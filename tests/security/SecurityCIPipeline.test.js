/**
 * Tests for SecurityCIPipeline
 * 
 * Tests the CI/CD security integration system including gates,
 * checks, reporting, and automated remediation workflows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SecurityCIPipeline } from "@/security/SecurityCIPipeline.js";

// Mock all security dependencies
vi.mock("../../dist/security/AISecurityScanner.js", () => ({
  AISecurityScanner: vi.fn().mockImplementation(() => ({
    scanCodeForVulnerabilities: vi.fn().mockResolvedValue({
      vulnerabilities: [],
      riskScore: 0.1,
      confidence: 0.95,
    }),
    scanDependencies: vi.fn().mockResolvedValue({
      vulnerabilities: [],
      outdatedPackages: 0,
      securityScore: 95,
    }),
    scanSecrets: vi.fn().mockResolvedValue({
      secrets: [],
      patterns: [],
      confidence: 0.98,
    }),
  })),
}));

vi.mock("../../dist/security/SecurityReviewer.js", () => ({
  SecurityReviewer: vi.fn().mockImplementation(() => ({
    reviewCode: vi.fn().mockResolvedValue({
      issues: [],
      score: 95,
      recommendations: [],
    }),
    reviewConfiguration: vi.fn().mockResolvedValue({
      issues: [],
      securityLevel: "high",
      compliance: true,
    }),
  })),
}));

vi.mock("../../dist/security/AutomatedRemediation.js", () => ({
  AutomatedRemediation: vi.fn().mockImplementation(() => ({
    autoFix: vi.fn().mockResolvedValue({
      fixed: [],
      failed: [],
      report: "No issues found",
    }),
    generateRecommendations: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../dist/security/SecurityConfigManager.js", () => ({
  SecurityConfigManager: vi.fn().mockImplementation(() => ({
    getSecurityConfig: vi.fn().mockReturnValue({
      gates: {
        preCommit: { enabled: true, blocking: true },
        preBuild: { enabled: true, blocking: true },
        preDeploy: { enabled: true, blocking: false },
      },
      thresholds: {
        maxCritical: 0,
        maxHigh: 2,
        maxMedium: 10,
        minSecurityScore: 80,
      },
    }),
    validateConfiguration: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock logger to avoid console output
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    security: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      time: vi.fn().mockImplementation((name, fn) => fn()),
    }),
  },
}));

describe("SecurityCIPipeline", () => {
  let pipeline;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      projectPath: "/test/project",
      environment: "test",
      branch: "main",
      commitHash: "abc123",
      enabledGates: ["pre-commit", "pre-build", "pre-deploy"],
      notificationConfig: {
        enabled: true,
        channels: ["email", "slack"],
      },
      reportingConfig: {
        enabled: true,
        outputDir: "/tmp/security-reports",
        format: "json",
      },
    };

    pipeline = new SecurityCIPipeline(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with configuration", () => {
      expect(pipeline).toBeDefined();
      expect(pipeline.config).toEqual(mockConfig);
    });

    it("should initialize security components", () => {
      expect(pipeline.scanner).toBeDefined();
      expect(pipeline.reviewer).toBeDefined();
      expect(pipeline.remediation).toBeDefined();
    });

    it("should validate configuration on initialization", () => {
      const invalidConfig = { ...mockConfig, projectPath: "" };
      
      expect(() => new SecurityCIPipeline(invalidConfig)).toThrow();
    });
  });

  describe("Security Gates", () => {
    it("should execute pre-commit gate successfully", async () => {
      const result = await pipeline.executePreCommitGate();
      
      expect(result).toBeDefined();
      expect(result.stage).toBe("pre-commit");
      expect(result.status).toBe("passed");
      expect(result.gates).toBeDefined();
    });

    it("should execute pre-build gate successfully", async () => {
      const result = await pipeline.executePreBuildGate();
      
      expect(result).toBeDefined();
      expect(result.stage).toBe("pre-build");
      expect(result.status).toBe("passed");
    });

    it("should execute pre-deploy gate with warnings", async () => {
      // Mock some medium-level issues
      pipeline.scanner.scanCodeForVulnerabilities.mockResolvedValue({
        vulnerabilities: [
          { severity: "medium", description: "Minor issue" },
        ],
        riskScore: 0.3,
        confidence: 0.9,
      });

      const result = await pipeline.executePreDeployGate();
      
      expect(result).toBeDefined();
      expect(result.stage).toBe("pre-deploy");
      expect(["passed", "warning"]).toContain(result.status);
    });

    it("should fail gate when critical vulnerabilities found", async () => {
      pipeline.scanner.scanCodeForVulnerabilities.mockResolvedValue({
        vulnerabilities: [
          { severity: "critical", description: "SQL injection" },
          { severity: "high", description: "XSS vulnerability" },
        ],
        riskScore: 0.9,
        confidence: 0.95,
      });

      const result = await pipeline.executePreCommitGate();
      
      expect(result.status).toBe("failed");
      expect(result.summary.criticalIssues).toBeGreaterThan(0);
    });
  });

  describe("Security Checks", () => {
    it("should perform vulnerability scanning", async () => {
      // Ensure the mock is properly set up
      pipeline.scanner.scanCodeForVulnerabilities = vi.fn().mockResolvedValue({
        vulnerabilities: [],
        riskScore: 0.1,
        confidence: 0.95,
      });
      
      const result = await pipeline.runVulnerabilityCheck();
      
      expect(result).toBeDefined();
      expect(result.checkId).toBe("vulnerability-scan");
      expect(result.status).toBe("passed");
      expect(pipeline.scanner.scanCodeForVulnerabilities).toHaveBeenCalled();
    });

    it("should perform dependency scanning", async () => {
      // Ensure the mock is properly set up
      pipeline.scanner.scanDependencies = vi.fn().mockResolvedValue({
        vulnerabilities: [],
        outdatedPackages: 0,
        securityScore: 95,
      });
      
      const result = await pipeline.runDependencyCheck();
      
      expect(result).toBeDefined();
      expect(result.checkId).toBe("dependency-scan");
      expect(pipeline.scanner.scanDependencies).toHaveBeenCalled();
    });

    it("should perform secrets scanning", async () => {
      // Ensure the mock is properly set up
      pipeline.scanner.scanSecrets = vi.fn().mockResolvedValue({
        secrets: [],
        patterns: [],
        confidence: 0.98,
      });
      
      const result = await pipeline.runSecretsCheck();
      
      expect(result).toBeDefined();
      expect(result.checkId).toBe("secrets-scan");
      expect(pipeline.scanner.scanSecrets).toHaveBeenCalled();
    });

    it("should perform code review", async () => {
      // Ensure the mock is properly set up
      pipeline.reviewer.reviewCode = vi.fn().mockResolvedValue({
        issues: [],
        score: 95,
        recommendations: [],
      });
      
      const result = await pipeline.runCodeReviewCheck();
      
      expect(result).toBeDefined();
      expect(result.checkId).toBe("code-review");
      expect(pipeline.reviewer.reviewCode).toHaveBeenCalled();
    });

    it("should handle check failures gracefully", async () => {
      pipeline.scanner.scanCodeForVulnerabilities.mockRejectedValue(
        new Error("Scan failed")
      );

      const result = await pipeline.runVulnerabilityCheck();
      
      expect(result.status).toBe("failed");
      expect(result.error).toBeDefined();
    });

    it("should respect check timeouts", async () => {
      // Mock slow scan
      pipeline.scanner.scanCodeForVulnerabilities.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const startTime = Date.now();
      const result = await pipeline.runVulnerabilityCheck({ timeout: 100 });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(200);
      expect(result.status).toBe("timeout");
    });
  });

  describe("Gate Configuration", () => {
    it("should configure security gates dynamically", () => {
      const gateConfig = {
        id: "test-gate",
        name: "Test Security Gate",
        stage: "pre-commit",
        enabled: true,
        blocking: false,
        checks: [],
        thresholds: {
          maxCritical: 0,
          maxHigh: 1,
          maxMedium: 5,
          minSecurityScore: 85,
        },
        exceptions: [],
      };

      pipeline.configureGate(gateConfig);
      
      const gates = pipeline.getConfiguredGates();
      expect(gates.some(gate => gate.id === "test-gate")).toBe(true);
    });

    it("should validate gate configuration", () => {
      const invalidGate = {
        id: "",
        name: "Invalid Gate",
        stage: "invalid-stage",
      };

      expect(() => pipeline.configureGate(invalidGate)).toThrow();
    });

    it("should enable/disable gates dynamically", () => {
      pipeline.enableGate("pre-commit");
      expect(pipeline.isGateEnabled("pre-commit")).toBe(true);
      
      pipeline.disableGate("pre-commit");
      expect(pipeline.isGateEnabled("pre-commit")).toBe(false);
    });
  });

  describe("Reporting", () => {
    it("should generate comprehensive security report", async () => {
      const report = await pipeline.generateReport();
      
      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.gates).toBeInstanceOf(Array);
    });

    it("should export reports in multiple formats", async () => {
      const jsonReport = await pipeline.exportReport("json");
      const htmlReport = await pipeline.exportReport("html");
      const xmlReport = await pipeline.exportReport("xml");
      
      expect(jsonReport).toBeDefined();
      expect(htmlReport).toBeDefined();
      expect(xmlReport).toBeDefined();
    });

    it("should include gate results in report", async () => {
      await pipeline.executePreCommitGate();
      const report = await pipeline.generateReport();
      
      expect(report.gates).toHaveLength(1);
      expect(report.gates[0].gateName).toBe("pre-commit");
    });

    it("should calculate security metrics correctly", async () => {
      const metrics = await pipeline.calculateSecurityMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
      expect(metrics.overallScore).toBeLessThanOrEqual(100);
      expect(metrics.riskLevel).toBeDefined();
      expect(metrics.complianceStatus).toBeDefined();
    });
  });

  describe("Automated Remediation", () => {
    it("should trigger auto-remediation for fixable issues", async () => {
      pipeline.scanner.scanCodeForVulnerabilities.mockResolvedValue({
        vulnerabilities: [
          { 
            severity: "medium", 
            type: "dependency",
            autoFixable: true,
            description: "Outdated package"
          },
        ],
        riskScore: 0.4,
        confidence: 0.9,
      });

      const result = await pipeline.executeAutoRemediation();
      
      expect(result).toBeDefined();
      expect(pipeline.remediation.autoFix).toHaveBeenCalled();
    });

    it("should generate remediation recommendations", async () => {
      const recommendations = await pipeline.generateRemediationPlan();
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(pipeline.remediation.generateRecommendations).toHaveBeenCalled();
    });

    it("should handle remediation failures gracefully", async () => {
      pipeline.remediation.autoFix.mockRejectedValue(
        new Error("Remediation failed")
      );

      const result = await pipeline.executeAutoRemediation();
      
      expect(result.status).toBe("failed");
      expect(result.error).toBeDefined();
    });
  });

  describe("Integration Workflow", () => {
    it("should execute complete CI pipeline", async () => {
      const result = await pipeline.executeFullPipeline();
      
      expect(result).toBeDefined();
      expect(result.stages).toBeDefined();
      expect(result.overallStatus).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it("should stop pipeline on blocking failures", async () => {
      pipeline.scanner.scanCodeForVulnerabilities.mockResolvedValue({
        vulnerabilities: [
          { severity: "critical", description: "Critical vulnerability" },
        ],
        riskScore: 0.95,
        confidence: 0.98,
      });

      const result = await pipeline.executeFullPipeline();
      
      expect(result.overallStatus).toBe("failed");
      expect(result.blockedBy).toBeDefined();
    });

    it("should continue pipeline on non-blocking failures", async () => {
      // Configure gates as non-blocking
      pipeline.configureGate({
        id: "pre-deploy",
        blocking: false,
        stage: "pre-deploy",
        enabled: true,
      });

      pipeline.scanner.scanCodeForVulnerabilities.mockResolvedValue({
        vulnerabilities: [
          { severity: "medium", description: "Medium issue" },
        ],
        riskScore: 0.4,
        confidence: 0.9,
      });

      const result = await pipeline.executeFullPipeline();
      
      expect(["passed", "warning"]).toContain(result.overallStatus);
    });
  });

  describe("Notifications", () => {
    it("should send notifications on security failures", async () => {
      const notificationSpy = vi.spyOn(pipeline, 'sendNotification');
      
      // Ensure the mock is properly set up
      pipeline.scanner.scanCodeForVulnerabilities = vi.fn().mockResolvedValue({
        vulnerabilities: [
          { severity: "critical", description: "Critical issue" },
        ],
        riskScore: 0.9,
        confidence: 0.95,
      });

      await pipeline.executePreCommitGate();
      
      expect(notificationSpy).toHaveBeenCalled();
    });

    it("should format notifications correctly", () => {
      const notification = pipeline.formatNotification({
        stage: "pre-commit",
        status: "failed",
        criticalIssues: 1,
        highIssues: 2,
      });
      
      expect(notification).toBeDefined();
      expect(notification.subject).toContain("Security Gate Failed");
      expect(notification.body).toContain("critical");
    });
  });

  describe("Performance", () => {
    it("should execute gates within reasonable time", async () => {
      const startTime = Date.now();
      await pipeline.executePreCommitGate();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle concurrent gate execution", async () => {
      const promises = [
        pipeline.executePreCommitGate(),
        pipeline.executePreBuildGate(),
        pipeline.executePreDeployGate(),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBeDefined();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle scanner initialization failures", () => {
      const brokenConfig = {
        ...mockConfig,
        scannerConfig: { invalid: true },
      };

      expect(() => new SecurityCIPipeline(brokenConfig)).toThrow();
    });

    it("should recover from transient failures", async () => {
      let callCount = 0;
      pipeline.scanner.scanCodeForVulnerabilities.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Transient failure"));
        }
        return Promise.resolve({
          vulnerabilities: [],
          riskScore: 0.1,
          confidence: 0.95,
        });
      });

      const result = await pipeline.runVulnerabilityCheck({ retries: 1 });
      
      expect(result.status).toBe("passed");
      expect(callCount).toBe(2);
    });

    it("should handle malformed security responses", async () => {
      pipeline.scanner.scanCodeForVulnerabilities.mockResolvedValue(null);

      const result = await pipeline.runVulnerabilityCheck();
      
      expect(result.status).toBe("failed");
      expect(result.error).toContain("Invalid response");
    });
  });

  describe("Configuration Management", () => {
    it("should reload configuration dynamically", () => {
      const newConfig = {
        ...mockConfig,
        environment: "production",
      };

      pipeline.reloadConfiguration(newConfig);
      
      expect(pipeline.config.environment).toBe("production");
    });

    it("should validate configuration changes", () => {
      const invalidConfig = {
        ...mockConfig,
        projectPath: null,
      };

      expect(() => pipeline.reloadConfiguration(invalidConfig)).toThrow();
    });

    it("should preserve gate states across reconfigurations", () => {
      pipeline.disableGate("pre-commit");
      
      pipeline.reloadConfiguration({
        ...mockConfig,
        environment: "staging",
      });
      
      expect(pipeline.isGateEnabled("pre-commit")).toBe(false);
    });
  });
});