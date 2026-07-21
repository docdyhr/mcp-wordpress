import { z } from "zod";
import { isDisallowedHostname, isInsecureHttpAllowed, isPrivateUrlAllowed } from "@/utils/validation/network.js";

/**
 * Zod schema for WordPress authentication methods.
 *
 * "cookie" is intentionally not offered here: the client can still be
 * constructed with `{ method: "cookie", nonce }` programmatically, but it
 * requires an already-established WordPress session nonce that neither the
 * setup wizard, the DXT installer, nor this schema has any way to obtain,
 * so it is not a genuinely configurable/supported mode end-to-end.
 */
const AuthMethodSchema = z.enum(["app-password", "jwt", "basic", "api-key"] as const);

/**
 * Zod schema for URL validation with security checks.
 *
 * Uses the same `isDisallowedHostname`/escape-hatch policy as
 * `WordPressClient.validateAndSanitizeUrl` (`src/client/api.ts`) so the two
 * enforcement points can't drift apart — this schema previously only blocked
 * private/localhost hosts when `NODE_ENV=production`, while the client always
 * blocked them; both now default to blocking, overridable via
 * `ALLOW_PRIVATE_URLS=true` / `ALLOW_INSECURE_HTTP=true`.
 */
const UrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }, "URL must use http or https protocol")
  .refine((url) => {
    const parsed = new URL(url);
    return parsed.protocol !== "http:" || isInsecureHttpAllowed();
  }, "HTTP is not allowed, use HTTPS (set ALLOW_INSECURE_HTTP=true to override for local development)")
  .refine((url) => {
    const parsed = new URL(url);
    return !isDisallowedHostname(parsed.hostname) || isPrivateUrlAllowed();
  }, "Private/localhost URLs not allowed (set ALLOW_PRIVATE_URLS=true to override for local development)");

const UsernameSchema = z
  .string()
  .min(1, "Username is required")
  .max(60, "Username must be 60 characters or less")
  .regex(/^[a-zA-Z0-9._@-]+$/, "Username contains invalid characters");

const AppPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .refine((password) => {
    // WordPress app passwords are typically 24 characters with spaces
    // But we'll be flexible to support different auth methods
    return password.length >= 8;
  }, "Password must be at least 8 characters");

const PasswordSchema = z.string().min(1, "Password is required");
const JwtSecretSchema = z.string().min(1, "JWT secret is required");
const ApiKeySchema = z.string().min(1, "API key is required");

/**
 * Per-auth-method site configuration variants. Each variant requires
 * exactly the credentials that WordPressClient.getAuthFromEnv() /
 * addAuthHeaders() actually use for that method — matching a method's
 * literal without its required fields (e.g. selecting "jwt" without a
 * WORDPRESS_JWT_SECRET) fails validation instead of silently falling back
 * to whatever app-password fields happen to be present.
 */
const AppPasswordSiteConfigSchema = z.object({
  WORDPRESS_SITE_URL: UrlSchema,
  WORDPRESS_AUTH_METHOD: z.literal("app-password"),
  WORDPRESS_USERNAME: UsernameSchema,
  WORDPRESS_APP_PASSWORD: AppPasswordSchema,
});

const BasicSiteConfigSchema = z.object({
  WORDPRESS_SITE_URL: UrlSchema,
  WORDPRESS_AUTH_METHOD: z.literal("basic"),
  WORDPRESS_USERNAME: UsernameSchema,
  WORDPRESS_PASSWORD: PasswordSchema,
});

const JwtSiteConfigSchema = z.object({
  WORDPRESS_SITE_URL: UrlSchema,
  WORDPRESS_AUTH_METHOD: z.literal("jwt"),
  WORDPRESS_USERNAME: UsernameSchema,
  WORDPRESS_PASSWORD: PasswordSchema,
  WORDPRESS_JWT_SECRET: JwtSecretSchema,
});

const ApiKeySiteConfigSchema = z.object({
  WORDPRESS_SITE_URL: UrlSchema,
  WORDPRESS_AUTH_METHOD: z.literal("api-key"),
  WORDPRESS_API_KEY: ApiKeySchema,
});

/**
 * Defaults WORDPRESS_AUTH_METHOD to "app-password" before discriminating,
 * so callers that omit it entirely (the common case) still validate
 * against the app-password variant instead of failing with "invalid
 * discriminator value: undefined".
 */
function withDefaultAuthMethod(value: unknown): unknown {
  if (value && typeof value === "object" && !("WORDPRESS_AUTH_METHOD" in value)) {
    return { ...value, WORDPRESS_AUTH_METHOD: "app-password" };
  }
  return value;
}

/**
 * Zod schema for WordPress site configuration (multi-site config file)
 */
const SiteConfigSchema = z.preprocess(
  withDefaultAuthMethod,
  z.discriminatedUnion("WORDPRESS_AUTH_METHOD", [
    AppPasswordSiteConfigSchema,
    BasicSiteConfigSchema,
    JwtSiteConfigSchema,
    ApiKeySiteConfigSchema,
  ]),
);

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
 * Zod schema for environment variables (single-site mode). Same
 * per-method discrimination as SiteConfigSchema, with the additional
 * optional process-level variables.
 */
const EnvironmentExtras = {
  NODE_ENV: z.enum(["development", "production", "test", "dxt", "ci"]).optional(),
  DEBUG: z.string().optional(),
  DISABLE_CACHE: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
};

const EnvironmentConfigSchema = z.preprocess(
  withDefaultAuthMethod,
  z.discriminatedUnion("WORDPRESS_AUTH_METHOD", [
    AppPasswordSiteConfigSchema.extend(EnvironmentExtras),
    BasicSiteConfigSchema.extend(EnvironmentExtras),
    JwtSiteConfigSchema.extend(EnvironmentExtras),
    ApiKeySiteConfigSchema.extend(EnvironmentExtras),
  ]),
);

/**
 * Zod schema for MCP configuration passed from client. Left as a loose,
 * fully-optional bag of fields (not discriminated) because it represents a
 * partial credential fragment that gets merged with process.env in
 * ServerConfiguration before the merged result is validated by
 * EnvironmentConfigSchema above — that merged validation is where an
 * incomplete credential set for the chosen method is actually caught.
 */
const McpConfigSchema = z
  .object({
    wordpressSiteUrl: UrlSchema.optional(),
    wordpressUsername: UsernameSchema.optional(),
    wordpressAppPassword: AppPasswordSchema.optional(),
    wordpressPassword: PasswordSchema.optional(),
    wordpressJwtSecret: JwtSecretSchema.optional(),
    wordpressApiKey: ApiKeySchema.optional(),
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
 * The credential shape WordPressClient's constructor expects, built from
 * whichever discriminated variant validation resolved to. Keeping this
 * next to the schema means the two can't drift independently — every
 * variant added above must be handled here too (the exhaustive switch
 * fails to compile otherwise).
 */
export interface ResolvedAuthConfig {
  method: "app-password" | "jwt" | "basic" | "api-key";
  username?: string;
  password?: string;
  appPassword?: string;
  secret?: string;
  apiKey?: string;
}

export function buildAuthConfig(validated: SiteConfigType | EnvironmentConfigType): ResolvedAuthConfig {
  switch (validated.WORDPRESS_AUTH_METHOD) {
    case "app-password":
      return {
        method: "app-password",
        username: validated.WORDPRESS_USERNAME,
        appPassword: validated.WORDPRESS_APP_PASSWORD,
      };
    case "basic":
      return {
        method: "basic",
        username: validated.WORDPRESS_USERNAME,
        password: validated.WORDPRESS_PASSWORD,
      };
    case "jwt":
      return {
        method: "jwt",
        username: validated.WORDPRESS_USERNAME,
        password: validated.WORDPRESS_PASSWORD,
        secret: validated.WORDPRESS_JWT_SECRET,
      };
    case "api-key":
      return {
        method: "api-key",
        apiKey: validated.WORDPRESS_API_KEY,
      };
  }
}

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
