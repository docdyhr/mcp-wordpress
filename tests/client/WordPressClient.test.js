/**
 * Tests for WordPressClient
 *
 * Basic test coverage for the main WordPress REST API client.
 * Tests core functionality, authentication, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WordPressClient } from "@/client/api.js";
import { WordPressAPIError, AuthenticationError, RateLimitError } from "@/client/api.js";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger to avoid console output
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    api: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      time: vi.fn().mockImplementation((name, fn) => fn()),
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
    cache: {
      enabled: false,
    },
    wordpress: {
      siteUrl: "",
      timeout: 30000,
      maxRetries: 3,
    },
    security: {
      rateLimit: 60,
    },
    app: {
      isProduction: false,
      isDevelopment: true,
      isTest: true,
    },
    error: {
      legacyLogsEnabled: false,
    },
    debug: {
      enabled: false,
    },
  }),
  ConfigHelpers: {
    getTimeout: vi.fn(() => 30000),
    shouldUseCache: vi.fn(() => false),
    isTest: vi.fn(() => true),
    shouldDebug: vi.fn(() => false),
  },
}));

describe("WordPressClient", () => {
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

    mockFetch.mockResolvedValue(mockResponse);

    const config = {
      baseUrl: "https://test.example.com",
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "test pass word",
      },
    };

    client = new WordPressClient(config);
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

    it("should handle default authentication method", () => {
      const minimalConfig = {
        baseUrl: "https://example.com",
        auth: {
          username: "user",
          appPassword: "pass",
        },
      };

      const minimalClient = new WordPressClient(minimalConfig);
      expect(minimalClient.config.auth.method).toBe("app-password");
    });

    it("should validate required configuration", () => {
      expect(() => new WordPressClient({})).toThrow();
    });
  });

  describe("Authentication", () => {
    it("should set app-password authentication headers", async () => {
      await client.get("posts");

      expect(mockFetch).toHaveBeenCalled();
      const [_url, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });

    it("should handle JWT authentication", async () => {
      const jwtConfig = {
        baseUrl: "https://test.example.com",
        auth: {
          method: "jwt",
          username: "testuser",
          password: "testpass",
          secret: "test-jwt-secret",
        },
      };

      const jwtClient = new WordPressClient(jwtConfig);

      // Mock JWT token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue({ token: "jwt-token-123" }),
        text: vi.fn().mockResolvedValue('{"token": "jwt-token-123"}'),
      });

      await jwtClient.authenticate();
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should handle basic authentication", async () => {
      const basicConfig = {
        baseUrl: "https://test.example.com",
        auth: {
          method: "basic",
          username: "testuser",
          password: "testpass",
        },
      };

      const basicClient = new WordPressClient(basicConfig);
      await basicClient.get("posts");

      const [_url, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });
  });

  describe("HTTP Methods", () => {
    it("should make GET requests", async () => {
      const result = await client.get("posts");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Object),
        }),
      );
      expect(result).toEqual({ id: 1, title: "Test" });
    });

    it("should make POST requests with data", async () => {
      const postData = { title: "New Post", content: "Content" };

      await client.post("posts", postData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should make PUT requests", async () => {
      const putData = { id: 1, title: "Updated Post" };

      await client.put("posts/1", putData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(putData),
        }),
      );
    });

    it("should make DELETE requests", async () => {
      await client.delete("posts/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.example.com/wp-json/wp/v2/posts/1",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue({
          code: "rest_post_invalid_id",
          message: "Invalid post ID",
        }),
      });

      await expect(client.get("posts/999")).rejects.toThrow(WordPressAPIError);
    });

    it("should handle 401 authentication errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue({
          code: "rest_forbidden",
          message: "Sorry, you are not allowed to do that",
        }),
      });

      await expect(client.get("posts")).rejects.toThrow(AuthenticationError);
    });

    it("should handle 429 rate limit errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Map([
          ["content-type", "application/json"],
          ["retry-after", "60"],
        ]),
        json: vi.fn().mockResolvedValue({
          code: "rest_too_many_requests",
          message: "Too many requests",
        }),
      });

      await expect(client.get("posts")).rejects.toThrow(RateLimitError);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(client.get("posts")).rejects.toThrow("Network error");
    });

    it("should handle malformed JSON responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        text: vi.fn().mockResolvedValue("invalid json"),
      });

      const result = await client.get("posts");
      expect(result).toBe("invalid json");
    });
  });

  describe("URL Construction", () => {
    it("should build correct URLs with base path", () => {
      const url = client.buildUrl("posts");
      expect(url).toBe("https://test.example.com/wp-json/wp/v2/posts");
    });

    it("should handle query parameters", () => {
      const url = client.buildUrl("posts", { per_page: 10, status: "publish" });
      expect(url).toBe("https://test.example.com/wp-json/wp/v2/posts?per_page=10&status=publish");
    });

    it("should handle trailing slashes correctly", () => {
      const clientWithSlash = new WordPressClient({
        baseUrl: "https://test.example.com/",
        auth: { method: "app-password", username: "user", appPassword: "pass" },
      });

      const url = clientWithSlash.buildUrl("posts");
      expect(url).toBe("https://test.example.com/wp-json/wp/v2/posts");
    });
  });

  describe("Request Options", () => {
    it("should set correct headers", async () => {
      await client.get("posts");

      const [_url, options] = mockFetch.mock.calls[0];
      expect(options.headers).toEqual(
        expect.objectContaining({
          "User-Agent": expect.stringMatching(/mcp-wordpress/),
          "Content-Type": "application/json",
          Authorization: expect.any(String),
        }),
      );
    });

    it("should handle custom headers", async () => {
      const customHeaders = { "X-Custom-Header": "test-value" };

      await client.request("GET", "posts", null, {
        headers: customHeaders,
      });

      const [_url, options] = mockFetch.mock.calls[0];
      expect(options.headers["X-Custom-Header"]).toBe("test-value");
    });

    it("should set timeout", async () => {
      await client.get("posts");

      const [_url, options] = mockFetch.mock.calls[0];
      expect(options.signal).toBeDefined();
    });
  });

  describe("WordPress-specific Methods", () => {
    it("should get posts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue([
          { id: 1, title: { rendered: "Post 1" } },
          { id: 2, title: { rendered: "Post 2" } },
        ]),
        text: vi.fn().mockResolvedValue(
          JSON.stringify([
            { id: 1, title: { rendered: "Post 1" } },
            { id: 2, title: { rendered: "Post 2" } },
          ]),
        ),
      });

      const posts = await client.getPosts();
      expect(posts).toHaveLength(2);
      expect(posts[0].title.rendered).toBe("Post 1");
    });

    it("should get posts with parameters", async () => {
      await client.getPosts({ per_page: 5, status: "publish" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("per_page=5");
      expect(url).toContain("status=publish");
    });

    it("should get single post", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue({ id: 1, title: { rendered: "Single Post" } }),
        text: vi.fn().mockResolvedValue('{"id": 1, "title": {"rendered": "Single Post"}}'),
      });

      const post = await client.getPost(1);
      expect(post.id).toBe(1);
      expect(post.title.rendered).toBe("Single Post");
    });

    it("should create posts", async () => {
      const newPost = {
        title: "New Post",
        content: "Post content",
        status: "draft",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue({ id: 3, ...newPost }),
        text: vi.fn().mockResolvedValue(JSON.stringify({ id: 3, ...newPost })),
      });

      const result = await client.createPost(newPost);
      expect(result.id).toBe(3);
      expect(result.title).toBe("New Post");
    });

    it("should update posts", async () => {
      const updatedPost = { id: 1, title: "Updated Title" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue(updatedPost),
        text: vi.fn().mockResolvedValue(JSON.stringify(updatedPost)),
      });

      const result = await client.updatePost(updatedPost);
      expect(result.title).toBe("Updated Title");
    });

    it("should delete posts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue({ deleted: true, previous: { id: 1 } }),
        text: vi.fn().mockResolvedValue('{"deleted": true, "previous": {"id": 1}}'),
      });

      const result = await client.deletePost(1);
      expect(result.deleted).toBe(true);
    });
  });

  describe("Statistics and Monitoring", () => {
    it("should track request statistics", async () => {
      await client.get("posts");
      await client.get("pages");

      const stats = client.stats;
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(2);
    });

    it("should track error statistics", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      try {
        await client.get("posts");
      } catch (_e) {
        // Expected error
      }

      const stats = client.stats;
      expect(stats.totalRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue(null),
        text: vi.fn().mockResolvedValue("null"),
      });

      const result = await client.get("posts");
      expect(result).toBeNull();
    });

    it("should handle non-JSON responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "text/html"]]),
        json: vi.fn().mockRejectedValue(new Error("Not JSON")),
        text: vi.fn().mockResolvedValue("<html>Not JSON</html>"),
      });

      const result = await client.get("posts");
      expect(result).toBe("<html>Not JSON</html>");
    });

    it("should handle very large responses", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, title: `Post ${i}` }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: vi.fn().mockResolvedValue(largeArray),
        text: vi.fn().mockResolvedValue(JSON.stringify(largeArray)),
      });

      const result = await client.get("posts");
      expect(result).toHaveLength(1000);
    });
  });
});
