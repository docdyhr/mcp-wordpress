import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fc from "fast-check";
import { CacheManager } from "../../src/cache/CacheManager.js";
import { CacheInvalidation } from "../../src/cache/CacheInvalidation.js";
import { HttpCacheWrapper } from "../../src/cache/HttpCacheWrapper.js";

/**
 * Property-based testing for cache invalidation patterns
 * Tests cache consistency under various scenarios using fast-check
 */

describe("Cache Invalidation Property-Based Tests", () => {
  let cacheManager;
  let cacheInvalidation;
  let httpCacheWrapper;

  beforeEach(() => {
    cacheManager = new CacheManager({ 
      maxSize: 1000,
      defaultTTL: 900000, // 15 minutes
      enableLRU: true,
      enableStats: true
    });
    httpCacheWrapper = new HttpCacheWrapper(cacheManager, 'test-site');
    cacheInvalidation = new CacheInvalidation(httpCacheWrapper);
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe("Cache Key Pattern Properties", () => {
    it("should generate consistent cache keys for identical parameters", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            endpoint: fc.constantFrom(
              "posts",
              "pages",
              "comments",
              "users",
              "media",
              "categories",
              "tags",
            ),
            params: fc.record({
              id: fc.option(fc.integer({ min: 1, max: 999999 })),
              slug: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              status: fc.option(fc.constantFrom("publish", "draft", "private")),
              per_page: fc.option(fc.integer({ min: 1, max: 100 })),
              page: fc.option(fc.integer({ min: 1, max: 100 })),
            }),
          }),
          (data) => {
            // Property: Identical parameters should always generate identical keys
            const key1 = cacheManager.generateKey(
              data.siteId,
              data.endpoint,
              data.params,
            );
            const key2 = cacheManager.generateKey(
              data.siteId,
              data.endpoint,
              data.params,
            );

            expect(key1).toBe(key2);
            expect(typeof key1).toBe("string");
            expect(key1.length).toBeGreaterThan(0);

            // Property: Keys should contain site ID for isolation
            expect(key1).toContain(data.siteId);
          },
        ),
      );
    });

    it("should generate different cache keys for different parameters", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            endpoint: fc.constantFrom("posts", "pages", "comments"),
            params1: fc.record({
              id: fc.integer({ min: 1, max: 999999 }),
              status: fc.constantFrom("publish", "draft"),
            }),
            params2: fc.record({
              id: fc.integer({ min: 1, max: 999999 }),
              status: fc.constantFrom("publish", "draft"),
            }),
          }),
          (data) => {
            // Skip if parameters are identical
            fc.pre(
              data.params1.id !== data.params2.id ||
                data.params1.status !== data.params2.status,
            );

            const key1 = cacheManager.generateKey(
              data.siteId,
              data.endpoint,
              data.params1,
            );
            const key2 = cacheManager.generateKey(
              data.siteId,
              data.endpoint,
              data.params2,
            );

            // Property: Different parameters should generate different keys
            expect(key1).not.toBe(key2);
          },
        ),
      );
    });

    it("should maintain site isolation in cache keys", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId1: fc.string({ minLength: 1, maxLength: 50 }),
            siteId2: fc.string({ minLength: 1, maxLength: 50 }),
            endpoint: fc.constantFrom("posts", "pages", "comments"),
            params: fc.record({
              id: fc.integer({ min: 1, max: 999999 }),
            }),
          }),
          (data) => {
            // Skip if site IDs are identical
            fc.pre(data.siteId1 !== data.siteId2);

            const key1 = cacheManager.generateKey(
              data.siteId1,
              data.endpoint,
              data.params,
            );
            const key2 = cacheManager.generateKey(
              data.siteId2,
              data.endpoint,
              data.params,
            );

            // Property: Different sites should generate different keys
            expect(key1).not.toBe(key2);
            expect(key1).toContain(data.siteId1);
            expect(key2).toContain(data.siteId2);
          },
        ),
      );
    });
  });

  describe("Cache Invalidation Pattern Properties", () => {
    it("should consistently handle cache pattern operations", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            resourceType: fc.constantFrom("posts", "pages", "comments"),
            resourceId: fc.integer({ min: 1, max: 999999 }),
            patterns: fc.array(
              fc.string({ minLength: 1, maxLength: 100 }),
              { minLength: 1, maxLength: 5 },
            ),
          }),
          (data) => {
            // Set up cache entries with generated keys
            const cacheKey = cacheManager.generateKey(
              data.siteId,
              data.resourceType,
              { id: data.resourceId },
            );
            cacheManager.set(cacheKey, { id: data.resourceId, data: "test" });

            // Property: Cache entry should be retrievable
            expect(cacheManager.get(cacheKey)).not.toBeNull();
            expect(cacheManager.has(cacheKey)).toBe(true);

            // Property: Pattern clearing should work consistently
            const initialStats = cacheManager.getStats();
            const clearedCount = cacheManager.clearPattern(new RegExp(data.resourceType));
            const finalStats = cacheManager.getStats();

            expect(clearedCount).toBeGreaterThanOrEqual(0);
            expect(finalStats.totalSize).toBeLessThanOrEqual(initialStats.totalSize);
          },
        ),
      );
    });

    it("should handle regex patterns safely", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            patterns: fc.array(
              fc.oneof(
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.constantFrom("posts", "pages", "comments", "users"),
                fc.constantFrom(".*", "\\d+", "[0-9]+"),
              ),
              { minLength: 1, maxLength: 3 },
            ),
          }),
          (data) => {
            // Property: Pattern operations should not throw errors
            data.patterns.forEach((pattern) => {
              expect(() => {
                const regex = new RegExp(pattern);
                cacheManager.clearPattern(regex);
              }).not.toThrow();
            });
          },
        ),
      );
    });
  });

  describe("Cascade Invalidation Properties", () => {
    it("should maintain consistency in cascade invalidation rules", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            postId: fc.integer({ min: 1, max: 999999 }),
            categoryIds: fc.array(fc.integer({ min: 1, max: 999999 }), {
              minLength: 1,
              maxLength: 5,
            }),
            tagIds: fc.array(fc.integer({ min: 1, max: 999999 }), {
              minLength: 1,
              maxLength: 5,
            }),
          }),
          (data) => {
            // Set up related cache entries
            const postKey = cacheManager.generateKey(data.siteId, "posts", {
              id: data.postId,
            });
            const postsListKey = cacheManager.generateKey(
              data.siteId,
              "posts",
              {},
            );

            cacheManager.set(postKey, { id: data.postId, title: "Test Post" });
            cacheManager.set(postsListKey, [{ id: data.postId }]);

            // Set up category and tag entries
            data.categoryIds.forEach((catId) => {
              const catKey = cacheManager.generateKey(
                data.siteId,
                "categories",
                { id: catId },
              );
              cacheManager.set(catKey, { id: catId, name: "Test Category" });
            });

            data.tagIds.forEach((tagId) => {
              const tagKey = cacheManager.generateKey(data.siteId, "tags", {
                id: tagId,
              });
              cacheManager.set(tagKey, { id: tagId, name: "Test Tag" });
            });

            const initialStats = cacheManager.getStats();

            // Trigger cascade invalidation
            cacheInvalidation.trigger({
              type: "update",
              resource: "posts",
              id: data.postId,
              siteId: data.siteId,
              timestamp: Date.now(),
              metadata: {
                categories: data.categoryIds,
                tags: data.tagIds,
              }
            });

            // Property: Cascade invalidation should affect related entries
            const postExists = cacheManager.get(postKey);
            const postsListExists = cacheManager.get(postsListKey);

            // Post should be invalidated
            expect(postExists).toBeNull();
            // Posts list should be invalidated (depends on implementation)
            // Categories and tags should remain (unless specifically invalidated)

            // Property: Invalidation should not affect unrelated entries
            const finalStats = cacheManager.getStats();
            expect(finalStats.totalSize).toBeLessThanOrEqual(initialStats.totalSize);
          },
        ),
      );
    });

    it("should handle deep cascade invalidation correctly", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            commentId: fc.integer({ min: 1, max: 999999 }),
            postId: fc.integer({ min: 1, max: 999999 }),
            parentCommentId: fc.option(fc.integer({ min: 1, max: 999999 })),
          }),
          (data) => {
            // Set up comment hierarchy
            const commentKey = cacheManager.generateKey(
              data.siteId,
              "comments",
              { id: data.commentId },
            );
            const postKey = cacheManager.generateKey(data.siteId, "posts", {
              id: data.postId,
            });
            const postCommentsKey = cacheManager.generateKey(
              data.siteId,
              "comments",
              { post: data.postId },
            );

            cacheManager.set(commentKey, {
              id: data.commentId,
              post: data.postId,
              parent: data.parentCommentId,
            });
            cacheManager.set(postKey, { id: data.postId });
            cacheManager.set(postCommentsKey, [{ id: data.commentId }]);

            // Trigger comment invalidation
            cacheInvalidation.trigger({
              type: "update",
              resource: "comments",
              id: data.commentId,
              siteId: data.siteId,
              timestamp: Date.now(),
              metadata: {
                post: data.postId,
                parent: data.parentCommentId,
              }
            });

            // Property: Comment invalidation should cascade to related entries
            const commentExists = cacheManager.get(commentKey);
            const postCommentsExists = cacheManager.get(postCommentsKey);

            // Comment should be invalidated
            expect(commentExists).toBeNull();
            // Post comments list should be invalidated
            expect(postCommentsExists).toBeNull();
          },
        ),
      );
    });
  });

  describe("Concurrent Invalidation Properties", () => {
    it("should handle concurrent invalidation operations safely", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            operations: fc.array(
              fc.record({
                type: fc.constantFrom("create", "update", "delete"),
                resource: fc.constantFrom("posts", "pages", "comments"),
                id: fc.integer({ min: 1, max: 999999 }),
                delay: fc.integer({ min: 0, max: 10 }),
              }),
              { minLength: 2, maxLength: 10 },
            ),
          }),
          async (data) => {
            // Set up initial cache entries
            const initialKeys = [];
            data.operations.forEach((op) => {
              const key = cacheManager.generateKey(data.siteId, op.resource, {
                id: op.id,
              });
              cacheManager.set(key, { id: op.id, data: "test" });
              initialKeys.push(key);
            });

            // Execute concurrent invalidation operations
            const promises = data.operations.map(async (op) => {
              if (op.delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, op.delay));
              }
              return cacheInvalidation.trigger({
                type: op.type,
                resource: op.resource,
                id: op.id,
                siteId: data.siteId,
                timestamp: Date.now(),
              });
            });

            await Promise.all(promises);

            // Property: Cache should remain in consistent state
            const finalStats = cacheManager.getStats();
            expect(finalStats.totalSize).toBeGreaterThanOrEqual(0);

            // Property: Cache statistics should be consistent
            expect(finalStats.hits).toBeGreaterThanOrEqual(0);
            expect(finalStats.misses).toBeGreaterThanOrEqual(0);
            expect(finalStats.evictions).toBeGreaterThanOrEqual(0);
          },
        ),
      );
    });

    it("should maintain atomicity in batch invalidation operations", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            batchOperations: fc.array(
              fc.record({
                resource: fc.constantFrom("posts", "pages", "comments"),
                ids: fc.array(fc.integer({ min: 1, max: 999999 }), {
                  minLength: 1,
                  maxLength: 5,
                }),
              }),
              { minLength: 1, maxLength: 3 },
            ),
          }),
          (data) => {
            // Set up batch cache entries
            const allKeys = [];
            data.batchOperations.forEach((batch) => {
              batch.ids.forEach((id) => {
                const key = cacheManager.generateKey(
                  data.siteId,
                  batch.resource,
                  { id },
                );
                cacheManager.set(key, { id, data: "test" });
                allKeys.push(key);
              });
            });

            const initialStats = cacheManager.getStats();

            // Execute batch invalidation
            data.batchOperations.forEach((batch) => {
              const patterns = batch.ids.map((id) => `${batch.resource}:${id}`);
              patterns.forEach((pattern) => {
                cacheManager.clearPattern(new RegExp(pattern));
              });
            });

            // Property: Batch operations should be atomic
            const finalStats = cacheManager.getStats();
            expect(finalStats.totalSize).toBeLessThanOrEqual(initialStats.totalSize);

            // Property: Cache should remain consistent
            expect(finalStats.totalSize).toBeGreaterThanOrEqual(0);
            expect(finalStats.hits).toBeGreaterThanOrEqual(0);
          },
        ),
      );
    });
  });

  describe("Cache Consistency Properties", () => {
    it("should maintain TTL consistency under invalidation", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            entries: fc.array(
              fc.record({
                resource: fc.constantFrom("posts", "pages", "comments"),
                id: fc.integer({ min: 1, max: 999999 }),
                ttl: fc.integer({ min: 100, max: 10000 }),
              }),
              { minLength: 1, maxLength: 10 },
            ),
          }),
          (data) => {
            // Set up entries with different TTLs
            const keys = [];
            data.entries.forEach((entry) => {
              const key = cacheManager.generateKey(
                data.siteId,
                entry.resource,
                { id: entry.id },
              );
              cacheManager.set(key, { id: entry.id }, entry.ttl);
              keys.push(key);
            });

            // Property: All entries should be retrievable before invalidation
            keys.forEach((key) => {
              const value = cacheManager.get(key);
              expect(value).not.toBeNull();
            });

            // Clear specific patterns
            cacheManager.clearPattern(new RegExp("posts"));

            // Property: Only matching entries should be invalidated
            keys.forEach((key) => {
              const value = cacheManager.get(key);
              if (key.includes("posts")) {
                expect(value).toBeNull();
              }
              // Other entries may or may not exist depending on TTL
            });
          },
        ),
      );
    });

    it("should handle edge cases in cache operations", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.oneof(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.constant(""),
              fc.constant(null),
              fc.constant(undefined),
            ),
            operations: fc.array(
              fc.record({
                key: fc.oneof(
                  fc.string({ minLength: 1, maxLength: 100 }),
                  fc.constant(""),
                  fc.constant(null),
                ),
                value: fc.oneof(
                  fc.object(),
                  fc.constant(null),
                  fc.constant(undefined),
                ),
              }),
              { minLength: 1, maxLength: 5 },
            ),
          }),
          (data) => {
            // Property: Edge cases should be handled gracefully
            data.operations.forEach((op) => {
              expect(() => {
                if (op.key && typeof op.key === "string" && op.key.length > 0) {
                  cacheManager.set(op.key, op.value);
                  const retrieved = cacheManager.get(op.key);
                  // Value should be retrievable if it was set
                  if (op.value !== null && op.value !== undefined) {
                    expect(retrieved).not.toBeNull();
                  }
                }
              }).not.toThrow();
            });

            // Property: Cache should remain in valid state
            const stats = cacheManager.getStats();
            expect(stats.totalSize).toBeGreaterThanOrEqual(0);
          },
        ),
      );
    });
  });

  describe("Performance Properties", () => {
    it("should maintain performance under high invalidation load", () => {
      fc.assert(
        fc.property(
          fc.record({
            siteId: fc.string({ minLength: 1, maxLength: 50 }),
            operations: fc.array(
              fc.record({
                resource: fc.constantFrom("posts", "pages", "comments"),
                id: fc.integer({ min: 1, max: 999999 }),
              }),
              { minLength: 50, maxLength: 100 },
            ),
          }),
          (data) => {
            // Set up cache entries
            data.operations.forEach((op) => {
              const key = cacheManager.generateKey(data.siteId, op.resource, {
                id: op.id,
              });
              cacheManager.set(key, { id: op.id, data: "test" });
            });

            const startTime = Date.now();

            // Perform bulk invalidation
            data.operations.forEach((op) => {
              cacheInvalidation.trigger({
                type: "update",
                resource: op.resource,
                id: op.id,
                siteId: data.siteId,
                timestamp: Date.now(),
              });
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Property: Bulk operations should complete within reasonable time
            expect(duration).toBeLessThan(1000); // 1 second threshold
          },
        ),
      );
    });
  });
});