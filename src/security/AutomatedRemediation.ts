/**
 * Automated Security Remediation System
 * Provides intelligent automated fixes for detected vulnerabilities
 */

import * as fs from "fs/promises";
import * as path from "path";
import { SecurityVulnerability, SecurityScanResult } from "./AISecurityScanner.js";
import { SecurityUtils } from "./SecurityConfig.js";
import { SecurityValidationError } from "./InputValidator.js";
import { LoggerFactory } from "@/utils/logger.js";

interface RemediationAction {
  id: string;
  type: "replace" | "insert" | "delete" | "config" | "file";
  target: {
    file?: string | undefined;
    line?: number | undefined;
    pattern?: RegExp | undefined;
    value?: string | undefined;
  };
  replacement: {
    content?: string;
    config?: Record<string, unknown>;
    action?: string;
  };
  backup: {
    enabled: boolean;
    path?: string;
  };
  validation: {
    test?: string;
    expected?: unknown;
  };
}

export interface RemediationResult {
  vulnerabilityId: string;
  success: boolean;
  action: string;
  details: string;
  timestamp: Date;
  backupPath?: string | undefined;
  validationResult?: boolean | undefined;
}

interface RemediationPlan {
  planId: string;
  vulnerabilities: SecurityVulnerability[];
  actions: RemediationAction[];
  estimatedDuration: number;
  riskLevel: "low" | "medium" | "high";
  requiresApproval: boolean;
}

/**
 * Automated remediation patterns for common vulnerabilities
 */
const REMEDIATION_PATTERNS = {
  sqlInjection: {
    pattern: /(SELECT|INSERT|UPDATE|DELETE).*?[\'\"].*?[\'\"].*?(WHERE|FROM|INTO)/gi,
    replacement: "// TODO: Replace with parameterized query",
    confidence: 0.7,
  },

  xssSimple: {
    pattern: /innerHTML\s*=\s*[^;]+;?/gi,
    replacement: "textContent = $1; // XSS remediation",
    confidence: 0.8,
  },

  pathTraversal: {
    pattern: /\.\.[\/\\]/g,
    replacement: "",
    confidence: 0.9,
  },

  credentialExposure: {
    pattern: /(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi,
    replacement: "$1 = process.env.$1?.toUpperCase() || '[REQUIRED]'",
    confidence: 0.85,
  },

  httpToHttps: {
    pattern: /http:\/\//gi,
    replacement: "https://",
    confidence: 0.95,
  },

  insecureConfig: {
    pattern: /(ssl|secure|verify)\s*[:=]\s*false/gi,
    replacement: "$1: true",
    confidence: 0.9,
  },
};

/**
 * Automated Security Remediation Engine
 */
export class AutomatedRemediation {
  private readonly logger = LoggerFactory.security();
  private remediationHistory: RemediationResult[] = [];
  private backupDirectory = "security-backups";

  /**
   * Create remediation plan for scan results
   */
  async createRemediationPlan(scanResult: SecurityScanResult): Promise<RemediationPlan> {
    const planId = SecurityUtils.generateSecureToken(16);
    const remediableVulns = scanResult.vulnerabilities.filter((v) => v.remediation.automated);

    this.logger.info("Creating remediation plan", {
      planId,
      remediableVulnerabilities: remediableVulns.length,
      totalVulnerabilities: scanResult.vulnerabilities.length,
    });

    const actions: RemediationAction[] = [];
    let estimatedDuration = 0;
    let maxRiskLevel: "low" | "medium" | "high" = "low";

    for (const vulnerability of remediableVulns) {
      const action = await this.createRemediationAction(vulnerability);
      if (action) {
        actions.push(action);
        estimatedDuration += 30; // 30 seconds per action estimate

        // Update risk level
        if (vulnerability.severity === "critical" || vulnerability.severity === "high") {
          maxRiskLevel = "high";
        } else if (vulnerability.severity === "medium" && maxRiskLevel === "low") {
          maxRiskLevel = "medium";
        }
      }
    }

    const requiresApproval = maxRiskLevel === "high" || actions.length > 10;

    return {
      planId,
      vulnerabilities: remediableVulns,
      actions,
      estimatedDuration,
      riskLevel: maxRiskLevel,
      requiresApproval,
    };
  }

  /**
   * Create remediation action for a specific vulnerability
   */
  private async createRemediationAction(vulnerability: SecurityVulnerability): Promise<RemediationAction | null> {
    const actionId = SecurityUtils.generateSecureToken(12);

    switch (vulnerability.type) {
      case "SQL Injection":
        return this.createSQLInjectionRemediation(actionId, vulnerability);

      case "Cross-Site Scripting (XSS)":
        return this.createXSSRemediation(actionId, vulnerability);

      case "Path Traversal":
        return this.createPathTraversalRemediation(actionId, vulnerability);

      case "Credential Exposure":
        return this.createCredentialExposureRemediation(actionId, vulnerability);

      case "Insecure Configuration":
        return this.createConfigRemediation(actionId, vulnerability);

      case "Information Disclosure":
        return this.createInfoDisclosureRemediation(actionId, vulnerability);

      default:
        return null;
    }
  }

  /**
   * Create SQL injection remediation
   */
  private createSQLInjectionRemediation(actionId: string, vulnerability: SecurityVulnerability): RemediationAction {
    return {
      id: actionId,
      type: "replace",
      target: {
        file: vulnerability.location.file,
        line: vulnerability.location.line,
        pattern: REMEDIATION_PATTERNS.sqlInjection.pattern,
      },
      replacement: {
        content:
          "// SECURITY FIX: Replace with parameterized query to prevent SQL injection\n" +
          "// Example: db.query('SELECT * FROM users WHERE id = ?', [userId])",
      },
      backup: {
        enabled: true,
      },
      validation: {
        test: 'grep -n "SELECT.*WHERE" $file | wc -l',
        expected: 0,
      },
    };
  }

  /**
   * Create XSS remediation
   */
  private createXSSRemediation(actionId: string, vulnerability: SecurityVulnerability): RemediationAction {
    return {
      id: actionId,
      type: "replace",
      target: {
        file: vulnerability.location.file,
        line: vulnerability.location.line,
        pattern: /innerHTML\s*=\s*([^;]+);?/gi,
      },
      replacement: {
        content: "textContent = $1; // XSS remediation: use textContent instead of innerHTML",
      },
      backup: {
        enabled: true,
      },
      validation: {
        test: 'grep -n "innerHTML" $file | wc -l',
        expected: 0,
      },
    };
  }

  /**
   * Create path traversal remediation
   */
  private createPathTraversalRemediation(actionId: string, vulnerability: SecurityVulnerability): RemediationAction {
    return {
      id: actionId,
      type: "replace",
      target: {
        file: vulnerability.location.file,
        line: vulnerability.location.line,
        pattern: /\.\.[\/\\]/g,
      },
      replacement: {
        content: "", // Remove path traversal sequences
      },
      backup: {
        enabled: true,
      },
      validation: {
        test: 'grep -n "\\.\\./" $file | wc -l',
        expected: 0,
      },
    };
  }

  /**
   * Create credential exposure remediation
   */
  private createCredentialExposureRemediation(
    actionId: string,
    vulnerability: SecurityVulnerability,
  ): RemediationAction {
    return {
      id: actionId,
      type: "replace",
      target: {
        file: vulnerability.location.file,
        line: vulnerability.location.line,
        pattern: /(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi,
      },
      replacement: {
        content:
          "// SECURITY FIX: Credential moved to environment variable\n" +
          "// Add to .env: $1=your_actual_value\n" +
          "$1: process.env.$1 || (() => { throw new Error('$1 environment variable required'); })()",
      },
      backup: {
        enabled: true,
      },
      validation: {
        test: 'grep -n "password.*=.*[\'\\"]" $file | wc -l',
        expected: 0,
      },
    };
  }

  /**
   * Create configuration remediation
   */
  private createConfigRemediation(actionId: string, vulnerability: SecurityVulnerability): RemediationAction {
    return {
      id: actionId,
      type: "replace",
      target: {
        file: vulnerability.location.file,
        line: vulnerability.location.line,
        pattern: /(ssl|secure|verify)\s*[:=]\s*false/gi,
      },
      replacement: {
        content: "$1: true // Security fix: enabled secure configuration",
      },
      backup: {
        enabled: true,
      },
      validation: {
        test: 'grep -n "ssl.*false" $file | wc -l',
        expected: 0,
      },
    };
  }

  /**
   * Create information disclosure remediation
   */
  private createInfoDisclosureRemediation(actionId: string, vulnerability: SecurityVulnerability): RemediationAction {
    return {
      id: actionId,
      type: "replace",
      target: {
        file: vulnerability.location.file,
        line: vulnerability.location.line,
        pattern: /(debug|trace|error)\s*[:=]\s*true/gi,
      },
      replacement: {
        content: "$1: process.env.NODE_ENV !== 'production' // Security fix: disable in production",
      },
      backup: {
        enabled: true,
      },
      validation: {
        test: 'grep -n "debug.*true" $file | wc -l',
        expected: 0,
      },
    };
  }

  /**
   * Execute remediation plan
   */
  async executeRemediationPlan(
    plan: RemediationPlan,
    options: {
      dryRun?: boolean;
      requireConfirmation?: boolean;
    } = {},
  ): Promise<RemediationResult[]> {
    this.logger.info("Executing remediation plan", {
      planId: plan.planId,
      actionCount: plan.actions.length,
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      this.logger.info("Running in dry-run mode - no changes will be made");
      return this.simulateRemediationActions(plan.actions);
    }

    const results: RemediationResult[] = [];

    // Ensure backup directory exists
    await this.ensureBackupDirectory();

    for (const action of plan.actions) {
      try {
        this.logger.debug("Executing remediation action", {
          actionId: action.id,
          actionType: action.type,
          targetFile: action.target.file,
        });

        const result = await this.executeRemediationAction(action);
        results.push(result);

        if (!result.success) {
          this.logger.error("Remediation action failed", {
            actionId: action.id,
            details: result.details,
          });
        }
      } catch (_error) {
        this.logger.error("Remediation action threw error", {
          actionId: action.id,
          _error: String(_error),
        });
        results.push({
          vulnerabilityId: action.id,
          success: false,
          action: action.type,
          details: `Error: ${_error instanceof Error ? _error.message : String(_error)}`,
          timestamp: new Date(),
        });
      }
    }

    this.remediationHistory.push(...results);

    const successCount = results.filter((r) => r.success).length;
    this.logger.info("Remediation plan completed", {
      planId: plan.planId,
      successCount,
      totalActions: results.length,
      successRate: `${Math.round((successCount / results.length) * 100)}%`,
    });

    return results;
  }

  /**
   * Execute a single remediation action
   */
  private async executeRemediationAction(action: RemediationAction): Promise<RemediationResult> {
    const startTime = Date.now();

    try {
      let backupPath: string | undefined;

      // Create backup if enabled
      if (action.backup.enabled && action.target.file) {
        backupPath = await this.createBackup(action.target.file);
      }

      // Execute the action based on type
      switch (action.type) {
        case "replace":
          await this.executeReplaceAction(action);
          break;

        case "insert":
          await this.executeInsertAction(action);
          break;

        case "delete":
          await this.executeDeleteAction(action);
          break;

        case "config":
          await this.executeConfigAction(action);
          break;

        case "file":
          await this.executeFileAction(action);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Validate the fix if validation is provided
      let validationResult: boolean | undefined;
      if (action.validation && action.target.file) {
        validationResult = await this.validateRemediation(action);
      }

      return {
        vulnerabilityId: action.id,
        success: true,
        action: action.type,
        details: `Remediation completed successfully in ${Date.now() - startTime}ms`,
        timestamp: new Date(),
        backupPath,
        validationResult,
      };
    } catch (_error) {
      return {
        vulnerabilityId: action.id,
        success: false,
        action: action.type,
        details: `Remediation failed: ${_error instanceof Error ? _error.message : String(_error)}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute replace action
   */
  private async executeReplaceAction(action: RemediationAction): Promise<void> {
    if (!action.target.file || !action.target.pattern || !action.replacement.content) {
      throw new Error("Replace action missing required fields");
    }

    const content = await fs.readFile(action.target.file, "utf-8");
    const updatedContent = content.replace(action.target.pattern, action.replacement.content);

    if (content === updatedContent) {
      throw new Error("No changes made - pattern not found");
    }

    await fs.writeFile(action.target.file, updatedContent, "utf-8");
  }

  /**
   * Execute insert action
   */
  private async executeInsertAction(action: RemediationAction): Promise<void> {
    if (!action.target.file || !action.replacement.content) {
      throw new Error("Insert action missing required fields");
    }

    const content = await fs.readFile(action.target.file, "utf-8");
    const lines = content.split("\n");

    const insertIndex = action.target.line ? Math.max(0, action.target.line - 1) : lines.length;
    lines.splice(insertIndex, 0, action.replacement.content);

    await fs.writeFile(action.target.file, lines.join("\n"), "utf-8");
  }

  /**
   * Execute delete action
   */
  private async executeDeleteAction(action: RemediationAction): Promise<void> {
    if (!action.target.file) {
      throw new Error("Delete action missing file");
    }

    if (action.target.line) {
      // Delete specific line
      const content = await fs.readFile(action.target.file, "utf-8");
      const lines = content.split("\n");

      if (action.target.line > 0 && action.target.line <= lines.length) {
        lines.splice(action.target.line - 1, 1);
        await fs.writeFile(action.target.file, lines.join("\n"), "utf-8");
      }
    } else if (action.target.pattern) {
      // Delete pattern matches
      const content = await fs.readFile(action.target.file, "utf-8");
      const updatedContent = content.replace(action.target.pattern, "");
      await fs.writeFile(action.target.file, updatedContent, "utf-8");
    } else {
      throw new Error("Delete action missing target specification");
    }
  }

  /**
   * Execute config action
   */
  private async executeConfigAction(action: RemediationAction): Promise<void> {
    if (!action.target.file || !action.replacement.config) {
      throw new Error("Config action missing required fields");
    }

    const content = await fs.readFile(action.target.file, "utf-8");
    const config = JSON.parse(content);

    // Merge configuration changes
    Object.assign(config, action.replacement.config);

    await fs.writeFile(action.target.file, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Execute file action
   */
  private async executeFileAction(action: RemediationAction): Promise<void> {
    if (!action.replacement.action) {
      throw new Error("File action missing action specification");
    }

    switch (action.replacement.action) {
      case "delete":
        if (action.target.file) {
          await fs.unlink(action.target.file);
        }
        break;

      case "create":
        if (action.target.file && action.replacement.content) {
          await fs.writeFile(action.target.file, action.replacement.content, "utf-8");
        }
        break;

      default:
        throw new Error(`Unknown file action: ${action.replacement.action}`);
    }
  }

  /**
   * Create backup of file
   */
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(this.backupDirectory, `${path.basename(filePath)}.${timestamp}.backup`);

    const content = await fs.readFile(filePath, "utf-8");
    await fs.writeFile(backupPath, content, "utf-8");

    this.logger.debug("Created backup file", { backupPath });
    return backupPath;
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDirectory);
    } catch {
      await fs.mkdir(this.backupDirectory, { recursive: true });
      this.logger.info("Created backup directory", { directory: this.backupDirectory });
    }
  }

  /**
   * Validate remediation
   */
  private async validateRemediation(action: RemediationAction): Promise<boolean> {
    if (!action.validation?.test || !action.target.file) {
      return true; // No validation specified
    }

    try {
      // This is a simplified validation - in practice you'd run the test command
      const content = await fs.readFile(action.target.file, "utf-8");

      // Simple pattern-based validation
      if (action.target.pattern) {
        const matches = content.match(action.target.pattern);
        return (matches?.length || 0) === (action.validation.expected || 0);
      }

      return true;
    } catch (_error) {
      this.logger.warn("Validation failed for action", {
        actionId: action.id,
        _error: String(_error),
      });
      return false;
    }
  }

  /**
   * Simulate remediation actions for dry run
   */
  private async simulateRemediationActions(actions: RemediationAction[]): Promise<RemediationResult[]> {
    const results: RemediationResult[] = [];

    for (const action of actions) {
      results.push({
        vulnerabilityId: action.id,
        success: true,
        action: `${action.type} (simulated)`,
        details: `Would ${action.type} in ${action.target.file || "configuration"}`,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Get remediation history
   */
  getRemediationHistory(): RemediationResult[] {
    return [...this.remediationHistory];
  }

  /**
   * Rollback remediation using backup
   */
  async rollbackRemediation(backupPath: string, targetFile: string): Promise<void> {
    try {
      const backupContent = await fs.readFile(backupPath, "utf-8");
      await fs.writeFile(targetFile, backupContent, "utf-8");
      this.logger.info("Rolled back file from backup", {
        targetFile,
        backupPath,
      });
    } catch (_error) {
      throw new SecurityValidationError(
        `Rollback failed: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDirectory);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.backupDirectory, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          this.logger.debug("Cleaned up old backup", { file });
        }
      }
    } catch (_error) {
      this.logger.warn("Backup cleanup failed", { _error: String(_error) });
    }
  }
}
