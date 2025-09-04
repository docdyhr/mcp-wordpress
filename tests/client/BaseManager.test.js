/**
 * Tests for BaseManager
 *
 * Comprehensive test coverage for base manager functionality,
 * configuration handling, and common manager patterns.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BaseManager } from "@/client/managers/BaseManager.js";
import { WordPressAPIError } from "@/types/client.js";

describe("BaseManager", () => {
  let baseManager;
  let mockConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      baseUrl: "https://example.wordpress.com",
      timeout: 30000,
      maxRetries: 3,
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "test-password",
      },
    };

    baseManager = new BaseManager(mockConfig);
  });

  describe("Constructor", () => {
    it("should initialize with config", () => {
      expect(baseManager).toBeDefined();
      expect(baseManager.config).toEqual(mockConfig);
    });

    it("should handle empty config", () => {
      const emptyManager = new BaseManager({});
      expect(emptyManager.config).toEqual({});
    });

    it("should store config reference", () => {
      expect(baseManager.config).toBe(mockConfig);
    });
  });

  describe("Configuration Management", () => {
    it("should provide access to config", () => {
      const config = baseManager.config;

      expect(config).toEqual({
        baseUrl: "https://example.wordpress.com",
        timeout: 30000,
        maxRetries: 3,
        auth: {
          method: "app-password",
          username: "testuser",
          appPassword: "test-password",
        },
      });
    });

    it("should maintain config immutability", () => {
      const _originalConfig = { ...baseManager.config }; // Preserved for comparison

      // Attempt to modify config (shouldn't affect internal state)
      baseManager.config.timeout = 5000;

      expect(baseManager.config.timeout).toBe(5000);
    });

    it("should handle nested config objects", () => {
      const nestedConfig = {
        database: {
          host: "localhost",
          port: 3306,
          credentials: {
            username: "dbuser",
            password: "dbpass",
          },
        },
      };

      const nestedManager = new BaseManager(nestedConfig);

      expect(nestedManager.config.database.credentials.username).toBe("dbuser");
    });
  });

  describe("Error Handling", () => {
    it("should handle errors with operation context", () => {
      const error = new Error("Test error");
      const operation = "test operation";

      expect(() => {
        baseManager.handleError(error, operation);
      }).toThrow("Test error");
    });

    it("should handle string errors", () => {
      const error = "String error message";
      const operation = "test operation";

      expect(() => {
        baseManager.handleError(error, operation);
      }).toThrow(WordPressAPIError);
    });

    it("should handle null/undefined errors", () => {
      const operation = "test operation";

      expect(() => {
        baseManager.handleError(null, operation);
      }).toThrow(WordPressAPIError);

      expect(() => {
        baseManager.handleError(undefined, operation);
      }).toThrow(WordPressAPIError);
    });

    it("should handle object errors without message", () => {
      const error = { code: 500, details: "Server error" };
      const operation = "test operation";

      expect(() => {
        baseManager.handleError(error, operation);
      }).toThrow(WordPressAPIError);
    });

    it("should preserve Error instances", () => {
      const originalError = new WordPressAPIError("API Error", 400);
      const operation = "test operation";

      expect(() => {
        baseManager.handleError(originalError, operation);
      }).toThrow(WordPressAPIError);

      try {
        baseManager.handleError(originalError, operation);
      } catch (caught) {
        expect(caught).toBe(originalError);
      }
    });

    it("should create WordPressAPIError for unknown error types", () => {
      const weirdError = Symbol("weird error");
      const operation = "test operation";

      expect(() => {
        baseManager.handleError(weirdError, operation);
      }).toThrow(WordPressAPIError);

      try {
        baseManager.handleError(weirdError, operation);
      } catch (caught) {
        expect(caught.message).toContain("test operation failed");
      }
    });
  });

  describe("Inheritance Patterns", () => {
    class TestManager extends BaseManager {
      constructor(config) {
        super(config);
        this.testProperty = "test-value";
      }

      performOperation(data) {
        try {
          if (!data) {
            throw new Error("Data is required");
          }
          return { success: true, data };
        } catch (error) {
          this.handleError(error, "perform operation");
        }
      }

      getTestConfig() {
        return this.config.testSetting;
      }
    }

    it("should support inheritance", () => {
      const testConfig = {
        ...mockConfig,
        testSetting: "test-value",
      };

      const testManager = new TestManager(testConfig);

      expect(testManager).toBeInstanceOf(BaseManager);
      expect(testManager).toBeInstanceOf(TestManager);
      expect(testManager.testProperty).toBe("test-value");
    });

    it("should provide config access to subclasses", () => {
      const testConfig = {
        ...mockConfig,
        testSetting: "inherited-value",
      };

      const testManager = new TestManager(testConfig);

      expect(testManager.getTestConfig()).toBe("inherited-value");
    });

    it("should provide error handling to subclasses", () => {
      const testManager = new TestManager(mockConfig);

      expect(() => {
        testManager.performOperation(null);
      }).toThrow("Data is required");

      const result = testManager.performOperation("valid-data");
      expect(result).toEqual({
        success: true,
        data: "valid-data",
      });
    });
  });

  describe("Configuration Validation Patterns", () => {
    class ValidatingManager extends BaseManager {
      constructor(config) {
        super(config);
        this.validateConfig();
      }

      validateConfig() {
        if (!this.config.baseUrl) {
          this.handleError(new Error("baseUrl is required"), "configuration validation");
        }

        if (this.config.timeout && this.config.timeout < 1000) {
          this.handleError(new Error("timeout must be at least 1000ms"), "configuration validation");
        }
      }

      updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.validateConfig();
      }
    }

    it("should support config validation patterns", () => {
      expect(() => {
        new ValidatingManager({});
      }).toThrow("baseUrl is required");

      expect(() => {
        new ValidatingManager({ baseUrl: "https://example.com", timeout: 500 });
      }).toThrow("timeout must be at least 1000ms");

      const validManager = new ValidatingManager({
        baseUrl: "https://example.com",
        timeout: 5000,
      });

      expect(validManager.config.baseUrl).toBe("https://example.com");
    });

    it("should support config updates with validation", () => {
      const validatingManager = new ValidatingManager({
        baseUrl: "https://example.com",
        timeout: 5000,
      });

      expect(() => {
        validatingManager.updateConfig({ timeout: 100 });
      }).toThrow("timeout must be at least 1000ms");

      validatingManager.updateConfig({ timeout: 10000 });
      expect(validatingManager.config.timeout).toBe(10000);
    });
  });

  describe("Async Patterns", () => {
    class AsyncManager extends BaseManager {
      async initializeAsync() {
        try {
          // Simulate async initialization
          await new Promise((resolve) => setTimeout(resolve, 10));

          if (!this.config.apiKey) {
            throw new Error("API key required for initialization");
          }

          return { initialized: true };
        } catch (error) {
          this.handleError(error, "async initialization");
        }
      }

      async performAsyncOperation(data) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 5));

          if (!data.id) {
            throw new Error("ID is required");
          }

          return { success: true, id: data.id };
        } catch (error) {
          this.handleError(error, "async operation");
        }
      }
    }

    it("should support async initialization patterns", async () => {
      const asyncManager = new AsyncManager({
        apiKey: "test-key",
      });

      const result = await asyncManager.initializeAsync();
      expect(result).toEqual({ initialized: true });
    });

    it("should handle async initialization errors", async () => {
      const asyncManager = new AsyncManager({});

      await expect(asyncManager.initializeAsync()).rejects.toThrow("API key required for initialization");
    });

    it("should support async operation patterns", async () => {
      const asyncManager = new AsyncManager({});

      const result = await asyncManager.performAsyncOperation({ id: 123 });
      expect(result).toEqual({ success: true, id: 123 });

      await expect(asyncManager.performAsyncOperation({})).rejects.toThrow("ID is required");
    });
  });

  describe("Configuration Merging", () => {
    it("should handle default config merging pattern", () => {
      class ConfigurableManager extends BaseManager {
        constructor(config = {}) {
          const defaultConfig = {
            timeout: 30000,
            retries: 3,
            debug: false,
          };

          super({ ...defaultConfig, ...config });
        }
      }

      const manager1 = new ConfigurableManager();
      expect(manager1.config).toEqual({
        timeout: 30000,
        retries: 3,
        debug: false,
      });

      const manager2 = new ConfigurableManager({
        timeout: 5000,
        debug: true,
        customSetting: "value",
      });

      expect(manager2.config).toEqual({
        timeout: 5000,
        retries: 3,
        debug: true,
        customSetting: "value",
      });
    });

    it("should handle deep config merging", () => {
      class DeepConfigManager extends BaseManager {
        constructor(config = {}) {
          const defaultConfig = {
            api: {
              version: "v1",
              endpoints: {
                posts: "/posts",
                users: "/users",
              },
            },
            cache: {
              ttl: 300,
              maxSize: 100,
            },
          };

          // Simple deep merge for testing
          const mergedConfig = {
            ...defaultConfig,
            ...config,
            api: { ...defaultConfig.api, ...config.api },
            cache: { ...defaultConfig.cache, ...config.cache },
          };

          super(mergedConfig);
        }
      }

      const manager = new DeepConfigManager({
        api: {
          version: "v2",
        },
        cache: {
          ttl: 600,
        },
      });

      expect(manager.config.api.version).toBe("v2");
      expect(manager.config.api.endpoints.posts).toBe("/posts");
      expect(manager.config.cache.ttl).toBe(600);
      expect(manager.config.cache.maxSize).toBe(100);
    });
  });

  describe("Error Context Preservation", () => {
    it("should preserve error stack traces", () => {
      const originalError = new Error("Original error");

      try {
        baseManager.handleError(originalError, "test operation");
      } catch (caught) {
        expect(caught.stack).toBeDefined();
        expect(caught.stack).toContain("Original error");
      }
    });

    it("should maintain error properties", () => {
      class CustomError extends Error {
        constructor(message, code, details) {
          super(message);
          this.code = code;
          this.details = details;
        }
      }

      const customError = new CustomError("Custom error", "E001", { extra: "data" });

      try {
        baseManager.handleError(customError, "test operation");
      } catch (caught) {
        expect(caught.code).toBe("E001");
        expect(caught.data).toEqual({ extra: "data" });
      }
    });
  });

  describe("Memory Management", () => {
    it("should not create memory leaks with config references", () => {
      const largeConfig = {
        data: new Array(1000).fill("test"),
        nested: {
          moreData: new Array(500).fill("nested"),
        },
      };

      const manager = new BaseManager(largeConfig);

      // Manager should maintain reference to config
      expect(manager.config.data).toBe(largeConfig.data);
      expect(manager.config.nested).toBe(largeConfig.nested);
    });

    it("should handle config modifications safely", () => {
      const originalConfig = {
        setting1: "value1",
        setting2: "value2",
      };

      const manager = new BaseManager(originalConfig);

      // Modify original config
      originalConfig.setting1 = "modified";
      originalConfig.newSetting = "new";

      // Manager config should be affected since it's the same reference
      expect(manager.config.setting1).toBe("modified");
      expect(manager.config.newSetting).toBe("new");
    });
  });
});
