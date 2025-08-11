/**
 * Tests for centralized configuration management
 */
import { jest } from "@jest/globals";
import { Config, ConfigHelpers, config } from "../../dist/config/Config.js";

describe("Config", () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset singleton
    Config.reset();
    
    // Set up test environment
    process.env.NODE_ENV = "test";
    process.env.WORDPRESS_SITE_URL = "https://test.example.com";
    process.env.WORDPRESS_USERNAME = "testuser";
    process.env.WORDPRESS_APP_PASSWORD = "test-password";
    process.env.WORDPRESS_AUTH_METHOD = "app-password";
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Reset singleton
    Config.reset();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = Config.getInstance();
      const instance2 = Config.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it("should reset singleton when requested", () => {
      const instance1 = Config.getInstance();
      Config.reset();
      const instance2 = Config.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Configuration Loading", () => {
    it("should load WordPress configuration from environment", () => {
      const configInstance = Config.getInstance();
      const appConfig = configInstance.get();
      
      expect(appConfig.wordpress.siteUrl).toBe("https://test.example.com");
      expect(appConfig.wordpress.username).toBe("testuser");
      expect(appConfig.wordpress.appPassword).toBe("test-password");
      expect(appConfig.wordpress.authMethod).toBe("app-password");
    });

    it("should use default auth method when not specified", () => {
      delete process.env.WORDPRESS_AUTH_METHOD;
      Config.reset();
      
      const configInstance = Config.getInstance();
      const appConfig = configInstance.get();
      
      expect(appConfig.wordpress.authMethod).toBe("app-password");
    });

    it("should detect environment modes", () => {
      // Test development mode
      process.env.NODE_ENV = "development";
      Config.reset();
      
      let appConfig = Config.getInstance().get();
      expect(appConfig.app.isDevelopment).toBe(true);
      expect(appConfig.app.isProduction).toBe(false);
      expect(appConfig.app.isTest).toBe(false);
      expect(appConfig.app.isDXT).toBe(false);
      
      // Test production mode
      process.env.NODE_ENV = "production";
      Config.reset();
      
      appConfig = Config.getInstance().get();
      expect(appConfig.app.isDevelopment).toBe(false);
      expect(appConfig.app.isProduction).toBe(true);
      expect(appConfig.app.isTest).toBe(false);
      
      // Test DXT mode
      process.env.NODE_ENV = "dxt";
      Config.reset();
      
      appConfig = Config.getInstance().get();
      expect(appConfig.app.isDXT).toBe(true);
    });

    it("should detect CI environment", () => {
      // GitHub Actions
      process.env.GITHUB_ACTIONS = "true";
      Config.reset();
      
      let appConfig = Config.getInstance().get();
      expect(appConfig.app.isCI).toBe(true);
      expect(appConfig.ci.isGitHubActions).toBe(true);
      expect(appConfig.ci.provider).toBe("github-actions");
      
      // Travis CI
      delete process.env.GITHUB_ACTIONS;
      process.env.TRAVIS = "true";
      Config.reset();
      
      appConfig = Config.getInstance().get();
      expect(appConfig.app.isCI).toBe(true);
      expect(appConfig.ci.isTravis).toBe(true);
      expect(appConfig.ci.provider).toBe("travis");
      
      // Generic CI
      delete process.env.TRAVIS;
      process.env.CI = "true";
      Config.reset();
      
      appConfig = Config.getInstance().get();
      expect(appConfig.app.isCI).toBe(true);
      expect(appConfig.ci.provider).toBe("generic");
    });

    it("should load debug configuration", () => {
      process.env.DEBUG = "true";
      process.env.LOG_LEVEL = "debug";
      Config.reset();
      
      const appConfig = Config.getInstance().get();
      
      expect(appConfig.debug.enabled).toBe(true);
      expect(appConfig.debug.logLevel).toBe("debug");
    });

    it("should load cache configuration", () => {
      process.env.DISABLE_CACHE = "true";
      process.env.CACHE_TTL = "600";
      process.env.CACHE_MAX_ITEMS = "2000";
      process.env.CACHE_MAX_MEMORY_MB = "100";
      Config.reset();
      
      const appConfig = Config.getInstance().get();
      
      expect(appConfig.cache.disabled).toBe(true);
      expect(appConfig.cache.ttl).toBe(600);
      expect(appConfig.cache.maxItems).toBe(2000);
      expect(appConfig.cache.maxMemoryMB).toBe(100);
    });

    it("should use default cache values when not specified", () => {
      Config.reset();
      
      const appConfig = Config.getInstance().get();
      
      expect(appConfig.cache.disabled).toBe(false);
      expect(appConfig.cache.ttl).toBe(300);
      expect(appConfig.cache.maxItems).toBe(1000);
      expect(appConfig.cache.maxMemoryMB).toBe(50);
    });

    it("should load security configuration", () => {
      process.env.RATE_LIMIT_ENABLED = "false";
      process.env.RATE_LIMIT_REQUESTS = "200";
      process.env.RATE_LIMIT_WINDOW = "120000";
      process.env.SECURITY_STRICT_MODE = "true";
      Config.reset();
      
      const appConfig = Config.getInstance().get();
      
      expect(appConfig.security.rateLimitEnabled).toBe(false);
      expect(appConfig.security.rateLimitRequests).toBe(200);
      expect(appConfig.security.rateLimitWindow).toBe(120000);
      expect(appConfig.security.strictMode).toBe(true);
    });

    it("should load testing configuration", () => {
      process.env.COVERAGE_TOLERANCE = "2.5";
      process.env.SKIP_PACT_TESTS = "true";
      process.env.PERFORMANCE_TEST = "true";
      Config.reset();
      
      const appConfig = Config.getInstance().get();
      
      expect(appConfig.testing.coverageTolerance).toBe(2.5);
      expect(appConfig.testing.skipPactTests).toBe(true);
      expect(appConfig.testing.performanceTest).toBe(true);
    });
  });

  describe("Convenience Methods", () => {
    it("should check if debug should be enabled", () => {
      const configInstance = Config.getInstance();
      
      // Debug disabled by default
      expect(configInstance.shouldDebug()).toBe(false);
      
      // Enable debug
      process.env.DEBUG = "true";
      process.env.NODE_ENV = "development";
      Config.reset();
      
      expect(Config.getInstance().shouldDebug()).toBe(true);
      
      // Disable in DXT mode even with debug enabled
      process.env.NODE_ENV = "dxt";
      Config.reset();
      
      expect(Config.getInstance().shouldDebug()).toBe(false);
    });

    it("should check if cache should be used", () => {
      const configInstance = Config.getInstance();
      
      // Cache enabled by default
      expect(configInstance.shouldUseCache()).toBe(true);
      
      // Disable cache
      process.env.DISABLE_CACHE = "true";
      Config.reset();
      
      expect(Config.getInstance().shouldUseCache()).toBe(false);
    });

    it("should check if info logging should be enabled", () => {
      // Disabled in test mode
      process.env.NODE_ENV = "test";
      Config.reset();
      
      expect(Config.getInstance().shouldLogInfo()).toBe(false);
      
      // Disabled in DXT mode
      process.env.NODE_ENV = "dxt";
      Config.reset();
      
      expect(Config.getInstance().shouldLogInfo()).toBe(false);
      
      // Enabled in development
      process.env.NODE_ENV = "development";
      Config.reset();
      
      expect(Config.getInstance().shouldLogInfo()).toBe(true);
    });

    it("should check if WordPress config is complete", () => {
      const configInstance = Config.getInstance();
      
      // Complete config
      expect(configInstance.hasWordPressConfig()).toBe(true);
      
      // Missing site URL
      delete process.env.WORDPRESS_SITE_URL;
      Config.reset();
      
      expect(Config.getInstance().hasWordPressConfig()).toBe(false);
      
      // Missing username
      process.env.WORDPRESS_SITE_URL = "https://test.com";
      delete process.env.WORDPRESS_USERNAME;
      Config.reset();
      
      expect(Config.getInstance().hasWordPressConfig()).toBe(false);
      
      // Missing password
      process.env.WORDPRESS_USERNAME = "user";
      delete process.env.WORDPRESS_APP_PASSWORD;
      Config.reset();
      
      expect(Config.getInstance().hasWordPressConfig()).toBe(false);
    });

    it("should get appropriate operation timeouts", () => {
      // Test environment
      process.env.NODE_ENV = "test";
      Config.reset();
      
      expect(Config.getInstance().getOperationTimeout()).toBe(5000);
      
      // CI environment
      process.env.CI = "true";
      process.env.NODE_ENV = "ci";  // Set NODE_ENV to ensure proper CI detection
      Config.reset();
      
      expect(Config.getInstance().getOperationTimeout()).toBe(30000);
      
      // Development/Production
      delete process.env.CI;
      process.env.NODE_ENV = "development";
      Config.reset();
      
      expect(Config.getInstance().getOperationTimeout()).toBe(60000);
    });
  });

  describe("ConfigHelpers", () => {
    it("should provide quick environment checks", () => {
      // Development
      process.env.NODE_ENV = "development";
      Config.reset();
      
      expect(ConfigHelpers.isDev()).toBe(true);
      expect(ConfigHelpers.isProd()).toBe(false);
      expect(ConfigHelpers.isTest()).toBe(false);
      expect(ConfigHelpers.isDXT()).toBe(false);
      
      // Production
      process.env.NODE_ENV = "production";
      Config.reset();
      
      expect(ConfigHelpers.isDev()).toBe(false);
      expect(ConfigHelpers.isProd()).toBe(true);
      
      // Test
      process.env.NODE_ENV = "test";
      Config.reset();
      
      expect(ConfigHelpers.isTest()).toBe(true);
      
      // DXT
      process.env.NODE_ENV = "dxt";
      Config.reset();
      
      expect(ConfigHelpers.isDXT()).toBe(true);
      
      // CI
      process.env.CI = "true";
      Config.reset();
      
      expect(ConfigHelpers.isCI()).toBe(true);
    });

    it("should provide quick feature flags", () => {
      expect(ConfigHelpers.shouldDebug()).toBe(false);
      expect(ConfigHelpers.shouldUseCache()).toBe(true);
      expect(ConfigHelpers.hasWordPressConfig()).toBe(true);
    });

    it("should get timeouts by type", () => {
      process.env.NODE_ENV = "development";
      Config.reset();
      
      // Default operation timeout
      expect(ConfigHelpers.getTimeout()).toBe(60000);
      expect(ConfigHelpers.getTimeout("operation")).toBe(60000);
      
      // Upload timeout (5x longer)
      expect(ConfigHelpers.getTimeout("upload")).toBe(300000);
      
      // Test timeout
      expect(ConfigHelpers.getTimeout("test")).toBe(10000);
      
      // Test timeout in CI
      process.env.CI = "true";
      Config.reset();
      
      expect(ConfigHelpers.getTimeout("test")).toBe(30000);
    });
  });

  describe("Global config helper", () => {
    it("should provide config through global helper", () => {
      const appConfig = config();
      
      expect(appConfig.wordpress.siteUrl).toBe("https://test.example.com");
      expect(appConfig.app.nodeEnv).toBe("test");
    });
  });
});