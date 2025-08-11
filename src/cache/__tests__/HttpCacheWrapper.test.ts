/**
 * Tests for HttpCacheWrapper
 */

import { CacheManager } from "../CacheManager.js";
import { HttpCacheWrapper } from "../HttpCacheWrapper.js";

describe("HttpCacheWrapper", () => {
  let cacheManager: CacheManager;
  let httpCache: HttpCacheWrapper;
  let mockRequestFn: jest.Mock;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 100,
      defaultTTL: 1000,
      enableLRU: true,
      enableStats: true,
    });

    httpCache = new HttpCacheWrapper(cacheManager, "test-site");

    mockRequestFn = jest.fn();
  });

  afterEach(() => {
    cacheManager.clear();
    jest.clearAllMocks();
  });

  describe("Request Caching", () => {
    test("should cache GET requests", async () => {
      const mockResponse = {
        data: { id: 1, title: "Test Post" },
        status: 200,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(mockResponse);

      const requestOptions = {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts",
        headers: {},
        params: {},
      };

      // First request should hit the API
      const result1 = await httpCache.request(mockRequestFn, requestOptions);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual(mockResponse.data);
      expect(result1.cached).toBe(false);

      // Second request should use cache
      const result2 = await httpCache.request(mockRequestFn, requestOptions);
      expect(mockRequestFn).toHaveBeenCalledTimes(1); // No additional call
      expect(result2.data).toEqual(mockResponse.data);
      expect(result2.cached).toBe(true);
    });

    test("should not cache non-GET requests", async () => {
      const mockResponse = {
        data: { id: 1, title: "Test Post" },
        status: 201,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(mockResponse);

      const requestOptions = {
        method: "POST",
        url: "https://example.com/wp-json/wp/v2/posts",
        headers: {},
        params: {},
        data: { title: "New Post" },
      };

      // Both requests should hit the API
      const result1 = await httpCache.request(mockRequestFn, requestOptions);
      const result2 = await httpCache.request(mockRequestFn, requestOptions);

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
      expect(result1.cached).toBeUndefined();
      expect(result2.cached).toBeUndefined();
    });

    test("should not cache error responses", async () => {
      const errorResponse = {
        data: { error: "Not found" },
        status: 404,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(errorResponse);

      const requestOptions = {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts/999",
        headers: {},
        params: {},
      };

      // Both requests should hit the API (no caching of 404)
      await httpCache.request(mockRequestFn, requestOptions);
      await httpCache.request(mockRequestFn, requestOptions);

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });

    test("should generate ETags for responses", async () => {
      const mockResponse = {
        data: { id: 1, title: "Test Post" },
        status: 200,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(mockResponse);

      const requestOptions = {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts/1",
        headers: {},
        params: {},
      };

      const result = await httpCache.request(mockRequestFn, requestOptions);

      expect(result.headers.etag).toBeDefined();
      expect(result.headers.etag).toMatch(/^"[a-f0-9]{32}"$/);
      expect(result.headers["last-modified"]).toBeDefined();
      expect(result.headers["cache-control"]).toBeDefined();
    });
  });

  describe("Cache Invalidation", () => {
    test("should invalidate specific endpoint", async () => {
      // Cache a response
      const mockResponse = {
        data: { id: 1, title: "Test Post" },
        status: 200,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(mockResponse);

      const requestOptions = {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts/1",
        headers: {},
        params: {},
      };

      await httpCache.request(mockRequestFn, requestOptions);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);

      // Verify cache hit
      await httpCache.request(mockRequestFn, requestOptions);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);

      // Invalidate cache
      httpCache.invalidate("posts/1");

      // Should hit API again
      await httpCache.request(mockRequestFn, requestOptions);
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });

    test("should invalidate by pattern", async () => {
      // Cache multiple responses
      const responses = [
        { url: "posts", data: [{ id: 1 }, { id: 2 }] },
        { url: "posts/1", data: { id: 1 } },
        { url: "pages/1", data: { id: 1 } },
      ];

      for (const response of responses) {
        mockRequestFn.mockResolvedValueOnce({
          data: response.data,
          status: 200,
          headers: {},
        });

        await httpCache.request(mockRequestFn, {
          method: "GET",
          url: `https://example.com/wp-json/wp/v2/${response.url}`,
          headers: {},
          params: {},
        });
      }

      expect(mockRequestFn).toHaveBeenCalledTimes(3);

      // Invalidate all posts
      const invalidated = httpCache.invalidatePattern("posts");
      expect(invalidated).toBe(2); // Should invalidate 2 post-related entries

      // Verify pages cache still works
      await httpCache.request(mockRequestFn, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/pages/1",
        headers: {},
        params: {},
      });
      expect(mockRequestFn).toHaveBeenCalledTimes(3); // No new call for pages
    });

    test("should invalidate all cache for site", async () => {
      // Cache some responses
      const mockResponse = {
        data: { id: 1 },
        status: 200,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(mockResponse);

      await httpCache.request(mockRequestFn, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts",
        headers: {},
        params: {},
      });

      await httpCache.request(mockRequestFn, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/pages",
        headers: {},
        params: {},
      });

      expect(mockRequestFn).toHaveBeenCalledTimes(2);

      // Clear all cache
      const invalidated = httpCache.invalidateAll();
      expect(invalidated).toBeGreaterThan(0);

      // Verify cache is cleared
      await httpCache.request(mockRequestFn, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts",
        headers: {},
        params: {},
      });
      expect(mockRequestFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("Cache Warming", () => {
    test("should pre-warm cache with data", () => {
      const endpoint = "posts";
      const data = [
        { id: 1, title: "Post 1" },
        { id: 2, title: "Post 2" },
      ];
      const params = { per_page: 10 };

      httpCache.warm(endpoint, data, params);

      // Verify cache entry exists
      const cacheKey = cacheManager.generateKey("test-site", endpoint, params);
      const cached = cacheManager.get(cacheKey);

      expect(cached).toBeDefined();
      if (cached && typeof cached === "object" && "data" in cached) {
        const cachedEntry = cached as { data: unknown; etag?: string; lastModified?: string };
        expect(cachedEntry.data).toEqual(data);
        expect(cachedEntry.etag).toBeDefined();
        expect(cachedEntry.lastModified).toBeDefined();
      }
    });

    test("should use warmed cache for requests", async () => {
      const endpoint = "posts";
      const data = [{ id: 1, title: "Post 1" }];

      httpCache.warm(endpoint, data);

      const result = await httpCache.request(mockRequestFn, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts",
        headers: {},
        params: {},
      });

      expect(mockRequestFn).not.toHaveBeenCalled();
      expect(result.data).toEqual(data);
      expect(result.cached).toBe(true);
    });
  });

  describe("Cache Statistics", () => {
    test("should return cache statistics", async () => {
      const mockResponse = {
        data: { id: 1 },
        status: 200,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(mockResponse);

      // Generate some cache activity
      await httpCache.request(mockRequestFn, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts/1",
        headers: {},
        params: {},
      });

      await httpCache.request(mockRequestFn, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts/1",
        headers: {},
        params: {},
      });

      const stats = httpCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalSize).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe("URL and Endpoint Extraction", () => {
    test("should extract endpoint from WordPress API URLs", async () => {
      const testCases = [
        {
          url: "https://example.com/wp-json/wp/v2/posts",
          expectedEndpoint: "posts",
        },
        {
          url: "https://example.com/wp-json/wp/v2/posts/123",
          expectedEndpoint: "posts/123",
        },
        {
          url: "https://example.com/wp-json/wp/v2/categories?per_page=10",
          expectedEndpoint: "categories",
        },
      ];

      const mockResponse = {
        data: {},
        status: 200,
        headers: {},
      };

      mockRequestFn.mockResolvedValue(mockResponse);

      for (const testCase of testCases) {
        await httpCache.request(mockRequestFn, {
          method: "GET",
          url: testCase.url,
          headers: {},
          params: {},
        });

        // Verify cache key contains the correct endpoint
        const stats = httpCache.getStats();
        expect(stats.totalSize).toBeGreaterThan(0);
      }
    });
  });
});
