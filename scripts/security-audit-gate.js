#!/usr/bin/env node
/**
 * Blocking production dependency audit gate.
 *
 * Runs `npm audit --omit=dev --json`, extracts every advisory at or above
 * MIN_SEVERITY, and cross-references it against security-exceptions.json.
 * Exits non-zero unless every finding is covered by a live, unexpired,
 * documented exception — replacing the previous audit steps (main-ci.yml,
 * package.json's security:scan) that swallowed their exit code or ran with
 * continue-on-error regardless of findings.
 *
 * When `npm audit` itself fails to run (a registry outage, a network error), it retries once
 * before failing. A report with findings is never retried.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const EXCEPTIONS_PATH = path.join(repoRoot, "security-exceptions.json");
const SEVERITY_ORDER = ["info", "low", "moderate", "high", "critical"];
const MIN_SEVERITY = "moderate";
const REVIEW_BY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const AUDIT_ATTEMPTS = 2;
// SECURITY_AUDIT_RETRY_DELAY_MS (whole milliseconds) overrides the pause between attempts; the
// tests set it to 0. Anything else keeps the default.
const retryDelayOverride = process.env.SECURITY_AUDIT_RETRY_DELAY_MS ?? "";
const AUDIT_RETRY_DELAY_MS = /^\d+$/.test(retryDelayOverride) ? Number(retryDelayOverride) : 30_000;
// npm's default fetch-timeout is 5 minutes, and npm 10 can wait it twice per attempt (the bulk
// advisory endpoint, then the quick fallback). The two registry outages seen in CI (2026-09-04,
// 2026-10-22) each held the gate for 5-7 minutes of the Quality Checks job's 10, so a retry at
// the default would get the job cancelled. A healthy audit answers in about a second.
const AUDIT_FETCH_TIMEOUT_MS = 60_000;

function severityAtOrAbove(severity) {
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(MIN_SEVERITY);
}

/**
 * True when `reviewBy` is missing, isn't a YYYY-MM-DD string, or is in the past. A bare
 * `reviewBy < today` string comparison would let a missing value (`undefined < "2026-…"` is
 * always false) or a malformed one (e.g. "not-a-date", which sorts after any real date
 * lexicographically) silently pass as "not expired" forever — fail closed instead.
 */
function isExceptionExpiredOrInvalid(reviewBy, today) {
  if (typeof reviewBy !== "string" || !REVIEW_BY_PATTERN.test(reviewBy)) {
    return true;
  }
  return reviewBy < today;
}

function parseAuditOutput(stdout) {
  const report = JSON.parse(stdout);
  // A failed `npm audit` invocation (bad flags, network error, environment misconfiguration —
  // e.g. an ambient npm_config_allow_scripts rejecting project-scoped installs) still exits
  // non-zero and still prints valid JSON, but shaped as `{ error: {...} }` with no
  // `vulnerabilities` key at all. Treating that as "zero vulnerabilities" would silently pass
  // the gate on a broken audit run instead of the real dependency tree — fail loudly instead.
  if (report.error) {
    // npm leaves error.summary empty for registry failures and puts the cause in `message`.
    const cause = report.error.summary || report.error.code || report.message;
    throw new Error(`npm audit itself failed to run: ${cause}`);
  }
  return report;
}

function execNpmAudit() {
  // Strip any ambient npm_config_allow_scripts from the environment before invoking the
  // inner npm audit — some environments set this globally for unrelated reasons, and npm
  // rejects project-scoped installs/audits outright when it's set without a matching
  // "allowScripts" field in package.json.
  const { npm_config_allow_scripts: _unused, ...cleanEnv } = process.env;

  return execSync(`npm audit --omit=dev --json --fetch-timeout=${AUDIT_FETCH_TIMEOUT_MS}`, {
    encoding: "utf8",
    cwd: repoRoot,
    maxBuffer: 10 * 1024 * 1024,
    env: cleanEnv,
  });
}

/**
 * One `npm audit` run: `{ report }` for a real audit report, with or without findings, or
 * `{ failure, output }` when the audit itself did not run.
 */
function auditOnce() {
  let stdout;
  try {
    stdout = execNpmAudit();
  } catch (error) {
    // npm audit exits non-zero as soon as it finds any vulnerability — the JSON report is
    // still written to stdout, so a thrown error here is the *expected* path, not a failure,
    // as long as it parses into a real report rather than an `{ error: {...} }` shape.
    if (!error.stdout) {
      return { failure: `Failed to run npm audit: ${error.message}` };
    }
    stdout = error.stdout;
  }
  try {
    return { report: parseAuditOutput(stdout) };
  } catch (parseError) {
    return { failure: parseError.message, output: stdout };
  }
}

async function runNpmAudit() {
  let result;
  for (let attempt = 1; attempt <= AUDIT_ATTEMPTS; attempt++) {
    result = auditOnce();
    if (result.report) return result.report;
    if (attempt < AUDIT_ATTEMPTS) {
      console.error(`⚠️  ${result.failure} (attempt ${attempt} of ${AUDIT_ATTEMPTS}); retrying.`);
      await delay(AUDIT_RETRY_DELAY_MS);
    }
  }
  console.error("❌", result.failure);
  if (result.output) console.error(result.output);
  process.exit(1);
}

function extractAdvisories(report) {
  const advisories = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== "object" || !via.url) continue; // skip plain string cross-references to other packages
      const match = /advisories\/(GHSA-[a-z0-9-]+)/i.exec(via.url);
      const id = match ? match[1] : via.url;
      if (!advisories.has(id)) {
        advisories.set(id, { id, package: vuln.name, severity: via.severity, title: via.title, url: via.url });
      }
    }
  }
  return [...advisories.values()].filter((advisory) => severityAtOrAbove(advisory.severity));
}

function loadExceptions() {
  const raw = JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8"));
  return raw.exceptions ?? [];
}

async function main() {
  const report = await runNpmAudit();
  const findings = extractAdvisories(report);
  const exceptions = loadExceptions();
  const today = new Date().toISOString().slice(0, 10);

  console.log(`🔍 Production dependency audit (npm audit --omit=dev, severity >= ${MIN_SEVERITY})`);
  console.log(`   Findings at or above threshold: ${findings.length}\n`);

  let failed = false;

  for (const finding of findings) {
    const exception = exceptions.find((e) => e.id === finding.id);

    if (!exception) {
      console.error(`❌ ${finding.id} (${finding.package}, ${finding.severity}) has no documented exception.`);
      console.error(`   ${finding.title}`);
      console.error(`   ${finding.url}`);
      console.error(`   Fix it, or add a reviewed, time-boxed entry to security-exceptions.json.\n`);
      failed = true;
      continue;
    }

    if (isExceptionExpiredOrInvalid(exception.reviewBy, today)) {
      console.error(
        `❌ ${finding.id} (${finding.package}) exception has an invalid or expired reviewBy ` +
          `(${JSON.stringify(exception.reviewBy)}); expected an unexpired YYYY-MM-DD date.`,
      );
      console.error(`   Re-review and update security-exceptions.json (or fix the underlying dependency).\n`);
      failed = true;
      continue;
    }

    console.log(
      `✅ ${finding.id} (${finding.package}, ${finding.severity}) — reviewed, valid until ${exception.reviewBy}.`,
    );
    console.log(`   ${exception.reason}\n`);
  }

  const staleExceptions = exceptions.filter((e) => !findings.some((f) => f.id === e.id));
  if (staleExceptions.length > 0) {
    console.log(
      `ℹ️  ${staleExceptions.length} exception(s) in security-exceptions.json no longer match any current finding — consider removing:`,
    );
    for (const stale of staleExceptions) {
      console.log(`   - ${stale.id} (${stale.package})`);
    }
    console.log("");
  }

  if (failed) {
    console.error("❌ Production dependency audit gate FAILED.");
    process.exit(1);
  }

  console.log(
    "✅ Production dependency audit gate passed — every finding is reviewed and within its exception window.",
  );
}

// Guard so this module can be imported for unit tests (e.g. isExceptionExpiredOrInvalid)
// without shelling out to a live `npm audit` or calling process.exit.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export {
  severityAtOrAbove,
  extractAdvisories,
  isExceptionExpiredOrInvalid,
  AUDIT_ATTEMPTS,
  AUDIT_RETRY_DELAY_MS,
  AUDIT_FETCH_TIMEOUT_MS,
};
