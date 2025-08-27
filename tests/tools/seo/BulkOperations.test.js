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
      expect(result.processingTime).toBeGreaterThan(0);
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

      await bulkOps.bulkUpdateMetadata(params);

      // Should only fetch posts that weren't cached
      expect(mockClient.getPost).toHaveBeenCalledTimes(2);
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
      let hasEta = false;
      const progressCallback = (progress) => {
        if (progress.eta && progress.processed < progress.total) {
          hasEta = true;
          expect(progress.eta).toBeInstanceOf(Date);
          expect(progress.eta.getTime()).toBeGreaterThan(Date.now());
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
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});
