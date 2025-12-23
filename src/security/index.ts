/**
 * Security System Index
 * Central export for all security components
 */

// Core Security Components
export { SecurityConfig, SecurityUtils, createSecureError, getEnvironmentSecurity } from "./SecurityConfig.js";
import { SecurityValidationError } from "./InputValidator.js";
import { LoggerFactory } from "@/utils/logger.js";
export {
  InputSanitizer,
  SecuritySchemas,
  SecurityLimiter,
  SecurityValidationError,
  validateSecurity,
  ToolSchemas,
} from "./InputValidator.js";

// AI-Powered Security Scanner
import { AISecurityScanner } from "./AISecurityScanner.js";
import type { SecurityScanResult } from "./AISecurityScanner.js";
export { AISecurityScanner } from "./AISecurityScanner.js";

// Automated Remediation System
import { AutomatedRemediation, RemediationResult as _RemediationResult } from "./AutomatedRemediation.js";
export { AutomatedRemediation, RemediationResult } from "./AutomatedRemediation.js";

// Security Code Reviewer
import { SecurityReviewer, CodeReviewResult as _CodeReviewResult } from "./SecurityReviewer.js";
export { SecurityReviewer, CodeReviewResult } from "./SecurityReviewer.js";

// Security Configuration Manager
import { SecurityConfigManager } from "./SecurityConfigManager.js";
export { SecurityConfigManager } from "./SecurityConfigManager.js";

// Security Monitoring and Alerting
import { SecurityMonitor, SecurityEvent as _SecurityEvent } from "./SecurityMonitoring.js";
export { SecurityMonitor, SecurityEvent } from "./SecurityMonitoring.js";

// CI/CD Pipeline Integration
import { SecurityCIPipeline, PipelineSecurityReport as _PipelineSecurityReport } from "./SecurityCIPipeline.js";
export { SecurityCIPipeline, PipelineSecurityReport } from "./SecurityCIPipeline.js";

// Security Types (new modular exports)
export * from "./SecurityTypes.js";
export { SecurityGateExecutor } from "./SecurityGateExecutor.js";
export { SecurityReportGenerator } from "./SecurityReportGenerator.js";

// Type definitions for external use
export interface SecurityScanOptions {
  targets?: string[];
  depth?: "shallow" | "deep" | "comprehensive";
  includeFileSystem?: boolean;
  includeRuntime?: boolean;
}

export interface SecurityReviewOptions {
  rules?: string[];
  excludeRules?: string[];
  aiAnalysis?: boolean;
  recursive?: boolean;
}

export interface SecurityGateOptions {
  skipNonBlocking?: boolean;
  continueOnFailure?: boolean;
  dryRun?: boolean;
}

/**
 * Security System Manager
 * Orchestrates all security components
 */
export class SecuritySystem {
  private scanner: AISecurityScanner;
  private remediation: AutomatedRemediation;
  private reviewer: SecurityReviewer;
  private configManager: SecurityConfigManager;
  private monitor: SecurityMonitor;
  private pipeline: SecurityCIPipeline;
  private initialized = false;

  constructor() {
    this.scanner = new AISecurityScanner();
    this.remediation = new AutomatedRemediation();
    this.reviewer = new SecurityReviewer();
    this.configManager = new SecurityConfigManager();
    this.monitor = new SecurityMonitor();
    this.pipeline = new SecurityCIPipeline();
  }

  /**
   * Initialize the security system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      const logger = LoggerFactory.security();
      logger.info("Security system already initialized");
      return;
    }

    const logger = LoggerFactory.security();
    logger.info("Initializing comprehensive security system");

    try {
      // Initialize all components
      await this.configManager.initialize();
      await this.pipeline.initialize();

      // Start monitoring
      this.monitor.start();

      this.initialized = true;
      logger.info("Security system initialized successfully");
    } catch (_error) {
      logger.error("Security system initialization failed", {
        _error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new SecurityValidationError("Security system initialization failed", [{ message: String(_error) }]);
    }
  }

  /**
   * Perform comprehensive security scan
   */
  async scan(options?: SecurityScanOptions) {
    this.ensureInitialized();
    return await this.scanner.performScan(options);
  }

  /**
   * Perform security code review
   */
  async review(filePath: string, options?: SecurityReviewOptions): Promise<_CodeReviewResult> {
    this.ensureInitialized();
    return await this.reviewer.reviewFile(filePath, options);
  }

  /**
   * Create and execute remediation plan
   */
  async remediate(scanResult: unknown, dryRun = false): Promise<_RemediationResult[]> {
    this.ensureInitialized();
    const plan = await this.remediation.createRemediationPlan(scanResult as SecurityScanResult);
    return await this.remediation.executeRemediationPlan(plan, { dryRun });
  }

  /**
   * Execute security gates for CI/CD
   */
  async executeGates(stage: string, context: unknown, options?: SecurityGateOptions): Promise<_PipelineSecurityReport> {
    this.ensureInitialized();
    const validStages = ["pre-commit", "pre-build", "pre-deploy", "post-deploy"] as const;
    type ValidStage = (typeof validStages)[number];
    const validStage = validStages.includes(stage as ValidStage) ? (stage as ValidStage) : "pre-commit";

    // Create a minimal PipelineContext from unknown input
    const pipelineContext = {
      repositoryUrl: "",
      branch: "",
      commit: "",
      author: "",
      environment: "development",
      buildNumber: "",
      artifacts: [],
      ...(typeof context === "object" && context !== null ? context : {}),
    };

    return await this.pipeline.executeSecurityGates(validStage, pipelineContext, options);
  }

  /**
   * Log security event
   */
  async logEvent(eventData: unknown): Promise<_SecurityEvent> {
    this.ensureInitialized();

    // Create a minimal SecurityEvent from unknown input
    const securityEventData = {
      type: "system" as const,
      description: "Security event",
      severity: "low" as const,
      source: "unknown",
      details: {},
      riskScore: 0,
      ...(typeof eventData === "object" && eventData !== null ? eventData : {}),
    };

    return await this.monitor.logSecurityEvent(securityEventData);
  }

  /**
   * Get security status
   */
  getStatus() {
    this.ensureInitialized();
    return {
      system: this.initialized,
      monitoring: this.monitor.getStatus(),
      scanner: this.scanner.getLatestScan(),
      pipeline: this.pipeline.getStatistics(),
    };
  }

  /**
   * Shutdown security system
   */
  shutdown(): void {
    if (!this.initialized) {
      return;
    }

    const logger = LoggerFactory.security();
    logger.info("Shutting down security system");

    this.monitor.stop();
    this.initialized = false;

    logger.info("Security system shutdown complete");
  }

  /**
   * Ensure system is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new SecurityValidationError("Security system not initialized", [{ message: "Call initialize() first" }]);
    }
  }

  /**
   * Get individual components for advanced usage
   */
  getComponents() {
    return {
      scanner: this.scanner,
      remediation: this.remediation,
      reviewer: this.reviewer,
      configManager: this.configManager,
      monitor: this.monitor,
      pipeline: this.pipeline,
    };
  }
}

/**
 * Default security system instance
 */
export const securitySystem = new SecuritySystem();

/**
 * Convenience functions for common operations
 */
export const security = {
  /**
   * Quick security scan
   */
  scan: (options?: SecurityScanOptions) => securitySystem.scan(options),

  /**
   * Quick security review
   */
  review: (filePath: string, options?: SecurityReviewOptions) => securitySystem.review(filePath, options),

  /**
   * Quick remediation
   */
  remediate: (scanResult: unknown, dryRun = true) => securitySystem.remediate(scanResult, dryRun),

  /**
   * Log security event
   */
  logEvent: (eventData: unknown) => securitySystem.logEvent(eventData),

  /**
   * Get security status
   */
  status: () => securitySystem.getStatus(),

  /**
   * Initialize security system
   */
  init: () => securitySystem.initialize(),

  /**
   * Shutdown security system
   */
  shutdown: () => securitySystem.shutdown(),
};
