/**
 * Security Types and Interfaces
 * Shared type definitions for the security CI/CD pipeline
 */

/**
 * Security gate configuration
 */
export interface SecurityGate {
  id: string;
  name: string;
  stage: "pre-commit" | "pre-build" | "pre-deploy" | "post-deploy";
  enabled: boolean;
  blocking: boolean;
  checks: SecurityCheck[];
  thresholds: SecurityThresholds;
  exceptions: string[];
}

/**
 * Security thresholds for gate evaluation
 */
export interface SecurityThresholds {
  maxCritical: number;
  maxHigh: number;
  maxMedium: number;
  minSecurityScore: number;
}

/**
 * Security check configuration
 */
export interface SecurityCheck {
  id: string;
  name: string;
  type: SecurityCheckType;
  enabled: boolean;
  timeout: number;
  retries: number;
  parameters: Record<string, unknown>;
}

/**
 * Types of security checks
 */
export type SecurityCheckType = "scan" | "review" | "dependency" | "configuration" | "secrets" | "compliance";

/**
 * Pipeline security report
 */
export interface PipelineSecurityReport {
  reportId: string;
  timestamp: Date;
  stage: string;
  status: ReportStatus;
  duration: number;
  gates: GateResult[];
  summary: ReportSummary;
  recommendations: string[];
  artifacts: string[];
}

/**
 * Report status
 */
export type ReportStatus = "passed" | "failed" | "warning";

/**
 * Report summary
 */
export interface ReportSummary {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  securityScore: number;
  compliance: boolean;
}

/**
 * Gate execution result
 */
export interface GateResult {
  gateId: string;
  gateName: string;
  status: GateStatus;
  duration: number;
  checks: CheckResult[];
  blocking: boolean;
  message: string;
}

/**
 * Gate status
 */
export type GateStatus = "passed" | "failed" | "warning" | "skipped";

/**
 * Check execution result
 */
export interface CheckResult {
  checkId: string;
  checkName: string;
  status: CheckStatus;
  duration: number;
  findings: SecurityFinding[];
  details: string;
  score: number;
}

/**
 * Check status
 */
export type CheckStatus = "passed" | "failed" | "warning" | "error";

/**
 * Security finding
 */
export interface SecurityFinding {
  id: string;
  severity: FindingSeverity;
  type: string;
  description: string;
  file?: string | undefined;
  line?: number | undefined;
  remediation?: string | undefined;
}

/**
 * Finding severity levels
 */
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * Pipeline execution context
 */
export interface PipelineContext {
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
 * Gate execution options
 */
export interface GateExecutionOptions {
  skipNonBlocking?: boolean;
  continueOnFailure?: boolean;
  dryRun?: boolean;
}

/**
 * Check execution result (internal)
 */
export interface CheckExecutionResult {
  findings: SecurityFinding[];
  score: number;
  details: string;
}

/**
 * Gate status evaluation result
 */
export interface GateStatusResult {
  status: "passed" | "failed" | "warning";
  message: string;
}

/**
 * Pipeline statistics
 */
export interface PipelineStatistics {
  totalReports: number;
  passRate: number;
  averageSecurityScore: number;
  mostCommonIssues: { type: string; count: number }[];
  gatePerformance: { gateId: string; successRate: number; averageDuration: number }[];
}

/**
 * Report filter options
 */
export interface ReportFilterOptions {
  stage?: string;
  status?: string;
  since?: Date;
  limit?: number;
}
