/**
 * Tests for WordPressClientRefactored
 * 
 * Tests the refactored modular WordPress client architecture
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WordPressClientRefactored } from "../../dist/client/WordPressClientRefactored.js";

// Mock fetch globally
global.fetch = vi.fn();

// Mock logger to avoid console output
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    api: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock config
vi.mock("../../dist/config/Config.js", () => ({
  config: () => ({
    api: {
      timeout: 30000,
      retries: 3,
      rateLimitDelay: 1000,
    },
  }),
}));

describe("WordPressClientRefactored", () => {
  let client;
  let mockResponse;

  beforeEach(() => {
    // Default successful response
    mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ id: 1, title: "Test" }),
      text: vi.fn().mockResolvedValue('{"id": 1, "title": "Test"}'),
    };
    
    global.fetch.mockResolvedValue(mockResponse);

    const config = {
      baseUrl: "https://test.example.com",
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "test pass word",
      },
    };

    client = new WordPressClientRefactored(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with basic configuration", () => {
      expect(client).toBeDefined();
      expect(client.config.baseUrl).toBe("https://test.example.com");
      expect(client.config.auth.method).toBe("app-password");
    });

    it("should initialize operation managers", () => {
      expect(client.posts).toBeDefined();
      expect(client.pages).toBeDefined();
      expect(client.media).toBeDefined();
      expect(client.users).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it("should throw error for missing base URL", () => {
      expect(() => new WordPressClientRefactored({})).toThrow("Base URL is required");
    });

    it("should provide default auth method when not specified", () => {
      const config = { baseUrl: "https://example.com" };
      const client = new WordPressClientRefactored(config);
      expect(client.config.auth.method).toBe("app-password");
    });
  });

  describe("HTTP Methods", () => {
    it("should make GET requests", async () => {
      const result = await client.get("/wp/v2/posts");
      
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Accept": "application/json",
            "User-Agent": "MCP-WordPress-Client/2.0",
          }),
        })
      );
      expect(result).toEqual({ id: 1, title: "Test" });
    });

    it("should make POST requests with data", async () => {
      const postData = { title: "New Post", content: "Content" };
      
      await client.post("/wp/v2/posts", postData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should make PUT requests", async () => {
      const putData = { id: 1, title: "Updated Post" };
      
      await client.put("/wp/v2/posts/1", putData);
      
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(putData),
        })
      );
    });

    it("should make DELETE requests", async () => {
      await client.delete("/wp/v2/posts/1");
      
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts/1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("URL Building", () => {
    it("should build correct URLs with base path", () => {
      const url = client.buildUrl("/wp/v2/posts");
      expect(url).toBe("https://test.example.com/wp-json/wp/v2/posts");
    });

    it("should handle endpoints without leading slash", () => {
      const url = client.buildUrl("posts");
      expect(url).toBe("https://test.example.com/wp-json/wp/v2/posts");
    });

    it("should handle query parameters", () => {
      const url = client.buildUrl("posts", { per_page: "10", status: "publish" });
      expect(url).toBe("https://test.example.com/wp-json/wp/v2/posts?per_page=10&status=publish");
    });

    it("should handle custom endpoints", () => {
      const url = client.buildUrl("wp/v2/custom");
      expect(url).toBe("https://test.example.com/wp-json/wp/v2/custom");
    });
  });

  describe("Operation Managers", () => {
    it("should delegate post operations to PostOperations", async () => {
      const spy = vi.spyOn(client.posts, 'getPosts');
      
      await client.getPosts();
      
      expect(spy).toHaveBeenCalled();
    });

    it("should delegate page operations to PageOperations", async () => {
      const spy = vi.spyOn(client.pages, 'getPages');
      
      await client.getPages();
      
      expect(spy).toHaveBeenCalled();
    });

    it("should delegate media operations to MediaOperations", async () => {
      const spy = vi.spyOn(client.media, 'getMedia');
      
      await client.getMedia();
      
      expect(spy).toHaveBeenCalled();
    });

    it("should delegate user operations to UserOperations", async () => {
      const spy = vi.spyOn(client.users, 'getUsers');
      
      await client.getUsers();
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Authentication Integration", () => {
    it("should include authentication headers", async () => {
      await client.get("/wp/v2/posts");
      
      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });

    it("should handle different authentication methods", () => {
      const jwtConfig = {
        baseUrl: "https://test.example.com",
        auth: {
          method: "jwt",
          username: "testuser",
          password: "testpass",
        },
      };

      const jwtClient = new WordPressClientRefactored(jwtConfig);
      expect(jwtClient.auth.getAuthMethod()).toBe("jwt");
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 errors", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Map([["content-type", "application/json"]]),
        text: vi.fn().mockResolvedValue('{"message": "Not found"}'),
      });

      await expect(client.get("/wp/v2/posts/999")).rejects.toThrow();
    });

    it("should handle 401 authentication errors", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Map([["content-type", "application/json"]]),
        text: vi.fn().mockResolvedValue('{"message": "Authentication failed"}'),
      });

      await expect(client.get("/wp/v2/posts")).rejects.toThrow("Authentication failed");
    });

    it("should handle network errors", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      await expect(client.get("/wp/v2/posts")).rejects.toThrow("Network error");
    });
  });

  describe("Statistics", () => {
    it("should track request statistics", async () => {
      await client.get("/wp/v2/posts");
      await client.get("/wp/v2/pages");

      const stats = client.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.errors).toBe(0);
    });

    it("should track error statistics", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      try {
        await client.get("/wp/v2/posts");
      } catch (_e) {
        // Expected error
      }

      const stats = client.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.errors).toBe(1);
    });

    it("should calculate average response time", async () => {
      // Mock fetch with a small delay to simulate response time
      global.fetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: async () => ({ posts: [] }),
          text: async () => '{"posts":[]}',
          headers: new Map([['content-type', 'application/json']]),
        }), 1)) // 1ms delay
      );

      await client.get("/wp/v2/posts");

      const stats = client.getStats();
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe("Initialization and Cleanup", () => {
    it("should initialize successfully", async () => {
      await expect(client.initialize()).resolves.not.toThrow();
    });

    it("should disconnect cleanly", async () => {
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });

  describe("Legacy Compatibility", () => {
    it("should maintain backward compatibility for post methods", async () => {
      const post = await client.getPost(1);
      expect(post).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/posts/1"),
        expect.any(Object)
      );
    });

    it("should maintain backward compatibility for page methods", async () => {
      const page = await client.getPage(1);
      expect(page).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/pages/1"),
        expect.any(Object)
      );
    });

    it("should maintain backward compatibility for user methods", async () => {
      const user = await client.getUser(1);
      expect(user).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/1"),
        expect.any(Object)
      );
    });
  });

  describe("Performance", () => {
    it("should handle concurrent requests", async () => {
      const promises = [
        client.get("/wp/v2/posts"),
        client.get("/wp/v2/pages"),
        client.get("/wp/v2/users"),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should handle request timeouts", async () => {
      global.fetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const timeoutPromise = client.get("/wp/v2/posts", { timeout: 100 });
      
      await expect(timeoutPromise).rejects.toThrow();
    });
  });

  describe("FormData Handling", () => {
    it("should handle FormData uploads", async () => {
      const formData = new FormData();
      formData.append("file", "test-content");
      
      await client.post("/wp/v2/media", formData);
      
      const [, options] = global.fetch.mock.calls[0];
      expect(options.body).toBe(formData);
      expect(options.headers["Content-Type"]).toBeUndefined(); // Should be removed for FormData
    });
  });
});