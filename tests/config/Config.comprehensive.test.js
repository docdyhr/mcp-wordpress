import { Config, ConfigHelpers } from "../../src/config/Config.ts";

describe("Config Comprehensive Tests", () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset Config singleton
    Config.reset();

    // Set clean test environment
    process.env.NODE_ENV = "test";
    delete process.env.DEBUG;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TRAVIS;
    delete process.env.CIRCLECI;
    delete process.env.CI;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    Config.reset();
  });

  describe("CI Provider Detection", () => {
    it("should detect GitHub Actions", () => {
      process.env.GITHUB_ACTIONS = "true";
      Config.getInstance();

      expect(ConfigHelpers.isCI()).toBe(true);
      // Test the private detectCIProvider method indirectly through CI detection
      expect(process.env.GITHUB_ACTIONS).toBe("true");
    });

    it("should detect Travis CI", () => {
      process.env.TRAVIS = "true";
      Config.getInstance();

      expect(ConfigHelpers.isCI()).toBe(true);
      expect(process.env.TRAVIS).toBe("true");
    });

    it("should detect CircleCI", () => {
      process.env.CIRCLECI = "true";
      Config.getInstance();

      expect(ConfigHelpers.isCI()).toBe(true);
      expect(process.env.CIRCLECI).toBe("true");
    });

    it("should detect generic CI", () => {
      process.env.CI = "true";
      Config.getInstance();

      expect(ConfigHelpers.isCI()).toBe(true);
      expect(process.env.CI).toBe("true");
    });

    it("should not detect CI in normal environment", () => {
      // No CI environment variables set
      Config.getInstance();

      expect(ConfigHelpers.isCI()).toBe(false);
    });
  });

  describe("Environment Detection", () => {
    it("should detect development environment", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      expect(ConfigHelpers.isDev()).toBe(true);
      expect(ConfigHelpers.isProd()).toBe(false);
      expect(ConfigHelpers.isTest()).toBe(false);
    });

    it("should detect production environment", () => {
      process.env.NODE_ENV = "production";
      Config.reset();

      expect(ConfigHelpers.isProd()).toBe(true);
      expect(ConfigHelpers.isDev()).toBe(false);
      expect(ConfigHelpers.isTest()).toBe(false);
    });

    it("should detect test environment", () => {
      process.env.NODE_ENV = "test";
      Config.reset();

      expect(ConfigHelpers.isTest()).toBe(true);
      expect(ConfigHelpers.isDev()).toBe(false);
      expect(ConfigHelpers.isProd()).toBe(false);
    });

    it("should detect DXT environment", () => {
      process.env.NODE_ENV = "dxt";
      Config.reset();

      expect(ConfigHelpers.isDXT()).toBe(true);
      expect(ConfigHelpers.isDev()).toBe(false);
    });
  });

  describe("ConfigHelpers convenience methods", () => {
    it("should provide debug flag", () => {
      process.env.DEBUG = "true";
      process.env.NODE_ENV = "development";
      Config.reset();

      expect(ConfigHelpers.shouldDebug()).toBe(true);
    });

    it("should disable debug in DXT mode", () => {
      process.env.DEBUG = "true";
      process.env.NODE_ENV = "dxt";
      Config.reset();

      expect(ConfigHelpers.shouldDebug()).toBe(false);
    });

    it("should provide cache flag", () => {
      process.env.CACHE_DISABLED = "false";
      Config.reset();

      expect(ConfigHelpers.shouldUseCache()).toBe(true);
    });

    it("should disable cache when CACHE_DISABLED=true", () => {
      process.env.CACHE_DISABLED = "true";
      Config.reset();

      expect(ConfigHelpers.shouldUseCache()).toBe(false);
    });

    it("should provide info logging flag", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      expect(ConfigHelpers.shouldLogInfo()).toBe(true);
    });

    it("should disable info logging in test mode", () => {
      process.env.NODE_ENV = "test";
      Config.reset();

      expect(ConfigHelpers.shouldLogInfo()).toBe(false);
    });

    it("should disable info logging in DXT mode", () => {
      process.env.NODE_ENV = "dxt";
      Config.reset();

      expect(ConfigHelpers.shouldLogInfo()).toBe(false);
    });
  });

  describe("WordPress Configuration Detection", () => {
    it("should detect WordPress config when site URL is present", () => {
      process.env.WORDPRESS_SITE_URL = "https://example.com";
      process.env.WORDPRESS_USERNAME = "testuser";
      process.env.WORDPRESS_APP_PASSWORD = "test-password";
      Config.reset();

      expect(ConfigHelpers.hasWordPressConfig()).toBe(true);
    });

    it("should not detect WordPress config when site URL is missing", () => {
      delete process.env.WORDPRESS_SITE_URL;
      Config.reset();

      expect(ConfigHelpers.hasWordPressConfig()).toBe(false);
    });
  });

  describe("Timeout Configuration", () => {
    it("should provide operation timeout", () => {
      const timeout = ConfigHelpers.getTimeout("operation");
      expect(typeof timeout).toBe("number");
      expect(timeout).toBeGreaterThan(0);
    });

    it("should provide longer upload timeout", () => {
      const opTimeout = ConfigHelpers.getTimeout("operation");
      const uploadTimeout = ConfigHelpers.getTimeout("upload");

      expect(uploadTimeout).toBeGreaterThan(opTimeout);
      expect(uploadTimeout).toBe(opTimeout * 5);
    });

    it("should provide test timeout", () => {
      const testTimeout = ConfigHelpers.getTimeout("test");
      expect(typeof testTimeout).toBe("number");
      expect(testTimeout).toBeGreaterThan(0);
    });

    it("should provide shorter test timeout in CI", () => {
      process.env.CI = "true";
      Config.reset();

      const testTimeout = ConfigHelpers.getTimeout("test");
      expect(testTimeout).toBe(30000); // 30 seconds in CI
    });

    it("should provide longer test timeout in development", () => {
      process.env.NODE_ENV = "development";
      delete process.env.CI;
      Config.reset();

      const testTimeout = ConfigHelpers.getTimeout("test");
      expect(testTimeout).toBe(10000); // 10 seconds in dev
    });

    it("should default to operation timeout for unknown types", () => {
      const defaultTimeout = ConfigHelpers.getTimeout();
      const operationTimeout = ConfigHelpers.getTimeout("operation");

      expect(defaultTimeout).toBe(operationTimeout);
    });
  });

  describe("Config Singleton Behavior", () => {
    it("should return the same instance", () => {
      const instance1 = Config.getInstance();
      const instance2 = Config.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should reset and create new instance", () => {
      const instance1 = Config.getInstance();
      Config.reset();
      const instance2 = Config.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it("should preserve config across multiple accesses", () => {
      process.env.DEBUG = "true";
      Config.reset();

      const shouldDebug1 = ConfigHelpers.shouldDebug();
      const shouldDebug2 = ConfigHelpers.shouldDebug();

      expect(shouldDebug1).toBe(shouldDebug2);
    });
  });

  describe("Environment Edge Cases", () => {
    it("should handle undefined NODE_ENV", () => {
      delete process.env.NODE_ENV;
      Config.reset();

      expect(() => Config.getInstance()).not.toThrow();
      expect(ConfigHelpers.isDev()).toBe(true); // Defaults to development
      expect(ConfigHelpers.isProd()).toBe(false);
      expect(ConfigHelpers.isTest()).toBe(false);
    });

    it("should handle empty string NODE_ENV", () => {
      process.env.NODE_ENV = "";
      Config.reset();

      expect(() => Config.getInstance()).not.toThrow();
    });

    it("should handle invalid NODE_ENV values", () => {
      process.env.NODE_ENV = "invalid";
      Config.reset();

      expect(() => Config.getInstance()).not.toThrow();
      expect(ConfigHelpers.isDev()).toBe(false);
      expect(ConfigHelpers.isProd()).toBe(false);
      expect(ConfigHelpers.isTest()).toBe(false);
    });
  });

  describe("Debug Configuration", () => {
    it("should enable debug when DEBUG=true", () => {
      process.env.DEBUG = "true";
      process.env.NODE_ENV = "development";
      Config.reset();

      expect(ConfigHelpers.shouldDebug()).toBe(true);
    });

    it("should disable debug when DEBUG=false", () => {
      process.env.DEBUG = "false";
      process.env.NODE_ENV = "development";
      Config.reset();

      expect(ConfigHelpers.shouldDebug()).toBe(false);
    });

    it("should disable debug when DEBUG is undefined", () => {
      delete process.env.DEBUG;
      process.env.NODE_ENV = "development";
      Config.reset();

      expect(ConfigHelpers.shouldDebug()).toBe(false);
    });
  });

  describe("Cache Configuration", () => {
    it("should enable cache by default", () => {
      delete process.env.CACHE_DISABLED;
      Config.reset();

      expect(ConfigHelpers.shouldUseCache()).toBe(true);
    });

    it("should handle various falsy values for cache disabled", () => {
      const falsyValues = ["false", "0", ""];

      falsyValues.forEach((value) => {
        process.env.CACHE_DISABLED = value;
        Config.reset();
        expect(ConfigHelpers.shouldUseCache()).toBe(true);
      });
    });

    it("should handle various truthy values for cache disabled", () => {
      const truthyValues = ["true", "1", "yes", "disable"];

      truthyValues.forEach((value) => {
        process.env.CACHE_DISABLED = value;
        Config.reset();
        expect(ConfigHelpers.shouldUseCache()).toBe(false);
      });
    });
  });
});
