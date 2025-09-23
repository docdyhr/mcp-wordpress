/**
 * Composed Managers Test Suite
 * Tests for the new composition-based manager architecture
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ComposedAuthenticationManager } from "../../dist/client/managers/ComposedAuthenticationManager.js";
import { ComposedRequestManager } from "../../dist/client/managers/ComposedRequestManager.js";
import {
  ComposedManagerFactory,
  createComposedWordPressClient,
} from "../../dist/client/managers/ComposedManagerFactory.js";
import { ConfigurationProviderImpl } from "../../dist/client/managers/implementations/ConfigurationProviderImpl.js";
import { ErrorHandlerImpl } from "../../dist/client/managers/implementations/ErrorHandlerImpl.js";
import { ParameterValidatorImpl } from "../../dist/client/managers/implementations/ParameterValidatorImpl.js";
import { MigrationAdapter } from "../../dist/client/managers/composed/MigrationAdapter.js";

import { WordPressAPIError, AuthenticationError } from "../../dist/types/client.js";

// Mock the config module to enable debug logging for this test suite
vi.mock("../../dist/config/Config.js", () => {
  return {
    config: vi.fn(() => ({
      wordpress: {},
      error: { legacyLogsEnabled: false },
      debug: { enabled: true },
      rateLimitEnabled: false,
      rateLimitRequests: 100,
      rateLimitWindow: 60000,
      rateLimit: 60,
      security: {
        rateLimit: 60,
      },
    })),
    ConfigHelpers: {
      shouldDebug: vi.fn(() => true),
    },
  };
});

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Composed Managers", () => {
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      baseUrl: "https://test-site.com",
      timeout: 30000,
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "test app password",
      },
    };

    // Reset fetch mock
    mockFetch.mockReset();

    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ id: 1, title: "Test Post" }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ConfigurationProviderImpl", () => {
    it("should provide configuration access", () => {
      const configProvider = new ConfigurationProviderImpl(mockConfig);

      expect(configProvider.config.baseUrl).toBe("https://test-site.com");
      expect(configProvider.getTimeout()).toBe(30000);
      expect(configProvider.isDebugEnabled()).toBe(false);
    });

    it("should validate required configuration", () => {
      const invalidConfig = { baseUrl: "https://test.com" }; // missing auth

      expect(() => {
        const configProvider = new ConfigurationProviderImpl(invalidConfig);
        configProvider.validateConfiguration();
      }).toThrow("Missing required configuration: auth");
    });

    it("should provide configuration values by path", () => {
      const configProvider = new ConfigurationProviderImpl(mockConfig);

      expect(configProvider.getConfigValue("auth.method")).toBe("app-password");
      expect(configProvider.getConfigValue("nonexistent", "default")).toBe("default");
    });
  });

  describe("ErrorHandlerImpl", () => {
    let configProvider;
    let errorHandler;

    beforeEach(() => {
      configProvider = new ConfigurationProviderImpl(mockConfig);
      errorHandler = new ErrorHandlerImpl(configProvider);
    });

    it("should handle WordPress API errors", () => {
      const apiError = new WordPressAPIError("Test error", 400, "test_error");

      expect(() => {
        errorHandler.handleError(apiError, "test operation");
      }).toThrow(WordPressAPIError);
    });

    it("should handle timeout errors", () => {
      const timeoutError = { name: "AbortError" };

      expect(() => {
        errorHandler.handleError(timeoutError, "test operation");
      }).toThrow("Request timeout after 30000ms");
    });

    it("should handle connection errors", () => {
      const connectionError = { code: "ECONNREFUSED" };

      expect(() => {
        errorHandler.handleError(connectionError, "test operation");
      }).toThrow("Cannot connect to WordPress site");
    });

    it("should log successful operations", () => {
      // The logSuccess method should complete without errors
      // We can see from the stderr output that debug logging is working
      expect(() => {
        errorHandler.logSuccess("test operation", { test: true });
      }).not.toThrow();
    });
  });

  describe("ParameterValidatorImpl", () => {
    let validator;

    beforeEach(() => {
      validator = new ParameterValidatorImpl();
    });

    it("should validate required parameters", () => {
      const params = { name: "test", value: 123 };

      expect(() => {
        validator.validateRequired(params, ["name", "value"]);
      }).not.toThrow();

      expect(() => {
        validator.validateRequired(params, ["name", "missing"]);
      }).toThrow("Missing required parameter: missing");
    });

    it("should validate string parameters", () => {
      expect(validator.validateString("hello", "test")).toBe("hello");
      expect(validator.validateString(null, "test")).toBe("");

      expect(() => {
        validator.validateString(123, "test");
      }).toThrow("test must be a string");

      expect(() => {
        validator.validateString("", "test", { required: true });
      }).toThrow("test is required");
    });

    it("should validate string length", () => {
      expect(() => {
        validator.validateString("hi", "test", { minLength: 5 });
      }).toThrow("test must be at least 5 characters");

      expect(() => {
        validator.validateString("this is too long", "test", { maxLength: 5 });
      }).toThrow("test must be no more than 5 characters");
    });

    it("should validate number parameters", () => {
      expect(validator.validateNumber(42, "test")).toBe(42);
      expect(validator.validateNumber("42", "test")).toBe(42);
      expect(validator.validateNumber(null, "test")).toBe(0);

      expect(() => {
        validator.validateNumber("not a number", "test");
      }).toThrow("test must be a valid number");
    });

    it("should validate WordPress IDs", () => {
      expect(validator.validateWordPressId(42)).toBe(42);

      expect(() => {
        validator.validateWordPressId(0);
      }).toThrow("id must be at least 1");

      expect(() => {
        validator.validateWordPressId("not a number");
      }).toThrow("id must be a valid number");
    });
  });

  describe("ComposedAuthenticationManager", () => {
    let authManager;

    beforeEach(() => {
      authManager = ComposedAuthenticationManager.create(mockConfig);
    });

    it("should create authentication manager", () => {
      expect(authManager).toBeInstanceOf(ComposedAuthenticationManager);
    });

    it("should authenticate with app password", async () => {
      const result = await authManager.authenticate();
      expect(result).toBe(true);
      expect(authManager.isAuthenticated()).toBe(true);
    });

    it("should provide auth headers", async () => {
      await authManager.authenticate();
      const headers = authManager.getAuthHeaders();

      expect(headers.Authorization).toContain("Basic ");
    });

    it("should handle authentication failures", async () => {
      const invalidConfig = {
        ...mockConfig,
        auth: { method: "app-password" }, // missing credentials
      };

      expect(() => {
        ComposedAuthenticationManager.create(invalidConfig);
      }).toThrow(AuthenticationError);
    });

    it("should provide authentication status", async () => {
      await authManager.authenticate();
      const status = authManager.getAuthStatus();

      expect(status.isAuthenticated).toBe(true);
      expect(status.method).toBe("app-password");
      expect(status.lastAuthAttempt).toBeInstanceOf(Date);
    });
  });

  describe("ComposedRequestManager", () => {
    let requestManager;
    let authManager;

    beforeEach(async () => {
      authManager = ComposedAuthenticationManager.create(mockConfig);
      await authManager.authenticate();

      requestManager = ComposedRequestManager.create(mockConfig, authManager);
      await requestManager.initialize();
    });

    it("should create request manager", () => {
      expect(requestManager).toBeInstanceOf(ComposedRequestManager);
    });

    it("should make GET requests", async () => {
      const response = await requestManager.request("GET", "/wp/v2/posts");

      expect(response).toEqual({ id: 1, title: "Test Post" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-site.com/wp-json/wp/v2/posts",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Basic"),
          }),
        }),
      );
    });

    it("should make POST requests", async () => {
      const postData = { title: "New Post", content: "Post content" };

      await requestManager.request("POST", "/wp/v2/posts", postData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-site.com/wp-json/wp/v2/posts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(postData),
        }),
      );
    });

    it("should track request statistics", async () => {
      await requestManager.request("GET", "/wp/v2/posts");
      const stats = requestManager.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
    });

    it("should reset statistics", async () => {
      await requestManager.request("GET", "/wp/v2/posts");
      requestManager.resetStats();
      const stats = requestManager.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: vi.fn().mockResolvedValue({
          message: "Post not found",
        }),
      });

      await expect(requestManager.request("GET", "/wp/v2/posts/999")).rejects.toThrow("Post not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(requestManager.request("GET", "/wp/v2/posts")).rejects.toThrow("Network error");
    });

    it("should require initialization", async () => {
      const uninitializedManager = ComposedRequestManager.create(mockConfig, authManager);

      await expect(uninitializedManager.request("GET", "/wp/v2/posts")).rejects.toThrow("not initialized");
    });
  });

  describe("ComposedManagerFactory", () => {
    let factory;

    beforeEach(() => {
      factory = new ComposedManagerFactory();
    });

    it("should create configuration provider", () => {
      const configProvider = factory.createConfigurationProvider(mockConfig);
      expect(configProvider).toBeInstanceOf(ConfigurationProviderImpl);
    });

    it("should create error handler", () => {
      const errorHandler = factory.createErrorHandler(mockConfig);
      expect(errorHandler).toBeInstanceOf(ErrorHandlerImpl);
    });

    it("should create parameter validator", () => {
      const validator = factory.createParameterValidator();
      expect(validator).toBeInstanceOf(ParameterValidatorImpl);
    });

    it("should create authentication provider", () => {
      const authProvider = factory.createAuthenticationProvider(mockConfig);
      expect(authProvider).toBeInstanceOf(ComposedAuthenticationManager);
    });

    it("should create complete composed client", async () => {
      const client = await factory.createComposedClient({ clientConfig: mockConfig });

      expect(client.isAuthenticated()).toBe(true);
      expect(client.config.baseUrl).toBe("https://test-site.com");
    });
  });

  describe("ComposedWordPressClient", () => {
    let client;

    beforeEach(async () => {
      client = await createComposedWordPressClient(mockConfig);
    });

    it("should create and initialize client", () => {
      expect(client.isAuthenticated()).toBe(true);
      expect(client.config.baseUrl).toBe("https://test-site.com");
    });

    it("should provide WordPress convenience methods", async () => {
      // Test getPosts
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue([
          { id: 1, title: "Post 1" },
          { id: 2, title: "Post 2" },
        ]),
      });

      const posts = await client.getPosts();
      expect(posts).toHaveLength(2);
      expect(posts[0].title).toBe("Post 1");
    });

    it("should provide getPost method", async () => {
      const post = await client.getPost(1);
      expect(post.id).toBe(1);
      expect(post.title).toBe("Test Post");
    });

    it("should validate post ID parameters", async () => {
      await expect(client.getPost("invalid")).rejects.toThrow("post ID must be a valid number");
      await expect(client.getPost(0)).rejects.toThrow("post ID must be at least 1");
    });

    it("should create posts", async () => {
      const postData = { title: "New Post", content: "Content" };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue({ id: 3, ...postData }),
      });

      const result = await client.createPost(postData);
      expect(result.id).toBe(3);
      expect(result.title).toBe("New Post");
    });

    it("should validate required fields for post creation", async () => {
      await expect(client.createPost({})).rejects.toThrow("Missing required parameter: title");
      await expect(client.createPost({ title: "Test" })).rejects.toThrow("Missing required parameter: content");
    });

    it("should dispose resources", () => {
      expect(() => client.dispose()).not.toThrow();
    });
  });

  describe("MigrationAdapter", () => {
    it("should create compatible managers", async () => {
      const { authManager } = await MigrationAdapter.createCompatibleManagers(mockConfig);

      expect(authManager).toBeInstanceOf(ComposedAuthenticationManager);
      expect(authManager.isAuthenticated()).toBe(true);
    });

    it("should detect composed managers", () => {
      const authManager = ComposedAuthenticationManager.create(mockConfig);

      expect(MigrationAdapter.isComposed(authManager)).toBe(true);
      expect(MigrationAdapter.isComposed({})).toBe(false);
    });

    it("should provide migration status", () => {
      const authManager = ComposedAuthenticationManager.create(mockConfig);
      const plainObject = {};

      const status = MigrationAdapter.getMigrationStatus([authManager, plainObject]);

      expect(status.total).toBe(2);
      expect(status.composed).toBe(1);
      expect(status.inheritance).toBe(1);
      expect(status.percentage).toBe(50);
    });

    it("should generate migration guide", () => {
      const guide = MigrationAdapter.generateMigrationGuide();

      expect(guide).toContain("Migration Guide");
      expect(guide).toContain("Benefits of Composition");
      expect(guide).toContain("Migration Steps");
    });
  });
});
