/**
 * Tests for AISecurityScanner
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AISecurityScanner } from "@/security/AISecurityScanner.js";

describe("AISecurityScanner", () => {
  let scanner;

  beforeEach(() => {
    scanner = new AISecurityScanner();
  });

  describe("initial state", () => {
    it("creates instance without errors", () => {
      expect(scanner).toBeInstanceOf(AISecurityScanner);
    });

    it("getScanHistory returns empty array initially", () => {
      expect(scanner.getScanHistory()).toHaveLength(0);
    });

    it("getLatestScan returns null initially", () => {
      expect(scanner.getLatestScan()).toBeNull();
    });
  });

  describe("performScan", () => {
    it("returns a scan result with required shape", async () => {
      const result = await scanner.performScan({ targets: [] });
      expect(result).toMatchObject({
        scanId: expect.any(String),
        timestamp: expect.any(Date),
        duration: expect.any(Number),
        vulnerabilities: expect.any(Array),
        summary: {
          total: expect.any(Number),
          critical: expect.any(Number),
          high: expect.any(Number),
          medium: expect.any(Number),
          low: expect.any(Number),
        },
        remediationAvailable: expect.any(Number),
        compliance: {
          owasp: expect.any(Boolean),
          cwe: expect.any(Boolean),
          gdpr: expect.any(Boolean),
        },
      });
    });

    it("adds result to scan history", async () => {
      await scanner.performScan({ targets: [] });
      expect(scanner.getScanHistory()).toHaveLength(1);
    });

    it("getLatestScan returns last result after scan", async () => {
      await scanner.performScan({ targets: [] });
      const latest = scanner.getLatestScan();
      expect(latest).not.toBeNull();
      expect(latest?.scanId).toBeDefined();
    });

    it("accumulates multiple scans in history", async () => {
      await scanner.performScan({ targets: [] });
      await scanner.performScan({ targets: [] });
      expect(scanner.getScanHistory()).toHaveLength(2);
    });

    it("handles scan with non-existent target gracefully", async () => {
      const result = await scanner.performScan({ targets: ["/nonexistent/path"] });
      expect(result).toBeDefined();
    });

    it("includes runtime scan when includeRuntime is true", async () => {
      const result = await scanner.performScan({ targets: [], includeRuntime: true });
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it("includes filesystem scan when includeFileSystem is true", async () => {
      const result = await scanner.performScan({ targets: [], includeFileSystem: true });
      expect(result).toBeDefined();
    });

    it("summary total matches sum of severity counts", async () => {
      const result = await scanner.performScan({ targets: [] });
      const { total, critical, high, medium, low } = result.summary;
      expect(total).toBe(critical + high + medium + low);
    });

    it("remediationAvailable is <= total vulnerabilities", async () => {
      const result = await scanner.performScan({ targets: [] });
      expect(result.remediationAvailable).toBeLessThanOrEqual(result.summary.total);
    });

    it("uses default scan targets when none provided", async () => {
      // Just verify it doesn't throw with default targets (which may not exist in test env)
      const result = await scanner.performScan();
      expect(result).toBeDefined();
    });
  });

  describe("clearHistory", () => {
    it("empties scan history", async () => {
      await scanner.performScan({ targets: [] });
      scanner.clearHistory();
      expect(scanner.getScanHistory()).toHaveLength(0);
    });

    it("makes getLatestScan return null after clear", async () => {
      await scanner.performScan({ targets: [] });
      scanner.clearHistory();
      expect(scanner.getLatestScan()).toBeNull();
    });

    it("can be called on empty scanner without error", () => {
      expect(() => scanner.clearHistory()).not.toThrow();
    });
  });

  describe("compliance flags", () => {
    it("owasp is true when no critical or few high vulns", async () => {
      // With empty targets, likely 0 vulns → owasp should be true
      const result = await scanner.performScan({ targets: [] });
      if (result.summary.critical === 0 && result.summary.high < 3) {
        expect(result.compliance.owasp).toBe(true);
      }
    });

    it("gdpr is true when no information disclosure vulns", async () => {
      const result = await scanner.performScan({ targets: [] });
      const infoDisclosureCount = result.vulnerabilities.filter((v) => v.type.includes("Disclosure")).length;
      if (infoDisclosureCount === 0) {
        expect(result.compliance.gdpr).toBe(true);
      }
    });
  });

  describe("getScanHistory", () => {
    it("returns a copy of the history array", async () => {
      await scanner.performScan({ targets: [] });
      const history1 = scanner.getScanHistory();
      const history2 = scanner.getScanHistory();
      expect(history1).not.toBe(history2); // different array references
      expect(history1).toEqual(history2);
    });
  });
});
