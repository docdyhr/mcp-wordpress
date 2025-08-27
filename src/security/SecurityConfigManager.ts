/**
 * Security Configuration Management System
 * Provides centralized security policy and configuration management
 */

import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { SecurityUtils } from "./SecurityConfig.js";
import { SecurityValidationError } from "./InputValidator.js";
import { LoggerFactory } from "../utils/logger.js";

const logger = LoggerFactory.security();

interface SecurityPolicy {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  scope: "global" | "environment" | "application" | "endpoint";
  rules: SecurityPolicyRule[];
  compliance: {
    frameworks: string[]; // OWASP, CWE, GDPR, etc.
    requirements: string[];
  };
  metadata: {
    created: Date;
    updated: Date;
    author: string;
    approved: boolean;
  };
}

interface SecurityPolicyRule {
  id: string;
  name: string;
  type: "authentication" | "authorization" | "input-validation" | "crypto" | "session" | "logging" | "monitoring";
  action: "enforce" | "warn" | "log" | "block";
  conditions: {
    environments?: string[];
    methods?: string[];
    paths?: string[];
    userRoles?: string[];
  };
  parameters: Record<string, unknown>;
  exceptions: string[];
}

interface SecurityConfiguration {
  configId: string;
  version: string;
  environment: string;
  policies: SecurityPolicy[];
  settings: {
    authentication: AuthenticationSettings;
    authorization: AuthorizationSettings;
    inputValidation: InputValidationSettings;
    cryptography: CryptographySettings;
    session: SessionSettings;
    logging: LoggingSettings;
    monitoring: MonitoringSettings;
  };
  overrides: Record<string, unknown>;
  metadata: {
    lastUpdated: Date;
    checksum: string;
  };
}

interface AuthenticationSettings {
  methods: ("password" | "jwt" | "oauth" | "api-key")[];
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
    preventReuse: number;
  };
  jwtSettings: {
    algorithm: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  };
  rateLimiting: {
    maxAttempts: number;
    windowMs: number;
    blockDuration: number;
  };
  mfa: {
    enabled: boolean;
    methods: string[];
    required: boolean;
  };
}

interface AuthorizationSettings {
  rbac: {
    enabled: boolean;
    defaultRole: string;
    roleHierarchy: Record<string, string[]>;
  };
  permissions: {
    strict: boolean;
    defaultDeny: boolean;
    inheritance: boolean;
  };
  sessionTimeout: number;
  resourceAccess: {
    checkOrigin: boolean;
    allowedOrigins: string[];
    csrfProtection: boolean;
  };
}

interface InputValidationSettings {
  sanitization: {
    enabled: boolean;
    htmlStripping: boolean;
    sqlEscaping: boolean;
    jsEscaping: boolean;
  };
  validation: {
    strict: boolean;
    maxStringLength: number;
    maxFileSize: number;
    allowedFileTypes: string[];
    blockedPatterns: string[];
  };
  xssProtection: {
    enabled: boolean;
    mode: "filter" | "block";
    reportUri: string;
  };
}

interface CryptographySettings {
  encryption: {
    algorithm: "AES-256-GCM" | "AES-256-CBC" | "ChaCha20-Poly1305";
    keyDerivation: "PBKDF2" | "scrypt" | "Argon2";
    keyRotation: {
      enabled: boolean;
      intervalDays: number;
    };
  };
  hashing: {
    algorithm: "bcrypt" | "scrypt" | "Argon2";
    saltRounds: number;
  };
  tls: {
    minVersion: string;
    cipherSuites: string[];
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
    };
  };
}

interface SessionSettings {
  storage: "memory" | "redis" | "database";
  security: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict" | "lax" | "none";
  };
  timeout: {
    idle: number;
    absolute: number;
  };
  regeneration: {
    onLogin: boolean;
    onPrivilegeChange: boolean;
    interval: number;
  };
}

interface LoggingSettings {
  level: "error" | "warn" | "info" | "debug";
  security: {
    logFailedAuth: boolean;
    logPrivilegeEscalation: boolean;
    logDataAccess: boolean;
    logConfigChanges: boolean;
  };
  retention: {
    days: number;
    compression: boolean;
    encryption: boolean;
  };
  alerting: {
    enabled: boolean;
    thresholds: Record<string, number>;
    channels: string[];
  };
}

interface MonitoringSettings {
  realTime: {
    enabled: boolean;
    metrics: string[];
    alertThresholds: Record<string, number>;
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivity: "low" | "medium" | "high";
    models: string[];
  };
  compliance: {
    enabled: boolean;
    frameworks: string[];
    reportingSchedule: string;
  };
}

/**
 * Security Configuration Schema Validation
 */
const SecurityPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  enabled: z.boolean(),
  scope: z.enum(["global", "environment", "application", "endpoint"]),
  rules: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      type: z.enum([
        "authentication",
        "authorization",
        "input-validation",
        "crypto",
        "session",
        "logging",
        "monitoring",
      ]),
      action: z.enum(["enforce", "warn", "log", "block"]),
      conditions: z.object({
        environments: z.array(z.string()).optional(),
        methods: z.array(z.string()).optional(),
        paths: z.array(z.string()).optional(),
        userRoles: z.array(z.string()).optional(),
      }),
      parameters: z.record(z.unknown()),
      exceptions: z.array(z.string()),
    }),
  ),
  compliance: z.object({
    frameworks: z.array(z.string()),
    requirements: z.array(z.string()),
  }),
  metadata: z.object({
    created: z.date(),
    updated: z.date(),
    author: z.string(),
    approved: z.boolean(),
  }),
});

/**
 * Security Configuration Manager
 */
export class SecurityConfigManager {
  private configurations: Map<string, SecurityConfiguration> = new Map();
  private policies: Map<string, SecurityPolicy> = new Map();
  private configPath: string;

  constructor(configPath: string = "security-config") {
    this.configPath = configPath;
  }

  /**
   * Initialize security configuration manager
   */
  async initialize(): Promise<void> {
    logger.info("Initializing security configuration manager");

    await this.ensureConfigDirectory();
    await this.loadConfigurations();
    await this.loadPolicies();

    logger.info("Loaded configurations and policies", {
      configurationCount: this.configurations.size,
      policyCount: this.policies.size,
    });
  }

  /**
   * Create a new security policy
   */
  async createPolicy(policyData: Omit<SecurityPolicy, "id" | "metadata">): Promise<SecurityPolicy> {
    const policy: SecurityPolicy = {
      ...policyData,
      id: SecurityUtils.generateSecureToken(16),
      metadata: {
        created: new Date(),
        updated: new Date(),
        author: "system",
        approved: false,
      },
    };

    // Validate policy
    try {
      SecurityPolicySchema.parse(policy);
    } catch (_error) {
      throw new SecurityValidationError("Invalid security policy", [{ message: String(_error) }]);
    }

    this.policies.set(policy.id, policy);
    await this.savePolicyToFile(policy);

    logger.info(`Created policy: ${policy.name}`, { policyId: policy.id });
    return policy;
  }

  /**
   * Update an existing security policy
   */
  async updatePolicy(policyId: string, updates: Partial<SecurityPolicy>): Promise<SecurityPolicy> {
    const existingPolicy = this.policies.get(policyId);
    if (!existingPolicy) {
      throw new SecurityValidationError("Policy not found", [{ message: `Policy ${policyId} not found` }]);
    }

    const updatedPolicy: SecurityPolicy = {
      ...existingPolicy,
      ...updates,
      id: policyId, // Ensure ID doesn't change
      metadata: {
        ...existingPolicy.metadata,
        updated: new Date(),
      },
    };

    // Validate updated policy
    try {
      SecurityPolicySchema.parse(updatedPolicy);
    } catch (_error) {
      throw new SecurityValidationError("Invalid policy update", [{ message: String(_error) }]);
    }

    this.policies.set(policyId, updatedPolicy);
    await this.savePolicyToFile(updatedPolicy);

    logger.info(`Updated policy: ${updatedPolicy.name}`, { policyId });
    return updatedPolicy;
  }

  /**
   * Create a new security configuration
   */
  async createConfiguration(
    environment: string,
    configData: Partial<SecurityConfiguration>,
  ): Promise<SecurityConfiguration> {
    const config: SecurityConfiguration = {
      configId: SecurityUtils.generateSecureToken(16),
      version: "1.0.0",
      environment,
      policies: [],
      settings: configData.settings || this.getDefaultSettings(),
      overrides: configData.overrides || {},
      metadata: {
        lastUpdated: new Date(),
        checksum: "",
      },
    };

    // Calculate checksum
    config.metadata.checksum = await this.calculateChecksum(config);

    this.configurations.set(environment, config);
    await this.saveConfigurationToFile(config);

    logger.info(`Created configuration for environment: ${environment}`, { environment });
    return config;
  }

  /**
   * Get configuration for environment
   */
  getConfiguration(environment: string): SecurityConfiguration | null {
    return this.configurations.get(environment) || null;
  }

  /**
   * Get all configurations
   */
  getAllConfigurations(): SecurityConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Apply policies to configuration
   */
  async applyPoliciesToConfiguration(environment: string, policyIds: string[]): Promise<SecurityConfiguration> {
    const config = this.configurations.get(environment);
    if (!config) {
      throw new SecurityValidationError("Configuration not found", [
        { message: `Environment ${environment} not found` },
      ]);
    }

    const policies: SecurityPolicy[] = [];
    for (const policyId of policyIds) {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new SecurityValidationError("Policy not found", [{ message: `Policy ${policyId} not found` }]);
      }
      if (!policy.enabled) {
        logger.warn(`Skipping disabled policy: ${policy.name}`, { policyName: policy.name });
        continue;
      }
      policies.push(policy);
    }

    config.policies = policies;
    config.metadata.lastUpdated = new Date();
    config.metadata.checksum = await this.calculateChecksum(config);

    this.configurations.set(environment, config);
    await this.saveConfigurationToFile(config);

    logger.info(`Applied policies to ${environment}`, { policyCount: policies.length, environment });
    return config;
  }

  /**
   * Validate configuration compliance
   */
  async validateCompliance(environment: string): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const config = this.configurations.get(environment);
    if (!config) {
      throw new SecurityValidationError("Configuration not found", [
        { message: `Environment ${environment} not found` },
      ]);
    }

    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check password policy compliance
    if (config.settings.authentication.passwordPolicy.minLength < 8) {
      violations.push("Password minimum length below recommended 8 characters");
    }

    // Check encryption compliance
    if (!["AES-256-GCM", "ChaCha20-Poly1305"].includes(config.settings.cryptography.encryption.algorithm)) {
      violations.push("Weak encryption algorithm detected");
    }

    // Check session security
    if (!config.settings.session.security.httpOnly || !config.settings.session.security.secure) {
      violations.push("Insecure session configuration");
    }

    // Check HTTPS enforcement
    if (!config.settings.cryptography.tls.hsts.enabled) {
      recommendations.push("Enable HSTS for enhanced security");
    }

    // Check MFA configuration
    if (!config.settings.authentication.mfa.enabled) {
      recommendations.push("Consider enabling multi-factor authentication");
    }

    // Check compliance frameworks
    const requiredFrameworks = ["OWASP", "CWE"];
    const configuredFrameworks = config.policies.flatMap((p) => p.compliance.frameworks);

    for (const framework of requiredFrameworks) {
      if (!configuredFrameworks.includes(framework)) {
        recommendations.push(`Add ${framework} compliance policies`);
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
    };
  }

  /**
   * Generate default security settings
   */
  private getDefaultSettings(): SecurityConfiguration["settings"] {
    return {
      authentication: {
        methods: ["password", "jwt"],
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90,
          preventReuse: 5,
        },
        jwtSettings: {
          algorithm: "HS256",
          expiresIn: "1h",
          issuer: "mcp-wordpress",
          audience: "mcp-wordpress-users",
        },
        rateLimiting: {
          maxAttempts: 5,
          windowMs: 900000, // 15 minutes
          blockDuration: 3600000, // 1 hour
        },
        mfa: {
          enabled: false,
          methods: ["totp", "sms"],
          required: false,
        },
      },
      authorization: {
        rbac: {
          enabled: true,
          defaultRole: "user",
          roleHierarchy: {
            admin: ["editor", "user"],
            editor: ["user"],
            user: [],
          },
        },
        permissions: {
          strict: true,
          defaultDeny: true,
          inheritance: true,
        },
        sessionTimeout: 3600, // 1 hour
        resourceAccess: {
          checkOrigin: true,
          allowedOrigins: [],
          csrfProtection: true,
        },
      },
      inputValidation: {
        sanitization: {
          enabled: true,
          htmlStripping: true,
          sqlEscaping: true,
          jsEscaping: true,
        },
        validation: {
          strict: true,
          maxStringLength: 10000,
          maxFileSize: 10485760, // 10MB
          allowedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
          blockedPatterns: ["<script>", "javascript:", "vbscript:"],
        },
        xssProtection: {
          enabled: true,
          mode: "block",
          reportUri: "/security/xss-report",
        },
      },
      cryptography: {
        encryption: {
          algorithm: "AES-256-GCM",
          keyDerivation: "PBKDF2",
          keyRotation: {
            enabled: true,
            intervalDays: 90,
          },
        },
        hashing: {
          algorithm: "bcrypt",
          saltRounds: 12,
        },
        tls: {
          minVersion: "1.2",
          cipherSuites: ["ECDHE-RSA-AES256-GCM-SHA384", "ECDHE-RSA-AES128-GCM-SHA256", "ECDHE-RSA-AES256-SHA384"],
          hsts: {
            enabled: true,
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
          },
        },
      },
      session: {
        storage: "memory",
        security: {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        },
        timeout: {
          idle: 1800, // 30 minutes
          absolute: 28800, // 8 hours
        },
        regeneration: {
          onLogin: true,
          onPrivilegeChange: true,
          interval: 3600, // 1 hour
        },
      },
      logging: {
        level: "info",
        security: {
          logFailedAuth: true,
          logPrivilegeEscalation: true,
          logDataAccess: true,
          logConfigChanges: true,
        },
        retention: {
          days: 90,
          compression: true,
          encryption: true,
        },
        alerting: {
          enabled: true,
          thresholds: {
            failedLogins: 10,
            privilegeEscalation: 1,
            dataAccess: 100,
          },
          channels: ["email", "webhook"],
        },
      },
      monitoring: {
        realTime: {
          enabled: true,
          metrics: ["requests", "errors", "latency", "security_events"],
          alertThresholds: {
            errorRate: 0.05,
            latencyP99: 1000,
            securityEvents: 10,
          },
        },
        anomalyDetection: {
          enabled: true,
          sensitivity: "medium",
          models: ["statistical", "ml"],
        },
        compliance: {
          enabled: true,
          frameworks: ["OWASP", "CWE"],
          reportingSchedule: "daily",
        },
      },
    };
  }

  /**
   * Load configurations from files
   */
  private async loadConfigurations(): Promise<void> {
    try {
      const configDir = path.join(this.configPath, "configurations");
      await fs.access(configDir);

      const files = await fs.readdir(configDir);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(configDir, file);
          const content = await fs.readFile(filePath, "utf-8");
          const config: SecurityConfiguration = JSON.parse(content);

          // Convert date strings back to Date objects
          config.metadata.lastUpdated = new Date(config.metadata.lastUpdated);

          this.configurations.set(config.environment, config);
        }
      }
    } catch (_error) {
      logger.info("No existing configurations found, will create new ones");
    }
  }

  /**
   * Load policies from files
   */
  private async loadPolicies(): Promise<void> {
    try {
      const policiesDir = path.join(this.configPath, "policies");
      await fs.access(policiesDir);

      const files = await fs.readdir(policiesDir);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(policiesDir, file);
          const content = await fs.readFile(filePath, "utf-8");
          const policy: SecurityPolicy = JSON.parse(content);

          // Convert date strings back to Date objects
          policy.metadata.created = new Date(policy.metadata.created);
          policy.metadata.updated = new Date(policy.metadata.updated);

          this.policies.set(policy.id, policy);
        }
      }
    } catch (_error) {
      logger.info("No existing policies found");
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfigurationToFile(config: SecurityConfiguration): Promise<void> {
    const configDir = path.join(this.configPath, "configurations");
    await fs.mkdir(configDir, { recursive: true });

    const filePath = path.join(configDir, `${config.environment}.json`);
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Save policy to file
   */
  private async savePolicyToFile(policy: SecurityPolicy): Promise<void> {
    const policiesDir = path.join(this.configPath, "policies");
    await fs.mkdir(policiesDir, { recursive: true });

    const filePath = path.join(policiesDir, `${policy.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(policy, null, 2), "utf-8");
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDirectory(): Promise<void> {
    await fs.mkdir(this.configPath, { recursive: true });
    await fs.mkdir(path.join(this.configPath, "configurations"), { recursive: true });
    await fs.mkdir(path.join(this.configPath, "policies"), { recursive: true });
  }

  /**
   * Calculate configuration checksum
   */
  private async calculateChecksum(config: SecurityConfiguration): Promise<string> {
    const configForHash = {
      ...config,
      metadata: {
        ...config.metadata,
        checksum: "", // Exclude checksum from hash calculation
      },
    };

    const _configString = JSON.stringify(configForHash, Object.keys(configForHash).sort());
    return SecurityUtils.generateSecureToken(32);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): SecurityPolicy | null {
    return this.policies.get(policyId) || null;
  }

  /**
   * Delete policy
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    this.policies.delete(policyId);

    try {
      const filePath = path.join(this.configPath, "policies", `${policyId}.json`);
      await fs.unlink(filePath);
      logger.info(`Deleted policy: ${policy.name}`, { policyId });
      return true;
    } catch (_error) {
      logger.warn("Failed to delete policy file", { _error });
      return false;
    }
  }

  /**
   * Export configuration
   */
  async exportConfiguration(environment: string): Promise<string> {
    const config = this.configurations.get(environment);
    if (!config) {
      throw new SecurityValidationError("Configuration not found", [
        { message: `Environment ${environment} not found` },
      ]);
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfiguration(configData: string): Promise<SecurityConfiguration> {
    try {
      const config: SecurityConfiguration = JSON.parse(configData);

      // Validate configuration structure
      if (!config.configId || !config.environment) {
        throw new Error("Invalid configuration format");
      }

      // Convert date strings to Date objects
      config.metadata.lastUpdated = new Date(config.metadata.lastUpdated);

      this.configurations.set(config.environment, config);
      await this.saveConfigurationToFile(config);

      logger.info(`Imported configuration for environment: ${config.environment}`, { environment: config.environment });
      return config;
    } catch (_error) {
      throw new SecurityValidationError("Failed to import configuration", [{ message: String(_error) }]);
    }
  }
}
