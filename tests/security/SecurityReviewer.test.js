/**
 * Tests for SecurityReviewer
 * 
 * Tests the AI-powered security code review system including
 * vulnerability detection, code analysis, and security scoring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SecurityReviewer } from "@/security/SecurityReviewer.js";
import * as fs from "fs";

// Mock file system operations
vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
  },
  promises: {
    readFile: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock AI Security Scanner dependency
vi.mock("../../dist/security/AISecurityScanner.js", () => ({
  AISecurityScanner: vi.fn().mockImplementation(() => ({
    analyzeCode: vi.fn().mockResolvedValue({
      vulnerabilities: [],
      patterns: [],
      confidence: 0.95,
    }),
    checkPatterns: vi.fn().mockResolvedValue([]),
    assessRisk: vi.fn().mockResolvedValue({
      score: 0.1,
      level: "low",
      factors: [],
    }),
  })),
}));

// Mock Security Config
vi.mock("../../dist/security/SecurityConfig.js", () => ({
  SecurityUtils: {
    sanitize: vi.fn(input => input?.toString().replace(/[<>]/g, "")),
    validateInput: vi.fn(() => true),
    hash: vi.fn(() => "mock-hash"),
  },
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

describe("SecurityReviewer", () => {
  let reviewer;
  let mockConfig;
  let mockFs;

  beforeEach(() => {
    mockConfig = {
      projectRoot: "/test/project",
      includePatterns: ["**/*.ts", "**/*.js"],
      excludePatterns: ["**/node_modules/**", "**/dist/**"],
      securityRules: {
        "no-hardcoded-secrets": { enabled: true, severity: "critical" },
        "no-sql-injection": { enabled: true, severity: "high" },
        "no-xss-vulnerabilities": { enabled: true, severity: "high" },
        "secure-dependencies": { enabled: true, severity: "medium" },
      },
      aiConfig: {
        model: "security-analysis-v1",
        confidence: 0.8,
        maxTokens: 2048,
      },
    };

    mockFs = {
      readFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(true),
      statSync: vi.fn().mockReturnValue({ isFile: () => true }),
      readdirSync: vi.fn().mockReturnValue([]),
    };

    fs.readFileSync = vi.fn().mockImplementation(mockFs.readFileSync);
    fs.existsSync = vi.fn().mockImplementation(mockFs.existsSync);
    fs.statSync = vi.fn().mockImplementation(mockFs.statSync);
    fs.readdirSync = vi.fn().mockImplementation(mockFs.readdirSync);

    reviewer = new SecurityReviewer(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with configuration", () => {
      expect(reviewer).toBeDefined();
      expect(reviewer.config).toEqual(mockConfig);
    });

    it("should initialize AI scanner", () => {
      expect(reviewer.aiScanner).toBeDefined();
    });

    it("should validate configuration on init", () => {
      const invalidConfig = { ...mockConfig, projectRoot: "" };
      
      expect(() => new SecurityReviewer(invalidConfig)).toThrow();
    });
  });

  describe("Code Analysis", () => {
    beforeEach(() => {
      mockFs.readFileSync.mockReturnValue(`
        const express = require('express');
        const app = express();
        
        app.get('/user', (req, res) => {
          const userId = req.query.id;
          const query = "SELECT * FROM users WHERE id = " + userId;
          db.query(query, (err, result) => {
            res.json(result);
          });
        });
      `);
    });

    it("should analyze single file for vulnerabilities", async () => {
      const result = await reviewer.analyzeFile("/test/app.js");
      
      expect(result).toBeDefined();
      expect(result.filePath).toBe("/test/app.js");
      expect(result.issues).toBeDefined();
      expect(result.securityScore).toBeGreaterThanOrEqual(0);
      expect(result.securityScore).toBeLessThanOrEqual(100);
    });

    it("should detect SQL injection vulnerabilities", async () => {
      reviewer.aiScanner.analyzeCode.mockResolvedValue({
        vulnerabilities: [
          {
            type: "sql-injection",
            severity: "high",
            line: 6,
            description: "Potential SQL injection vulnerability",
            code: 'const query = "SELECT * FROM users WHERE id = " + userId;',
            recommendation: "Use parameterized queries",
          },
        ],
        patterns: ["sql-concat"],
        confidence: 0.92,
      });

      const result = await reviewer.analyzeFile("/test/app.js");
      
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("sql-injection");
      expect(result.issues[0].severity).toBe("high");
    });

    it("should calculate security scores correctly", async () => {
      reviewer.aiScanner.analyzeCode.mockResolvedValue({
        vulnerabilities: [
          { severity: "critical", type: "hardcoded-secret" },
          { severity: "high", type: "xss" },
          { severity: "medium", type: "insecure-dependency" },
        ],
        patterns: [],
        confidence: 0.9,
      });

      const result = await reviewer.analyzeFile("/test/vulnerable.js");
      
      expect(result.securityScore).toBeLessThan(50);
      expect(result.riskLevel).toBe("high");
    });

    it("should handle parsing errors gracefully", async () => {
      mockFs.readFileSync.mockReturnValue("invalid javascript code {{{");

      const result = await reviewer.analyzeFile("/test/broken.js");
      
      expect(result.issues).toBeDefined();
      expect(result.parseError).toBe(true);
    });
  });

  describe("Project Analysis", () => {
    beforeEach(() => {
      mockFs.readdirSync.mockReturnValue([
        "app.js", "config.js", "routes.js", "package.json"
      ]);
      mockFs.readFileSync.mockReturnValue("const test = 'safe code';");
    });

    it("should analyze entire project", async () => {
      const result = await reviewer.analyzeProject();
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.files).toBeInstanceOf(Array);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
    });

    it("should respect include/exclude patterns", async () => {
      mockFs.readdirSync.mockReturnValue([
        "src/app.js", "node_modules/lib.js", "dist/bundle.js", "tests/test.js"
      ]);

      const result = await reviewer.analyzeProject();
      
      // Should only analyze files matching patterns and not excluded
      expect(result.files.length).toBeLessThan(4);
      expect(result.files.every(f => 
        !f.filePath.includes("node_modules") && 
        !f.filePath.includes("dist")
      )).toBe(true);
    });

    it("should aggregate security metrics", async () => {
      reviewer.aiScanner.analyzeCode.mockImplementation(() => 
        Promise.resolve({
          vulnerabilities: [
            { severity: "high", type: "xss" },
            { severity: "medium", type: "dependency" },
          ],
          patterns: [],
          confidence: 0.9,
        })
      );

      const result = await reviewer.analyzeProject();
      
      expect(result.summary.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(result.summary.highIssues).toBeGreaterThanOrEqual(0);
      expect(result.summary.mediumIssues).toBeGreaterThanOrEqual(0);
      expect(result.summary.lowIssues).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Security Rules", () => {
    it("should apply hardcoded secrets rule", async () => {
      mockFs.readFileSync.mockReturnValue(`
        const apiKey = "sk-1234567890abcdef";
        const password = "admin123";
        const token = process.env.SECRET_TOKEN;
      `);

      reviewer.aiScanner.analyzeCode.mockResolvedValue({
        vulnerabilities: [
          {
            type: "hardcoded-secret",
            severity: "critical",
            line: 2,
            description: "Hardcoded API key detected",
            code: 'const apiKey = "sk-1234567890abcdef";',
          },
        ],
        patterns: ["hardcoded-credentials"],
        confidence: 0.95,
      });

      const result = await reviewer.analyzeFile("/test/secrets.js");
      
      expect(result.issues.some(issue => 
        issue.type === "hardcoded-secret"
      )).toBe(true);
    });

    it("should detect XSS vulnerabilities", async () => {
      mockFs.readFileSync.mockReturnValue(`
        app.get('/search', (req, res) => {
          const query = req.query.q;
          res.send('<h1>Results for: ' + query + '</h1>');
        });
      `);

      reviewer.aiScanner.analyzeCode.mockResolvedValue({
        vulnerabilities: [
          {
            type: "xss",
            severity: "high",
            line: 4,
            description: "Potential XSS vulnerability",
            code: "res.send('<h1>Results for: ' + query + '</h1>');",
          },
        ],
        patterns: ["unsafe-html-output"],
        confidence: 0.88,
      });

      const result = await reviewer.analyzeFile("/test/xss.js");
      
      expect(result.issues.some(issue => 
        issue.type === "xss"
      )).toBe(true);
    });

    it("should check dependency security", async () => {
      mockFs.readFileSync.mockReturnValue(`{
        "dependencies": {
          "express": "^3.0.0",
          "lodash": "^3.10.1",
          "moment": "^2.24.0"
        }
      }`);

      reviewer.aiScanner.analyzeCode.mockResolvedValue({
        vulnerabilities: [
          {
            type: "insecure-dependency",
            severity: "medium",
            description: "Outdated dependency with known vulnerabilities",
            dependency: "express@3.0.0",
          },
        ],
        patterns: ["vulnerable-dependencies"],
        confidence: 0.9,
      });

      const result = await reviewer.analyzeFile("/test/package.json");
      
      expect(result.issues.some(issue => 
        issue.type === "insecure-dependency"
      )).toBe(true);
    });
  });

  describe("Risk Assessment", () => {
    it("should assess overall project risk", async () => {
      const mockFiles = [
        { filePath: "/test/app.js", securityScore: 85, issues: [] },
        { filePath: "/test/auth.js", securityScore: 60, issues: [
          { severity: "high", type: "auth-bypass" }
        ]},
        { filePath: "/test/db.js", securityScore: 40, issues: [
          { severity: "critical", type: "sql-injection" }
        ]},
      ];

      const risk = await reviewer.assessProjectRisk(mockFiles);
      
      expect(risk).toBeDefined();
      expect(risk.overallRisk).toBeDefined();
      expect(risk.riskFactors).toBeInstanceOf(Array);
      expect(risk.recommendations).toBeInstanceOf(Array);
      expect(risk.priorityAreas).toBeInstanceOf(Array);
    });

    it("should identify high-risk files", async () => {
      const mockFiles = [
        { filePath: "/test/safe.js", securityScore: 95, issues: [] },
        { filePath: "/test/risky.js", securityScore: 20, issues: [
          { severity: "critical", type: "code-injection" }
        ]},
      ];

      const risk = await reviewer.assessProjectRisk(mockFiles);
      
      expect(risk.highRiskFiles).toContain("/test/risky.js");
      expect(risk.highRiskFiles).not.toContain("/test/safe.js");
    });

    it("should calculate risk scores based on vulnerability severity", async () => {
      const criticalVulns = [
        { severity: "critical", type: "rce" },
        { severity: "critical", type: "sql-injection" },
      ];
      
      const mediumVulns = [
        { severity: "medium", type: "info-disclosure" },
      ];

      const criticalRisk = await reviewer.calculateRiskScore(criticalVulns);
      const mediumRisk = await reviewer.calculateRiskScore(mediumVulns);
      
      expect(criticalRisk).toBeGreaterThan(mediumRisk);
      expect(criticalRisk).toBeGreaterThan(0.8);
      expect(mediumRisk).toBeLessThan(0.5);
    });
  });

  describe("Reporting", () => {
    it("should generate comprehensive security report", async () => {
      const report = await reviewer.generateReport();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it("should include executive summary", async () => {
      const report = await reviewer.generateReport();
      
      expect(report.summary.totalFiles).toBeGreaterThanOrEqual(0);
      expect(report.summary.totalIssues).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.riskLevel).toBeDefined();
    });

    it("should provide actionable recommendations", async () => {
      reviewer.aiScanner.analyzeCode.mockResolvedValue({
        vulnerabilities: [
          {
            type: "sql-injection",
            severity: "high",
            recommendation: "Use parameterized queries instead of string concatenation",
          },
        ],
        patterns: [],
        confidence: 0.9,
      });

      const report = await reviewer.generateReport();
      
      expect(report.recommendations).toHaveLength(1);
      expect(report.recommendations[0]).toContain("parameterized queries");
    });

    it("should format report for different outputs", async () => {
      const jsonReport = await reviewer.generateReport("json");
      const htmlReport = await reviewer.generateReport("html");
      const markdownReport = await reviewer.generateReport("markdown");
      
      expect(typeof jsonReport).toBe("object");
      expect(typeof htmlReport).toBe("string");
      expect(typeof markdownReport).toBe("string");
      expect(htmlReport).toContain("<html>");
      expect(markdownReport).toContain("#");
    });
  });

  describe("Configuration Management", () => {
    it("should allow runtime rule configuration", () => {
      const newRules = {
        "custom-security-rule": { 
          enabled: true, 
          severity: "high",
          pattern: /dangerous-function\(/g,
        },
      };

      reviewer.updateSecurityRules(newRules);
      
      expect(reviewer.config.securityRules["custom-security-rule"]).toBeDefined();
    });

    it("should validate rule configurations", () => {
      const invalidRule = {
        "invalid-rule": { enabled: "yes", severity: "unknown" },
      };

      expect(() => reviewer.updateSecurityRules(invalidRule)).toThrow();
    });

    it("should support rule disabling", () => {
      reviewer.disableRule("no-hardcoded-secrets");
      
      expect(reviewer.config.securityRules["no-hardcoded-secrets"].enabled).toBe(false);
    });
  });

  describe("Performance", () => {
    it("should analyze files within reasonable time", async () => {
      const startTime = Date.now();
      await reviewer.analyzeFile("/test/app.js");
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it("should handle large files efficiently", async () => {
      const largeCode = "const x = 1;\n".repeat(10000);
      mockFs.readFileSync.mockReturnValue(largeCode);

      const startTime = Date.now();
      await reviewer.analyzeFile("/test/large.js");
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should handle large files
    });

    it("should support parallel analysis", async () => {
      const files = ["/test/app1.js", "/test/app2.js", "/test/app3.js"];
      
      const startTime = Date.now();
      const results = await reviewer.analyzeFilesInParallel(files);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(duration).toBeLessThan(3000); // Parallel should be faster
    });
  });

  describe("Error Handling", () => {
    it("should handle missing files gracefully", async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await reviewer.analyzeFile("/test/missing.js");
      
      expect(result.error).toBeDefined();
      expect(result.error).toContain("not found");
    });

    it("should recover from AI scanner failures", async () => {
      reviewer.aiScanner.analyzeCode.mockRejectedValue(
        new Error("AI service unavailable")
      );

      const result = await reviewer.analyzeFile("/test/app.js");
      
      expect(result).toBeDefined();
      expect(result.error).toContain("AI service unavailable");
      expect(result.fallbackAnalysis).toBe(true);
    });

    it("should handle malformed code gracefully", async () => {
      mockFs.readFileSync.mockReturnValue("invalid { code } structure");

      const result = await reviewer.analyzeFile("/test/malformed.js");
      
      expect(result.parseError).toBe(true);
      expect(result.issues).toBeDefined(); // Should still provide some analysis
    });

    it("should timeout on hanging analysis", async () => {
      reviewer.aiScanner.analyzeCode.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const startTime = Date.now();
      const result = await reviewer.analyzeFile("/test/slow.js", { timeout: 1000 });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(2000);
      expect(result.timeout).toBe(true);
    });
  });

  describe("Integration", () => {
    it("should integrate with CI/CD pipelines", async () => {
      const ciReport = await reviewer.generateCIReport({
        format: "junit",
        exitOnFailure: false,
        includeMetrics: true,
      });
      
      expect(ciReport).toBeDefined();
      expect(ciReport).toContain("<testsuite");
      expect(ciReport).toContain("security-analysis");
    });

    it("should support webhook notifications", async () => {
      const webhookPayload = reviewer.formatWebhookPayload({
        event: "security-scan-complete",
        results: { totalIssues: 5, criticalIssues: 1 },
      });
      
      expect(webhookPayload).toBeDefined();
      expect(webhookPayload.event).toBe("security-scan-complete");
      expect(webhookPayload.results).toBeDefined();
    });

    it("should export results to external systems", async () => {
      const sarif = await reviewer.exportToSARIF();
      const sonar = await reviewer.exportToSonarQube();
      
      expect(sarif).toBeDefined();
      expect(sarif.version).toBe("2.1.0");
      expect(sonar).toBeDefined();
      expect(sonar.issues).toBeInstanceOf(Array);
    });
  });
});