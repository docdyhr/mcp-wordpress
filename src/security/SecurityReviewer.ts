/**
 * AI-Powered Security Code Reviewer
 * Provides intelligent security code review and analysis
 */

import * as fs from "fs/promises";
import * as path from "path";
import { SecurityUtils } from "./SecurityConfig.js";
import { SecurityValidationError } from "./InputValidator.js";
import { LoggerFactory } from "@/utils/logger.js";

interface SecurityReviewRule {
  id: string;
  name: string;
  description: string;
  category: "authentication" | "authorization" | "input-validation" | "crypto" | "session" | "config" | "general";
  severity: "critical" | "high" | "medium" | "low" | "info";
  pattern: RegExp;
  message: string;
  recommendation: string;
  cweId?: string;
  examples: {
    vulnerable: string;
    secure: string;
  };
}

export interface CodeReviewResult {
  reviewId: string;
  timestamp: Date;
  file: string;
  findings: SecurityFinding[];
  summary: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    infoFindings: number;
  };
  overallRating: "secure" | "needs-review" | "vulnerable" | "critical";
  recommendations: string[];
}

interface SecurityFinding {
  id: string;
  rule: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  line: number;
  column: number;
  code: string;
  message: string;
  recommendation: string;
  confidence: number;
  category: string;
}

interface AICodeAnalysis {
  complexity: number;
  securityScore: number;
  patterns: {
    positive: string[];
    negative: string[];
  };
  recommendations: string[];
  riskAssessment: {
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
  };
}

/**
 * Comprehensive security review rules
 */
const SECURITY_REVIEW_RULES: SecurityReviewRule[] = [
  // Authentication Rules
  {
    id: "auth-001",
    name: "Hardcoded Credentials",
    description: "Detects hardcoded passwords, API keys, and secrets",
    category: "authentication",
    severity: "critical",
    pattern: /(password|secret|key|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    message: "Hardcoded credential detected",
    recommendation: "Use environment variables or secure credential storage",
    cweId: "CWE-798",
    examples: {
      vulnerable: `const password = "mysecretpassword123";`,
      secure: `const password = process.env.DB_PASSWORD;`,
    },
  },
  {
    id: "auth-002",
    name: "Weak Password Policy",
    description: "Detects weak password validation",
    category: "authentication",
    severity: "medium",
    pattern: /password.*length.*[<>]\s*[1-7]\b/gi,
    message: "Weak password length requirement",
    recommendation: "Enforce minimum 8-character passwords with complexity requirements",
    cweId: "CWE-521",
    examples: {
      vulnerable: `if (password.length < 6) return false;`,
      secure: `if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/.test(password)) return false;`,
    },
  },
  {
    id: "auth-003",
    name: "JWT Secret Exposure",
    description: "Detects exposed JWT secrets",
    category: "authentication",
    severity: "critical",
    pattern: /jwt.*secret.*[:=].*['"][^'"]+['"]/gi,
    message: "JWT secret should not be hardcoded",
    recommendation: "Store JWT secret in environment variables",
    cweId: "CWE-798",
    examples: {
      vulnerable: `const jwtSecret = "my-jwt-secret-key";`,
      secure: `const jwtSecret = process.env.JWT_SECRET;`,
    },
  },

  // Input Validation Rules
  {
    id: "input-001",
    name: "SQL Injection Risk",
    description: "Detects potential SQL injection vulnerabilities",
    category: "input-validation",
    severity: "critical",
    pattern: /(SELECT|INSERT|UPDATE|DELETE).*?[\+].*?(WHERE|FROM|INTO)/gi,
    message: "Potential SQL injection vulnerability",
    recommendation: "Use parameterized queries or prepared statements",
    cweId: "CWE-89",
    examples: {
      vulnerable: `query = "SELECT * FROM users WHERE id = " + userId;`,
      secure: `query = "SELECT * FROM users WHERE id = ?"; db.query(query, [userId]);`,
    },
  },
  {
    id: "input-002",
    name: "XSS Vulnerability",
    description: "Detects potential XSS vulnerabilities",
    category: "input-validation",
    severity: "high",
    pattern: /innerHTML\s*=\s*[^;]+userInput/gi,
    message: "Potential XSS vulnerability through innerHTML",
    recommendation: "Use textContent or sanitize input before setting innerHTML",
    cweId: "CWE-79",
    examples: {
      vulnerable: `element.innerHTML = userInput;`,
      secure: `element.textContent = userInput; // or sanitize userInput`,
    },
  },
  {
    id: "input-003",
    name: "Command Injection",
    description: "Detects potential command injection vulnerabilities",
    category: "input-validation",
    severity: "critical",
    pattern: /exec\(.*?[\+].*?\)/gi,
    message: "Potential command injection vulnerability",
    recommendation: "Validate input and use safe APIs",
    cweId: "CWE-78",
    examples: {
      vulnerable: `exec("ls " + userInput);`,
      secure: `execFile("ls", [userInput]);`,
    },
  },

  // Authorization Rules
  {
    id: "authz-001",
    name: "Missing Authorization Check",
    description: "Detects endpoints without authorization checks",
    category: "authorization",
    severity: "high",
    pattern: /app\.(get|post|put|delete)\(['"][^'"]*['"],\s*(?!.*auth|.*login)[^)]*\)/gi,
    message: "Endpoint may be missing authorization check",
    recommendation: "Add authorization middleware to protected endpoints",
    cweId: "CWE-862",
    examples: {
      vulnerable: `app.get("/admin/users", (req, res) => { ... });`,
      secure: `app.get("/admin/users", authMiddleware, (req, res) => { ... });`,
    },
  },
  {
    id: "authz-002",
    name: "Privilege Escalation Risk",
    description: "Detects potential privilege escalation",
    category: "authorization",
    severity: "high",
    pattern: /role\s*=\s*['"]admin['"]|isAdmin\s*=\s*true/gi,
    message: "Potential privilege escalation through role assignment",
    recommendation: "Validate user permissions before role assignment",
    cweId: "CWE-269",
    examples: {
      vulnerable: `user.role = "admin";`,
      secure: `if (currentUser.canAssignRole("admin")) user.role = "admin";`,
    },
  },

  // Cryptography Rules
  {
    id: "crypto-001",
    name: "Weak Encryption Algorithm",
    description: "Detects use of weak encryption algorithms",
    category: "crypto",
    severity: "high",
    pattern: /(md5|sha1|des|rc4|3des)/gi,
    message: "Weak cryptographic algorithm detected",
    recommendation: "Use strong algorithms like AES-256, SHA-256, or bcrypt",
    cweId: "CWE-327",
    examples: {
      vulnerable: `const hash = crypto.createHash("md5");`,
      secure: `const hash = crypto.createHash("sha256");`,
    },
  },
  {
    id: "crypto-002",
    name: "Hardcoded Encryption Key",
    description: "Detects hardcoded encryption keys",
    category: "crypto",
    severity: "critical",
    pattern: /encrypt.*key.*[:=].*['"][^'"]{16,}['"]/gi,
    message: "Hardcoded encryption key detected",
    recommendation: "Generate keys securely and store in environment variables",
    cweId: "CWE-798",
    examples: {
      vulnerable: `const encryptionKey = "1234567890abcdef";`,
      secure: `const encryptionKey = process.env.ENCRYPTION_KEY;`,
    },
  },

  // Session Management Rules
  {
    id: "session-001",
    name: "Insecure Session Configuration",
    description: "Detects insecure session settings",
    category: "session",
    severity: "medium",
    pattern: /session.*secure\s*:\s*false|httpOnly\s*:\s*false/gi,
    message: "Insecure session configuration",
    recommendation: "Enable secure and httpOnly flags for sessions",
    cweId: "CWE-614",
    examples: {
      vulnerable: `session({ secure: false, httpOnly: false })`,
      secure: `session({ secure: true, httpOnly: true })`,
    },
  },
  {
    id: "session-002",
    name: "Session Fixation Risk",
    description: "Detects potential session fixation vulnerabilities",
    category: "session",
    severity: "medium",
    pattern: /login.*(?!regenerate)/gi,
    message: "Login may not regenerate session ID",
    recommendation: "Regenerate session ID after successful login",
    cweId: "CWE-384",
    examples: {
      vulnerable: `// Login without session regeneration`,
      secure: `req.session.regenerate(() => { /* login success */ });`,
    },
  },

  // Configuration Rules
  {
    id: "config-001",
    name: "Debug Mode in Production",
    description: "Detects debug mode enabled",
    category: "config",
    severity: "medium",
    pattern: /debug\s*[:=]\s*true|DEBUG\s*=\s*['"]?true['"]?/gi,
    message: "Debug mode may be enabled in production",
    recommendation: "Disable debug mode in production environments",
    cweId: "CWE-489",
    examples: {
      vulnerable: `const debug = true;`,
      secure: `const debug = process.env.NODE_ENV !== 'production';`,
    },
  },
  {
    id: "config-002",
    name: "HTTPS Disabled",
    description: "Detects HTTP instead of HTTPS",
    category: "config",
    severity: "medium",
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
    message: "HTTP URL detected in production code",
    recommendation: "Use HTTPS for all external communications",
    cweId: "CWE-319",
    examples: {
      vulnerable: `const apiUrl = "http://api.example.com";`,
      secure: `const apiUrl = "https://api.example.com";`,
    },
  },

  // General Security Rules
  {
    id: "general-001",
    name: "Error Information Disclosure",
    description: "Detects potential information disclosure through errors",
    category: "general",
    severity: "low",
    pattern: /throw.*error.*stack|console\.error.*stack/gi,
    message: "Error may disclose sensitive information",
    recommendation: "Log detailed errors securely, return generic errors to users",
    cweId: "CWE-209",
    examples: {
      vulnerable: `throw new Error(err.stack);`,
      secure: `logger.error(err.stack); throw new Error("An error occurred");`,
    },
  },
  {
    id: "general-002",
    name: "Unsafe Random Generation",
    description: "Detects use of unsafe random number generation",
    category: "general",
    severity: "medium",
    pattern: /Math\.random\(\)/gi,
    message: "Math.random() is not cryptographically secure",
    recommendation: "Use crypto.randomBytes() for security-sensitive random generation",
    cweId: "CWE-338",
    examples: {
      vulnerable: `const token = Math.random().toString(36);`,
      secure: `const token = crypto.randomBytes(32).toString('hex');`,
    },
  },
];

/**
 * AI-Powered Security Code Reviewer
 */
export class SecurityReviewer {
  private reviewHistory: CodeReviewResult[] = [];

  /**
   * Perform comprehensive security review of a file
   */
  async reviewFile(
    filePath: string,
    options: {
      rules?: string[];
      excludeRules?: string[];
      aiAnalysis?: boolean;
    } = {},
  ): Promise<CodeReviewResult> {
    const reviewId = SecurityUtils.generateSecureToken(16);
    const logger = LoggerFactory.security();
    logger.info("Reviewing file", { filePath, reviewId });

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      // Apply security rules
      const findings = await this.applySecurityRules(content, lines, options);

      // Perform AI analysis if requested
      let aiAnalysis: AICodeAnalysis | undefined;
      if (options.aiAnalysis) {
        aiAnalysis = await this.performAIAnalysis(content, findings);
      }

      // Generate summary
      const summary = this.generateSummary(findings);
      const overallRating = this.calculateOverallRating(summary);
      const recommendations = this.generateRecommendations(findings, aiAnalysis);

      const result: CodeReviewResult = {
        reviewId,
        timestamp: new Date(),
        file: filePath,
        findings,
        summary,
        overallRating,
        recommendations,
      };

      this.reviewHistory.push(result);
      logger.info("Review completed", { filePath, findingsCount: findings.length, reviewId });

      return result;
    } catch (_error) {
      logger.error("Review failed", {
        filePath,
        reviewId,
        _error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new SecurityValidationError("Security review failed", [{ message: String(_error) }]);
    }
  }

  /**
   * Review multiple files
   */
  async reviewDirectory(
    dirPath: string,
    options: {
      recursive?: boolean;
      filePattern?: RegExp;
      rules?: string[];
      excludeRules?: string[];
      aiAnalysis?: boolean;
    } = {},
  ): Promise<CodeReviewResult[]> {
    const logger = LoggerFactory.security();
    logger.info("Reviewing directory", { dirPath });

    const results: CodeReviewResult[] = [];
    const filePattern = options.filePattern || /\.(ts|js|jsx|tsx)$/;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && options.recursive && !entry.name.startsWith(".")) {
          const subResults = await this.reviewDirectory(fullPath, options);
          results.push(...subResults);
        } else if (entry.isFile() && filePattern.test(entry.name)) {
          const result = await this.reviewFile(fullPath, options);
          results.push(result);
        }
      }

      return results;
    } catch (_error) {
      logger.error("Directory review failed", {
        dirPath,
        _error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new SecurityValidationError("Directory review failed", [{ message: String(_error) }]);
    }
  }

  /**
   * Apply security rules to code content
   */
  private async applySecurityRules(
    content: string,
    lines: string[],
    options: {
      rules?: string[];
      excludeRules?: string[];
    },
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const applicableRules = this.getApplicableRules(options);

    for (const rule of applicableRules) {
      const matches = Array.from(content.matchAll(rule.pattern));

      for (const match of matches) {
        if (match.index !== undefined) {
          const lineNumber = this.getLineNumber(content, match.index);
          const columnNumber = this.getColumnNumber(content, match.index);

          findings.push({
            id: `${rule.id}-${Date.now()}-${findings.length}`,
            rule: rule.id,
            severity: rule.severity,
            line: lineNumber,
            column: columnNumber,
            code: lines[lineNumber - 1]?.trim() || "",
            message: rule.message,
            recommendation: rule.recommendation,
            confidence: this.calculateConfidence(rule, match[0]),
            category: rule.category,
          });
        }
      }
    }

    return findings;
  }

  /**
   * Get applicable security rules based on options
   */
  private getApplicableRules(options: { rules?: string[]; excludeRules?: string[] }): SecurityReviewRule[] {
    let rules = SECURITY_REVIEW_RULES;

    if (options.rules) {
      rules = rules.filter((rule) => options.rules!.includes(rule.id));
    }

    if (options.excludeRules) {
      rules = rules.filter((rule) => !options.excludeRules!.includes(rule.id));
    }

    return rules;
  }

  /**
   * Perform AI-powered code analysis
   */
  private async performAIAnalysis(content: string, findings: SecurityFinding[]): Promise<AICodeAnalysis> {
    // Simplified AI analysis - in practice this would use machine learning
    const complexity = this.calculateComplexity(content);
    const securityScore = this.calculateSecurityScore(findings, content.length);

    const patterns = this.analyzePatterns(content);
    const recommendations = this.generateAIRecommendations(findings, patterns);
    const riskAssessment = this.assessRisk(findings, complexity);

    return {
      complexity,
      securityScore,
      patterns,
      recommendations,
      riskAssessment,
    };
  }

  /**
   * Calculate code complexity
   */
  private calculateComplexity(content: string): number {
    const complexityFactors = [
      (content.match(/if\s*\(/g) || []).length * 1,
      (content.match(/for\s*\(/g) || []).length * 2,
      (content.match(/while\s*\(/g) || []).length * 2,
      (content.match(/switch\s*\(/g) || []).length * 3,
      (content.match(/try\s*\{/g) || []).length * 2,
      (content.match(/catch\s*\(/g) || []).length * 2,
    ];

    return complexityFactors.reduce((sum, factor) => sum + factor, 0);
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(findings: SecurityFinding[], codeLength: number): number {
    const severityWeights = { critical: 10, high: 7, medium: 4, low: 2, info: 1 };

    const penalty = findings.reduce((sum, finding) => {
      return sum + severityWeights[finding.severity];
    }, 0);

    const normalizedPenalty = penalty / (codeLength / 1000); // Normalize by code size
    return Math.max(0, 100 - normalizedPenalty);
  }

  /**
   * Analyze code patterns
   */
  private analyzePatterns(content: string): { positive: string[]; negative: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];

    // Positive patterns
    if (/process\.env\./g.test(content)) positive.push("Uses environment variables");
    if (/try\s*\{[\s\S]*catch/g.test(content)) positive.push("Implements error handling");
    if (/crypto\.randomBytes/g.test(content)) positive.push("Uses secure random generation");
    if (/bcrypt/g.test(content)) positive.push("Uses secure password hashing");
    if (/https:\/\//g.test(content)) positive.push("Uses HTTPS URLs");

    // Negative patterns
    if (/eval\s*\(/g.test(content)) negative.push("Uses dangerous eval() function");
    if (/innerHTML.*\+/g.test(content)) negative.push("Potential XSS through innerHTML concatenation");
    if (/password.*=.*['"][^'"]{1,7}['"]/g.test(content)) negative.push("Weak passwords detected");
    if (/http:\/\/(?!localhost)/g.test(content)) negative.push("Uses insecure HTTP URLs");

    return { positive, negative };
  }

  /**
   * Generate AI recommendations
   */
  private generateAIRecommendations(
    findings: SecurityFinding[],
    patterns: { positive: string[]; negative: string[] },
  ): string[] {
    const recommendations: string[] = [];

    // High-level recommendations based on findings
    const criticalFindings = findings.filter((f) => f.severity === "critical");
    if (criticalFindings.length > 0) {
      recommendations.push("Address critical security vulnerabilities immediately");
    }

    const authFindings = findings.filter((f) => f.category === "authentication");
    if (authFindings.length > 2) {
      recommendations.push("Review and strengthen authentication mechanisms");
    }

    const inputFindings = findings.filter((f) => f.category === "input-validation");
    if (inputFindings.length > 0) {
      recommendations.push("Implement comprehensive input validation and sanitization");
    }

    // Recommendations based on patterns
    if (patterns.negative.length > patterns.positive.length) {
      recommendations.push("Consider refactoring to follow security best practices");
    }

    if (patterns.negative.includes("Uses dangerous eval() function")) {
      recommendations.push("Replace eval() with safer alternatives like JSON.parse()");
    }

    return recommendations;
  }

  /**
   * Assess overall risk
   */
  private assessRisk(
    findings: SecurityFinding[],
    complexity: number,
  ): { level: "low" | "medium" | "high" | "critical"; factors: string[] } {
    const factors: string[] = [];
    let riskScore = 0;

    // Risk based on findings
    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const highCount = findings.filter((f) => f.severity === "high").length;

    riskScore += criticalCount * 10 + highCount * 5;

    if (criticalCount > 0) factors.push(`${criticalCount} critical vulnerabilities`);
    if (highCount > 0) factors.push(`${highCount} high-severity vulnerabilities`);

    // Risk based on complexity
    if (complexity > 50) {
      riskScore += 10;
      factors.push("High code complexity");
    }

    // Risk based on categories
    const authVulns = findings.filter((f) => f.category === "authentication").length;
    if (authVulns > 0) {
      riskScore += authVulns * 3;
      factors.push("Authentication vulnerabilities");
    }

    // Determine risk level
    let level: "low" | "medium" | "high" | "critical";
    if (riskScore >= 30) level = "critical";
    else if (riskScore >= 20) level = "high";
    else if (riskScore >= 10) level = "medium";
    else level = "low";

    return { level, factors };
  }

  /**
   * Calculate confidence score for a finding
   */
  private calculateConfidence(rule: SecurityReviewRule, match: string): number {
    // Base confidence varies by rule type
    let confidence = 0.7;

    // Adjust based on match characteristics
    if (match.length > 50) confidence += 0.1; // Longer matches are more likely to be intentional
    if (/\w{20,}/.test(match)) confidence += 0.1; // Long strings suggest real credentials
    if (rule.category === "authentication") confidence += 0.1; // Auth issues are commonly overlooked

    return Math.min(1.0, confidence);
  }

  /**
   * Generate summary of findings
   */
  private generateSummary(findings: SecurityFinding[]): {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    infoFindings: number;
  } {
    return {
      totalFindings: findings.length,
      criticalFindings: findings.filter((f) => f.severity === "critical").length,
      highFindings: findings.filter((f) => f.severity === "high").length,
      mediumFindings: findings.filter((f) => f.severity === "medium").length,
      lowFindings: findings.filter((f) => f.severity === "low").length,
      infoFindings: findings.filter((f) => f.severity === "info").length,
    };
  }

  /**
   * Calculate overall security rating
   */
  private calculateOverallRating(summary: {
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
  }): "secure" | "needs-review" | "vulnerable" | "critical" {
    if (summary.criticalFindings > 0) return "critical";
    if (summary.highFindings > 2) return "vulnerable";
    if (summary.highFindings > 0 || summary.mediumFindings > 3) return "needs-review";
    return "secure";
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(findings: SecurityFinding[], aiAnalysis?: AICodeAnalysis): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on severity
    const criticalFindings = findings.filter((f) => f.severity === "critical");
    if (criticalFindings.length > 0) {
      recommendations.push("Immediately address critical security vulnerabilities");
      recommendations.push("Review credential management and move secrets to environment variables");
    }

    // Category-specific recommendations
    const categories = [...new Set(findings.map((f) => f.category))];

    if (categories.includes("authentication")) {
      recommendations.push("Strengthen authentication mechanisms and credential handling");
    }

    if (categories.includes("input-validation")) {
      recommendations.push("Implement comprehensive input validation and output encoding");
    }

    if (categories.includes("crypto")) {
      recommendations.push("Update to use strong cryptographic algorithms and secure key management");
    }

    // Add AI recommendations if available
    if (aiAnalysis) {
      recommendations.push(...aiAnalysis.recommendations);
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split("\n").length;
  }

  /**
   * Get column number from character index
   */
  private getColumnNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split("\n");
    return lines[lines.length - 1].length + 1;
  }

  /**
   * Get review history
   */
  getReviewHistory(): CodeReviewResult[] {
    return [...this.reviewHistory];
  }

  /**
   * Get security rules
   */
  getSecurityRules(): SecurityReviewRule[] {
    return [...SECURITY_REVIEW_RULES];
  }

  /**
   * Add custom security rule
   */
  addCustomRule(rule: SecurityReviewRule): void {
    SECURITY_REVIEW_RULES.push(rule);
  }

  /**
   * Remove security rule
   */
  removeRule(ruleId: string): boolean {
    const index = SECURITY_REVIEW_RULES.findIndex((rule) => rule.id === ruleId);
    if (index !== -1) {
      SECURITY_REVIEW_RULES.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Generate security report
   */
  generateSecurityReport(results: CodeReviewResult[]): {
    summary: {
      filesReviewed: number;
      totalFindings: number;
      criticalFindings: number;
      highFindings: number;
      overallRating: "secure" | "needs-review" | "vulnerable" | "critical";
    };
    topIssues: SecurityFinding[];
    recommendations: string[];
    riskFactors: string[];
  } {
    const summary = {
      filesReviewed: results.length,
      totalFindings: results.reduce((sum, r) => sum + r.findings.length, 0),
      criticalFindings: results.reduce((sum, r) => sum + r.summary.criticalFindings, 0),
      highFindings: results.reduce((sum, r) => sum + r.summary.highFindings, 0),
      overallRating: this.calculateProjectRating(results),
    };

    const allFindings = results.flatMap((r) => r.findings);
    const topIssues = allFindings
      .filter((f) => f.severity === "critical" || f.severity === "high")
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10);

    const recommendations = [...new Set(results.flatMap((r) => r.recommendations))];
    const riskFactors = this.identifyRiskFactors(results);

    return {
      summary,
      topIssues,
      recommendations,
      riskFactors,
    };
  }

  /**
   * Calculate overall project security rating
   */
  private calculateProjectRating(results: CodeReviewResult[]): "secure" | "needs-review" | "vulnerable" | "critical" {
    const criticalCount = results.reduce((sum, r) => sum + r.summary.criticalFindings, 0);
    const highCount = results.reduce((sum, r) => sum + r.summary.highFindings, 0);
    const criticalFiles = results.filter((r) => r.overallRating === "critical").length;

    if (criticalCount > 0 || criticalFiles > 0) return "critical";
    if (highCount > 5 || results.filter((r) => r.overallRating === "vulnerable").length > 2) return "vulnerable";
    if (highCount > 0 || results.filter((r) => r.overallRating === "needs-review").length > 0) return "needs-review";
    return "secure";
  }

  /**
   * Identify project-wide risk factors
   */
  private identifyRiskFactors(results: CodeReviewResult[]): string[] {
    const factors: string[] = [];
    const allFindings = results.flatMap((r) => r.findings);

    const authIssues = allFindings.filter((f) => f.category === "authentication").length;
    if (authIssues > 3) factors.push("Multiple authentication vulnerabilities");

    const cryptoIssues = allFindings.filter((f) => f.category === "crypto").length;
    if (cryptoIssues > 0) factors.push("Cryptographic implementation issues");

    const inputIssues = allFindings.filter((f) => f.category === "input-validation").length;
    if (inputIssues > 5) factors.push("Widespread input validation issues");

    const vulnerableFiles = results.filter(
      (r) => r.overallRating === "vulnerable" || r.overallRating === "critical",
    ).length;
    const totalFiles = results.length;
    if (vulnerableFiles / totalFiles > 0.3) factors.push("High percentage of vulnerable files");

    return factors;
  }
}
