import { createRequire } from "module";

// scripts/run-tests-safe.cjs is CommonJS; load it natively rather than through the
// ESM transform so the test exercises exactly what `npm run test:safe` executes.
const require = createRequire(import.meta.url);
const { parseVitestSummary, evaluateBatch } = require("../../scripts/run-tests-safe.cjs");

const ESC = "\u001b";

// Captured verbatim from `npx vitest run --config vitest.memory-safe.config.ts tests/bin/`
// (vitest 4.1.11) with stdout piped and colours disabled.
const PLAIN_SUMMARY = `
 RUN  v4.1.11 /Users/thomas/Programming/mcp-wordpress

 ✓ tests/bin/mcp-wordpress-entry.test.js (3 tests) 1200ms
 ✓ tests/bin/setup.test.js (10 tests) 11ms
 ✓ tests/bin/status.test.js (7 tests) 4ms

 Test Files  3 passed (3)
      Tests  20 passed (20)
   Start at  10:36:45
   Duration  1.68s (transform 31ms, setup 22ms, import 37ms, tests 1.22s, environment 0ms)
`;

// The same summary as vitest 4.1.11 emits it in a normal terminal environment
// (TERM set, stdout piped): the title is dimmed, the count is bold green, the
// total is grey. This is what the pre-push hook sees. Bytes captured verbatim.
const COLOURED_SUMMARY = [
  "",
  ` ${ESC}[1m${ESC}[32m✓${ESC}[39m${ESC}[22m tests/bin/status.test.js ${ESC}[2m(7 tests)${ESC}[22m${ESC}[32m 4${ESC}[2mms${ESC}[22m${ESC}[39m`,
  "",
  `${ESC}[2m Test Files ${ESC}[22m ${ESC}[1m${ESC}[32m1 passed${ESC}[39m${ESC}[22m${ESC}[90m (1)${ESC}[39m`,
  `${ESC}[2m      Tests ${ESC}[22m ${ESC}[1m${ESC}[32m7 passed${ESC}[39m${ESC}[22m${ESC}[90m (7)${ESC}[39m`,
  `${ESC}[2m   Start at ${ESC}[22m 10:44:12`,
  `${ESC}[2m   Duration ${ESC}[22m 1.41s${ESC}[2m (transform 29ms, setup 21ms, import 34ms, tests 954ms, environment 0ms)${ESC}[22m`,
  "",
].join("\n");

describe("scripts/run-tests-safe.cjs", () => {
  describe("parseVitestSummary", () => {
    it("parses the plain vitest 4 summary block", () => {
      const summary = parseVitestSummary(PLAIN_SUMMARY);
      expect(summary).toMatchObject({
        found: true,
        testFiles: 3,
        tests: 20,
        passed: 20,
        failed: 0,
        skipped: 0,
        todo: 0,
      });
    });

    it("regression: parses the ANSI-coloured summary vitest prints in a real terminal", () => {
      // Before the fix, /Tests\s+(\d+)\s+passed/ could not see past the escape codes
      // between the label and the number, every count collapsed to 0, and the runner
      // still printed "🎉 All tests passed!" because vitest's exit code was 0.
      const summary = parseVitestSummary(COLOURED_SUMMARY);
      expect(summary).toMatchObject({ found: true, testFiles: 1, tests: 7, passed: 7, failed: 0 });
    });

    it("regression: reports the real count for a large coloured batch instead of 0", () => {
      const output =
        `${ESC}[2m Test Files ${ESC}[22m ${ESC}[1m${ESC}[32m33 passed${ESC}[39m${ESC}[22m${ESC}[90m (33)${ESC}[39m\n` +
        `${ESC}[2m      Tests ${ESC}[22m ${ESC}[1m${ESC}[32m1070 passed${ESC}[39m${ESC}[22m${ESC}[90m (1070)${ESC}[39m\n`;
      const summary = parseVitestSummary(output);
      expect(summary.testFiles).toBe(33);
      expect(summary.passed).toBe(1070);
      expect(summary.tests).toBe(1070);
    });

    it("parses mixed failed and passed counts", () => {
      const output = " Test Files  1 failed | 32 passed (33)\n      Tests  2 failed | 108 passed (110)\n";
      const summary = parseVitestSummary(output);
      expect(summary).toMatchObject({ found: true, testFiles: 33, tests: 110, passed: 108, failed: 2 });
    });

    it("parses skipped, todo and expected-fail segments and keeps the parenthesised total", () => {
      const output =
        " Test Files  5 passed (5)\n" + "      Tests  100 passed | 1 expected fail | 3 skipped | 1 todo (105)\n";
      const summary = parseVitestSummary(output);
      expect(summary).toMatchObject({
        tests: 105,
        passed: 100,
        failed: 0,
        skipped: 3,
        todo: 1,
        expectedFail: 1,
      });
    });

    it("falls back to summing the segments when no parenthesised total is printed", () => {
      const summary = parseVitestSummary("      Tests  4 failed | 6 passed\n");
      expect(summary).toMatchObject({ found: true, tests: 10, passed: 6, failed: 4 });
    });

    it("uses the last summary block when several are present", () => {
      const output = "      Tests  1 passed (1)\n ... rerun ...\n      Tests  9 passed (9)\n";
      expect(parseVitestSummary(output).passed).toBe(9);
    });

    it("does not mistake a test file line for the summary", () => {
      const output = " ✓ tests/x.test.js (3 tests) 5ms\n Test Files  1 passed (1)\n      Tests  3 passed (3)\n";
      expect(parseVitestSummary(output)).toMatchObject({ testFiles: 1, tests: 3, passed: 3 });
    });

    it("reports found=false and zero counts (never an estimate) when no summary line exists", () => {
      const summary = parseVitestSummary(" RUN  v4.1.11\n\nNo test files found, exiting with code 1\n");
      expect(summary.found).toBe(false);
      expect(summary.tests).toBe(0);
      expect(summary.passed).toBe(0);
    });

    it("tolerates empty or missing output", () => {
      expect(parseVitestSummary("").found).toBe(false);
      expect(parseVitestSummary(undefined).found).toBe(false);
    });
  });

  describe("evaluateBatch", () => {
    const healthy = parseVitestSummary(PLAIN_SUMMARY);

    it("accepts a zero exit code with a populated summary and no failures", () => {
      expect(evaluateBatch({ code: 0, summary: healthy })).toEqual({ success: true, reason: null });
    });

    it("regression: fails a batch whose vitest exit code is 0 but which reports zero tests", () => {
      const summary = parseVitestSummary("      Tests  0 passed (0)\n");
      const verdict = evaluateBatch({ code: 0, summary });
      expect(verdict.success).toBe(false);
      expect(verdict.reason).toMatch(/zero tests/);
    });

    it("regression: fails a batch whose summary line could not be found", () => {
      const verdict = evaluateBatch({ code: 0, summary: parseVitestSummary("") });
      expect(verdict.success).toBe(false);
      expect(verdict.reason).toMatch(/summary line/);
    });

    it("fails when every test was skipped even though the total is non-zero", () => {
      const summary = parseVitestSummary("      Tests  3 skipped (3)\n");
      expect(evaluateBatch({ code: 0, summary }).success).toBe(false);
    });

    it("fails on a non-zero exit code regardless of the summary", () => {
      const verdict = evaluateBatch({ code: 1, summary: healthy });
      expect(verdict.success).toBe(false);
      expect(verdict.reason).toMatch(/code 1/);
    });

    it("fails and names the signal when vitest was killed", () => {
      const verdict = evaluateBatch({ code: null, signal: "SIGTERM", summary: healthy });
      expect(verdict.success).toBe(false);
      expect(verdict.reason).toMatch(/SIGTERM/);
    });

    it("fails when the summary reports failed tests", () => {
      const summary = parseVitestSummary("      Tests  2 failed | 108 passed (110)\n");
      const verdict = evaluateBatch({ code: 0, summary });
      expect(verdict.success).toBe(false);
      expect(verdict.reason).toMatch(/2 test\(s\) failed/);
    });
  });
});
