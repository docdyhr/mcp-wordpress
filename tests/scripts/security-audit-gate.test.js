import { spawnSync } from "child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parse } from "yaml";
import {
  severityAtOrAbove,
  extractAdvisories,
  isExceptionExpiredOrInvalid,
} from "../../scripts/security-audit-gate.js";
import * as gate from "../../scripts/security-audit-gate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GATE_PATH = join(__dirname, "../../scripts/security-audit-gate.js");
const CI_WORKFLOW_PATH = join(__dirname, "../../.github/workflows/main-ci.yml");

// Stand-in for npm: records its arguments, then answers call N with response-N (the last
// response repeats once they run out).
const FAKE_NPM = `#!/bin/sh
n=$(( $(cat "$FAKE_NPM_DIR/calls" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$FAKE_NPM_DIR/calls"
echo "$*" >> "$FAKE_NPM_DIR/args"
r="$FAKE_NPM_DIR/response-$n"
[ -f "$r.out" ] || r="$FAKE_NPM_DIR/response-last"
cat "$r.out"
exit "$(cat "$r.exit")"
`;

/**
 * Runs the real gate script, the way CI, the pre-push hook and `npm run security:scan` do,
 * against a fake `npm` that answers each `npm audit` call with the next of `responses`.
 */
function runGate(responses) {
  const dir = mkdtempSync(join(tmpdir(), "audit-gate-"));
  try {
    writeFileSync(join(dir, "npm"), FAKE_NPM);
    chmodSync(join(dir, "npm"), 0o755);
    responses.forEach(({ body, exit }, i) => {
      const out = typeof body === "string" ? body : JSON.stringify(body);
      for (const name of [`response-${i + 1}`, ...(i === responses.length - 1 ? ["response-last"] : [])]) {
        writeFileSync(join(dir, `${name}.out`), out);
        writeFileSync(join(dir, `${name}.exit`), String(exit));
      }
    });
    const result = spawnSync(process.execPath, [GATE_PATH], {
      encoding: "utf8",
      timeout: 30_000,
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        FAKE_NPM_DIR: dir,
        SECURITY_AUDIT_RETRY_DELAY_MS: "0",
      },
    });
    const read = (name) => {
      try {
        return readFileSync(join(dir, name), "utf8");
      } catch {
        return "";
      }
    };
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      calls: Number(read("calls").trim() || 0),
      args: read("args").split("\n").filter(Boolean),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("scripts/security-audit-gate.js", () => {
  describe("isExceptionExpiredOrInvalid", () => {
    const today = "2026-07-26";

    it("treats a future reviewBy as valid (not expired)", () => {
      expect(isExceptionExpiredOrInvalid("2026-10-26", today)).toBe(false);
    });

    it("treats today as valid (not expired)", () => {
      expect(isExceptionExpiredOrInvalid(today, today)).toBe(false);
    });

    it("treats a past reviewBy as expired", () => {
      expect(isExceptionExpiredOrInvalid("2026-01-01", today)).toBe(true);
    });

    it("regression: treats a missing reviewBy as invalid instead of silently passing forever", () => {
      // A bare `undefined < today` string comparison is always false, so the old code
      // treated a missing reviewBy as "not expired" — accepting it forever.
      expect(isExceptionExpiredOrInvalid(undefined, today)).toBe(true);
    });

    it("regression: treats a malformed reviewBy as invalid instead of comparing it lexicographically", () => {
      // "not-a-date" sorts after any real YYYY-MM-DD date string, so the old
      // `exception.reviewBy < today` comparison was always false for it too.
      expect(isExceptionExpiredOrInvalid("not-a-date", today)).toBe(true);
    });

    it("rejects non-YYYY-MM-DD shaped strings even if they look date-like", () => {
      expect(isExceptionExpiredOrInvalid("26-07-2026", today)).toBe(true);
      expect(isExceptionExpiredOrInvalid("2026/07/26", today)).toBe(true);
    });
  });

  describe("severityAtOrAbove", () => {
    it("accepts moderate, high, and critical", () => {
      expect(severityAtOrAbove("moderate")).toBe(true);
      expect(severityAtOrAbove("high")).toBe(true);
      expect(severityAtOrAbove("critical")).toBe(true);
    });

    it("rejects info and low", () => {
      expect(severityAtOrAbove("info")).toBe(false);
      expect(severityAtOrAbove("low")).toBe(false);
    });
  });

  describe("extractAdvisories", () => {
    it("extracts GHSA ids from vulnerability report and filters by severity threshold", () => {
      const report = {
        vulnerabilities: {
          "@hono/node-server": {
            name: "@hono/node-server",
            via: [
              {
                url: "https://github.com/advisories/GHSA-frvp-7c67-39w9",
                severity: "moderate",
                title: "Path traversal",
              },
            ],
          },
          "low-sev-pkg": {
            name: "low-sev-pkg",
            via: [{ url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "low", title: "Minor issue" }],
          },
        },
      };

      const findings = extractAdvisories(report);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("GHSA-frvp-7c67-39w9");
      expect(findings[0].package).toBe("@hono/node-server");
    });

    it("returns an empty array when there are no vulnerabilities", () => {
      expect(extractAdvisories({ vulnerabilities: {} })).toEqual([]);
    });
  });

  describe("npm audit invocation failures (registry outages)", () => {
    // What `npm audit --json` printed when the audit itself didn't run, trimmed of headers.
    // Both CI failures (npm 10) hung on the bulk advisory endpoint for npm's whole default
    // fetch-timeout, then fell back to the retired quick endpoint, which refused.
    const INVOCATION_FAILURES = {
      "CI 2026-10-22, quick endpoint 400 (run 39711295110)": {
        message: "400 Bad Request - POST https://registry.npmjs.org/-/npm/v1/security/audits/quick - Bad Request",
        method: "POST",
        uri: "https://registry.npmjs.org/-/npm/v1/security/audits/quick",
        statusCode: 400,
        body: {
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid package tree, run  npm install  to rebuild your package-lock.json",
        },
        error: { summary: "", detail: "" },
      },
      "CI 2026-09-04, quick endpoint 503 (run 33829486088)": {
        message:
          "503 Service Unavailable - POST https://registry.npmjs.org/-/npm/v1/security/audits/quick - Service Unavailable",
        method: "POST",
        uri: "https://registry.npmjs.org/-/npm/v1/security/audits/quick",
        statusCode: 503,
        error: { summary: "", detail: "" },
      },
      "npm 11 bulk endpoint timeout (--fetch-timeout=1)": {
        message: "network timeout at: https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
        error: { summary: "", detail: "" },
      },
    };
    const CLEAN_REPORT = {
      auditReportVersion: 2,
      vulnerabilities: {},
      metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } },
    };
    const FINDINGS_REPORT = {
      auditReportVersion: 2,
      vulnerabilities: {
        "fixture-pkg": {
          name: "fixture-pkg",
          severity: "high",
          via: [
            {
              url: "https://github.com/advisories/GHSA-zzzz-zzzz-zzzz",
              severity: "high",
              title: "Fixture advisory with no documented exception",
            },
          ],
        },
      },
    };

    it.each(Object.entries(INVOCATION_FAILURES))(
      "regression: retries once after an invocation failure (%s) and passes on a clean second audit",
      (_name, failure) => {
        const run = runGate([
          { body: failure, exit: 1 },
          { body: CLEAN_REPORT, exit: 0 },
        ]);
        expect(run.calls).toBe(2);
        expect(run.status).toBe(0);
        expect(run.stdout).toContain("audit gate passed");
      },
    );

    it("regression: retries once when npm printed no report at all", () => {
      const run = runGate([
        { body: "", exit: 1 },
        { body: CLEAN_REPORT, exit: 0 },
      ]);
      expect(run.calls).toBe(2);
      expect(run.status).toBe(0);
    });

    it("still fails closed when the second attempt fails too, and names npm's message instead of a blank", () => {
      // npm leaves error.summary empty; the old message ended after "failed to run: ".
      const run = runGate([
        { body: INVOCATION_FAILURES["CI 2026-10-22, quick endpoint 400 (run 39711295110)"], exit: 1 },
      ]);
      expect(run.calls).toBe(2);
      expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/npm audit itself failed to run: 400 Bad Request/);
    });

    it("never retries a real report: an unexcepted finding fails the gate on the only audit run", () => {
      const run = runGate([
        { body: FINDINGS_REPORT, exit: 1 },
        { body: CLEAN_REPORT, exit: 0 },
      ]);
      expect(run.calls).toBe(1);
      expect(run.status).toBe(1);
      expect(run.stderr).toContain("GHSA-zzzz-zzzz-zzzz (fixture-pkg, high) has no documented exception");
    });

    it("bounds npm's fetch timeout so both attempts fit inside the Quality Checks job", () => {
      const run = runGate([{ body: CLEAN_REPORT, exit: 0 }]);
      expect(run.args).toEqual([`audit --omit=dev --json --fetch-timeout=${gate.AUDIT_FETCH_TIMEOUT_MS}`]);

      // npm 10 can wait the full fetch-timeout twice per attempt (bulk endpoint, then the
      // quick fallback). At npm's 5-minute default, one outage already took 7 of the job's
      // 10 minutes, so a retry would get the job cancelled. The steps before the gate took
      // up to ~3 minutes; reserve 4.
      const ci = parse(readFileSync(CI_WORKFLOW_PATH, "utf8"));
      const jobBudgetMs = (ci.jobs.quality["timeout-minutes"] - 4) * 60_000;
      const worstCaseMs =
        gate.AUDIT_ATTEMPTS * 2 * gate.AUDIT_FETCH_TIMEOUT_MS + (gate.AUDIT_ATTEMPTS - 1) * gate.AUDIT_RETRY_DELAY_MS;
      expect(gate.AUDIT_ATTEMPTS).toBe(2);
      expect(worstCaseMs).toBeLessThanOrEqual(jobBudgetMs);
    });
  });
});
