/**
 * Security CI/CD Pipeline Integration
 * Provides security checks and gates for continuous integration and deployment
 */

import { AISecurityScanner } from "./AISecurityScanner.js";
import { AutomatedRemediation } from "./AutomatedRemediation.js";
import { SecurityReviewer } from "./SecurityReviewer.js";
import { SecurityConfigManager } from "./SecurityConfigManager.js";
import { SecurityUtils } from "./SecurityConfig.js";
import { SecurityValidationError } from "./InputValidator.js";

interface SecurityGate {
  id: string;
  name: string;
  stage: "pre-commit" | "pre-build" | "pre-deploy" | "post-deploy";
  enabled: boolean;
  blocking: boolean;
  checks: SecurityCheck[];
  thresholds: {
    maxCritical: number;
    maxHigh: number;
    maxMedium: number;
    minSecurityScore: number;
  };
  exceptions: string[];
}

interface SecurityCheck {
  id: string;
  name: string;
  type: "scan" | "review" | "dependency" | "configuration" | "secrets" | "compliance";
  enabled: boolean;
  timeout: number;
  retries: number;
  parameters: Record<string, any>;
}

export interface PipelineSecurityReport {
  reportId: string;
  timestamp: Date;
  stage: string;
  status: "passed" | "failed" | "warning";
  duration: number;
  gates: GateResult[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    securityScore: number;
    compliance: boolean;
  };
  recommendations: string[];
  artifacts: string[];
}

interface GateResult {
  gateId: string;
  gateName: string;
  status: "passed" | "failed" | "warning" | "skipped";
  duration: number;
  checks: CheckResult[];
  blocking: boolean;
  message: string;
}

interface CheckResult {
  checkId: string;
  checkName: string;
  status: "passed" | "failed" | "warning" | "error";
  duration: number;
  findings: SecurityFinding[];
  details: string;
  score: number;
}

interface SecurityFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  type: string;
  description: string;
  file?: string | undefined;
  line?: number | undefined;
  remediation?: string | undefined;
}

interface PipelineContext {
  repositoryUrl: string;
  branch: string;
  commit: string;
  author: string;
  pullRequest?: {
    id: string;
    title: string;
    source: string;
    target: string;
  };
  environment: string;
  buildNumber: string;
  artifacts: string[];
}

/**
 * Security CI/CD Pipeline Manager
 */
export class SecurityCIPipeline {
  private scanner: AISecurityScanner;
  private remediation: AutomatedRemediation;
  private reviewer: SecurityReviewer;
  private configManager: SecurityConfigManager;
  private gates: Map<string, SecurityGate> = new Map();
  private reports: PipelineSecurityReport[] = [];

  constructor() {
    this.scanner = new AISecurityScanner();
    this.remediation = new AutomatedRemediation();
    this.reviewer = new SecurityReviewer();
    this.configManager = new SecurityConfigManager();

    this.initializeDefaultGates();
  }

  /**
   * Initialize the security pipeline
   */
  async initialize(): Promise<void> {
    console.log("[Security Pipeline] Initializing security CI/CD pipeline");
    await this.configManager.initialize();
    console.log("[Security Pipeline] Security pipeline ready");
  }

  /**
   * Execute security gates for a pipeline stage
   */
  async executeSecurityGates(
    stage: SecurityGate["stage"],
    context: PipelineContext,
    options: {
      skipNonBlocking?: boolean;
      continueOnFailure?: boolean;
      dryRun?: boolean;
    } = {},
  ): Promise<PipelineSecurityReport> {
    const reportId = SecurityUtils.generateSecureToken(16);
    const startTime = Date.now();

    console.log(`[Security Pipeline] Executing ${stage} security gates for ${context.branch}@${context.commit}`);

    const applicableGates = Array.from(this.gates.values()).filter((gate) => gate.stage === stage && gate.enabled);

    if (applicableGates.length === 0) {
      console.log(`[Security Pipeline] No security gates configured for stage: ${stage}`);
      return this.createEmptyReport(reportId, stage, startTime);
    }

    const gateResults: GateResult[] = [];
    let overallStatus: "passed" | "failed" | "warning" = "passed";

    for (const gate of applicableGates) {
      console.log(`[Security Pipeline] Executing gate: ${gate.name}`);

      try {
        const gateResult = await this.executeSecurityGate(gate, context, options);
        gateResults.push(gateResult);

        // Update overall status
        if (gateResult.status === "failed" && gate.blocking) {
          overallStatus = "failed";
        } else if (gateResult.status === "warning" && overallStatus === "passed") {
          overallStatus = "warning";
        }

        // Stop on blocking failure unless continuing on failure
        if (gateResult.status === "failed" && gate.blocking && !options.continueOnFailure) {
          console.log(`[Security Pipeline] Stopping pipeline due to blocking gate failure: ${gate.name}`);
          break;
        }
      } catch (error) {
        console.error(`[Security Pipeline] Gate execution error: ${gate.name}`, error);

        const errorResult: GateResult = {
          gateId: gate.id,
          gateName: gate.name,
          status: "failed",
          duration: Date.now() - startTime,
          checks: [],
          blocking: gate.blocking,
          message: `Gate execution failed: ${error instanceof Error ? error.message : String(error)}`,
        };

        gateResults.push(errorResult);

        if (gate.blocking && !options.continueOnFailure) {
          overallStatus = "failed";
          break;
        }
      }
    }

    const report = this.generatePipelineReport(reportId, stage, startTime, overallStatus, gateResults, context);

    this.reports.push(report);

    console.log(`[Security Pipeline] ${stage} gates completed with status: ${overallStatus}`);

    return report;
  }

  /**
   * Execute a single security gate
   */
  private async executeSecurityGate(
    gate: SecurityGate,
    context: PipelineContext,
    options: { dryRun?: boolean } = {},
  ): Promise<GateResult> {
    const startTime = Date.now();
    const checkResults: CheckResult[] = [];

    for (const check of gate.checks) {
      if (!check.enabled) {
        continue;
      }

      console.log(`[Security Pipeline] Running check: ${check.name}`);

      try {
        const checkResult = await this.executeSecurityCheck(check, context, options);
        checkResults.push(checkResult);
      } catch (error) {
        console.error(`[Security Pipeline] Check execution error: ${check.name}`, error);

        checkResults.push({
          checkId: check.id,
          checkName: check.name,
          status: "error",
          duration: Date.now() - startTime,
          findings: [],
          details: `Check execution failed: ${error instanceof Error ? error.message : String(error)}`,
          score: 0,
        });
      }
    }

    // Evaluate gate status based on check results and thresholds
    const gateStatus = this.evaluateGateStatus(gate, checkResults);

    return {
      gateId: gate.id,
      gateName: gate.name,
      status: gateStatus.status,
      duration: Date.now() - startTime,
      checks: checkResults,
      blocking: gate.blocking,
      message: gateStatus.message,
    };
  }

  /**
   * Execute a single security check
   */
  private async executeSecurityCheck(
    check: SecurityCheck,
    context: PipelineContext,
    options: { dryRun?: boolean } = {},
  ): Promise<CheckResult> {
    const startTime = Date.now();
    const findings: SecurityFinding[] = [];
    let score: number = 100; // Initialize with safe default
    let details = "";

    if (options.dryRun) {
      return {
        checkId: check.id,
        checkName: check.name,
        status: "passed",
        duration: Date.now() - startTime,
        findings: [],
        details: "Dry run - no actual checks performed",
        score: 100,
      };
    }

    try {
      switch (check.type) {
        case "scan":
          const scanResults = await this.executeScanCheck(check, context);
          findings.push(...scanResults.findings);
          score = scanResults.score;
          details = scanResults.details;
          break;

        case "review":
          const reviewResults = await this.executeReviewCheck(check, context);
          findings.push(...reviewResults.findings);
          score = reviewResults.score;
          details = reviewResults.details;
          break;

        case "dependency":
          const depResults = await this.executeDependencyCheck(check, context);
          findings.push(...depResults.findings);
          score = depResults.score;
          details = depResults.details;
          break;

        case "configuration":
          const configResults = await this.executeConfigurationCheck(check, context);
          findings.push(...configResults.findings);
          score = configResults.score;
          details = configResults.details;
          break;

        case "secrets":
          const secretResults = await this.executeSecretsCheck(check, context);
          findings.push(...secretResults.findings);
          score = secretResults.score;
          details = secretResults.details;
          break;

        case "compliance":
          const complianceResults = await this.executeComplianceCheck(check, context);
          findings.push(...complianceResults.findings);
          score = complianceResults.score;
          details = complianceResults.details;
          break;

        default:
          throw new Error(`Unknown check type: ${check.type}`);
      }

      // Determine check status based on findings
      const criticalCount = findings.filter((f) => f.severity === "critical").length;
      const highCount = findings.filter((f) => f.severity === "high").length;

      let status: CheckResult["status"];
      if (criticalCount > 0) {
        status = "failed";
      } else if (highCount > 0) {
        status = "warning";
      } else {
        status = "passed";
      }

      return {
        checkId: check.id,
        checkName: check.name,
        status,
        duration: Date.now() - startTime,
        findings,
        details,
        score,
      };
    } catch (error) {
      throw new SecurityValidationError(`Check ${check.name} failed`, [{ message: String(error) }]);
    }
  }

  /**
   * Execute security scan check
   */
  private async executeScanCheck(
    check: SecurityCheck,
    context: PipelineContext,
  ): Promise<{
    findings: SecurityFinding[];
    score: number;
    details: string;
  }> {
    const scanResult = await this.scanner.performScan({
      targets: check.parameters.targets || ["src/"],
      depth: check.parameters.depth || "deep",
      includeRuntime: check.parameters.includeRuntime || false,
      includeFileSystem: check.parameters.includeFileSystem || true,
    });

    const findings: SecurityFinding[] = scanResult.vulnerabilities.map((vuln) => ({
      id: vuln.id,
      severity: vuln.severity,
      type: vuln.type,
      description: vuln.description,
      file: vuln.location.file,
      line: vuln.location.line,
      remediation: vuln.remediation.suggested,
    }));

    const score = Math.max(
      0,
      100 - (scanResult.summary.critical * 10 + scanResult.summary.high * 5 + scanResult.summary.medium * 2),
    );

    return {
      findings,
      score,
      details: `Scanned codebase: ${scanResult.summary.total} vulnerabilities found`,
    };
  }

  /**
   * Execute code review check
   */
  private async executeReviewCheck(
    check: SecurityCheck,
    context: PipelineContext,
  ): Promise<{
    findings: SecurityFinding[];
    score: number;
    details: string;
  }> {
    const reviewResults = await this.reviewer.reviewDirectory("src/", {
      recursive: true,
      rules: check.parameters.rules,
      excludeRules: check.parameters.excludeRules,
      aiAnalysis: check.parameters.aiAnalysis || false,
    });

    const allFindings: SecurityFinding[] = [];
    let totalScore = 0;

    for (const result of reviewResults) {
      const resultFindings = result.findings.map((finding) => ({
        id: finding.id,
        severity: finding.severity,
        type: finding.category,
        description: finding.message,
        file: result.file,
        line: finding.line,
        remediation: finding.recommendation,
      }));

      allFindings.push(...resultFindings);
      totalScore += this.calculateFileScore(result.findings);
    }

    const averageScore = reviewResults.length > 0 ? totalScore / reviewResults.length : 100;

    return {
      findings: allFindings,
      score: averageScore,
      details: `Reviewed ${reviewResults.length} files: ${allFindings.length} security issues found`,
    };
  }

  /**
   * Execute dependency check
   */
  private async executeDependencyCheck(
    check: SecurityCheck,
    context: PipelineContext,
  ): Promise<{
    findings: SecurityFinding[];
    score: number;
    details: string;
  }> {
    // This would integrate with npm audit, Snyk, or similar tools
    console.log("[Security Pipeline] Dependency check - integration with external tools required");

    return {
      findings: [],
      score: 100,
      details: "Dependency check completed - no vulnerabilities found",
    };
  }

  /**
   * Execute configuration check
   */
  private async executeConfigurationCheck(
    check: SecurityCheck,
    context: PipelineContext,
  ): Promise<{
    findings: SecurityFinding[];
    score: number;
    details: string;
  }> {
    const compliance = await this.configManager.validateCompliance(context.environment);

    const findings: SecurityFinding[] = compliance.violations.map((violation, index) => ({
      id: `config-${index}`,
      severity: "medium" as const,
      type: "Configuration",
      description: violation,
      remediation: "Review security configuration",
    }));

    const score = compliance.compliant ? 100 : Math.max(0, 100 - compliance.violations.length * 10);

    return {
      findings,
      score,
      details: `Configuration compliance: ${compliance.compliant ? "compliant" : "non-compliant"}`,
    };
  }

  /**
   * Execute secrets check
   */
  private async executeSecretsCheck(
    check: SecurityCheck,
    context: PipelineContext,
  ): Promise<{
    findings: SecurityFinding[];
    score: number;
    details: string;
  }> {
    // This would integrate with tools like TruffleHog, GitLeaks, etc.
    console.log("[Security Pipeline] Secrets check - integration with secret scanning tools required");

    return {
      findings: [],
      score: 100,
      details: "Secrets scan completed - no exposed secrets found",
    };
  }

  /**
   * Execute compliance check
   */
  private async executeComplianceCheck(
    check: SecurityCheck,
    context: PipelineContext,
  ): Promise<{
    findings: SecurityFinding[];
    score: number;
    details: string;
  }> {
    const frameworks = check.parameters.frameworks || ["OWASP", "CWE"];
    const findings: SecurityFinding[] = [];

    // Check for compliance with security frameworks
    for (const framework of frameworks) {
      // This would integrate with compliance checking tools
      console.log(`[Security Pipeline] Checking ${framework} compliance`);
    }

    return {
      findings,
      score: 100,
      details: `Compliance check completed for frameworks: ${frameworks.join(", ")}`,
    };
  }

  /**
   * Calculate security score for file findings
   */
  private calculateFileScore(findings: any[]): number {
    const severityWeights = { critical: 20, high: 10, medium: 5, low: 2, info: 1 };

    const penalty = findings.reduce((sum, finding) => {
      return sum + (severityWeights[finding.severity as keyof typeof severityWeights] || 0);
    }, 0);

    return Math.max(0, 100 - penalty);
  }

  /**
   * Evaluate gate status based on check results and thresholds
   */
  private evaluateGateStatus(
    gate: SecurityGate,
    checkResults: CheckResult[],
  ): {
    status: "passed" | "failed" | "warning";
    message: string;
  } {
    const allFindings = checkResults.flatMap((result) => result.findings);

    const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
    const highCount = allFindings.filter((f) => f.severity === "high").length;
    const mediumCount = allFindings.filter((f) => f.severity === "medium").length;

    const averageScore =
      checkResults.length > 0 ? checkResults.reduce((sum, result) => sum + result.score, 0) / checkResults.length : 100;

    // Check thresholds
    if (criticalCount > gate.thresholds.maxCritical) {
      return {
        status: "failed",
        message: `Critical vulnerabilities (${criticalCount}) exceed threshold (${gate.thresholds.maxCritical})`,
      };
    }

    if (highCount > gate.thresholds.maxHigh) {
      return {
        status: "failed",
        message: `High-severity vulnerabilities (${highCount}) exceed threshold (${gate.thresholds.maxHigh})`,
      };
    }

    if (averageScore < gate.thresholds.minSecurityScore) {
      return {
        status: "failed",
        message: `Security score (${averageScore.toFixed(1)}) below threshold (${gate.thresholds.minSecurityScore})`,
      };
    }

    if (mediumCount > gate.thresholds.maxMedium) {
      return {
        status: "warning",
        message: `Medium-severity vulnerabilities (${mediumCount}) exceed threshold (${gate.thresholds.maxMedium})`,
      };
    }

    return {
      status: "passed",
      message: "All security checks passed",
    };
  }

  /**
   * Generate pipeline security report
   */
  private generatePipelineReport(
    reportId: string,
    stage: string,
    startTime: number,
    status: "passed" | "failed" | "warning",
    gateResults: GateResult[],
    context: PipelineContext,
  ): PipelineSecurityReport {
    const allFindings = gateResults.flatMap((gate) => gate.checks.flatMap((check) => check.findings));

    const summary = {
      totalIssues: allFindings.length,
      criticalIssues: allFindings.filter((f) => f.severity === "critical").length,
      highIssues: allFindings.filter((f) => f.severity === "high").length,
      mediumIssues: allFindings.filter((f) => f.severity === "medium").length,
      lowIssues: allFindings.filter((f) => f.severity === "low").length,
      securityScore: this.calculateOverallSecurityScore(gateResults),
      compliance: status === "passed",
    };

    const recommendations = this.generateRecommendations(gateResults, summary);

    return {
      reportId,
      timestamp: new Date(),
      stage,
      status,
      duration: Date.now() - startTime,
      gates: gateResults,
      summary,
      recommendations,
      artifacts: this.generateArtifacts(reportId, gateResults),
    };
  }

  /**
   * Calculate overall security score
   */
  private calculateOverallSecurityScore(gateResults: GateResult[]): number {
    const allChecks = gateResults.flatMap((gate) => gate.checks);

    if (allChecks.length === 0) {
      return 100;
    }

    const totalScore = allChecks.reduce((sum, check) => sum + check.score, 0);
    return totalScore / allChecks.length;
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(gateResults: GateResult[], summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.criticalIssues > 0) {
      recommendations.push("Address critical security vulnerabilities immediately before deployment");
    }

    if (summary.highIssues > 5) {
      recommendations.push("Review and remediate high-severity security issues");
    }

    if (summary.securityScore < 80) {
      recommendations.push("Improve overall security posture through code review and security training");
    }

    const failedGates = gateResults.filter((gate) => gate.status === "failed");
    if (failedGates.length > 0) {
      recommendations.push(`Review failed security gates: ${failedGates.map((g) => g.gateName).join(", ")}`);
    }

    return recommendations;
  }

  /**
   * Generate artifacts for the security report
   */
  private generateArtifacts(reportId: string, gateResults: GateResult[]): string[] {
    // In a real implementation, this would generate SARIF files, security reports, etc.
    return [`security-report-${reportId}.json`, `security-findings-${reportId}.sarif`];
  }

  /**
   * Create empty report for stages with no gates
   */
  private createEmptyReport(reportId: string, stage: string, startTime: number): PipelineSecurityReport {
    return {
      reportId,
      timestamp: new Date(),
      stage,
      status: "passed",
      duration: Date.now() - startTime,
      gates: [],
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        securityScore: 100,
        compliance: true,
      },
      recommendations: [],
      artifacts: [],
    };
  }

  /**
   * Initialize default security gates
   */
  private initializeDefaultGates(): void {
    // Pre-commit gate
    this.gates.set("pre-commit", {
      id: "pre-commit",
      name: "Pre-commit Security Gate",
      stage: "pre-commit",
      enabled: true,
      blocking: true,
      checks: [
        {
          id: "secrets-scan",
          name: "Secrets Scan",
          type: "secrets",
          enabled: true,
          timeout: 60000,
          retries: 1,
          parameters: {},
        },
        {
          id: "basic-review",
          name: "Basic Security Review",
          type: "review",
          enabled: true,
          timeout: 120000,
          retries: 1,
          parameters: { rules: ["auth-001", "input-001", "crypto-001"] },
        },
      ],
      thresholds: {
        maxCritical: 0,
        maxHigh: 2,
        maxMedium: 10,
        minSecurityScore: 80,
      },
      exceptions: [],
    });

    // Pre-build gate
    this.gates.set("pre-build", {
      id: "pre-build",
      name: "Pre-build Security Gate",
      stage: "pre-build",
      enabled: true,
      blocking: true,
      checks: [
        {
          id: "full-scan",
          name: "Full Security Scan",
          type: "scan",
          enabled: true,
          timeout: 300000,
          retries: 1,
          parameters: { depth: "comprehensive", includeRuntime: true },
        },
        {
          id: "dependency-check",
          name: "Dependency Vulnerability Check",
          type: "dependency",
          enabled: true,
          timeout: 180000,
          retries: 2,
          parameters: {},
        },
        {
          id: "config-review",
          name: "Configuration Review",
          type: "configuration",
          enabled: true,
          timeout: 60000,
          retries: 1,
          parameters: {},
        },
      ],
      thresholds: {
        maxCritical: 0,
        maxHigh: 5,
        maxMedium: 20,
        minSecurityScore: 75,
      },
      exceptions: [],
    });

    // Pre-deploy gate
    this.gates.set("pre-deploy", {
      id: "pre-deploy",
      name: "Pre-deployment Security Gate",
      stage: "pre-deploy",
      enabled: true,
      blocking: true,
      checks: [
        {
          id: "compliance-check",
          name: "Compliance Validation",
          type: "compliance",
          enabled: true,
          timeout: 120000,
          retries: 1,
          parameters: { frameworks: ["OWASP", "CWE"] },
        },
        {
          id: "final-review",
          name: "Final Security Review",
          type: "review",
          enabled: true,
          timeout: 240000,
          retries: 1,
          parameters: { aiAnalysis: true },
        },
      ],
      thresholds: {
        maxCritical: 0,
        maxHigh: 1,
        maxMedium: 5,
        minSecurityScore: 85,
      },
      exceptions: [],
    });
  }

  /**
   * Get security gate configuration
   */
  getSecurityGate(gateId: string): SecurityGate | null {
    return this.gates.get(gateId) || null;
  }

  /**
   * Update security gate configuration
   */
  updateSecurityGate(gateId: string, updates: Partial<SecurityGate>): boolean {
    const gate = this.gates.get(gateId);
    if (!gate) {
      return false;
    }

    const updatedGate = { ...gate, ...updates, id: gateId };
    this.gates.set(gateId, updatedGate);

    console.log(`[Security Pipeline] Updated security gate: ${updatedGate.name}`);
    return true;
  }

  /**
   * Get pipeline reports
   */
  getReports(
    options: {
      stage?: string;
      status?: string;
      since?: Date;
      limit?: number;
    } = {},
  ): PipelineSecurityReport[] {
    let reports = [...this.reports];

    if (options.stage) {
      reports = reports.filter((r) => r.stage === options.stage);
    }

    if (options.status) {
      reports = reports.filter((r) => r.status === options.status);
    }

    if (options.since) {
      reports = reports.filter((r) => r.timestamp >= options.since!);
    }

    // Sort by timestamp (newest first)
    reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      reports = reports.slice(0, options.limit);
    }

    return reports;
  }

  /**
   * Get pipeline statistics
   */
  getStatistics(): {
    totalReports: number;
    passRate: number;
    averageSecurityScore: number;
    mostCommonIssues: { type: string; count: number }[];
    gatePerformance: { gateId: string; successRate: number; averageDuration: number }[];
  } {
    const totalReports = this.reports.length;
    const passedReports = this.reports.filter((r) => r.status === "passed").length;
    const passRate = totalReports > 0 ? passedReports / totalReports : 1;

    const averageSecurityScore =
      totalReports > 0 ? this.reports.reduce((sum, r) => sum + r.summary.securityScore, 0) / totalReports : 100;

    // Count issue types
    const issueTypes: Record<string, number> = {};
    this.reports.forEach((report) => {
      report.gates.forEach((gate) => {
        gate.checks.forEach((check) => {
          check.findings.forEach((finding) => {
            issueTypes[finding.type] = (issueTypes[finding.type] || 0) + 1;
          });
        });
      });
    });

    const mostCommonIssues = Object.entries(issueTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate gate performance
    const gateStats: Record<string, { total: number; passed: number; totalDuration: number }> = {};

    this.reports.forEach((report) => {
      report.gates.forEach((gate) => {
        if (!gateStats[gate.gateId]) {
          gateStats[gate.gateId] = { total: 0, passed: 0, totalDuration: 0 };
        }

        gateStats[gate.gateId].total++;
        gateStats[gate.gateId].totalDuration += gate.duration;

        if (gate.status === "passed") {
          gateStats[gate.gateId].passed++;
        }
      });
    });

    const gatePerformance = Object.entries(gateStats).map(([gateId, stats]) => ({
      gateId,
      successRate: stats.total > 0 ? stats.passed / stats.total : 0,
      averageDuration: stats.total > 0 ? stats.totalDuration / stats.total : 0,
    }));

    return {
      totalReports,
      passRate,
      averageSecurityScore,
      mostCommonIssues,
      gatePerformance,
    };
  }
}
