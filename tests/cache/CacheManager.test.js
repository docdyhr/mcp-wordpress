/**
 * Tests for CacheManager
 * 
 * Tests the in-memory caching system with TTL and LRU eviction.
 * Matches the actual CacheManager implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CacheManager } from "@/cache/CacheManager.js";

// Mock config with proper structure that matches Config.js exports
vi.mock("../../dist/config/Config.js", () => ({
  config: () => ({
    app: {
      isDevelopment: true,
      isProduction: false,
      isTest: true,
      isDXT: false,
      isCI: false,
    },
  }),
  ConfigHelpers: {
    isTest: vi.fn(() => true),
  },
}));

describe("CacheManager", () => {
  let cacheManager;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      maxSize: 100,
      defaultTTL: 300000, // 5 minutes in milliseconds
      enableLRU: true,
      enableStats: true,
    };

    cacheManager = new CacheManager(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (cacheManager && cacheManager.destroy) {
      cacheManager.destroy();
    }
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with configuration", () => {
      expect(cacheManager).toBeDefined();
      expect(cacheManager.config).toEqual(mockConfig);
    });

    it("should initialize with default stats", () => {
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe("Basic Cache Operations", () => {
    it("should set and get values", () => {
      cacheManager.set("test-key", "test-value");
      const value = cacheManager.get("test-key");
      
      expect(value).toBe("test-value");
    });

    it("should return null for non-existent keys", () => {
      const value = cacheManager.get("non-existent-key");
      
      expect(value).toBeNull();
    });

    it("should check if keys exist", () => {
      cacheManager.set("exists-key", "exists-value");
      
      const exists = cacheManager.has("exists-key");
      const notExists = cacheManager.has("not-exists-key");
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it("should delete values", () => {
      cacheManager.set("delete-key", "delete-value");
      
      let value = cacheManager.get("delete-key");
      expect(value).toBe("delete-value");
      
      const deleted = cacheManager.delete("delete-key");
      expect(deleted).toBe(true);
      
      value = cacheManager.get("delete-key");
      expect(value).toBeNull();
    });

    it("should clear all cache entries", () => {
      cacheManager.set("key1", "value1");
      cacheManager.set("key2", "value2");
      cacheManager.set("key3", "value3");
      
      cacheManager.clear();
      
      const value1 = cacheManager.get("key1");
      const value2 = cacheManager.get("key2");
      const value3 = cacheManager.get("key3");
      
      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBeNull();
    });
  });

  describe("Key Generation", () => {
    it("should generate keys with site and endpoint", () => {
      const key = cacheManager.generateKey("site1", "posts");
      expect(key).toBe("site1:posts");
    });

    it("should generate keys with parameters hash", () => {
      const key = cacheManager.generateKey("site1", "posts", { status: "publish", per_page: 10 });
      expect(key).toMatch(/^site1:posts:[a-f0-9]{8}$/);
    });

    it("should generate consistent keys for same parameters", () => {
      const params = { status: "publish", per_page: 10 };
      const key1 = cacheManager.generateKey("site1", "posts", params);
      const key2 = cacheManager.generateKey("site1", "posts", params);
      expect(key1).toBe(key2);
    });

    it("should generate different keys for different parameter order (normalized)", () => {
      const params1 = { status: "publish", per_page: 10 };
      const params2 = { per_page: 10, status: "publish" };
      const key1 = cacheManager.generateKey("site1", "posts", params1);
      const key2 = cacheManager.generateKey("site1", "posts", params2);
      // Should be the same because parameters are normalized (sorted)
      expect(key1).toBe(key2);
    });
  });

  describe("TTL and Expiration", () => {
    it("should handle TTL expiration", (done) => {
      // Use very short TTL for testing
      cacheManager.set("ttl-key", "ttl-value", 50); // 50ms TTL
      
      // Should exist immediately
      let value = cacheManager.get("ttl-key");
      expect(value).toBe("ttl-value");
      
      // Wait for expiration
      setTimeout(() => {
        value = cacheManager.get("ttl-key");
        expect(value).toBeNull();
        done();
      }, 100);
    });

    it("should use custom TTL", () => {
      cacheManager.set("custom-ttl", "value", 60000); // 1 minute
      
      // Check the entry directly
      const entry = cacheManager.getEntry("custom-ttl");
      expect(entry).toBeDefined();
      expect(entry.ttl).toBe(60000);
    });

    it("should use default TTL when not specified", () => {
      cacheManager.set("default-ttl", "value");
      
      const entry = cacheManager.getEntry("default-ttl");
      expect(entry).toBeDefined();
      expect(entry.ttl).toBe(mockConfig.defaultTTL);
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache hits and misses", () => {
      cacheManager.set("stats-key", "stats-value");
      
      // Hit
      cacheManager.get("stats-key");
      // Miss
      cacheManager.get("non-existent-key");
      
      const stats = cacheManager.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it("should track total size", () => {
      cacheManager.set("key1", "value1");
      cacheManager.set("key2", "value2");
      
      const stats = cacheManager.getStats();
      expect(stats.totalSize).toBe(2);
    });

    it("should track evictions", () => {
      // Set cache to small size to trigger evictions
      const smallConfig = { ...mockConfig, maxSize: 2 };
      const smallCache = new CacheManager(smallConfig);
      
      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      smallCache.set("key3", "value3"); // Should trigger eviction
      
      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
      expect(stats.totalSize).toBe(2);
      
      smallCache.destroy();
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used entries when maxSize exceeded", () => {
      const smallConfig = { ...mockConfig, maxSize: 3 };
      const lruCache = new CacheManager(smallConfig);
      
      lruCache.set("oldest", "value1");
      lruCache.set("middle", "value2");
      lruCache.set("newest", "value3");
      
      // Access middle to make it more recent
      lruCache.get("middle");
      
      // Add new item to trigger eviction of oldest
      lruCache.set("newer", "value4");
      
      const oldest = lruCache.get("oldest");
      const middle = lruCache.get("middle");
      const newest = lruCache.get("newest");
      const newer = lruCache.get("newer");
      
      expect(oldest).toBeNull(); // Should be evicted (least recently used)
      expect(middle).toBe("value2"); // Should remain (accessed recently)
      expect(newest).toBe("value3");
      expect(newer).toBe("value4");
      
      lruCache.destroy();
    });
  });

  describe("Site-specific Operations", () => {
    it("should clear cache entries for specific site", () => {
      cacheManager.set("site1:posts", "site1-posts");
      cacheManager.set("site1:pages", "site1-pages");
      cacheManager.set("site2:posts", "site2-posts");
      
      const cleared = cacheManager.clearSite("site1");
      
      expect(cleared).toBe(2);
      expect(cacheManager.get("site1:posts")).toBeNull();
      expect(cacheManager.get("site1:pages")).toBeNull();
      expect(cacheManager.get("site2:posts")).toBe("site2-posts");
    });

    it("should clear cache entries matching pattern", () => {
      cacheManager.set("posts:list", "posts");
      cacheManager.set("posts:single:123", "post123");
      cacheManager.set("pages:list", "pages");
      
      const cleared = cacheManager.clearPattern(/^posts:/);
      
      expect(cleared).toBe(2);
      expect(cacheManager.get("posts:list")).toBeNull();
      expect(cacheManager.get("posts:single:123")).toBeNull();
      expect(cacheManager.get("pages:list")).toBe("pages");
    });
  });

  describe("Conditional Requests", () => {
    it("should support etag for conditional requests", () => {
      cacheManager.set("etag-key", "value", 300000, "etag-123");
      
      const supportsConditional = cacheManager.supportsConditionalRequest("etag-key");
      expect(supportsConditional).toBe(true);
      
      const headers = cacheManager.getConditionalHeaders("etag-key");
      expect(headers["If-None-Match"]).toBe("etag-123");
    });

    it("should support lastModified for conditional requests", () => {
      const lastModified = "Wed, 21 Oct 2015 07:28:00 GMT";
      cacheManager.set("lastmod-key", "value", 300000, undefined, lastModified);
      
      const supportsConditional = cacheManager.supportsConditionalRequest("lastmod-key");
      expect(supportsConditional).toBe(true);
      
      const headers = cacheManager.getConditionalHeaders("lastmod-key");
      expect(headers["If-Modified-Since"]).toBe(lastModified);
    });

    it("should support both etag and lastModified", () => {
      const etag = "etag-456";
      const lastModified = "Wed, 21 Oct 2015 07:28:00 GMT";
      cacheManager.set("both-key", "value", 300000, etag, lastModified);
      
      const headers = cacheManager.getConditionalHeaders("both-key");
      expect(headers["If-None-Match"]).toBe(etag);
      expect(headers["If-Modified-Since"]).toBe(lastModified);
    });
  });

  describe("Data Types", () => {
    it("should handle string values", () => {
      cacheManager.set("string-key", "string-value");
      const value = cacheManager.get("string-key");
      
      expect(value).toBe("string-value");
      expect(typeof value).toBe("string");
    });

    it("should handle number values", () => {
      cacheManager.set("number-key", 42);
      const value = cacheManager.get("number-key");
      
      expect(value).toBe(42);
      expect(typeof value).toBe("number");
    });

    it("should handle boolean values", () => {
      cacheManager.set("boolean-key", true);
      const value = cacheManager.get("boolean-key");
      
      expect(value).toBe(true);
      expect(typeof value).toBe("boolean");
    });

    it("should handle object values", () => {
      const testObject = { id: 1, name: "Test", active: true };
      cacheManager.set("object-key", testObject);
      const value = cacheManager.get("object-key");
      
      expect(value).toEqual(testObject);
      expect(typeof value).toBe("object");
    });

    it("should handle array values", () => {
      const testArray = [1, 2, 3, "four", { five: 5 }];
      cacheManager.set("array-key", testArray);
      const value = cacheManager.get("array-key");
      
      expect(value).toEqual(testArray);
      expect(Array.isArray(value)).toBe(true);
    });

    it("should handle null values", () => {
      cacheManager.set("null-key", null);
      const value = cacheManager.get("null-key");
      
      expect(value).toBeNull();
    });
  });

  describe("Cache Entry Metadata", () => {
    it("should track access count and last accessed time", async () => {
      cacheManager.set("access-key", "value");
      
      // First access
      cacheManager.get("access-key");
      let entry = cacheManager.getEntry("access-key");
      expect(entry.accessCount).toBe(2); // 1 from set + 1 from get
      
      // Wait a tiny bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Second access
      cacheManager.get("access-key");
      entry = cacheManager.getEntry("access-key");
      expect(entry.accessCount).toBe(3); // 1 from set + 2 from gets
      expect(entry.lastAccessed).toBeGreaterThanOrEqual(entry.timestamp);
    });
  });

  describe("Cache Presets", () => {
    it("should export cache presets", async () => {
      const { CachePresets } = await import("@/cache/CacheManager.js");
      
      expect(CachePresets).toBeDefined();
      expect(CachePresets.STATIC).toBeDefined();
      expect(CachePresets.DYNAMIC).toBeDefined();
      expect(CachePresets.SESSION).toBeDefined();
      expect(CachePresets.REALTIME).toBeDefined();
      
      expect(CachePresets.STATIC.ttl).toBe(4 * 60 * 60 * 1000); // 4 hours
      expect(CachePresets.DYNAMIC.ttl).toBe(15 * 60 * 1000); // 15 minutes
    });
  });
});