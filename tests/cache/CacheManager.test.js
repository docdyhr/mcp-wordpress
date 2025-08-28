/**
 * Tests for CacheManager
 * 
 * Tests the multi-layer caching system including in-memory cache,
 * file system cache, Redis integration, and cache monitoring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CacheManager } from "@/cache/CacheManager.js";
import * as fs from "fs";

// Mock file system operations
vi.mock("fs", () => ({
  promises: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue("{}"),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({
      mtime: new Date(),
      size: 1024,
    }),
  },
  existsSync: vi.fn().mockReturnValue(true),
}));

// Mock Redis client
vi.mock("redis", () => ({
  createClient: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    ttl: vi.fn().mockResolvedValue(-1),
    flushall: vi.fn().mockResolvedValue("OK"),
    keys: vi.fn().mockResolvedValue([]),
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

// Mock logger to avoid console output
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    cache: () => ({
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
    cache: {
      enabled: true,
      ttl: 300,
      maxMemoryMB: 50,
      maxItems: 1000,
      compressionEnabled: true,
      persistToDisk: true,
      diskCachePath: "/tmp/cache",
      redisEnabled: false,
      redisUrl: "redis://localhost:6379",
    },
  }),
  ConfigHelpers: {
    shouldUseCache: vi.fn(() => true),
    isProduction: vi.fn(() => false),
    isDev: vi.fn(() => true),
  },
}));

describe("CacheManager", () => {
  let cacheManager;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      ttl: 300,
      maxMemoryMB: 50,
      maxItems: 1000,
      compressionEnabled: true,
      persistToDisk: true,
      diskCachePath: "/tmp/cache",
      redisEnabled: false,
      redisUrl: "redis://localhost:6379",
      keyPrefix: "wp-cache:",
      enableMetrics: true,
    };

    cacheManager = new CacheManager(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with configuration", () => {
      expect(cacheManager).toBeDefined();
      expect(cacheManager.config).toEqual(mockConfig);
    });

    it("should initialize in-memory cache", () => {
      expect(cacheManager.memoryCache).toBeDefined();
    });

    it("should use default configuration when none provided", () => {
      const defaultManager = new CacheManager();
      expect(defaultManager.config).toBeDefined();
    });

    it("should validate configuration parameters", () => {
      const invalidConfig = {
        ...mockConfig,
        maxMemoryMB: -1,
      };

      expect(() => new CacheManager(invalidConfig)).toThrow();
    });
  });

  describe("Basic Cache Operations", () => {
    it("should set and get values from memory cache", async () => {
      await cacheManager.set("test-key", "test-value");
      const value = await cacheManager.get("test-key");
      
      expect(value).toBe("test-value");
    });

    it("should return null for non-existent keys", async () => {
      const value = await cacheManager.get("non-existent-key");
      
      expect(value).toBeNull();
    });

    it("should handle TTL expiration", async () => {
      await cacheManager.set("ttl-key", "ttl-value", { ttl: 100 });
      
      // Should exist immediately
      let value = await cacheManager.get("ttl-key");
      expect(value).toBe("ttl-value");
      
      // Mock time passage
      vi.advanceTimersByTime(150);
      
      value = await cacheManager.get("ttl-key");
      expect(value).toBeNull();
    });

    it("should delete values", async () => {
      await cacheManager.set("delete-key", "delete-value");
      
      let value = await cacheManager.get("delete-key");
      expect(value).toBe("delete-value");
      
      await cacheManager.delete("delete-key");
      
      value = await cacheManager.get("delete-key");
      expect(value).toBeNull();
    });

    it("should check if keys exist", async () => {
      await cacheManager.set("exists-key", "exists-value");
      
      const exists = await cacheManager.has("exists-key");
      const notExists = await cacheManager.has("not-exists-key");
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it("should clear all cache entries", async () => {
      await cacheManager.set("key1", "value1");
      await cacheManager.set("key2", "value2");
      await cacheManager.set("key3", "value3");
      
      await cacheManager.clear();
      
      const value1 = await cacheManager.get("key1");
      const value2 = await cacheManager.get("key2");
      const value3 = await cacheManager.get("key3");
      
      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBeNull();
    });
  });

  describe("Data Types Support", () => {
    it("should handle string values", async () => {
      await cacheManager.set("string-key", "string-value");
      const value = await cacheManager.get("string-key");
      
      expect(value).toBe("string-value");
      expect(typeof value).toBe("string");
    });

    it("should handle number values", async () => {
      await cacheManager.set("number-key", 42);
      const value = await cacheManager.get("number-key");
      
      expect(value).toBe(42);
      expect(typeof value).toBe("number");
    });

    it("should handle boolean values", async () => {
      await cacheManager.set("boolean-key", true);
      const value = await cacheManager.get("boolean-key");
      
      expect(value).toBe(true);
      expect(typeof value).toBe("boolean");
    });

    it("should handle object values", async () => {
      const testObject = { id: 1, name: "Test", active: true };
      await cacheManager.set("object-key", testObject);
      const value = await cacheManager.get("object-key");
      
      expect(value).toEqual(testObject);
      expect(typeof value).toBe("object");
    });

    it("should handle array values", async () => {
      const testArray = [1, 2, 3, "four", { five: 5 }];
      await cacheManager.set("array-key", testArray);
      const value = await cacheManager.get("array-key");
      
      expect(value).toEqual(testArray);
      expect(Array.isArray(value)).toBe(true);
    });

    it("should handle null values", async () => {
      await cacheManager.set("null-key", null);
      const value = await cacheManager.get("null-key");
      
      expect(value).toBeNull();
    });
  });

  describe("Cache Options", () => {
    it("should respect custom TTL values", async () => {
      await cacheManager.set("custom-ttl", "value", { ttl: 60 });
      
      const entry = cacheManager.memoryCache.get("custom-ttl");
      expect(entry.expires).toBeDefined();
      expect(entry.expires - Date.now()).toBeLessThanOrEqual(60000);
    });

    it("should handle no-expire entries", async () => {
      await cacheManager.set("no-expire", "value", { ttl: 0 });
      
      const entry = cacheManager.memoryCache.get("no-expire");
      expect(entry.expires).toBe(0);
    });

    it("should support compression for large values", async () => {
      const largeValue = "x".repeat(10000);
      await cacheManager.set("large-value", largeValue, { compress: true });
      
      const value = await cacheManager.get("large-value");
      expect(value).toBe(largeValue);
    });

    it("should support tags for grouped invalidation", async () => {
      await cacheManager.set("post-1", "Post 1", { tags: ["posts", "user-123"] });
      await cacheManager.set("post-2", "Post 2", { tags: ["posts", "user-456"] });
      await cacheManager.set("page-1", "Page 1", { tags: ["pages"] });
      
      await cacheManager.invalidateByTag("posts");
      
      const post1 = await cacheManager.get("post-1");
      const post2 = await cacheManager.get("post-2");
      const page1 = await cacheManager.get("page-1");
      
      expect(post1).toBeNull();
      expect(post2).toBeNull();
      expect(page1).toBe("Page 1");
    });
  });

  describe("Disk Cache", () => {
    beforeEach(() => {
      cacheManager.config.persistToDisk = true;
    });

    it("should persist cache entries to disk", async () => {
      await cacheManager.set("disk-key", "disk-value");
      
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it("should load cache entries from disk", async () => {
      fs.promises.readFile.mockResolvedValue(
        JSON.stringify({ value: "disk-loaded-value" })
      );
      
      const value = await cacheManager.get("disk-loaded-key");
      
      expect(fs.promises.readFile).toHaveBeenCalled();
      expect(value).toBe("disk-loaded-value");
    });

    it("should handle disk write failures gracefully", async () => {
      fs.promises.writeFile.mockRejectedValue(new Error("Disk full"));
      
      await expect(cacheManager.set("fail-key", "fail-value")).resolves.not.toThrow();
    });

    it("should cleanup expired disk entries", async () => {
      fs.promises.readdir.mockResolvedValue([
        "expired-entry-1",
        "expired-entry-2",
        "valid-entry",
      ]);
      
      fs.promises.stat.mockImplementation((path) => {
        const isExpired = path.includes("expired");
        return Promise.resolve({
          mtime: new Date(Date.now() - (isExpired ? 3600000 : 60000)),
          size: 1024,
        });
      });
      
      await cacheManager.cleanupDiskCache();
      
      expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
    });
  });

  describe("Memory Management", () => {
    it("should enforce memory limits", async () => {
      cacheManager.config.maxMemoryMB = 1; // Very small limit
      
      // Fill cache beyond memory limit
      for (let i = 0; i < 100; i++) {
        await cacheManager.set(`key-${i}`, "x".repeat(1000));
      }
      
      const stats = await cacheManager.getStats();
      expect(stats.memoryUsageMB).toBeLessThanOrEqual(2); // Some overhead allowed
    });

    it("should enforce item count limits", async () => {
      cacheManager.config.maxItems = 10;
      
      // Add more items than limit
      for (let i = 0; i < 20; i++) {
        await cacheManager.set(`item-${i}`, `value-${i}`);
      }
      
      const stats = await cacheManager.getStats();
      expect(stats.itemCount).toBeLessThanOrEqual(10);
    });

    it("should use LRU eviction policy", async () => {
      cacheManager.config.maxItems = 3;
      
      await cacheManager.set("oldest", "value1");
      await cacheManager.set("middle", "value2");
      await cacheManager.set("newest", "value3");
      
      // Access middle to make it more recent
      await cacheManager.get("middle");
      
      // Add new item to trigger eviction
      await cacheManager.set("newer", "value4");
      
      const oldest = await cacheManager.get("oldest");
      const middle = await cacheManager.get("middle");
      const newest = await cacheManager.get("newest");
      const newer = await cacheManager.get("newer");
      
      expect(oldest).toBeNull(); // Should be evicted
      expect(middle).toBe("value2"); // Should remain (accessed recently)
      expect(newest).toBe("value3");
      expect(newer).toBe("value4");
    });
  });

  describe("Redis Integration", () => {
    beforeEach(() => {
      cacheManager.config.redisEnabled = true;
    });

    it("should connect to Redis when enabled", async () => {
      await cacheManager.initializeRedis();
      
      expect(cacheManager.redisClient).toBeDefined();
    });

    it("should fallback to memory cache when Redis unavailable", async () => {
      cacheManager.redisClient.get.mockRejectedValue(new Error("Redis down"));
      
      await cacheManager.set("redis-fallback", "fallback-value");
      const value = await cacheManager.get("redis-fallback");
      
      expect(value).toBe("fallback-value");
    });

    it("should use Redis for distributed caching", async () => {
      cacheManager.redisClient.get.mockResolvedValue("redis-value");
      
      const value = await cacheManager.get("redis-key");
      
      expect(value).toBe("redis-value");
      expect(cacheManager.redisClient.get).toHaveBeenCalledWith("wp-cache:redis-key");
    });

    it("should handle Redis connection failures", async () => {
      cacheManager.redisClient.connect.mockRejectedValue(new Error("Connection failed"));
      
      await expect(cacheManager.initializeRedis()).resolves.not.toThrow();
      expect(cacheManager.redisEnabled).toBe(false);
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache hits and misses", async () => {
      await cacheManager.set("stats-key", "stats-value");
      
      // Hit
      await cacheManager.get("stats-key");
      // Miss
      await cacheManager.get("non-existent-key");
      
      const stats = await cacheManager.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it("should track cache operations", async () => {
      await cacheManager.set("op-key1", "value1");
      await cacheManager.set("op-key2", "value2");
      await cacheManager.delete("op-key1");
      
      const stats = await cacheManager.getStats();
      
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
    });

    it("should calculate memory usage", async () => {
      const largeValue = "x".repeat(10000);
      await cacheManager.set("memory-test", largeValue);
      
      const stats = await cacheManager.getStats();
      
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
      expect(stats.itemCount).toBe(1);
    });

    it("should track average operation times", async () => {
      await cacheManager.set("perf-key", "perf-value");
      await cacheManager.get("perf-key");
      
      const stats = await cacheManager.getStats();
      
      expect(stats.avgSetTime).toBeGreaterThanOrEqual(0);
      expect(stats.avgGetTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Cache Warming", () => {
    it("should warm cache with predefined data", async () => {
      const warmupData = [
        { key: "warm-1", value: "warm-value-1", ttl: 300 },
        { key: "warm-2", value: "warm-value-2", ttl: 600 },
      ];
      
      await cacheManager.warmUp(warmupData);
      
      const value1 = await cacheManager.get("warm-1");
      const value2 = await cacheManager.get("warm-2");
      
      expect(value1).toBe("warm-value-1");
      expect(value2).toBe("warm-value-2");
    });

    it("should warm cache from external source", async () => {
      const dataLoader = vi.fn().mockResolvedValue([
        { key: "external-1", value: "external-value-1" },
        { key: "external-2", value: "external-value-2" },
      ]);
      
      await cacheManager.warmUpFromSource(dataLoader);
      
      expect(dataLoader).toHaveBeenCalled();
      
      const value1 = await cacheManager.get("external-1");
      expect(value1).toBe("external-value-1");
    });
  });

  describe("Error Handling", () => {
    it("should handle serialization errors", async () => {
      const circularObj = {};
      circularObj.self = circularObj;
      
      await expect(cacheManager.set("circular", circularObj)).resolves.not.toThrow();
    });

    it("should handle deserialization errors", async () => {
      fs.promises.readFile.mockResolvedValue("invalid-json");
      
      const value = await cacheManager.get("invalid-json-key");
      
      expect(value).toBeNull();
    });

    it("should handle concurrent access gracefully", async () => {
      const promises = [];
      
      // Simulate concurrent operations
      for (let i = 0; i < 100; i++) {
        promises.push(cacheManager.set(`concurrent-${i}`, `value-${i}`));
      }
      
      await Promise.all(promises);
      
      const stats = await cacheManager.getStats();
      expect(stats.itemCount).toBe(100);
    });

    it("should handle memory pressure", async () => {
      // Mock low memory condition
      Object.defineProperty(process, 'memoryUsage', {
        value: vi.fn().mockReturnValue({
          rss: 1000000000, // 1GB
          heapTotal: 900000000,
          heapUsed: 850000000,
          external: 50000000,
        }),
      });
      
      await cacheManager.set("memory-pressure", "test-value");
      
      // Should still function under memory pressure
      const value = await cacheManager.get("memory-pressure");
      expect(value).toBe("test-value");
    });
  });

  describe("Integration", () => {
    it("should work with WordPress post caching", async () => {
      const post = {
        id: 123,
        title: "Test Post",
        content: "Post content",
        author: "test-user",
      };
      
      await cacheManager.set("wp:post:123", post, {
        ttl: 300,
        tags: ["posts", "user:test-user"],
      });
      
      const cachedPost = await cacheManager.get("wp:post:123");
      expect(cachedPost).toEqual(post);
    });

    it("should handle cache invalidation on content updates", async () => {
      await cacheManager.set("wp:post:456", { title: "Old Title" }, {
        tags: ["posts", "post:456"],
      });
      
      await cacheManager.set("wp:posts:list", ["post:456"], {
        tags: ["posts"],
      });
      
      // Simulate post update
      await cacheManager.invalidateByTag("post:456");
      
      const post = await cacheManager.get("wp:post:456");
      const postsList = await cacheManager.get("wp:posts:list");
      
      expect(post).toBeNull();
      expect(postsList).toBeNull(); // Should be invalidated by posts tag
    });

    it("should optimize for API response caching", async () => {
      const apiResponse = {
        data: [{ id: 1 }, { id: 2 }],
        meta: { total: 2, page: 1 },
      };
      
      const cacheKey = cacheManager.generateCacheKey("api", "/wp/v2/posts", {
        per_page: 10,
        status: "publish",
      });
      
      await cacheManager.set(cacheKey, apiResponse, { ttl: 180 });
      
      const cached = await cacheManager.get(cacheKey);
      expect(cached).toEqual(apiResponse);
    });
  });
});