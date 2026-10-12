/**
 * BulkOperations Tests
 *
 * Tests for the SEO bulk operations functionality including
 * batch processing, retry logic, progress tracking, and error handling.
 *
 * @since 2.7.0
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BulkOperations } from "../../../dist/tools/seo/BulkOperations.js";

// Mock WordPress client
const createMockClient = () => ({
  getPost: vi.fn(),
  updatePost: vi.fn(),
  authenticate: vi.fn().mockResolvedValue(true),
});

// Mock cache manager
const createMockCache = () => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  ttlFor: vi.fn((type) => ({ analysis: 1111, metadata: 2222 })[type]),
});

describe("BulkOperations", () => {
  let bulkOps;
  let mockClient;
  let mockCache;

  beforeEach(() => {
    mockClient = createMockClient();
    mockCache = createMockCache();

    bulkOps = new BulkOperations(mockClient, mockCache, {
      batchSize: 3, // Small batch size for testing
      maxRetries: 2,
      retryDelayMs: 10, // Fast retries for tests
      maxRetryDelayMs: 100,
      operationTimeoutMs: 5000,
      enableProgress: true,
    });
  });

  describe("Configuration", () => {
    it("should initialize with default configuration", () => {
      const defaultBulkOps = new BulkOperations(mockClient);
      const config = defaultBulkOps.getConfig();

      expect(config.batchSize).toBe(10);
      expect(config.maxRetries).toBe(3);
      expect(config.enableProgress).toBe(true);
    });

    it("should allow configuration updates", () => {
      bulkOps.updateConfig({ batchSize: 5, maxRetries: 5 });
      const config = bulkOps.getConfig();

      expect(config.batchSize).toBe(5);
      expect(config.maxRetries).toBe(5);
    });
  });

  describe("Bulk Metadata Updates", () => {
    const samplePost = {
      id: 1,
      title: { rendered: "Test Post" },
      content: { rendered: "<p>Test content for SEO analysis.</p>" },
      excerpt: { rendered: "Test excerpt" },
      link: "https://example.com/test-post",
      status: "publish",
      type: "post",
    };

    beforeEach(() => {
      mockClient.getPost.mockResolvedValue(samplePost);
    });

    it("should process bulk metadata updates successfully", async () => {
      const params = {
        postIds: [1, 2, 3],
        site: "test",
        focusKeywords: ["SEO"],
        dryRun: false,
      };

      const result = await bulkOps.bulkUpdateMetadata(params);

      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.dryRun).toBe(false);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(mockClient.getPost).toHaveBeenCalledTimes(3);
    });

    it("should handle dry run mode", async () => {
      const params = {
        postIds: [1, 2],
        site: "test",
        dryRun: true,
      };

      const result = await bulkOps.bulkUpdateMetadata(params);

      expect(result.dryRun).toBe(true);
      expect(result.success).toBe(2);
    });

    it("should handle empty post IDs array", async () => {
      const params = {
        postIds: [],
        site: "test",
      };

      await expect(bulkOps.bulkUpdateMetadata(params)).rejects.toThrow("No post IDs provided");
    });

    it("should handle missing post IDs", async () => {
      const params = {
        site: "test",
      };

      await expect(bulkOps.bulkUpdateMetadata(params)).rejects.toThrow("No post IDs provided");
    });

    it("should track progress correctly", async () => {
      const progressCallbacks = [];
      const progressCallback = (progress) => {
        progressCallbacks.push({ ...progress });
      };

      const params = {
        postIds: [1, 2, 3, 4, 5],
        site: "test",
      };

      await bulkOps.bulkUpdateMetadata(params, progressCallback);

      expect(progressCallbacks.length).toBeGreaterThan(0);

      const finalProgress = progressCallbacks[progressCallbacks.length - 1];
      expect(finalProgress.total).toBe(5);
      expect(finalProgress.processed).toBe(5);
      expect(finalProgress.completed).toBe(5);
    });

    it("should handle post not found errors", async () => {
      mockClient.getPost
        .mockResolvedValueOnce(samplePost)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(samplePost);

      const params = {
        postIds: [1, 2, 3],
        site: "test",
      };

      const result = await bulkOps.bulkUpdateMetadata(params);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].postId).toBe(2);
      expect(result.errors[0].error).toContain("not found");
    });

    it("should cache results to avoid duplicate processing", async () => {
      mockCache.get.mockReturnValueOnce(null).mockReturnValueOnce({ title: "Cached" }).mockReturnValueOnce(null);

      const params = {
        postIds: [1, 2, 3],
        site: "test",
      };

      const generate = vi.spyOn(bulkOps.metaGenerator, "generateMetadata");

      await bulkOps.bulkUpdateMetadata(params);

      // Should only regenerate posts that weren't cached. Every post is fetched: its last modification is part of
      // the cache key, so an edited post is processed again.
      expect(generate).toHaveBeenCalledTimes(2);
      expect(mockClient.getPost).toHaveBeenCalledTimes(3);
      expect(mockCache.get).toHaveBeenCalledTimes(3);
    });

    it("should respect force parameter to bypass cache", async () => {
      mockCache.get.mockReturnValue({ title: "Cached" });

      const params = {
        postIds: [1, 2],
        site: "test",
        force: true,
      };

      await bulkOps.bulkUpdateMetadata(params);

      // Should fetch all posts despite cache
      expect(mockClient.getPost).toHaveBeenCalledTimes(2);
    });
  });

  describe("Bulk Content Analysis", () => {
    const samplePost = {
      id: 1,
      title: { rendered: "Analysis Test Post" },
      content: { rendered: "<h1>Main Title</h1><p>Content for analysis with good readability.</p>" },
      excerpt: { rendered: "Analysis excerpt" },
      link: "https://example.com/analysis-test",
      status: "publish",
      type: "post",
    };

    beforeEach(() => {
      mockClient.getPost.mockResolvedValue(samplePost);
    });

    it("should perform bulk content analysis", async () => {
      const params = {
        postIds: [1, 2, 3],
        site: "test",
        analysisType: "full",
        focusKeywords: ["SEO", "analysis"],
      };

      const { results, summary } = await bulkOps.bulkAnalyzeContent(params);

      expect(results).toHaveLength(3);
      expect(summary.total).toBe(3);
      expect(summary.success).toBe(3);
      expect(summary.failed).toBe(0);

      // Check analysis result structure
      results.forEach((result) => {
        expect(result).toHaveProperty("score");
        expect(result).toHaveProperty("status");
        expect(result).toHaveProperty("metrics");
        expect(result).toHaveProperty("recommendations");
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    it("should handle analysis errors with retries", async () => {
      mockClient.getPost
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(samplePost)
        .mockResolvedValueOnce(samplePost);

      const params = {
        postIds: [1, 2, 3],
        site: "test",
        analysisType: "readability",
      };

      const { results, summary } = await bulkOps.bulkAnalyzeContent(params);

      expect(results.length).toBeGreaterThan(0);
      expect(summary.success).toBeGreaterThan(0);
    });

    it("should cache analysis results", async () => {
      const params = {
        postIds: [1, 2],
        site: "test",
        analysisType: "keywords",
      };

      await bulkOps.bulkAnalyzeContent(params);

      expect(mockCache.set).toHaveBeenCalledTimes(2);

      // Verify cache keys contain analysis type
      const setCalls = mockCache.set.mock.calls;
      setCalls.forEach((call) => {
        const cacheKey = call[0];
        expect(cacheKey).toContain("bulk-analysis");
        expect(cacheKey).toContain("keywords");
      });
    });

    // SEO_CACHE_ANALYSIS_TTL reached SEOTools but bulk analysis still wrote a hard-coded 21600.
    it("caches analyses for the configured analysis TTL", async () => {
      await bulkOps.bulkAnalyzeContent({ postIds: [1], site: "test" });

      expect(mockCache.ttlFor).toHaveBeenCalledWith("analysis");
      expect(mockCache.set.mock.calls[0][2]).toBe(1111);
    });
  });

  describe("Error Handling and Retries", () => {
    it("should retry retryable errors", async () => {
      mockClient.getPost
        .mockRejectedValueOnce(new Error("503 Service Unavailable"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValueOnce({
          id: 1,
          title: { rendered: "Test" },
          content: { rendered: "Content" },
          status: "publish",
        });

      const params = {
        postIds: [1],
        site: "test",
      };

      const result = await bulkOps.bulkUpdateMetadata(params);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockClient.getPost).toHaveBeenCalledTimes(3); // Original + 2 retries
    });

    it("should not retry non-retryable errors", async () => {
      mockClient.getPost.mockRejectedValue(new Error("404 Not Found"));

      const params = {
        postIds: [1],
        site: "test",
      };

      const result = await bulkOps.bulkUpdateMetadata(params);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockClient.getPost).toHaveBeenCalledTimes(1); // No retries for 404
    });

    it("should give up after max retries", async () => {
      mockClient.getPost.mockRejectedValue(new Error("502 Bad Gateway"));

      const params = {
        postIds: [1],
        site: "test",
      };

      const result = await bulkOps.bulkUpdateMetadata(params);

      expect(result.failed).toBe(1);
      expect(mockClient.getPost).toHaveBeenCalledTimes(3); // Original + 2 retries (maxRetries = 2)
    });
  });

  describe("Batch Processing", () => {
    it("should process items in correct batch sizes", async () => {
      const progressUpdates = [];
      const progressCallback = (progress) => {
        progressUpdates.push({
          currentBatch: progress.currentBatch,
          totalBatches: progress.totalBatches,
          processed: progress.processed,
        });
      };

      mockClient.getPost.mockResolvedValue({
        id: 1,
        title: { rendered: "Test" },
        content: { rendered: "Content" },
        status: "publish",
      });

      const params = {
        postIds: [1, 2, 3, 4, 5, 6, 7], // 7 items with batchSize 3 = 3 batches
        site: "test",
      };

      await bulkOps.bulkUpdateMetadata(params, progressCallback);

      const finalUpdate = progressUpdates[progressUpdates.length - 1];
      expect(finalUpdate.totalBatches).toBe(3); // Math.ceil(7/3)
      expect(finalUpdate.processed).toBe(7);
    });

    it("should calculate estimated completion time", async () => {
      const beforeTime = Date.now();
      let hasEta = false;
      const progressCallback = (progress) => {
        if (progress.eta && progress.processed < progress.total) {
          hasEta = true;
          expect(progress.eta).toBeInstanceOf(Date);
          // ETA must be at or after the test start time; using beforeTime avoids
          // a race where Date.now() inside the callback equals eta when mock
          // processing time rounds to 0ms (flaky with toBeGreaterThan(Date.now())).
          expect(progress.eta.getTime()).toBeGreaterThanOrEqual(beforeTime);
        }
      };

      mockClient.getPost.mockResolvedValue({
        id: 1,
        title: { rendered: "Test" },
        content: { rendered: "Content" },
        status: "publish",
      });

      const params = {
        postIds: [1, 2, 3, 4, 5],
        site: "test",
      };

      await bulkOps.bulkUpdateMetadata(params, progressCallback);

      // ETA should be calculated during processing
      expect(hasEta).toBe(true);
    });
  });

  describe("Multi-batch partial failure accumulation", () => {
    const goodPost = {
      id: 1,
      title: { rendered: "Good Post" },
      content: { rendered: "<p>Content</p>" },
      status: "publish",
    };

    it("accumulates failures across batches — totals reflect all batches", async () => {
      // batchSize=3, so 7 posts → batches [1,2,3], [4,5,6], [7]
      // batch 1: post 2 returns null (not found)
      // batch 2: post 5 throws a network error
      // batch 3: post 7 succeeds
      mockClient.getPost
        .mockResolvedValueOnce(goodPost) // post 1 — ok
        .mockResolvedValueOnce(null) // post 2 — not found → failed
        .mockResolvedValueOnce(goodPost) // post 3 — ok
        .mockResolvedValueOnce(goodPost) // post 4 — ok
        .mockRejectedValueOnce(new Error("ECONNRESET")) // post 5 — network error → failed after retries
        .mockResolvedValueOnce(goodPost) // post 6 — ok
        .mockResolvedValueOnce(goodPost); // post 7 — ok

      const result = await bulkOps.bulkUpdateMetadata({ postIds: [1, 2, 3, 4, 5, 6, 7], site: "test" });

      expect(result.total).toBe(7);
      expect(result.success).toBe(5);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map((e) => e.postId)).toEqual(expect.arrayContaining([2, 5]));
    });

    it("records distinct error messages per failed post", async () => {
      mockClient.getPost
        .mockResolvedValueOnce(goodPost)
        .mockResolvedValueOnce(null) // → "not found"
        .mockRejectedValueOnce(new Error("rate limit exceeded")); // → propagated message

      const result = await bulkOps.bulkUpdateMetadata({ postIds: [1, 2, 3], site: "test" });

      expect(result.failed).toBe(2);
      const errMessages = result.errors.map((e) => e.error);
      expect(errMessages.some((m) => m.includes("not found"))).toBe(true);
      expect(errMessages.some((m) => m.includes("rate limit"))).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should complete bulk operations within reasonable time", async () => {
      mockClient.getPost.mockResolvedValue({
        id: 1,
        title: { rendered: "Performance Test" },
        content: { rendered: "Content for performance testing" },
        status: "publish",
      });

      const params = {
        postIds: Array.from({ length: 20 }, (_, i) => i + 1),
        site: "test",
      };

      const startTime = Date.now();
      const result = await bulkOps.bulkUpdateMetadata(params);
      const endTime = Date.now();

      expect(result.success).toBe(20);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });
});

// One SEOCacheManager serves every site, and the bulk keys were `bulk-analysis-<postId>-<type>` /
// `bulk-meta-<postId>`: post 5 on one site was answered from post 5 of another, and an edit or other focus keywords
// reused the old result. Hidden while SEO TTLs (seconds read as milliseconds) expired everything within seconds.
describe("BulkOperations cache keys", () => {
  const postFor = (id, text, modified = "2026-10-11T08:00:00") => ({
    id,
    modified,
    modified_gmt: modified,
    title: { rendered: `Post ${id}` },
    content: { rendered: `<p>${text}</p>` },
    excerpt: { rendered: "" },
    link: `https://example.com/?p=${id}`,
    status: "publish",
  });
  const fast = { batchSize: 5, maxRetries: 0, retryDelayMs: 1, maxRetryDelayMs: 1, enableProgress: false };
  let cache;

  beforeEach(async () => {
    const { SEOCacheManager } = await import("../../../dist/cache/SEOCacheManager.js");
    cache = new SEOCacheManager();
  });

  it("keeps the same post ID on two sites apart", async () => {
    const siteA = { getPost: vi.fn(async (id) => postFor(id, "one two three")) };
    const siteB = { getPost: vi.fn(async (id) => postFor(id, "one two three four five six seven eight")) };

    const a = await new BulkOperations(siteA, cache, fast).bulkAnalyzeContent({ postIds: [5], site: "a" });
    const b = await new BulkOperations(siteB, cache, fast).bulkAnalyzeContent({ postIds: [5], site: "b" });

    expect(a.results[0].metrics.wordCount).toBe(3);
    expect(b.results[0].metrics.wordCount).toBe(8);
  });

  it("re-analyses an edited post and other focus keywords", async () => {
    let post = postFor(6, "caching makes pages faster");
    const ops = new BulkOperations({ getPost: vi.fn(async () => post) }, cache, fast);
    const analyze = vi.spyOn(ops.contentAnalyzer, "analyzePost");

    await ops.bulkAnalyzeContent({ postIds: [6], site: "a", focusKeywords: ["caching"] });
    await ops.bulkAnalyzeContent({ postIds: [6], site: "a", focusKeywords: ["caching"] }); // cache hit
    await ops.bulkAnalyzeContent({ postIds: [6], site: "a", focusKeywords: ["speed"] });
    post = postFor(6, "caching makes pages much faster", "2026-10-11T09:00:00");
    await ops.bulkAnalyzeContent({ postIds: [6], site: "a", focusKeywords: ["speed"] });

    expect(analyze).toHaveBeenCalledTimes(3);
  });
});
