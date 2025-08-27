/**
 * Tests for CachedWordPressClient
 */

import { CachedWordPressClient } from "../index.js";
import type { WordPressClientConfig } from "../../types/client.js";

// Mock the base WordPress client
jest.mock("../../client/api.js", () => {
  return {
    WordPressClient: jest.fn().mockImplementation(() => ({
      baseUrl: "https://example.com",
      auth: { method: "app-password", username: "test", appPassword: "test" },
      jwtToken: null,
      request: jest.fn(),
      getPosts: jest.fn(),
      getPost: jest.fn(),
      createPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn(),
      getCurrentUser: jest.fn(),
      getCategories: jest.fn(),
      getTags: jest.fn(),
      getSiteSettings: jest.fn(),
    })),
  };
});

describe("CachedWordPressClient", () => {
  let client: CachedWordPressClient;
  let config: WordPressClientConfig;

  beforeEach(() => {
    config = {
      baseUrl: "https://example.com",
      auth: {
        method: "app-password",
        username: "test",
        appPassword: "test-password",
      },
    };

    client = new CachedWordPressClient(config, "test-site");
  });

  afterEach(() => {
    client.clearCache();
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    test("should initialize with caching system", () => {
      expect(client).toBeDefined();
      expect(client["cacheManager"]).toBeDefined();
      expect(client["httpCache"]).toBeDefined();
      expect(client["cacheInvalidation"]).toBeDefined();
    });

    test("should use provided site ID", () => {
      const customClient = new CachedWordPressClient(config, "custom-site");
      expect(customClient["siteId"]).toBe("custom-site");
    });

    test('should default to "default" site ID', () => {
      const defaultClient = new CachedWordPressClient(config);
      expect(defaultClient["siteId"]).toBe("default");
    });
  });

  describe("GET Request Caching", () => {
    test("should cache GET requests", async () => {
      const mockResponse = [{ id: 1, title: "Test Post" }];
      (client as unknown).request = jest
        .fn()
        .mockImplementationOnce(async () => mockResponse)
        .mockImplementationOnce(async () => mockResponse);

      // First call should hit the API
      const result1 = await client.getPosts();
      expect(result1).toEqual(mockResponse);

      // Second call should use cache (mocked request should only be called once)
      const result2 = await client.getPosts();
      expect(result2).toEqual(mockResponse);

      // Verify the underlying request was only called once due to caching
      expect((client as unknown).request).toHaveBeenCalledTimes(1);
    });

    test("should cache individual post requests", async () => {
      const mockPost = { id: 1, title: "Test Post" };
      (client as unknown).request = jest.fn().mockResolvedValue(mockPost);

      const result1 = await client.getPost(1);
      const result2 = await client.getPost(1);

      expect(result1).toEqual(mockPost);
      expect(result2).toEqual(mockPost);
      expect((client as unknown).request).toHaveBeenCalledTimes(1);
    });
  });

  describe("Write Operations and Cache Invalidation", () => {
    test("should invalidate cache on post creation", async () => {
      const mockPost = { id: 1, title: "New Post" };
      const mockCreateData = { title: "New Post", content: "Content" };

      // Mock the parent class methods
      const _originalCreatePost = client.createPost;
      client.createPost = jest.fn().mockResolvedValue(mockPost);

      const invalidateSpy = jest.spyOn(client["cacheInvalidation"], "invalidateResource");

      await client.createPost(mockCreateData);

      expect(invalidateSpy).toHaveBeenCalledWith("posts", 1, "create");
    });

    test("should invalidate cache on post update", async () => {
      const mockPost = { id: 1, title: "Updated Post" };
      const mockUpdateData = { id: 1, title: "Updated Post" };

      client.updatePost = jest.fn().mockResolvedValue(mockPost);
      const invalidateSpy = jest.spyOn(client["cacheInvalidation"], "invalidateResource");

      await client.updatePost(mockUpdateData);

      expect(invalidateSpy).toHaveBeenCalledWith("posts", 1, "update");
    });

    test("should invalidate cache on post deletion", async () => {
      client.deletePost = jest.fn().mockResolvedValue(undefined);
      const invalidateSpy = jest.spyOn(client["cacheInvalidation"], "invalidateResource");

      await client.deletePost(1);

      expect(invalidateSpy).toHaveBeenCalledWith("posts", 1, "delete");
    });
  });

  describe("Cache Configuration by Endpoint Type", () => {
    test("should use static caching for site settings", async () => {
      const mockSettings = { title: "Test Site" };
      (client as unknown).request = jest.fn().mockResolvedValue(mockSettings);

      await client.getSiteSettings();

      // Verify request was made with static cache configuration
      expect((client as unknown).request).toHaveBeenCalledWith("GET", "settings");
    });

    test("should use semi-static caching for categories", async () => {
      const mockCategories = [{ id: 1, name: "Test Category" }];
      (client as unknown).request = jest.fn().mockResolvedValue(mockCategories);

      await client.getCategories();

      expect((client as unknown).request).toHaveBeenCalledWith("GET", "categories", null, { params: {} });
    });

    test("should use session caching for current user", async () => {
      const mockUser = { id: 1, username: "testuser" };
      (client as unknown).request = jest.fn().mockResolvedValue(mockUser);

      await client.getCurrentUser();

      expect((client as unknown).request).toHaveBeenCalledWith("GET", "users/me");
    });
  });

  describe("Cache Management", () => {
    test("should clear all cache", () => {
      const clearSpy = jest.spyOn(client["httpCache"], "invalidateAll");

      const result = client.clearCache();

      expect(clearSpy).toHaveBeenCalled();
      expect(typeof result).toBe("number");
    });

    test("should clear cache by pattern", () => {
      const pattern = "posts.*";
      const clearPatternSpy = jest.spyOn(client["httpCache"], "invalidatePattern");

      const result = client.clearCachePattern(pattern);

      expect(clearPatternSpy).toHaveBeenCalledWith(pattern);
      expect(typeof result).toBe("number");
    });

    test("should provide cache statistics", () => {
      const stats = client.getCacheStats();

      expect(stats).toHaveProperty("cache");
      expect(stats).toHaveProperty("invalidation");
      expect(stats.cache).toHaveProperty("hits");
      expect(stats.cache).toHaveProperty("misses");
      expect(stats.cache).toHaveProperty("totalSize");
      expect(stats.invalidation).toHaveProperty("queueSize");
    });

    test("should warm cache with essential data", async () => {
      // Mock all the methods that warmCache calls
      client.getCurrentUser = jest.fn().mockResolvedValue({ id: 1 });
      client.getCategories = jest.fn().mockResolvedValue([]);
      client.getTags = jest.fn().mockResolvedValue([]);
      client.getSiteSettings = jest.fn().mockResolvedValue({});

      await client.warmCache();

      expect(client.getCurrentUser).toHaveBeenCalled();
      expect(client.getCategories).toHaveBeenCalled();
      expect(client.getTags).toHaveBeenCalled();
      expect(client.getSiteSettings).toHaveBeenCalled();
    });

    test("should handle cache warming errors gracefully", async () => {
      client.getCurrentUser = jest.fn().mockRejectedValue(new Error("Auth failed"));
      client.getCategories = jest.fn().mockResolvedValue([]);
      client.getTags = jest.fn().mockResolvedValue([]);
      client.getSiteSettings = jest.fn().mockResolvedValue({});

      // Should not throw despite getCurrentUser failing
      await expect(client.warmCache()).resolves.toBeUndefined();

      expect(client.getCategories).toHaveBeenCalled();
      expect(client.getTags).toHaveBeenCalled();
      expect(client.getSiteSettings).toHaveBeenCalled();
    });
  });

  describe("Cache Key Generation", () => {
    test("should generate different cache keys for different parameters", async () => {
      const mockPosts = [{ id: 1 }];
      (client as unknown).request = jest.fn().mockResolvedValue(mockPosts);

      // Make requests with different parameters
      await client.getPosts({ per_page: 10 });
      await client.getPosts({ per_page: 20 });

      // Should make two separate requests due to different cache keys
      expect((client as unknown).request).toHaveBeenCalledTimes(2);
    });

    test("should use same cache key for identical parameters", async () => {
      const mockPosts = [{ id: 1 }];
      (client as unknown).request = jest.fn().mockResolvedValue(mockPosts);

      const params = { per_page: 10, status: ["publish"] as ["publish"] };

      await client.getPosts(params);
      await client.getPosts(params);

      // Should only make one request due to caching
      expect((client as unknown).request).toHaveBeenCalledTimes(1);
    });
  });

  describe("Helper Methods", () => {
    test("should extract resource from endpoint", () => {
      const resource1 = (client as unknown).extractResourceFromEndpoint("posts");
      const resource2 = (client as unknown).extractResourceFromEndpoint("posts/123");
      const resource3 = (client as unknown).extractResourceFromEndpoint("categories");

      expect(resource1).toBe("posts");
      expect(resource2).toBe("posts");
      expect(resource3).toBe("categories");
    });

    test("should extract ID from endpoint", () => {
      const id1 = (client as unknown).extractIdFromEndpoint("posts/123");
      const id2 = (client as unknown).extractIdFromEndpoint("posts/123/revisions");
      const id3 = (client as unknown).extractIdFromEndpoint("posts");

      expect(id1).toBe(123);
      expect(id2).toBe(123);
      expect(id3).toBeUndefined();
    });

    test("should identify endpoint types correctly", () => {
      expect((client as unknown).isStaticEndpoint("settings")).toBe(true);
      expect((client as unknown).isStaticEndpoint("types")).toBe(true);
      expect((client as unknown).isStaticEndpoint("posts")).toBe(false);

      expect((client as unknown).isSemiStaticEndpoint("categories")).toBe(true);
      expect((client as unknown).isSemiStaticEndpoint("tags")).toBe(true);
      expect((client as unknown).isSemiStaticEndpoint("posts")).toBe(false);

      expect((client as unknown).isSessionEndpoint("users/me")).toBe(true);
      expect((client as unknown).isSessionEndpoint("application-passwords")).toBe(true);
      expect((client as unknown).isSessionEndpoint("posts")).toBe(false);
    });
  });
});
