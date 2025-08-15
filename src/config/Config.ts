/**
 * Centralized Configuration Management
 *
 * Provides typed access to all environment variables and configuration options.
 * Centralizes configuration logic and eliminates scattered process.env access.
 */

export interface AppConfig {
  // WordPress Connection
  readonly wordpress: {
    readonly siteUrl: string | undefined;
    readonly username: string | undefined;
    readonly appPassword: string | undefined;
    readonly password: string | undefined;
    readonly authMethod: string;
    readonly timeout: number;
    readonly maxRetries: number;
    readonly jwtSecret: string | undefined;
    readonly apiKey: string | undefined;
    readonly cookieNonce: string | undefined;
    readonly jwtPassword: string | undefined;
  };

  // Application Environment
  readonly app: {
    readonly nodeEnv: string;
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
    readonly isTest: boolean;
    readonly isDXT: boolean;
    readonly isCI: boolean;
  };

  // Debug & Logging
  readonly debug: {
    readonly enabled: boolean;
    readonly logLevel: string;
  };

  // Caching
  readonly cache: {
    readonly disabled: boolean;
    readonly ttl: number;
    readonly maxItems: number;
    readonly maxMemoryMB: number;
  };

  // Security
  readonly security: {
    readonly rateLimitEnabled: boolean;
    readonly rateLimitRequests: number;
    readonly rateLimitWindow: number;
    readonly rateLimit: number;
    readonly strictMode: boolean;
  };

  // Error Handling & Logging
  readonly error: {
    readonly legacyLogsEnabled: boolean;
  };

  // Testing & Coverage
  readonly testing: {
    readonly coverageTolerance: number;
    readonly skipPactTests: boolean;
    readonly performanceTest: boolean;
  };

  // CI/CD Environment Detection
  readonly ci: {
    readonly isCI: boolean;
    readonly provider: string | null;
    readonly isGitHubActions: boolean;
    readonly isTravis: boolean;
    readonly isCircleCI: boolean;
  };
}

/**
 * Centralized Configuration Class
 *
 * Singleton that provides type-safe access to all configuration values.
 * Replaces scattered process.env access throughout the codebase.
 */
export class Config {
  private static instance: Config | null = null;
  private readonly config: AppConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Get configuration object (read-only)
   */
  public get(): AppConfig {
    return this.config;
  }

  /**
   * Load and validate all configuration from environment
   */
  private loadConfiguration(): AppConfig {
    const nodeEnv = process.env.NODE_ENV || "development";

    return {
      wordpress: {
        siteUrl: process.env.WORDPRESS_SITE_URL,
        username: process.env.WORDPRESS_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        password: process.env.WORDPRESS_PASSWORD,
        authMethod: process.env.WORDPRESS_AUTH_METHOD || "app-password",
        timeout: parseInt(process.env.WORDPRESS_TIMEOUT || "30000", 10),
        maxRetries: parseInt(process.env.WORDPRESS_MAX_RETRIES || "3", 10),
        jwtSecret: process.env.WORDPRESS_JWT_SECRET,
        apiKey: process.env.WORDPRESS_API_KEY,
        cookieNonce: process.env.WORDPRESS_COOKIE_NONCE,
        jwtPassword: process.env.WORDPRESS_JWT_PASSWORD,
      },

      app: {
        nodeEnv,
        isDevelopment: nodeEnv === "development",
        isProduction: nodeEnv === "production",
        isTest: nodeEnv === "test",
        isDXT: nodeEnv === "dxt",
        isCI: this.detectCIEnvironment(),
      },

      debug: {
        enabled: process.env.DEBUG === "true",
        logLevel: process.env.LOG_LEVEL || "info",
      },

      cache: {
        disabled: process.env.DISABLE_CACHE === "true",
        ttl: parseInt(process.env.CACHE_TTL || "300", 10), // 5 minutes default
        maxItems: parseInt(process.env.CACHE_MAX_ITEMS || "1000", 10),
        maxMemoryMB: parseInt(process.env.CACHE_MAX_MEMORY_MB || "50", 10),
      },

      security: {
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
        rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || "100", 10),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "60000", 10), // 1 minute
        rateLimit: parseInt(process.env.RATE_LIMIT || "60", 10),
        strictMode: process.env.SECURITY_STRICT_MODE === "true",
      },

      error: {
        legacyLogsEnabled: process.env.LEGACY_ERROR_LOGS !== "0",
      },

      testing: {
        coverageTolerance: parseFloat(process.env.COVERAGE_TOLERANCE || "1.0"),
        skipPactTests: process.env.SKIP_PACT_TESTS === "true",
        performanceTest: process.env.PERFORMANCE_TEST === "true",
      },

      ci: {
        isCI: this.detectCIEnvironment(),
        provider: this.detectCIProvider(),
        isGitHubActions: process.env.GITHUB_ACTIONS === "true",
        isTravis: process.env.TRAVIS === "true",
        isCircleCI: process.env.CIRCLECI === "true",
      },
    };
  }

  /**
   * Detect if running in CI environment
   */
  private detectCIEnvironment(): boolean {
    return (
      process.env.CI === "true" ||
      process.env.NODE_ENV === "ci" ||
      process.env.NODE_ENV === "test" ||
      process.env.GITHUB_ACTIONS === "true" ||
      process.env.TRAVIS === "true" ||
      process.env.CIRCLECI === "true"
    );
  }

  /**
   * Detect CI provider
   */
  private detectCIProvider(): string | null {
    if (process.env.GITHUB_ACTIONS === "true") return "github-actions";
    if (process.env.TRAVIS === "true") return "travis";
    if (process.env.CIRCLECI === "true") return "circleci";
    if (process.env.CI === "true") return "generic";
    return null;
  }

  // Convenience methods for common checks

  /**
   * Should log debug information?
   */
  public shouldDebug(): boolean {
    return this.config.debug.enabled && !this.config.app.isDXT;
  }

  /**
   * Should use caching?
   */
  public shouldUseCache(): boolean {
    return !this.config.cache.disabled;
  }

  /**
   * Should log info messages? (not in test or DXT mode)
   */
  public shouldLogInfo(): boolean {
    return !this.config.app.isTest && !this.config.app.isDXT;
  }

  /**
   * Is WordPress configuration complete?
   */
  public hasWordPressConfig(): boolean {
    const wp = this.config.wordpress;
    return !!(wp.siteUrl && wp.username && wp.appPassword);
  }

  /**
   * Get environment-appropriate timeout for operations
   */
  public getOperationTimeout(): number {
    if (this.config.app.isTest) return 5000; // 5 seconds in tests
    if (this.config.app.isCI) return 30000; // 30 seconds in CI
    return 60000; // 1 minute in development/production
  }

  /**
   * Reset singleton (for testing)
   */
  public static reset(): void {
    Config.instance = null;
  }
}

/**
 * Global configuration instance getter
 * Use this throughout the application instead of process.env
 */
export const config = () => Config.getInstance().get();

/**
 * Configuration helper utilities
 */
export const ConfigHelpers = {
  /**
   * Get config instance
   */
  get: () => Config.getInstance(),

  /**
   * Quick environment checks
   */
  isDev: () => config().app.isDevelopment,
  isProd: () => config().app.isProduction,
  isTest: () => config().app.isTest,
  isDXT: () => config().app.isDXT,
  isCI: () => config().app.isCI,

  /**
   * Quick feature flags
   */
  shouldDebug: () => Config.getInstance().shouldDebug(),
  shouldUseCache: () => Config.getInstance().shouldUseCache(),
  shouldLogInfo: () => Config.getInstance().shouldLogInfo(),
  hasWordPressConfig: () => Config.getInstance().hasWordPressConfig(),

  /**
   * Get timeout for different operation types
   */
  getTimeout: (type: "operation" | "upload" | "test" = "operation") => {
    const instance = Config.getInstance();
    switch (type) {
      case "upload":
        return instance.getOperationTimeout() * 5; // 5x longer for uploads
      case "test":
        return config().app.isCI ? 30000 : 10000;
      default:
        return instance.getOperationTimeout();
    }
  },
};
