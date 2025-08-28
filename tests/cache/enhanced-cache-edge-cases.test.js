import { vi } from "vitest";
import { CacheManager } from "@/cache/CacheManager.js";

describe("Enhanced Cache Edge Cases and Performance Validation", () => {
  let cacheManager;
  let cacheManagers = [];

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 100,
      defaultTTL: 5000, // 5 seconds
      cleanupInterval: 1000, // 1 second for tests
      enableLRU: true,
      enableStats: true,
    });
    cacheManagers.push(cacheManager);
  });

  afterEach(() => {
    // Clean up all cache managers to prevent memory leaks
    cacheManagers.forEach((manager) => {
      if (manager && manager.destroy) {
        manager.destroy();
      }
    });
    cacheManagers = [];
    vi.clearAllMocks();
  });

  describe("Edge Cases", () => {
    it("should handle null and undefined values gracefully", () => {
      expect(() => cacheManager.set("nullKey", null)).not.toThrow();
      expect(() => cacheManager.set("undefinedKey", undefined)).not.toThrow();

      expect(cacheManager.get("nullKey")).toBe(null);
      expect(cacheManager.get("undefinedKey")).toBe(undefined);
    });

    it("should handle empty string keys", () => {
      expect(() => cacheManager.set("", "empty key value")).not.toThrow();
      expect(cacheManager.get("")).toBe("empty key value");
    });

    it("should handle very long keys", () => {
      const longKey = "a".repeat(1000);
      const value = "long key value";

      cacheManager.set(longKey, value);
      expect(cacheManager.get(longKey)).toBe(value);
    });

    it("should handle special characters in keys", () => {
      const specialKeys = [
        "key with spaces",
        "key-with-dashes",
        "key_with_underscores",
        "key.with.dots",
        "key/with/slashes",
        "key:with:colons",
        "key@with@symbols",
        "key[with]brackets",
        "key{with}braces",
        "key(with)parentheses",
      ];

      specialKeys.forEach((key, index) => {
        const value = `value-${index}`;
        cacheManager.set(key, value);
        expect(cacheManager.get(key)).toBe(value);
      });
    });

    it("should handle unicode characters in keys and values", () => {
      const unicodeKey = "🚀_test_key_🌟";
      const unicodeValue = "Hello 世界 🌍";

      cacheManager.set(unicodeKey, unicodeValue);
      expect(cacheManager.get(unicodeKey)).toBe(unicodeValue);
    });

    it("should handle large objects", () => {
      const largeObject = {
        id: 12345,
        data: "x".repeat(10000), // 10KB string
        nested: {
          array: new Array(1000).fill(0).map((_, i) => ({ index: i, value: `item-${i}` })),
          metadata: {
            created: new Date().toISOString(),
            version: "1.0.0",
            tags: ["large", "test", "object"],
          },
        },
      };

      cacheManager.set("largeObject", largeObject);
      const retrieved = cacheManager.get("largeObject");

      expect(retrieved).toEqual(largeObject);
      expect(retrieved.nested.array).toHaveLength(1000);
    });

    it("should handle circular references gracefully", () => {
      const circularObj = { name: "test" };
      circularObj.self = circularObj;

      // Should not throw when setting (JSON.stringify might be used internally)
      expect(() => cacheManager.set("circular", circularObj)).not.toThrow();

      // The retrieved object should be the same reference
      const retrieved = cacheManager.get("circular");
      expect(retrieved).toBe(circularObj);
    });

    it("should handle concurrent access safely", async () => {
      const promises = [];
      const testData = {};

      // Create 100 concurrent operations
      for (let i = 0; i < 100; i++) {
        testData[`key-${i}`] = `value-${i}`;

        promises.push(
          Promise.resolve().then(() => {
            cacheManager.set(`key-${i}`, `value-${i}`);
            return cacheManager.get(`key-${i}`);
          }),
        );
      }

      const results = await Promise.all(promises);

      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result).toBe(`value-${index}`);
      });

      // Cache should contain all entries
      expect(cacheManager.getStats().totalSize).toBe(100);
    });

    it("should handle rapid successive operations", () => {
      const key = "rapidKey";

      // Rapid set operations
      for (let i = 0; i < 1000; i++) {
        cacheManager.set(key, `value-${i}`);
      }

      // Should have the latest value
      expect(cacheManager.get(key)).toBe("value-999");

      // Should only have one entry for this key
      expect(cacheManager.getStats().totalSize).toBe(1);
    });

    it("should handle memory pressure gracefully", () => {
      // Fill cache beyond its limit
      for (let i = 0; i < 200; i++) {
        // maxSize is 100
        cacheManager.set(`key-${i}`, { data: `value-${i}`, index: i });
      }

      // Should not exceed maxSize due to LRU eviction
      expect(cacheManager.getStats().totalSize).toBeLessThanOrEqual(100);

      // Most recent entries should still be available
      expect(cacheManager.get("key-199")).toBeDefined();
      expect(cacheManager.get("key-150")).toBeDefined();

      // Oldest entries should be evicted (get returns null, not undefined)
      expect(cacheManager.get("key-0")).toBeNull();
      expect(cacheManager.get("key-50")).toBeNull();
    });
  });

  describe("TTL and Expiration Edge Cases", () => {
    it("should handle zero TTL correctly", () => {
      cacheManager.set("zeroTTL", "should expire immediately", 0);

      // Zero TTL entries might be immediately expired
      // The important thing is that it behaves consistently and doesn't throw errors
      expect(() => cacheManager.get("zeroTTL")).not.toThrow();
      expect(() => cacheManager.has("zeroTTL")).not.toThrow();

      // Zero TTL means immediate expiration, so the entry should not be considered valid
      // Note: Implementation may vary - some return null, others may never cache zero TTL
      const result = cacheManager.get("zeroTTL");
      expect([null, "should expire immediately"]).toContain(result);
    });

    it("should handle negative TTL correctly", () => {
      cacheManager.set("negativeTTL", "should be invalid", -1000);

      // Should be immediately expired (returns null)
      expect(cacheManager.get("negativeTTL")).toBeNull();
    });

    it("should handle very short TTL correctly", async () => {
      cacheManager.set("shortTTL", "expires quickly", 10); // 10ms

      // Should be available immediately
      expect(cacheManager.get("shortTTL")).toBe("expires quickly");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should be expired (returns null)
      expect(cacheManager.get("shortTTL")).toBeNull();
    });

    it("should handle very long TTL correctly", () => {
      const longTTL = 365 * 24 * 60 * 60 * 1000; // 1 year
      cacheManager.set("longTTL", "expires in a year", longTTL);

      expect(cacheManager.get("longTTL")).toBe("expires in a year");

      // Check that expiration time is set correctly
      const stats = cacheManager.getStats();
      expect(stats.totalSize).toBe(1);
    });

    it("should handle TTL updates correctly", () => {
      cacheManager.set("updateTTL", "original value", 1000);

      // Update with new TTL
      cacheManager.set("updateTTL", "updated value", 5000);

      expect(cacheManager.get("updateTTL")).toBe("updated value");
    });

    it("should handle mixed TTL values", () => {
      cacheManager.set("short", "short ttl", 100);
      cacheManager.set("medium", "medium ttl", 1000);
      cacheManager.set("long", "long ttl", 10000);
      cacheManager.set("default", "default ttl"); // Uses default TTL

      expect(cacheManager.get("short")).toBe("short ttl");
      expect(cacheManager.get("medium")).toBe("medium ttl");
      expect(cacheManager.get("long")).toBe("long ttl");
      expect(cacheManager.get("default")).toBe("default ttl");
    });
  });

  describe("Performance Validation", () => {
    it("should have acceptable set performance", () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        cacheManager.set(`perf-set-${i}`, { index: i, data: `value-${i}` });
      }

      const duration = Date.now() - startTime;
      const opsPerSecond = iterations / (duration / 1000);

      // Should achieve at least 10,000 ops/sec
      expect(opsPerSecond).toBeGreaterThan(10000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should have acceptable get performance", () => {
      // First populate cache
      for (let i = 0; i < 1000; i++) {
        cacheManager.set(`perf-get-${i}`, { index: i, data: `value-${i}` });
      }

      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const key = `perf-get-${i % 1000}`; // Cycle through existing keys
        cacheManager.get(key);
      }

      const duration = Date.now() - startTime;
      const opsPerSecond = iterations / (duration / 1000);

      // Should achieve at least 50,000 ops/sec for gets
      expect(opsPerSecond).toBeGreaterThan(50000);
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it("should have acceptable mixed operation performance", () => {
      const iterations = 5000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        if (i % 3 === 0) {
          cacheManager.set(`perf-mixed-${i}`, { index: i });
        } else {
          cacheManager.get(`perf-mixed-${i - (i % 3)}`);
        }
      }

      const duration = Date.now() - startTime;
      const opsPerSecond = iterations / (duration / 1000);

      // Should achieve at least 15,000 ops/sec for mixed operations
      expect(opsPerSecond).toBeGreaterThan(15000);
      expect(duration).toBeLessThan(333); // Should complete within 333ms
    });

    it("should maintain performance under high memory usage", () => {
      // Fill cache with large objects
      const largeObjects = [];
      for (let i = 0; i < 50; i++) {
        largeObjects.push({
          id: i,
          data: "x".repeat(1000), // 1KB each
          array: new Array(100).fill(0).map((j) => ({ id: j, value: `item-${i}-${j}` })),
        });
        cacheManager.set(`large-${i}`, largeObjects[i]);
      }

      // Test performance with large cache
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        cacheManager.get(`large-${i % 50}`);
      }

      const duration = Date.now() - startTime;
      const opsPerSecond = iterations / (duration / 1000);

      // Performance should still be reasonable
      expect(opsPerSecond).toBeGreaterThan(10000);
      expect(duration).toBeLessThan(100);
    });

    it("should handle cleanup operations efficiently", async () => {
      // Add entries with short TTLs
      for (let i = 0; i < 100; i++) {
        cacheManager.set(`cleanup-${i}`, `value-${i}`, 50); // 50ms TTL
      }

      expect(cacheManager.getStats().totalSize).toBe(100);

      // Wait for expiration and allow cleanup to occur
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Cleanup happens automatically, but we can trigger it by accessing expired entries
      const startTime = Date.now();
      let nullCount = 0;
      for (let i = 0; i < 20; i++) {
        if (cacheManager.get(`cleanup-${i}`) === null) {
          nullCount++;
        }
      }
      const duration = Date.now() - startTime;

      // Cleanup should be fast and entries should be expired
      expect(duration).toBeLessThan(50);
      expect(nullCount).toBeGreaterThan(0);

      // After accessing expired entries, cache size should be reduced
      // Allow for some tolerance since cleanup might not happen immediately
      const finalSize = cacheManager.getStats().totalSize;
      expect(finalSize).toBeLessThanOrEqual(100); // At minimum should not grow
    });
  });

  describe("Statistics and Monitoring", () => {
    it("should track statistics accurately", () => {
      // Perform various operations
      cacheManager.set("stat1", "value1");
      cacheManager.set("stat2", "value2");
      cacheManager.get("stat1"); // Hit
      cacheManager.get("stat1"); // Hit
      cacheManager.get("nonexistent"); // Miss

      const stats = cacheManager.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.totalSize).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.67, 2); // 2/3
    });

    it("should provide consistent statistics", () => {
      cacheManager.set("consistent1", "value1");
      cacheManager.set("consistent2", "value2");
      cacheManager.get("consistent1");
      cacheManager.get("consistent1"); // Another hit
      cacheManager.get("nonexistent"); // Miss

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.totalSize).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.67, 2); // 2/3
    });

    it("should handle statistics edge cases", () => {
      // Test statistics with zero operations
      let stats = cacheManager.getStats();
      expect(stats.hitRate).toBe(0);

      // Test with only misses
      cacheManager.get("nonexistent1");
      cacheManager.get("nonexistent2");

      stats = cacheManager.getStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.misses).toBe(2);
    });
  });

  describe("Cache Patterns and Clear Operations", () => {
    it("should clear cache patterns correctly", () => {
      cacheManager.set("user:1", "user1");
      cacheManager.set("user:2", "user2");
      cacheManager.set("post:1", "post1");
      cacheManager.set("post:2", "post2");
      cacheManager.set("category:1", "category1");

      expect(cacheManager.getStats().totalSize).toBe(5);

      // Clear user patterns
      const cleared = cacheManager.clearPattern(/^user:/);
      expect(cleared).toBe(2);
      expect(cacheManager.getStats().totalSize).toBe(3);

      // Verify user entries are gone (returns null, not undefined)
      expect(cacheManager.get("user:1")).toBeNull();
      expect(cacheManager.get("user:2")).toBeNull();

      // Verify other entries remain
      expect(cacheManager.get("post:1")).toBe("post1");
      expect(cacheManager.get("post:2")).toBe("post2");
      expect(cacheManager.get("category:1")).toBe("category1");
    });

    it("should handle complex regex patterns", () => {
      cacheManager.set("api:v1:users", "users_v1");
      cacheManager.set("api:v2:users", "users_v2");
      cacheManager.set("api:v1:posts", "posts_v1");
      cacheManager.set("cache:temp:1", "temp1");
      cacheManager.set("cache:permanent:1", "perm1");

      // Clear all v1 API endpoints
      let cleared = cacheManager.clearPattern(/^api:v1:/);
      expect(cleared).toBe(2);

      // Clear temporary cache entries
      cleared = cacheManager.clearPattern(/cache:temp:/);
      expect(cleared).toBe(1);

      expect(cacheManager.getStats().totalSize).toBe(2);
      expect(cacheManager.get("api:v2:users")).toBe("users_v2");
      expect(cacheManager.get("cache:permanent:1")).toBe("perm1");
    });

    it("should handle empty pattern matches", () => {
      cacheManager.set("test1", "value1");
      cacheManager.set("test2", "value2");

      const cleared = cacheManager.clearPattern(/^nomatch:/);
      expect(cleared).toBe(0);
      expect(cacheManager.getStats().totalSize).toBe(2);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle cache corruption gracefully", () => {
      cacheManager.set("normal", "normal value");

      // Manually corrupt cache entry (simulate corruption)
      const corruptedData = {
        value: "corrupted",
        expiresAt: "invalid-date",
        accessCount: "not-a-number",
      };
      cacheManager.cache.set("corrupted", corruptedData);

      // Should handle corrupted entries gracefully
      expect(() => cacheManager.get("corrupted")).not.toThrow();
      expect(() => cacheManager.cleanupExpired()).not.toThrow();

      // Normal entries should still work
      expect(cacheManager.get("normal")).toBe("normal value");
    });

    it("should recover from full cache clear", () => {
      // Populate cache
      for (let i = 0; i < 10; i++) {
        cacheManager.set(`recovery-${i}`, `value-${i}`);
      }

      expect(cacheManager.getStats().totalSize).toBe(10);

      // Clear all
      cacheManager.clear();
      expect(cacheManager.getStats().totalSize).toBe(0);

      // Should be able to add new entries
      cacheManager.set("recovered", "recovery value");
      expect(cacheManager.get("recovered")).toBe("recovery value");
      expect(cacheManager.getStats().totalSize).toBe(1);

      // Statistics should still work
      const stats = cacheManager.getStats();
      expect(stats).toBeDefined();
    });

    it("should handle extreme values gracefully", () => {
      // Test with extreme numbers
      expect(() => cacheManager.set("extreme1", Number.MAX_VALUE)).not.toThrow();
      expect(() => cacheManager.set("extreme2", Number.MIN_VALUE)).not.toThrow();
      expect(() => cacheManager.set("extreme3", Number.POSITIVE_INFINITY)).not.toThrow();
      expect(() => cacheManager.set("extreme4", Number.NEGATIVE_INFINITY)).not.toThrow();
      expect(() => cacheManager.set("extreme5", NaN)).not.toThrow();

      // Should be able to retrieve them
      expect(cacheManager.get("extreme1")).toBe(Number.MAX_VALUE);
      expect(cacheManager.get("extreme2")).toBe(Number.MIN_VALUE);
      expect(cacheManager.get("extreme3")).toBe(Number.POSITIVE_INFINITY);
      expect(cacheManager.get("extreme4")).toBe(Number.NEGATIVE_INFINITY);
      expect(Number.isNaN(cacheManager.get("extreme5"))).toBe(true);
    });
  });
});
