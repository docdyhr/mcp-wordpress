import { z } from "zod";

/**
 * Zod schema for WordPress authentication methods
 */
const AuthMethodSchema = z.enum(["app-password", "jwt", "basic", "api-key", "cookie"] as const);

/**
 * Zod schema for URL validation with security checks
 */
const UrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }, "URL must use http or https protocol")
  .refine((url) => {
    // Additional security checks
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // In production, block localhost and private IPs
    if (process.env.NODE_ENV === "production") {
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./) ||
        hostname.match(/^192\.168\./)
      ) {
        return false;
      }
    }

    return true;
  }, "Private/localhost URLs not allowed in production");

/**
 * Zod schema for WordPress site configuration
 */
const SiteConfigSchema = z.object({
  WORDPRESS_SITE_URL: UrlSchema,
  WORDPRESS_USERNAME: z
    .string()
    .min(1, "Username is required")
    .max(60, "Username must be 60 characters or less")
    .regex(/^[a-zA-Z0-9._@-]+$/, "Username contains invalid characters"),
  WORDPRESS_APP_PASSWORD: z
    .string()
    .min(1, "Password is required")
    .refine((password) => {
      // WordPress app passwords are typically 24 characters with spaces
      // But we'll be flexible to support different auth methods
      return password.length >= 8;
    }, "Password must be at least 8 characters"),
  WORDPRESS_AUTH_METHOD: AuthMethodSchema.optional().default("app-password"),
});

/**
 * Zod schema for site configuration with metadata
 */
const SiteSchema = z.object({
  id: z
    .string()
    .min(1, "Site ID is required")
    .max(50, "Site ID must be 50 characters or less")
    .regex(/^[a-zA-Z0-9_-]+$/, "Site ID can only contain letters, numbers, underscores, and hyphens"),
  name: z.string().min(1, "Site name is required").max(100, "Site name must be 100 characters or less"),
  config: SiteConfigSchema,
});

/**
 * Zod schema for multi-site configuration file
 */
const MultiSiteConfigSchema = z.object({
  sites: z
    .array(SiteSchema)
    .min(1, "At least one site must be configured")
    .max(50, "Maximum of 50 sites supported")
    .refine((sites) => {
      const ids = sites.map((site) => site.id);
      const uniqueIds = new Set(ids);
      return ids.length === uniqueIds.size;
    }, "Site IDs must be unique")
    .refine((sites) => {
      const names = sites.map((site) => site.name);
      const uniqueNames = new Set(names);
      return names.length === uniqueNames.size;
    }, "Site names must be unique")
    .refine((sites) => {
      const urls = sites.map((site) => site.config.WORDPRESS_SITE_URL);
      const uniqueUrls = new Set(urls);
      return urls.length === uniqueUrls.size;
    }, "Site URLs must be unique"),
});

/**
 * Zod schema for environment variables (single-site mode)
 */
const EnvironmentConfigSchema = z.object({
  WORDPRESS_SITE_URL: UrlSchema,
  WORDPRESS_USERNAME: SiteConfigSchema.shape.WORDPRESS_USERNAME,
  WORDPRESS_APP_PASSWORD: SiteConfigSchema.shape.WORDPRESS_APP_PASSWORD,
  WORDPRESS_AUTH_METHOD: AuthMethodSchema.optional().default("app-password"),
  // Optional environment variables
  NODE_ENV: z.enum(["development", "production", "test", "dxt", "ci"]).optional(),
  DEBUG: z.string().optional(),
  DISABLE_CACHE: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
});

/**
 * Zod schema for MCP configuration passed from client
 */
const McpConfigSchema = z
  .object({
    wordpressSiteUrl: UrlSchema.optional(),
    wordpressUsername: SiteConfigSchema.shape.WORDPRESS_USERNAME.optional(),
    wordpressAppPassword: SiteConfigSchema.shape.WORDPRESS_APP_PASSWORD.optional(),
    wordpressAuthMethod: AuthMethodSchema.optional(),
  })
  .optional();

/**
 * Type definitions derived from Zod schemas
 */
export type SiteConfigType = z.infer<typeof SiteConfigSchema>;
export type SiteType = z.infer<typeof SiteSchema>;
export type MultiSiteConfigType = z.infer<typeof MultiSiteConfigSchema>;
export type EnvironmentConfigType = z.infer<typeof EnvironmentConfigSchema>;
export type McpConfigType = z.infer<typeof McpConfigSchema>;

/**
 * Configuration validation utilities
 */
export class ConfigurationValidator {
  /**
   * Validate multi-site configuration from JSON file
   */
  static validateMultiSiteConfig(config: unknown): MultiSiteConfigType {
    try {
      return MultiSiteConfigSchema.parse(config);
    } catch (_error) {
      if (_error instanceof z.ZodError) {
        const messages = _error.issues.map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`).join("; ");
        throw new Error(`Multi-site configuration validation failed: ${messages}`);
      }
      throw _error;
    }
  }

  /**
   * Validate environment configuration for single-site mode
   */
  static validateEnvironmentConfig(env: Record<string, string | undefined>): EnvironmentConfigType {
    try {
      return EnvironmentConfigSchema.parse(env);
    } catch (_error) {
      if (_error instanceof z.ZodError) {
        const messages = _error.issues.map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`).join("; ");
        throw new Error(`Environment configuration validation failed: ${messages}`);
      }
      throw _error;
    }
  }

  /**
   * Validate MCP configuration passed from client
   */
  static validateMcpConfig(config: unknown): McpConfigType {
    try {
      return McpConfigSchema.parse(config);
    } catch (_error) {
      if (_error instanceof z.ZodError) {
        const messages = _error.issues.map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`).join("; ");
        throw new Error(`MCP configuration validation failed: ${messages}`);
      }
      throw _error;
    }
  }

  /**
   * Validate a single site configuration
   */
  static validateSiteConfig(config: unknown): SiteType {
    try {
      return SiteSchema.parse(config);
    } catch (_error) {
      if (_error instanceof z.ZodError) {
        const messages = _error.issues.map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`).join("; ");
        throw new Error(`Site configuration validation failed: ${messages}`);
      }
      throw _error;
    }
  }

  /**
   * Check if a configuration file structure is valid without throwing
   */
  static isValidMultiSiteConfig(config: unknown): boolean {
    const result = MultiSiteConfigSchema.safeParse(config);
    return result.success;
  }

  /**
   * Check if environment configuration is valid without throwing
   */
  static isValidEnvironmentConfig(env: Record<string, string | undefined>): boolean {
    const result = EnvironmentConfigSchema.safeParse(env);
    return result.success;
  }

  /**
   * Get validation errors without throwing
   */
  static getValidationErrors(schema: z.ZodSchema, data: unknown): string[] {
    const result = schema.safeParse(data);
    if (result.success) {
      return [];
    }
    return result.error.issues.map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`);
  }
}

// Export schemas for direct use if needed
export {
  SiteConfigSchema,
  SiteSchema,
  MultiSiteConfigSchema,
  EnvironmentConfigSchema,
  McpConfigSchema,
  AuthMethodSchema,
  UrlSchema,
};
