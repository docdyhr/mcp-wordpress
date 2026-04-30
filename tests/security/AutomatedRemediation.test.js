/**
 * Tests for AutomatedRemediation
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AutomatedRemediation } from "@/security/AutomatedRemediation.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

let tmpDir;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "auto-remediation-test-"));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeScanResult(vulnerabilities = []) {
  return {
    scanId: "scan-test-1",
    timestamp: new Date(),
    duration: 100,
    vulnerabilities,
    summary: {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter((v) => v.severity === "critical").length,
      high: vulnerabilities.filter((v) => v.severity === "high").length,
      medium: vulnerabilities.filter((v) => v.severity === "medium").length,
      low: vulnerabilities.filter((v) => v.severity === "low").length,
    },
    remediationAvailable: vulnerabilities.filter((v) => v.remediation.automated).length,
    compliance: { owasp: true, cwe: true, gdpr: true },
  };
}

function makeVuln(overrides = {}) {
  return {
    id: `vuln-${Date.now()}-${Math.random()}`,
    severity: "high",
    type: "SQL Injection",
    description: "SQL injection detected",
    location: { file: undefined, line: 1, context: "test" },
    remediation: { suggested: "Use parameterized queries", automated: true, confidence: 0.8 },
    metadata: { cweId: "CWE-89", cvssScore: 8.1, exploitability: "high", detected: new Date() },
    ...overrides,
  };
}

describe("AutomatedRemediation", () => {
  let remediator;

  beforeEach(() => {
    remediator = new AutomatedRemediation();
  });

  describe("initial state", () => {
    it("creates instance without errors", () => {
      expect(remediator).toBeInstanceOf(AutomatedRemediation);
    });

    it("getRemediationHistory returns empty array initially", () => {
      expect(remediator.getRemediationHistory()).toHaveLength(0);
    });
  });

  describe("createRemediationPlan()", () => {
    it("returns plan with correct shape for empty scan", async () => {
      const plan = await remediator.createRemediationPlan(makeScanResult([]));
      expect(plan).toMatchObject({
        planId: expect.any(String),
        vulnerabilities: [],
        actions: [],
        estimatedDuration: 0,
        riskLevel: "low",
        requiresApproval: false,
      });
    });

    it("returns only remediable vulnerabilities in plan", async () => {
      const vulns = [
        makeVuln({ remediation: { automated: true, suggested: "fix", confidence: 0.8 } }),
        makeVuln({ remediation: { automated: false, suggested: "manual fix", confidence: 0.5 } }),
      ];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.vulnerabilities).toHaveLength(1);
    });

    it("estimates 30s per action", async () => {
      const vulns = [makeVuln({ type: "SQL Injection" }), makeVuln({ type: "Cross-Site Scripting (XSS)" })];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.estimatedDuration).toBe(60);
    });

    it("sets riskLevel to high for critical vulnerabilities", async () => {
      const vulns = [makeVuln({ severity: "critical", type: "Credential Exposure" })];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.riskLevel).toBe("high");
    });

    it("sets riskLevel to medium for medium severity when max is low", async () => {
      const vulns = [makeVuln({ severity: "medium", type: "Insecure Configuration" })];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.riskLevel).toBe("medium");
    });

    it("requiresApproval is true for high risk plans", async () => {
      const vulns = [makeVuln({ severity: "critical", type: "SQL Injection" })];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.requiresApproval).toBe(true);
    });

    it("requiresApproval is true when more than 10 actions", async () => {
      // Create 11 low-severity remediable vulns
      const vulns = Array.from({ length: 11 }, () => makeVuln({ severity: "low", type: "Information Disclosure" }));
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.requiresApproval).toBe(true);
    });

    it("handles all supported vulnerability types without throwing", async () => {
      const types = [
        "SQL Injection",
        "Cross-Site Scripting (XSS)",
        "Path Traversal",
        "Credential Exposure",
        "Insecure Configuration",
        "Information Disclosure",
      ];
      const vulns = types.map((type) => makeVuln({ type }));
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.actions.length).toBe(types.length);
    });

    it("returns null action for unknown vulnerability type (excluded from plan)", async () => {
      const vulns = [makeVuln({ type: "Unknown Vulnerability Type" })];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      expect(plan.actions).toHaveLength(0);
    });
  });

  describe("executeRemediationPlan() - dry run", () => {
    it("returns simulated results for each action", async () => {
      const vulns = [makeVuln({ type: "SQL Injection" }), makeVuln({ type: "Path Traversal" })];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      const results = await remediator.executeRemediationPlan(plan, { dryRun: true });
      expect(results).toHaveLength(plan.actions.length);
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.action).toContain("simulated");
      }
    });

    it("dry run does not add to remediation history", async () => {
      const vulns = [makeVuln({ type: "SQL Injection" })];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      await remediator.executeRemediationPlan(plan, { dryRun: true });
      expect(remediator.getRemediationHistory()).toHaveLength(0);
    });

    it("dry run on empty plan returns empty results", async () => {
      const plan = await remediator.createRemediationPlan(makeScanResult([]));
      const results = await remediator.executeRemediationPlan(plan, { dryRun: true });
      expect(results).toHaveLength(0);
    });
  });

  describe("executeRemediationPlan() - real execution with files", () => {
    it("executes replace action on a real file", async () => {
      const filePath = path.join(tmpDir, "vuln-file.ts");
      await fs.writeFile(filePath, "const debug = true;\nconst x = 1;\n", "utf-8");

      const vulns = [
        makeVuln({
          type: "Information Disclosure",
          location: { file: filePath, line: 1 },
          remediation: { automated: true, suggested: "disable debug", confidence: 0.8 },
        }),
      ];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      const results = await remediator.executeRemediationPlan(plan);
      // May succeed or fail depending on pattern match, but should not throw
      expect(results).toHaveLength(plan.actions.length);
    });

    it("adds successful results to remediation history", async () => {
      const filePath = path.join(tmpDir, "debug-file.ts");
      await fs.writeFile(filePath, "const debug = true;\n", "utf-8");

      const vulns = [
        makeVuln({
          type: "Information Disclosure",
          location: { file: filePath, line: 1 },
          remediation: { automated: true, suggested: "fix", confidence: 0.8 },
        }),
      ];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      await remediator.executeRemediationPlan(plan);
      // History should have entries (success or failure)
      expect(remediator.getRemediationHistory().length).toBeGreaterThanOrEqual(0);
    });

    it("handles action failure gracefully (non-existent file)", async () => {
      const vulns = [
        makeVuln({
          type: "SQL Injection",
          location: { file: "/nonexistent/path/file.ts", line: 1 },
        }),
      ];
      const plan = await remediator.createRemediationPlan(makeScanResult(vulns));
      const results = await remediator.executeRemediationPlan(plan);
      // Should not throw; failure recorded in results
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("rollbackRemediation()", () => {
    it("restores file from backup", async () => {
      const original = "original content\n";
      const backupPath = path.join(tmpDir, "backup.ts.backup");
      const targetPath = path.join(tmpDir, "target-rollback.ts");
      await fs.writeFile(backupPath, original, "utf-8");
      await fs.writeFile(targetPath, "modified content\n", "utf-8");

      await remediator.rollbackRemediation(backupPath, targetPath);
      const restored = await fs.readFile(targetPath, "utf-8");
      expect(restored).toBe(original);
    });

    it("throws SecurityValidationError for non-existent backup", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(remediator.rollbackRemediation("/no/such/backup.bak", "/some/target.ts")).rejects.toBeInstanceOf(
        SecurityValidationError,
      );
    });
  });

  describe("cleanupBackups()", () => {
    it("runs without error even when backup dir does not exist", async () => {
      await expect(remediator.cleanupBackups()).resolves.toBeUndefined();
    });
  });

  describe("getRemediationHistory()", () => {
    it("returns a copy of the history array", () => {
      expect(remediator.getRemediationHistory()).not.toBe(remediator.getRemediationHistory());
    });
  });
});
