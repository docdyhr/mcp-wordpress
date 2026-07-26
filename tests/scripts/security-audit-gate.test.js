import {
  severityAtOrAbove,
  extractAdvisories,
  isExceptionExpiredOrInvalid,
} from "../../scripts/security-audit-gate.js";

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
});
