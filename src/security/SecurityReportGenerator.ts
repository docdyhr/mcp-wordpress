/**
 * Security Report Generator
 * Handles generation of security reports and statistics
 */

import type {
  PipelineSecurityReport,
  GateResult,
  PipelineContext,
  ReportSummary,
  PipelineStatistics,
  ReportFilterOptions,
} from "./SecurityTypes.js";

/**
 * Security Report Generator
 * Responsible for generating and managing security reports
 */
export class SecurityReportGenerator {
  private reports: PipelineSecurityReport[] = [];

  /**
   * Generate a pipeline security report
   */
  generateReport(
    reportId: string,
    stage: string,
    startTime: number,
    status: "passed" | "failed" | "warning",
    gateResults: GateResult[],
    context: PipelineContext,
  ): PipelineSecurityReport {
    const allFindings = gateResults.flatMap((gate) => gate.checks.flatMap((check) => check.findings));

    const summary: ReportSummary = {
      totalIssues: allFindings.length,
      criticalIssues: allFindings.filter((f) => f.severity === "critical").length,
      highIssues: allFindings.filter((f) => f.severity === "high").length,
      mediumIssues: allFindings.filter((f) => f.severity === "medium").length,
      lowIssues: allFindings.filter((f) => f.severity === "low").length,
      securityScore: this.calculateOverallSecurityScore(gateResults),
      compliance: status === "passed",
    };

    const recommendations = this.generateRecommendations(gateResults, summary);

    const report: PipelineSecurityReport = {
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

    return report;
  }

  /**
   * Create empty report for stages with no gates
   */
  createEmptyReport(reportId: string, stage: string, startTime: number): PipelineSecurityReport {
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
   * Store a report
   */
  storeReport(report: PipelineSecurityReport): void {
    this.reports.push(report);
  }

  /**
   * Get the latest report
   */
  getLatestReport(): PipelineSecurityReport | undefined {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : undefined;
  }

  /**
   * Get all reports
   */
  getAllReports(): PipelineSecurityReport[] {
    return [...this.reports];
  }

  /**
   * Get filtered reports
   */
  getReports(options: ReportFilterOptions = {}): PipelineSecurityReport[] {
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
   * Export report in various formats
   */
  exportReport(report: PipelineSecurityReport, format: string): string {
    if (format === "html") {
      return `<html><body>${JSON.stringify(report)}</body></html>`;
    }
    if (format === "xml") {
      return `<report>${JSON.stringify(report)}</report>`;
    }
    return JSON.stringify(report);
  }

  /**
   * Calculate security metrics from a report
   */
  calculateSecurityMetrics(report: PipelineSecurityReport): {
    overallScore: number;
    riskLevel: string;
    complianceStatus: boolean;
  } {
    const overallScore = report.summary.securityScore ?? 100;
    const riskLevel = overallScore > 80 ? "low" : overallScore > 50 ? "medium" : "high";
    return { overallScore, riskLevel, complianceStatus: report.summary.compliance };
  }

  /**
   * Calculate overall security score from gate results
   */
  calculateOverallSecurityScore(gateResults: GateResult[]): number {
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
  generateRecommendations(
    gateResults: GateResult[],
    summary: ReportSummary,
  ): string[] {
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
  generateArtifacts(reportId: string, gateResults: GateResult[]): string[] {
    return [`security-report-${reportId}.json`, `security-findings-${reportId}.sarif`];
  }

  /**
   * Get pipeline statistics
   */
  getStatistics(): PipelineStatistics {
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
