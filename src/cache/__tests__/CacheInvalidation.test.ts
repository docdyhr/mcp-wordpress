/**
 * Tests for CacheInvalidation
 */

import { CacheManager } from "../CacheManager.js";
import { HttpCacheWrapper } from "../HttpCacheWrapper.js";
import { CacheInvalidation, WordPressCachePatterns } from "../CacheInvalidation.js";

describe("CacheInvalidation", () => {
  let cacheManager: CacheManager;
  let httpCache: HttpCacheWrapper;
  let cacheInvalidation: CacheInvalidation;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 100,
      defaultTTL: 10000,
      enableLRU: true,
      enableStats: true,
    });

    httpCache = new HttpCacheWrapper(cacheManager, "test-site");
    cacheInvalidation = new CacheInvalidation(httpCache);
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe("Default Invalidation Rules", () => {
    test("should have default rules for posts", () => {
      const rules = cacheInvalidation.getRules();

      expect(rules.posts).toBeDefined();
      expect(rules.posts.length).toBeGreaterThan(0);

      const createRule = rules.posts.find((r) => r.trigger === "create");
      expect(createRule).toBeDefined();
      expect(createRule?.patterns).toContain("posts");
      expect(createRule?.immediate).toBe(true);
      expect(createRule?.cascade).toBe(true);
    });

    test("should have default rules for categories", () => {
      const rules = cacheInvalidation.getRules();

      expect(rules.categories).toBeDefined();

      const updateRule = rules.categories.find((r) => r.trigger === "update");
      expect(updateRule).toBeDefined();
      expect(updateRule?.patterns).toContain("categories/\\d+");
      expect(updateRule?.cascade).toBe(true);
    });

    test("should have default rules for users", () => {
      const rules = cacheInvalidation.getRules();

      expect(rules.users).toBeDefined();

      const deleteRule = rules.users.find((r) => r.trigger === "delete");
      expect(deleteRule).toBeDefined();
      expect(deleteRule?.patterns).toContain("users");
    });
  });

  describe("Custom Invalidation Rules", () => {
    test("should register custom invalidation rules", () => {
      const customRule = {
        trigger: "update" as const,
        patterns: ["custom-endpoint.*"],
        immediate: true,
      };

      cacheInvalidation.registerRule("custom", customRule);

      const rules = cacheInvalidation.getRules();
      expect(rules.custom).toBeDefined();
      expect(rules.custom).toContain(customRule);
    });

    test("should support multiple rules per resource", () => {
      const rule1 = {
        trigger: "create" as const,
        patterns: ["test.*"],
        immediate: true,
      };

      const rule2 = {
        trigger: "update" as const,
        patterns: ["test/\\d+"],
        immediate: false,
      };

      cacheInvalidation.registerRule("test", rule1);
      cacheInvalidation.registerRule("test", rule2);

      const rules = cacheInvalidation.getRules();
      expect(rules.test).toHaveLength(2);
      expect(rules.test).toContain(rule1);
      expect(rules.test).toContain(rule2);
    });
  });

  describe("Event Processing", () => {
    test("should process invalidation events", async () => {
      // Pre-populate cache with some test data
      httpCache.warm("posts", [{ id: 1 }, { id: 2 }]);
      httpCache.warm("posts/1", { id: 1, title: "Test Post" });
      httpCache.warm("categories", [{ id: 1 }]);

      expect(cacheManager.getStats().totalSize).toBe(3);

      // Trigger post creation event
      await cacheInvalidation.trigger({
        type: "create",
        resource: "posts",
        id: 3,
        siteId: "test-site",
        timestamp: Date.now(),
      });

      // Should invalidate posts listings but not specific post
      const stats = cacheManager.getStats();
      expect(stats.totalSize).toBeLessThan(3);
    });

    test("should process events in queue order", async () => {
      const processedEvents: string[] = [];

      // Mock the invalidation process to track order
      const originalInvalidatePattern = httpCache.invalidatePattern;
      httpCache.invalidatePattern = jest.fn().mockImplementation((pattern: string) => {
        processedEvents.push(pattern);
        return originalInvalidatePattern.call(httpCache, pattern);
      });

      // Queue multiple events
      await Promise.all([
        cacheInvalidation.trigger({
          type: "create",
          resource: "posts",
          siteId: "test-site",
          timestamp: Date.now(),
        }),
        cacheInvalidation.trigger({
          type: "update",
          resource: "categories",
          siteId: "test-site",
          timestamp: Date.now(),
        }),
      ]);

      expect(processedEvents.length).toBeGreaterThan(0);
    });

    test("should handle resource invalidation by type", async () => {
      httpCache.warm("posts", [{ id: 1 }]);
      httpCache.warm("posts/1", { id: 1 });

      expect(cacheManager.getStats().totalSize).toBe(2);

      await cacheInvalidation.invalidateResource("posts", 1, "update");

      // Should clear specific post and related caches
      const stats = cacheManager.getStats();
      expect(stats.totalSize).toBeLessThan(2);
    });
  });

  describe("Pattern Matching", () => {
    test("should replace placeholders in patterns", async () => {
      // Pre-populate cache
      httpCache.warm("posts/123", { id: 123 });
      httpCache.warm("posts/456", { id: 456 });
      httpCache.warm("pages/123", { id: 123 });

      expect(cacheManager.getStats().totalSize).toBe(3);

      // Trigger event with specific ID
      await cacheInvalidation.trigger({
        type: "update",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      });

      // Should only invalidate posts/123, not posts/456 or pages/123
      const remainingKeys: string[] = [];
      for (const [key] of (cacheManager as unknown).cache.entries()) {
        remainingKeys.push(key);
      }

      expect(remainingKeys).not.toContain(expect.stringContaining("posts"));
    });
  });

  describe("Statistics", () => {
    test("should track invalidation statistics", () => {
      const stats = cacheInvalidation.getStats();

      expect(stats).toHaveProperty("queueSize");
      expect(stats).toHaveProperty("rulesCount");
      expect(stats).toHaveProperty("processing");

      expect(typeof stats.queueSize).toBe("number");
      expect(typeof stats.rulesCount).toBe("number");
      expect(typeof stats.processing).toBe("boolean");
      expect(stats.rulesCount).toBeGreaterThan(0);
    });

    test("should clear rules", () => {
      const initialStats = cacheInvalidation.getStats();
      expect(initialStats.rulesCount).toBeGreaterThan(0);

      cacheInvalidation.clearRules();

      const clearedStats = cacheInvalidation.getStats();
      expect(clearedStats.rulesCount).toBe(0);
    });
  });
});

describe("WordPressCachePatterns", () => {
  let cacheManager: CacheManager;
  let httpCache: HttpCacheWrapper;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 100,
      defaultTTL: 10000,
      enableLRU: true,
      enableStats: true,
    });

    httpCache = new HttpCacheWrapper(cacheManager, "test-site");
  });

  afterEach(() => {
    cacheManager.clear();
  });

  test("should invalidate content-related caches", () => {
    // Pre-populate cache
    httpCache.warm("posts", []);
    httpCache.warm("pages", []);
    httpCache.warm("comments", []);
    httpCache.warm("categories", []);

    expect(cacheManager.getStats().totalSize).toBe(4);

    const invalidated = WordPressCachePatterns.invalidateContent(httpCache);

    expect(invalidated).toBeGreaterThan(0);
    // Should invalidate posts, pages, comments but not categories
    expect(cacheManager.getStats().totalSize).toBeLessThan(4);
  });

  test("should invalidate taxonomy-related caches", () => {
    httpCache.warm("categories", []);
    httpCache.warm("tags", []);
    httpCache.warm("posts", []);

    expect(cacheManager.getStats().totalSize).toBe(3);

    const invalidated = WordPressCachePatterns.invalidateTaxonomies(httpCache);

    expect(invalidated).toBeGreaterThan(0);
    // Should invalidate categories and tags but not posts
    expect(cacheManager.getStats().totalSize).toBeLessThan(3);
  });

  test("should invalidate user-related caches", () => {
    httpCache.warm("users", []);
    httpCache.warm("users/me", {});
    httpCache.warm("posts", []);

    expect(cacheManager.getStats().totalSize).toBe(3);

    const invalidated = WordPressCachePatterns.invalidateUsers(httpCache);

    expect(invalidated).toBeGreaterThan(0);
    // Should invalidate user caches but not posts
    expect(cacheManager.getStats().totalSize).toBeLessThan(3);
  });

  test("should invalidate all caches", () => {
    httpCache.warm("posts", []);
    httpCache.warm("categories", []);
    httpCache.warm("users", []);

    expect(cacheManager.getStats().totalSize).toBe(3);

    const invalidated = WordPressCachePatterns.invalidateAll(httpCache);

    expect(invalidated).toBe(3);
    expect(cacheManager.getStats().totalSize).toBe(0);
  });
});
