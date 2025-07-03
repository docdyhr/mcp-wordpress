/**
 * Test to verify authentication headers are properly included in POST requests
 */

import { jest } from "@jest/globals";
import { WordPressClient } from "../dist/client/api.js";
import fetch from "node-fetch";

// Mock fetch
jest.mock("node-fetch");

describe("WordPress REST API Authentication Headers", () => {
  let client;
  let mockFetch;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockFetch = fetch;

    // Create client with app password auth
    client = new WordPressClient({
      baseUrl: "https://test.wordpress.com",
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "xxxx yyyy zzzz aaaa bbbb cccc",
      },
    });
  });

  describe("addAuthHeaders method", () => {
    it("should add Authorization header for app-password auth", () => {
      const headers = {};
      client.addAuthHeaders(headers);

      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Basic /);

      // Verify the encoded credentials
      const decoded = Buffer.from(
        headers.Authorization.replace("Basic ", ""),
        "base64",
      ).toString();
      expect(decoded).toBe("testuser:xxxx yyyy zzzz aaaa bbbb cccc");
    });
  });

  describe("request method", () => {
    it("should include Authorization header in GET requests", async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, title: "Test Post" }],
      });

      await client.getPosts({ per_page: 1 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_url, options] = mockFetch.mock.calls[0];

      expect(options.headers).toBeDefined();
      expect(options.headers.Authorization).toBeDefined();
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });

    it("should include Authorization header in POST requests", async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: "New Post" }),
      });

      await client.createPost({
        title: "New Post",
        content: "Test content",
        status: "draft",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_url, options] = mockFetch.mock.calls[0];

      expect(options.method).toBe("POST");
      expect(options.headers).toBeDefined();
      expect(options.headers.Authorization).toBeDefined();
      expect(options.headers.Authorization).toMatch(/^Basic /);
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should include Authorization header in PUT requests", async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: "Updated Post" }),
      });

      await client.updatePost({
        id: 123,
        title: "Updated Post",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_url, options] = mockFetch.mock.calls[0];

      expect(options.method).toBe("PUT");
      expect(options.headers).toBeDefined();
      expect(options.headers.Authorization).toBeDefined();
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });

    it("should include Authorization header in DELETE requests", async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      await client.deletePost(123, true);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_url, options] = mockFetch.mock.calls[0];

      expect(options.method).toBe("DELETE");
      expect(options.headers).toBeDefined();
      expect(options.headers.Authorization).toBeDefined();
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });

    it("should not override auth headers when custom headers are provided", async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Make request with custom headers
      await client.get("posts", {
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_url, options] = mockFetch.mock.calls[0];

      // Should have both auth and custom headers
      expect(options.headers.Authorization).toBeDefined();
      expect(options.headers["X-Custom-Header"]).toBe("custom-value");
    });

    it("should handle FormData requests without breaking auth headers", async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 456,
          source_url: "https://example.com/image.jpg",
        }),
      });

      // Create mock FormData
      const formData = {
        append: jest.fn(),
      };

      await client.post("media", formData);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_url, options] = mockFetch.mock.calls[0];

      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBeDefined();
      // Content-Type should be removed for FormData
      expect(options.headers["Content-Type"]).toBeUndefined();
      expect(options.body).toBe(formData);
    });
  });

  describe("authentication with different methods", () => {
    it("should add Authorization header for basic auth", () => {
      const basicClient = new WordPressClient({
        baseUrl: "https://test.wordpress.com",
        auth: {
          method: "basic",
          username: "testuser",
          password: "testpassword",
        },
      });

      const headers = {};
      basicClient.addAuthHeaders(headers);

      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Basic /);

      const decoded = Buffer.from(
        headers.Authorization.replace("Basic ", ""),
        "base64",
      ).toString();
      expect(decoded).toBe("testuser:testpassword");
    });

    it("should add Bearer token for JWT auth", () => {
      const jwtClient = new WordPressClient({
        baseUrl: "https://test.wordpress.com",
        auth: {
          method: "jwt",
          token: "test-jwt-token",
        },
      });

      // Set JWT token (normally done during authentication)
      jwtClient.jwtToken = "test-jwt-token";

      const headers = {};
      jwtClient.addAuthHeaders(headers);

      expect(headers.Authorization).toBe("Bearer test-jwt-token");
    });

    it("should add X-API-Key header for API key auth", () => {
      const apiKeyClient = new WordPressClient({
        baseUrl: "https://test.wordpress.com",
        auth: {
          method: "api-key",
          apiKey: "test-api-key-123",
        },
      });

      const headers = {};
      apiKeyClient.addAuthHeaders(headers);

      expect(headers["X-API-Key"]).toBe("test-api-key-123");
    });
  });
});
