/**
 * Security System Index
 * Central export for all security components
 */

// Core Security Components
export { SecurityConfig, SecurityUtils, createSecureError, getEnvironmentSecurity } from "./SecurityConfig";
import { SecurityValidationError } from "./InputValidator";
export {
  InputSanitizer,
  SecuritySchemas,
  SecurityLimiter,
  SecurityValidationError,
  validateSecurity,
  ToolSchemas,
} from "./InputValidator";

// AI-Powered Security Scanner
import { AISecurityScanner } from "./AISecurityScanner";
export { AISecurityScanner } from "./AISecurityScanner";

// Automated Remediation System
import { AutomatedRemediation, RemediationResult as _RemediationResult } from "./AutomatedRemediation";
export { AutomatedRemediation, RemediationResult } from "./AutomatedRemediation";

// Security Code Reviewer
import { SecurityReviewer, CodeReviewResult as _CodeReviewResult } from "./SecurityReviewer";
export { SecurityReviewer, CodeReviewResult } from "./SecurityReviewer";

// Security Configuration Manager
import { SecurityConfigManager } from "./SecurityConfigManager";
export { SecurityConfigManager } from "./SecurityConfigManager";

// Security Monitoring and Alerting
import { SecurityMonitor, SecurityEvent as _SecurityEvent } from "./SecurityMonitoring";
export { SecurityMonitor, SecurityEvent } from "./SecurityMonitoring";

// CI/CD Pipeline Integration
import { SecurityCIPipeline, PipelineSecurityReport as _PipelineSecurityReport } from "./SecurityCIPipeline";
export { SecurityCIPipeline, PipelineSecurityReport } from "./SecurityCIPipeline";

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
      console.log("[Security System] Already initialized");
      return;
    }

    console.log("[Security System] Initializing comprehensive security system...");

    try {
      // Initialize all components
      await this.configManager.initialize();
      await this.pipeline.initialize();

      // Start monitoring
      this.monitor.start();

      this.initialized = true;
      console.log("[Security System] Security system initialized successfully");
    } catch (error) {
      console.error("[Security System] Initialization failed:", error);
      throw new SecurityValidationError("Security system initialization failed", [{ message: String(error) }]);
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
  async remediate(scanResult: any, dryRun = false): Promise<_RemediationResult[]> {
    this.ensureInitialized();
    const plan = await this.remediation.createRemediationPlan(scanResult);
    return await this.remediation.executeRemediationPlan(plan, { dryRun });
  }

  /**
   * Execute security gates for CI/CD
   */
  async executeGates(stage: string, context: any, options?: SecurityGateOptions): Promise<_PipelineSecurityReport> {
    this.ensureInitialized();
    return await this.pipeline.executeSecurityGates(stage as any, context, options);
  }

  /**
   * Log security event
   */
  async logEvent(eventData: any): Promise<_SecurityEvent> {
    this.ensureInitialized();
    return await this.monitor.logSecurityEvent(eventData);
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

    console.log("[Security System] Shutting down security system...");

    this.monitor.stop();
    this.initialized = false;

    console.log("[Security System] Security system shutdown complete");
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
  remediate: (scanResult: any, dryRun = true) => securitySystem.remediate(scanResult, dryRun),

  /**
   * Log security event
   */
  logEvent: (eventData: any) => securitySystem.logEvent(eventData),

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
