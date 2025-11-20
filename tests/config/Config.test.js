/**
 * Comprehensive tests for Config.ts
 * Target: Increase coverage from 60% to 85%+
 *
 * Covers:
 * - Singleton pattern
 * - Environment variable loading
 * - Configuration parsing (integers, floats, booleans)
 * - Default values
 * - WordPress configuration
 * - Cache configuration
 * - Security configuration
 * - SEO configuration
 * - CI detection
 * - Helper methods
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Config, ConfigHelpers, config } from "@/config/Config.js";

describe("Config.ts - Comprehensive Coverage", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Config.reset();

    // Clean environment
    delete process.env.NODE_ENV;
    delete process.env.DEBUG;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TRAVIS;
    delete process.env.CIRCLECI;
  });

  afterEach(() => {
    process.env = originalEnv;
    Config.reset();
  });

  describe("Singleton Pattern", () => {
    it("should create a single instance", () => {
      const instance1 = Config.getInstance();
      const instance2 = Config.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(Config);
    });

    it("should reset and create new instance", () => {
      const instance1 = Config.getInstance();
      Config.reset();
      const instance2 = Config.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it("should return configuration object", () => {
      const cfg = Config.getInstance().get();

      expect(cfg).toBeDefined();
      expect(cfg).toHaveProperty("wordpress");
      expect(cfg).toHaveProperty("app");
      expect(cfg).toHaveProperty("debug");
      expect(cfg).toHaveProperty("cache");
      expect(cfg).toHaveProperty("security");
      expect(cfg).toHaveProperty("seo");
    });

    it("config() helper should return same object as getInstance().get()", () => {
      const cfg1 = config();
      const cfg2 = Config.getInstance().get();

      expect(cfg1).toEqual(cfg2);
    });
  });

  describe("WordPress Configuration", () => {
    it("should load WordPress site URL", () => {
      process.env.WORDPRESS_SITE_URL = "https://example.com";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.siteUrl).toBe("https://example.com");
    });

    it("should load WordPress username", () => {
      process.env.WORDPRESS_USERNAME = "admin";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.username).toBe("admin");
    });

    it("should load WordPress app password", () => {
      process.env.WORDPRESS_APP_PASSWORD = "abcd 1234 efgh 5678";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.appPassword).toBe("abcd 1234 efgh 5678");
    });

    it("should load WordPress basic auth password", () => {
      process.env.WORDPRESS_PASSWORD = "secret123";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.password).toBe("secret123");
    });

    it("should default to app-password auth method", () => {
      delete process.env.WORDPRESS_AUTH_METHOD;
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.authMethod).toBe("app-password");
    });

    it("should load custom auth method", () => {
      process.env.WORDPRESS_AUTH_METHOD = "jwt";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.authMethod).toBe("jwt");
    });

    it("should load JWT secret", () => {
      process.env.WORDPRESS_JWT_SECRET = "jwt-secret-key";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.jwtSecret).toBe("jwt-secret-key");
    });

    it("should load JWT password", () => {
      process.env.WORDPRESS_JWT_PASSWORD = "jwt-password";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.jwtPassword).toBe("jwt-password");
    });

    it("should load API key", () => {
      process.env.WORDPRESS_API_KEY = "api-key-123";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.apiKey).toBe("api-key-123");
    });

    it("should load cookie nonce", () => {
      process.env.WORDPRESS_COOKIE_NONCE = "nonce-123";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.cookieNonce).toBe("nonce-123");
    });

    it("should parse timeout as integer", () => {
      process.env.WORDPRESS_TIMEOUT = "60000";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.timeout).toBe(60000);
      expect(typeof cfg.wordpress.timeout).toBe("number");
    });

    it("should use default timeout", () => {
      delete process.env.WORDPRESS_TIMEOUT;
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.timeout).toBe(30000);
    });

    it("should parse max retries as integer", () => {
      process.env.WORDPRESS_MAX_RETRIES = "5";
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.maxRetries).toBe(5);
      expect(typeof cfg.wordpress.maxRetries).toBe("number");
    });

    it("should use default max retries", () => {
      delete process.env.WORDPRESS_MAX_RETRIES;
      Config.reset();

      const cfg = config();
      expect(cfg.wordpress.maxRetries).toBe(3);
    });
  });

  describe("App Configuration", () => {
    it("should detect development environment", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const cfg = config();
      expect(cfg.app.nodeEnv).toBe("development");
      expect(cfg.app.isDevelopment).toBe(true);
      expect(cfg.app.isProduction).toBe(false);
      expect(cfg.app.isTest).toBe(false);
      expect(cfg.app.isDXT).toBe(false);
    });

    it("should detect production environment", () => {
      process.env.NODE_ENV = "production";
      Config.reset();

      const cfg = config();
      expect(cfg.app.nodeEnv).toBe("production");
      expect(cfg.app.isProduction).toBe(true);
      expect(cfg.app.isDevelopment).toBe(false);
      expect(cfg.app.isTest).toBe(false);
      expect(cfg.app.isDXT).toBe(false);
    });

    it("should detect test environment", () => {
      process.env.NODE_ENV = "test";
      Config.reset();

      const cfg = config();
      expect(cfg.app.nodeEnv).toBe("test");
      expect(cfg.app.isTest).toBe(true);
      expect(cfg.app.isDevelopment).toBe(false);
      expect(cfg.app.isProduction).toBe(false);
      expect(cfg.app.isDXT).toBe(false);
    });

    it("should detect DXT environment", () => {
      process.env.NODE_ENV = "dxt";
      Config.reset();

      const cfg = config();
      expect(cfg.app.nodeEnv).toBe("dxt");
      expect(cfg.app.isDXT).toBe(true);
      expect(cfg.app.isDevelopment).toBe(false);
      expect(cfg.app.isProduction).toBe(false);
      expect(cfg.app.isTest).toBe(false);
    });

    it("should default to development when NODE_ENV is undefined", () => {
      delete process.env.NODE_ENV;
      Config.reset();

      const cfg = config();
      expect(cfg.app.nodeEnv).toBe("development");
      expect(cfg.app.isDevelopment).toBe(true);
    });

    it("should detect CI from GITHUB_ACTIONS", () => {
      process.env.GITHUB_ACTIONS = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.app.isCI).toBe(true);
    });

    it("should detect CI from TRAVIS", () => {
      process.env.TRAVIS = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.app.isCI).toBe(true);
    });

    it("should detect CI from CIRCLECI", () => {
      process.env.CIRCLECI = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.app.isCI).toBe(true);
    });

    it("should detect CI from generic CI variable", () => {
      process.env.CI = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.app.isCI).toBe(true);
    });

    it("should detect CI from NODE_ENV=ci", () => {
      process.env.NODE_ENV = "ci";
      Config.reset();

      const cfg = config();
      expect(cfg.app.isCI).toBe(true);
    });

    it("should not detect CI in normal environment", () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.TRAVIS;
      delete process.env.CIRCLECI;
      process.env.NODE_ENV = "development";
      Config.reset();

      const cfg = config();
      expect(cfg.app.isCI).toBe(false);
    });
  });

  describe("Debug Configuration", () => {
    it("should enable debug when DEBUG=true", () => {
      process.env.DEBUG = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.debug.enabled).toBe(true);
    });

    it("should disable debug by default", () => {
      delete process.env.DEBUG;
      Config.reset();

      const cfg = config();
      expect(cfg.debug.enabled).toBe(false);
    });

    it("should load log level", () => {
      process.env.LOG_LEVEL = "debug";
      Config.reset();

      const cfg = config();
      expect(cfg.debug.logLevel).toBe("debug");
    });

    it("should default to info log level", () => {
      delete process.env.LOG_LEVEL;
      Config.reset();

      const cfg = config();
      expect(cfg.debug.logLevel).toBe("info");
    });
  });

  describe("Cache Configuration", () => {
    it("should enable cache by default", () => {
      delete process.env.CACHE_DISABLED;
      delete process.env.DISABLE_CACHE;
      Config.reset();

      const cfg = config();
      expect(cfg.cache.disabled).toBe(false);
    });

    it("should disable cache with CACHE_DISABLED=true", () => {
      process.env.CACHE_DISABLED = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.cache.disabled).toBe(true);
    });

    it("should disable cache with DISABLE_CACHE=true", () => {
      process.env.DISABLE_CACHE = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.cache.disabled).toBe(true);
    });

    it("should handle truthy values for cache disable", () => {
      const truthyValues = ["true", "1", "yes", "on", "enable", "enabled"];

      truthyValues.forEach((value) => {
        process.env.CACHE_DISABLED = value;
        Config.reset();
        const cfg = config();
        expect(cfg.cache.disabled).toBe(true);
      });
    });

    it("should handle falsy values for cache disable", () => {
      const falsyValues = ["false", "0", "no", "off"];

      falsyValues.forEach((value) => {
        process.env.CACHE_DISABLED = value;
        Config.reset();
        const cfg = config();
        expect(cfg.cache.disabled).toBe(false);
      });
    });

    it("should parse cache TTL as integer", () => {
      process.env.CACHE_TTL = "600";
      Config.reset();

      const cfg = config();
      expect(cfg.cache.ttl).toBe(600);
      expect(typeof cfg.cache.ttl).toBe("number");
    });

    it("should use default cache TTL", () => {
      delete process.env.CACHE_TTL;
      Config.reset();

      const cfg = config();
      expect(cfg.cache.ttl).toBe(300);
    });

    it("should parse cache max items", () => {
      process.env.CACHE_MAX_ITEMS = "5000";
      Config.reset();

      const cfg = config();
      expect(cfg.cache.maxItems).toBe(5000);
    });

    it("should use default cache max items", () => {
      delete process.env.CACHE_MAX_ITEMS;
      Config.reset();

      const cfg = config();
      expect(cfg.cache.maxItems).toBe(1000);
    });

    it("should parse cache max memory MB", () => {
      process.env.CACHE_MAX_MEMORY_MB = "100";
      Config.reset();

      const cfg = config();
      expect(cfg.cache.maxMemoryMB).toBe(100);
    });

    it("should use default cache max memory", () => {
      delete process.env.CACHE_MAX_MEMORY_MB;
      Config.reset();

      const cfg = config();
      expect(cfg.cache.maxMemoryMB).toBe(50);
    });
  });

  describe("Security Configuration", () => {
    it("should enable rate limiting by default", () => {
      delete process.env.RATE_LIMIT_ENABLED;
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimitEnabled).toBe(true);
    });

    it("should disable rate limiting when explicitly disabled", () => {
      process.env.RATE_LIMIT_ENABLED = "false";
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimitEnabled).toBe(false);
    });

    it("should parse rate limit requests", () => {
      process.env.RATE_LIMIT_REQUESTS = "200";
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimitRequests).toBe(200);
    });

    it("should use default rate limit requests", () => {
      delete process.env.RATE_LIMIT_REQUESTS;
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimitRequests).toBe(100);
    });

    it("should parse rate limit window", () => {
      process.env.RATE_LIMIT_WINDOW = "120000";
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimitWindow).toBe(120000);
    });

    it("should use default rate limit window", () => {
      delete process.env.RATE_LIMIT_WINDOW;
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimitWindow).toBe(60000);
    });

    it("should parse rate limit", () => {
      process.env.RATE_LIMIT = "120";
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimit).toBe(120);
    });

    it("should use default rate limit", () => {
      delete process.env.RATE_LIMIT;
      Config.reset();

      const cfg = config();
      expect(cfg.security.rateLimit).toBe(60);
    });

    it("should disable strict mode by default", () => {
      delete process.env.SECURITY_STRICT_MODE;
      Config.reset();

      const cfg = config();
      expect(cfg.security.strictMode).toBe(false);
    });

    it("should enable strict mode when set", () => {
      process.env.SECURITY_STRICT_MODE = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.security.strictMode).toBe(true);
    });
  });

  describe("Error Configuration", () => {
    it("should enable legacy logs by default", () => {
      delete process.env.LEGACY_ERROR_LOGS;
      Config.reset();

      const cfg = config();
      expect(cfg.error.legacyLogsEnabled).toBe(true);
    });

    it("should disable legacy logs when set to 0", () => {
      process.env.LEGACY_ERROR_LOGS = "0";
      Config.reset();

      const cfg = config();
      expect(cfg.error.legacyLogsEnabled).toBe(false);
    });
  });

  describe("Testing Configuration", () => {
    it("should parse coverage tolerance as float", () => {
      process.env.COVERAGE_TOLERANCE = "0.95";
      Config.reset();

      const cfg = config();
      expect(cfg.testing.coverageTolerance).toBe(0.95);
      expect(typeof cfg.testing.coverageTolerance).toBe("number");
    });

    it("should use default coverage tolerance", () => {
      delete process.env.COVERAGE_TOLERANCE;
      Config.reset();

      const cfg = config();
      expect(cfg.testing.coverageTolerance).toBe(1.0);
    });

    it("should skip pact tests when enabled", () => {
      process.env.SKIP_PACT_TESTS = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.testing.skipPactTests).toBe(true);
    });

    it("should not skip pact tests by default", () => {
      delete process.env.SKIP_PACT_TESTS;
      Config.reset();

      const cfg = config();
      expect(cfg.testing.skipPactTests).toBe(false);
    });

    it("should enable performance tests when set", () => {
      process.env.PERFORMANCE_TEST = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.testing.performanceTest).toBe(true);
    });

    it("should disable performance tests by default", () => {
      delete process.env.PERFORMANCE_TEST;
      Config.reset();

      const cfg = config();
      expect(cfg.testing.performanceTest).toBe(false);
    });
  });

  describe("CI Configuration", () => {
    it("should detect GitHub Actions provider", () => {
      process.env.GITHUB_ACTIONS = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.ci.isCI).toBe(true);
      expect(cfg.ci.provider).toBe("github-actions");
      expect(cfg.ci.isGitHubActions).toBe(true);
      expect(cfg.ci.isTravis).toBe(false);
      expect(cfg.ci.isCircleCI).toBe(false);
    });

    it("should detect Travis provider", () => {
      process.env.TRAVIS = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.ci.isCI).toBe(true);
      expect(cfg.ci.provider).toBe("travis");
      expect(cfg.ci.isTravis).toBe(true);
      expect(cfg.ci.isGitHubActions).toBe(false);
      expect(cfg.ci.isCircleCI).toBe(false);
    });

    it("should detect CircleCI provider", () => {
      process.env.CIRCLECI = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.ci.isCI).toBe(true);
      expect(cfg.ci.provider).toBe("circleci");
      expect(cfg.ci.isCircleCI).toBe(true);
      expect(cfg.ci.isGitHubActions).toBe(false);
      expect(cfg.ci.isTravis).toBe(false);
    });

    it("should detect generic CI provider", () => {
      process.env.CI = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.ci.isCI).toBe(true);
      expect(cfg.ci.provider).toBe("generic");
    });

    it("should return null provider when not in CI", () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.TRAVIS;
      delete process.env.CIRCLECI;
      Config.reset();

      const cfg = config();
      expect(cfg.ci.isCI).toBe(false);
      expect(cfg.ci.provider).toBeNull();
    });
  });

  describe("SEO Configuration", () => {
    it("should enable SEO by default", () => {
      delete process.env.SEO_ENABLED;
      Config.reset();

      const cfg = config();
      expect(cfg.seo.enabled).toBe(true);
    });

    it("should disable SEO when set", () => {
      process.env.SEO_ENABLED = "false";
      Config.reset();

      const cfg = config();
      expect(cfg.seo.enabled).toBe(false);
    });

    it("should load SEO provider settings", () => {
      process.env.SEO_PROVIDER_SEARCH_CONSOLE = "true";
      process.env.SEO_PROVIDER_DATAFORSEO = "true";
      process.env.SEO_PROVIDER_AHREFS = "true";
      Config.reset();

      const cfg = config();
      expect(cfg.seo.providers.searchConsole).toBe(true);
      expect(cfg.seo.providers.dataForSEO).toBe(true);
      expect(cfg.seo.providers.ahrefs).toBe(true);
    });

    it("should disable SEO providers by default", () => {
      delete process.env.SEO_PROVIDER_SEARCH_CONSOLE;
      delete process.env.SEO_PROVIDER_DATAFORSEO;
      delete process.env.SEO_PROVIDER_AHREFS;
      Config.reset();

      const cfg = config();
      expect(cfg.seo.providers.searchConsole).toBe(false);
      expect(cfg.seo.providers.dataForSEO).toBe(false);
      expect(cfg.seo.providers.ahrefs).toBe(false);
    });

    it("should parse SEO limit integers", () => {
      process.env.SEO_BULK_OPERATION_SIZE = "20";
      process.env.SEO_RATE_LIMIT_PER_MINUTE = "60";
      process.env.SEO_MAX_CONCURRENT_ANALYSIS = "10";
      Config.reset();

      const cfg = config();
      expect(cfg.seo.limits.bulkOperationSize).toBe(20);
      expect(cfg.seo.limits.rateLimitPerMinute).toBe(60);
      expect(cfg.seo.limits.maxConcurrentAnalysis).toBe(10);
    });

    it("should use default SEO limits", () => {
      delete process.env.SEO_BULK_OPERATION_SIZE;
      delete process.env.SEO_RATE_LIMIT_PER_MINUTE;
      delete process.env.SEO_MAX_CONCURRENT_ANALYSIS;
      Config.reset();

      const cfg = config();
      expect(cfg.seo.limits.bulkOperationSize).toBe(10);
      expect(cfg.seo.limits.rateLimitPerMinute).toBe(30);
      expect(cfg.seo.limits.maxConcurrentAnalysis).toBe(5);
    });

    it("should parse SEO cache TTL values", () => {
      process.env.SEO_CACHE_ANALYSIS_TTL = "43200";
      process.env.SEO_CACHE_SCHEMA_TTL = "172800";
      process.env.SEO_CACHE_AUDIT_TTL = "7200";
      process.env.SEO_CACHE_KEYWORDS_TTL = "1209600";
      Config.reset();

      const cfg = config();
      expect(cfg.seo.cache.analysisTTL).toBe(43200);
      expect(cfg.seo.cache.schemaTTL).toBe(172800);
      expect(cfg.seo.cache.auditTTL).toBe(7200);
      expect(cfg.seo.cache.keywordsTTL).toBe(1209600);
    });

    it("should use default SEO cache TTL values", () => {
      delete process.env.SEO_CACHE_ANALYSIS_TTL;
      delete process.env.SEO_CACHE_SCHEMA_TTL;
      delete process.env.SEO_CACHE_AUDIT_TTL;
      delete process.env.SEO_CACHE_KEYWORDS_TTL;
      Config.reset();

      const cfg = config();
      expect(cfg.seo.cache.analysisTTL).toBe(21600); // 6 hours
      expect(cfg.seo.cache.schemaTTL).toBe(86400); // 24 hours
      expect(cfg.seo.cache.auditTTL).toBe(3600); // 1 hour
      expect(cfg.seo.cache.keywordsTTL).toBe(604800); // 7 days
    });

    it("should parse SEO metadata lengths", () => {
      process.env.SEO_TITLE_MAX_LENGTH = "70";
      process.env.SEO_DESCRIPTION_MAX_LENGTH = "200";
      process.env.SEO_DESCRIPTION_MIN_LENGTH = "150";
      Config.reset();

      const cfg = config();
      expect(cfg.seo.metadata.titleMaxLength).toBe(70);
      expect(cfg.seo.metadata.descriptionMaxLength).toBe(200);
      expect(cfg.seo.metadata.descriptionMinLength).toBe(150);
    });

    it("should use default SEO metadata lengths", () => {
      delete process.env.SEO_TITLE_MAX_LENGTH;
      delete process.env.SEO_DESCRIPTION_MAX_LENGTH;
      delete process.env.SEO_DESCRIPTION_MIN_LENGTH;
      Config.reset();

      const cfg = config();
      expect(cfg.seo.metadata.titleMaxLength).toBe(60);
      expect(cfg.seo.metadata.descriptionMaxLength).toBe(160);
      expect(cfg.seo.metadata.descriptionMinLength).toBe(155);
    });

    it("should parse SEO analysis floats", () => {
      process.env.SEO_MIN_WORD_COUNT = "500";
      process.env.SEO_TARGET_KEYWORD_DENSITY = "3.0";
      process.env.SEO_MAX_KEYWORD_DENSITY = "4.5";
      process.env.SEO_MIN_READABILITY_SCORE = "70";
      Config.reset();

      const cfg = config();
      expect(cfg.seo.analysis.minWordCount).toBe(500);
      expect(cfg.seo.analysis.targetKeywordDensity).toBe(3.0);
      expect(cfg.seo.analysis.maxKeywordDensity).toBe(4.5);
      expect(cfg.seo.analysis.minReadabilityScore).toBe(70);
    });

    it("should use default SEO analysis values", () => {
      delete process.env.SEO_MIN_WORD_COUNT;
      delete process.env.SEO_TARGET_KEYWORD_DENSITY;
      delete process.env.SEO_MAX_KEYWORD_DENSITY;
      delete process.env.SEO_MIN_READABILITY_SCORE;
      Config.reset();

      const cfg = config();
      expect(cfg.seo.analysis.minWordCount).toBe(300);
      expect(cfg.seo.analysis.targetKeywordDensity).toBe(2.5);
      expect(cfg.seo.analysis.maxKeywordDensity).toBe(3.5);
      expect(cfg.seo.analysis.minReadabilityScore).toBe(60);
    });
  });

  describe("Instance Methods", () => {
    it("shouldDebug() should return true when debug enabled", () => {
      process.env.DEBUG = "true";
      process.env.NODE_ENV = "development";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldDebug()).toBe(true);
    });

    it("shouldDebug() should return false when debug disabled", () => {
      delete process.env.DEBUG;
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldDebug()).toBe(false);
    });

    it("shouldDebug() should return false in DXT mode", () => {
      process.env.DEBUG = "true";
      process.env.NODE_ENV = "dxt";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldDebug()).toBe(false);
    });

    it("shouldUseCache() should return true when cache enabled", () => {
      delete process.env.CACHE_DISABLED;
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldUseCache()).toBe(true);
    });

    it("shouldUseCache() should return false when cache disabled", () => {
      process.env.CACHE_DISABLED = "true";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldUseCache()).toBe(false);
    });

    it("shouldLogInfo() should return true in development", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldLogInfo()).toBe(true);
    });

    it("shouldLogInfo() should return false in test mode", () => {
      process.env.NODE_ENV = "test";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldLogInfo()).toBe(false);
    });

    it("shouldLogInfo() should return false in DXT mode", () => {
      process.env.NODE_ENV = "dxt";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.shouldLogInfo()).toBe(false);
    });

    it("hasWordPressConfig() should return true when fully configured", () => {
      process.env.WORDPRESS_SITE_URL = "https://example.com";
      process.env.WORDPRESS_USERNAME = "admin";
      process.env.WORDPRESS_APP_PASSWORD = "password";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.hasWordPressConfig()).toBe(true);
    });

    it("hasWordPressConfig() should return false when missing site URL", () => {
      delete process.env.WORDPRESS_SITE_URL;
      process.env.WORDPRESS_USERNAME = "admin";
      process.env.WORDPRESS_APP_PASSWORD = "password";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.hasWordPressConfig()).toBe(false);
    });

    it("hasWordPressConfig() should return false when missing username", () => {
      process.env.WORDPRESS_SITE_URL = "https://example.com";
      delete process.env.WORDPRESS_USERNAME;
      process.env.WORDPRESS_APP_PASSWORD = "password";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.hasWordPressConfig()).toBe(false);
    });

    it("hasWordPressConfig() should return false when missing password", () => {
      process.env.WORDPRESS_SITE_URL = "https://example.com";
      process.env.WORDPRESS_USERNAME = "admin";
      delete process.env.WORDPRESS_APP_PASSWORD;
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.hasWordPressConfig()).toBe(false);
    });

    it("getOperationTimeout() should return 5s in test mode", () => {
      process.env.NODE_ENV = "test";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.getOperationTimeout()).toBe(5000);
    });

    it("getOperationTimeout() should return 30s in CI", () => {
      process.env.CI = "true";
      process.env.NODE_ENV = "development";
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.getOperationTimeout()).toBe(30000);
    });

    it("getOperationTimeout() should return 60s in development/production", () => {
      process.env.NODE_ENV = "development";
      delete process.env.CI;
      Config.reset();

      const instance = Config.getInstance();
      expect(instance.getOperationTimeout()).toBe(60000);
    });
  });

  describe("ConfigHelpers", () => {
    it("should provide environment checks", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      expect(ConfigHelpers.isDev()).toBe(true);
      expect(ConfigHelpers.isProd()).toBe(false);
      expect(ConfigHelpers.isTest()).toBe(false);
      expect(ConfigHelpers.isDXT()).toBe(false);
      expect(ConfigHelpers.isCI()).toBe(false);
    });

    it("should provide feature flags", () => {
      process.env.DEBUG = "true";
      process.env.NODE_ENV = "development";
      delete process.env.CACHE_DISABLED;
      process.env.WORDPRESS_SITE_URL = "https://example.com";
      process.env.WORDPRESS_USERNAME = "admin";
      process.env.WORDPRESS_APP_PASSWORD = "password";
      Config.reset();

      expect(ConfigHelpers.shouldDebug()).toBe(true);
      expect(ConfigHelpers.shouldUseCache()).toBe(true);
      expect(ConfigHelpers.shouldLogInfo()).toBe(true);
      expect(ConfigHelpers.hasWordPressConfig()).toBe(true);
    });

    it("should provide timeout helpers", () => {
      process.env.NODE_ENV = "development";
      delete process.env.CI;
      Config.reset();

      const operationTimeout = ConfigHelpers.getTimeout("operation");
      const uploadTimeout = ConfigHelpers.getTimeout("upload");
      const testTimeout = ConfigHelpers.getTimeout("test");

      expect(operationTimeout).toBe(60000);
      expect(uploadTimeout).toBe(300000); // 5x operation
      expect(testTimeout).toBe(10000);
    });

    it("should return operation timeout as default", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const defaultTimeout = ConfigHelpers.getTimeout();
      const operationTimeout = ConfigHelpers.getTimeout("operation");

      expect(defaultTimeout).toBe(operationTimeout);
    });
  });
});
