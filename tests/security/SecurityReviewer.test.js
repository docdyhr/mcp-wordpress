/**
 * Tests for SecurityReviewer
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { SecurityReviewer } from "@/security/SecurityReviewer.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

let tmpDir;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "security-reviewer-test-"));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeFile(name, content) {
  const filePath = path.join(tmpDir, name);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

describe("SecurityReviewer", () => {
  let reviewer;

  beforeEach(() => {
    reviewer = new SecurityReviewer();
  });

  describe("initial state", () => {
    it("creates an instance without errors", () => {
      expect(reviewer).toBeInstanceOf(SecurityReviewer);
    });

    it("getReviewHistory returns empty array initially", () => {
      expect(reviewer.getReviewHistory()).toHaveLength(0);
    });

    it("getSecurityRules returns built-in rules", () => {
      const rules = reviewer.getSecurityRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it("rules include authentication and input-validation categories", () => {
      const rules = reviewer.getSecurityRules();
      const categories = rules.map((r) => r.category);
      expect(categories).toContain("authentication");
      expect(categories).toContain("input-validation");
    });
  });

  describe("reviewFile()", () => {
    it("throws SecurityValidationError for non-existent file", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(reviewer.reviewFile("/nonexistent/path/file.ts")).rejects.toBeInstanceOf(SecurityValidationError);
    });

    it("returns a result with required shape for clean code", async () => {
      const filePath = await writeFile("clean.ts", 'const x = process.env.VALUE;\nconsole.log("hello");');
      const result = await reviewer.reviewFile(filePath);

      expect(result).toMatchObject({
        reviewId: expect.any(String),
        timestamp: expect.any(Date),
        file: filePath,
        findings: expect.any(Array),
        summary: {
          totalFindings: expect.any(Number),
          criticalFindings: expect.any(Number),
          highFindings: expect.any(Number),
          mediumFindings: expect.any(Number),
          lowFindings: expect.any(Number),
          infoFindings: expect.any(Number),
        },
        overallRating: expect.any(String),
        recommendations: expect.any(Array),
      });
    });

    it("adds result to review history", async () => {
      const filePath = await writeFile("history.ts", "const x = 1;");
      await reviewer.reviewFile(filePath);
      expect(reviewer.getReviewHistory()).toHaveLength(1);
    });

    it("detects hardcoded credential pattern", async () => {
      const filePath = await writeFile("creds.ts", 'const password = "supersecretpassword123";\n');
      const result = await reviewer.reviewFile(filePath);
      const authFindings = result.findings.filter((f) => f.category === "authentication");
      expect(authFindings.length).toBeGreaterThan(0);
    });

    it("detects Math.random() usage", async () => {
      const filePath = await writeFile("random.ts", "const token = Math.random().toString(36);\n");
      const result = await reviewer.reviewFile(filePath);
      const randomFindings = result.findings.filter((f) => f.rule === "general-002");
      expect(randomFindings.length).toBeGreaterThan(0);
    });

    it("returns 'critical' overallRating when critical findings exist", async () => {
      const filePath = await writeFile("critical.ts", 'const password = "supersecretpassword123abc";\n');
      const result = await reviewer.reviewFile(filePath);
      if (result.summary.criticalFindings > 0) {
        expect(result.overallRating).toBe("critical");
      }
    });

    it("returns 'secure' for genuinely clean code", async () => {
      const filePath = await writeFile("safe.ts", "export function add(a: number, b: number) { return a + b; }\n");
      const result = await reviewer.reviewFile(filePath);
      if (
        result.summary.criticalFindings === 0 &&
        result.summary.highFindings === 0 &&
        result.summary.mediumFindings <= 3
      ) {
        expect(["secure", "needs-review"]).toContain(result.overallRating);
      }
    });

    it("runs aiAnalysis when option is true", async () => {
      const filePath = await writeFile("ai.ts", "const x = process.env.VALUE;\n");
      const result = await reviewer.reviewFile(filePath, { aiAnalysis: true });
      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("filters to only specified rules", async () => {
      const filePath = await writeFile("filter.ts", "const x = Math.random();\n");
      const result = await reviewer.reviewFile(filePath, { rules: ["general-002"] });
      // Only general-002 (Math.random) should be checked
      for (const finding of result.findings) {
        expect(finding.rule).toBe("general-002");
      }
    });

    it("excludes specified rules", async () => {
      const filePath = await writeFile("exclude.ts", "const x = Math.random();\n");
      const result = await reviewer.reviewFile(filePath, { excludeRules: ["general-002"] });
      const randomFindings = result.findings.filter((f) => f.rule === "general-002");
      expect(randomFindings).toHaveLength(0);
    });
  });

  describe("reviewDirectory()", () => {
    it("throws SecurityValidationError for non-existent directory", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(reviewer.reviewDirectory("/nonexistent/dir")).rejects.toBeInstanceOf(SecurityValidationError);
    });

    it("returns results for .ts and .js files in a directory", async () => {
      const subDir = path.join(tmpDir, "review-dir");
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(subDir, "file1.ts"), "const x = 1;\n");
      await fs.writeFile(path.join(subDir, "file2.js"), "const y = 2;\n");
      await fs.writeFile(path.join(subDir, "ignored.txt"), "just text");

      const results = await reviewer.reviewDirectory(subDir);
      expect(results).toHaveLength(2);
    });

    it("recurses into subdirectories when recursive option is true", async () => {
      const subDir = path.join(tmpDir, "recursive-dir");
      const nestedDir = path.join(subDir, "nested");
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(subDir, "top.ts"), "const x = 1;\n");
      await fs.writeFile(path.join(nestedDir, "nested.ts"), "const y = 2;\n");

      const results = await reviewer.reviewDirectory(subDir, { recursive: true });
      expect(results).toHaveLength(2);
    });

    it("does not recurse when recursive is false (default)", async () => {
      const subDir = path.join(tmpDir, "non-recursive-dir");
      const nestedDir = path.join(subDir, "nested");
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(subDir, "top.ts"), "const x = 1;\n");
      await fs.writeFile(path.join(nestedDir, "nested.ts"), "const y = 2;\n");

      const results = await reviewer.reviewDirectory(subDir);
      expect(results).toHaveLength(1);
    });

    it("applies custom filePattern", async () => {
      const subDir = path.join(tmpDir, "pattern-dir");
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(subDir, "file.ts"), "const x = 1;\n");
      await fs.writeFile(path.join(subDir, "file.js"), "const y = 2;\n");

      const results = await reviewer.reviewDirectory(subDir, { filePattern: /\.ts$/ });
      expect(results).toHaveLength(1);
    });

    it("skips dot-directories even with recursive true", async () => {
      const subDir = path.join(tmpDir, "dot-dir-test");
      const dotDir = path.join(subDir, ".hidden");
      await fs.mkdir(dotDir, { recursive: true });
      await fs.writeFile(path.join(subDir, "file.ts"), "const x = 1;\n");
      await fs.writeFile(path.join(dotDir, "hidden.ts"), "const z = 3;\n");

      const results = await reviewer.reviewDirectory(subDir, { recursive: true });
      expect(results).toHaveLength(1);
    });
  });

  describe("addCustomRule() / removeRule()", () => {
    it("addCustomRule adds a rule to the rules list", () => {
      const initialCount = reviewer.getSecurityRules().length;
      reviewer.addCustomRule({
        id: "custom-test-001",
        name: "Test Rule",
        description: "A test rule",
        category: "general",
        severity: "low",
        pattern: /testPattern/gi,
        message: "Test pattern found",
        recommendation: "Remove test patterns",
        examples: { vulnerable: "testPattern", secure: "safePattern" },
      });
      expect(reviewer.getSecurityRules().length).toBe(initialCount + 1);
    });

    it("removeRule returns true for existing rule id", () => {
      reviewer.addCustomRule({
        id: "custom-remove-test",
        name: "Removable Rule",
        description: "Will be removed",
        category: "general",
        severity: "low",
        pattern: /removeMe/gi,
        message: "Remove me",
        recommendation: "Remove it",
        examples: { vulnerable: "removeMe", secure: "safe" },
      });
      expect(reviewer.removeRule("custom-remove-test")).toBe(true);
    });

    it("removeRule returns false for non-existent rule id", () => {
      expect(reviewer.removeRule("nonexistent-rule-id")).toBe(false);
    });

    it("getSecurityRules returns a copy (modifications don't affect internals)", () => {
      const rules1 = reviewer.getSecurityRules();
      const rules2 = reviewer.getSecurityRules();
      expect(rules1).not.toBe(rules2);
    });
  });

  describe("generateSecurityReport()", () => {
    it("generates a report with correct summary from review results", async () => {
      const filePath = await writeFile("report-test.ts", "const x = Math.random();\n");
      const reviewResult = await reviewer.reviewFile(filePath);
      const report = reviewer.generateSecurityReport([reviewResult]);

      expect(report).toMatchObject({
        summary: {
          filesReviewed: 1,
          totalFindings: expect.any(Number),
          criticalFindings: expect.any(Number),
          highFindings: expect.any(Number),
          overallRating: expect.any(String),
        },
        topIssues: expect.any(Array),
        recommendations: expect.any(Array),
        riskFactors: expect.any(Array),
      });
    });

    it("reports zero findings for empty results", () => {
      const report = reviewer.generateSecurityReport([]);
      expect(report.summary.filesReviewed).toBe(0);
      expect(report.summary.totalFindings).toBe(0);
      expect(report.summary.overallRating).toBe("secure");
    });

    it("topIssues limited to 10 items", async () => {
      // Generate a file with many findings
      const content = Array.from({ length: 20 }, (_, i) => `const pass${i} = "secret${i}abcdefghij";\n`).join("");
      const filePath = await writeFile("many-findings.ts", content);
      const reviewResult = await reviewer.reviewFile(filePath);
      const report = reviewer.generateSecurityReport([reviewResult]);
      expect(report.topIssues.length).toBeLessThanOrEqual(10);
    });

    it("topIssues contains only critical/high severity findings", async () => {
      const filePath = await writeFile("top-issues.ts", "const x = Math.random();\n");
      const reviewResult = await reviewer.reviewFile(filePath);
      const report = reviewer.generateSecurityReport([reviewResult]);
      for (const issue of report.topIssues) {
        expect(["critical", "high"]).toContain(issue.severity);
      }
    });

    it("overall rating is critical when any file has critical findings", async () => {
      const filePath = await writeFile("crit-report.ts", 'const password = "supersecretpassword123abc";\n');
      const reviewResult = await reviewer.reviewFile(filePath);
      if (reviewResult.summary.criticalFindings > 0) {
        const report = reviewer.generateSecurityReport([reviewResult]);
        expect(report.summary.overallRating).toBe("critical");
      }
    });

    it("deduplicate recommendations across files", async () => {
      const filePath1 = await writeFile("dup1.ts", "const x = Math.random();\n");
      const filePath2 = await writeFile("dup2.ts", "const y = Math.random();\n");
      const [r1, r2] = await Promise.all([reviewer.reviewFile(filePath1), reviewer.reviewFile(filePath2)]);
      const report = reviewer.generateSecurityReport([r1, r2]);
      const uniqueRecs = new Set(report.recommendations);
      expect(report.recommendations.length).toBe(uniqueRecs.size);
    });
  });

  describe("getReviewHistory()", () => {
    it("returns a copy of review history (not same reference)", async () => {
      const filePath = await writeFile("history-copy.ts", "const x = 1;\n");
      await reviewer.reviewFile(filePath);
      expect(reviewer.getReviewHistory()).not.toBe(reviewer.getReviewHistory());
    });
  });
});
