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
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const EXCEPTIONS_PATH = path.join(repoRoot, "security-exceptions.json");
const SEVERITY_ORDER = ["info", "low", "moderate", "high", "critical"];
const MIN_SEVERITY = "moderate";

function severityAtOrAbove(severity) {
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(MIN_SEVERITY);
}

function parseAuditOutput(stdout) {
  const report = JSON.parse(stdout);
  // A failed `npm audit` invocation (bad flags, network error, environment misconfiguration —
  // e.g. an ambient npm_config_allow_scripts rejecting project-scoped installs) still exits
  // non-zero and still prints valid JSON, but shaped as `{ error: {...} }` with no
  // `vulnerabilities` key at all. Treating that as "zero vulnerabilities" would silently pass
  // the gate on a broken audit run instead of the real dependency tree — fail loudly instead.
  if (report.error) {
    throw new Error(`npm audit itself failed to run: ${report.error.summary ?? report.error.code}`);
  }
  return report;
}

function runNpmAudit() {
  // Strip any ambient npm_config_allow_scripts from the environment before invoking the
  // inner npm audit — some environments set this globally for unrelated reasons, and npm
  // rejects project-scoped installs/audits outright when it's set without a matching
  // "allowScripts" field in package.json.
  const { npm_config_allow_scripts: _unused, ...cleanEnv } = process.env;

  try {
    const stdout = execSync("npm audit --omit=dev --json", {
      encoding: "utf8",
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
      env: cleanEnv,
    });
    return parseAuditOutput(stdout);
  } catch (error) {
    // npm audit exits non-zero as soon as it finds any vulnerability — the JSON report is
    // still written to stdout, so a thrown error here is the *expected* path, not a failure,
    // as long as it parses into a real report rather than an `{ error: {...} }` shape.
    if (error.stdout) {
      try {
        return parseAuditOutput(error.stdout);
      } catch (parseError) {
        console.error("❌", parseError.message);
        console.error(error.stdout);
        process.exit(1);
      }
    }
    console.error("❌ Failed to run npm audit:", error.message);
    process.exit(1);
  }
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

const report = runNpmAudit();
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

  if (exception.reviewBy < today) {
    console.error(`❌ ${finding.id} (${finding.package}) exception expired on ${exception.reviewBy}.`);
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

console.log("✅ Production dependency audit gate passed — every finding is reviewed and within its exception window.");
