/**
 * Tests for SEOWordPressClient
 *
 * Comprehensive test coverage for WordPress SEO integration client,
 * including plugin detection, metadata extraction, and bulk operations.
 *
 * @since 2.7.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SEOWordPressClient } from "../../dist/client/SEOWordPressClient.js";
// import { LoggerFactory } from "../../dist/utils/logger.js";

// Mock the logger to avoid console output during tests
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  time: vi.fn().mockImplementation((name, fn) => fn()),
  child: vi.fn().mockReturnThis(),
};

vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    api: () => mockLogger,
    tool: () => mockLogger,
    server: () => mockLogger,
    cache: () => mockLogger,
    security: () => mockLogger,
  },
}));

// Also mock error handling utilities
vi.mock("../../dist/utils/error.js", () => ({
  handleToolError: vi.fn(),
  validateRequired: vi.fn(),
  validateSite: vi.fn(),
  getErrorMessage: vi.fn().mockReturnValue("Mocked error"),
}));

describe("SEOWordPressClient", () => {
  let client;
  let mockWordPressClient;

  beforeEach(() => {
    // Mock the WordPressClient base class
    mockWordPressClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    // Create SEOWordPressClient with mocked base
    client = new SEOWordPressClient({
      baseUrl: "https://test.example.com",
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "test password",
      },
    });

    // Replace the base client methods with mocks
    Object.assign(client, mockWordPressClient);

    // Reset console mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Plugin Detection", () => {
    it("should detect Yoast SEO plugin", async () => {
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wordpress-seo", status: "active" }]);

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("yoast");
      expect(mockWordPressClient.get).toHaveBeenCalledWith("/wp/v2/plugins");
    });

    it("should detect RankMath SEO plugin", async () => {
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "seo-by-rank-math", status: "active" }]);

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("rankmath");
    });

    it("should detect SEOPress plugin", async () => {
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wp-seopress", status: "active" }]);

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("seopress");
    });

    it("should handle no SEO plugin detected", async () => {
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "some-other-plugin", status: "active" }]);

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("none");
    });

    it("should handle plugin detection API errors", async () => {
      mockWordPressClient.get.mockRejectedValueOnce(new Error("API Error"));

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("none");
    });

    it("should prefer Yoast when multiple SEO plugins are active", async () => {
      mockWordPressClient.get.mockResolvedValueOnce([
        { slug: "wordpress-seo", status: "active" },
        { slug: "seo-by-rank-math", status: "active" },
        { slug: "wp-seopress", status: "active" },
      ]);

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("yoast");
    });

    it("should handle inactive SEO plugins", async () => {
      mockWordPressClient.get.mockResolvedValueOnce([
        { slug: "wordpress-seo", status: "inactive" },
        { slug: "seo-by-rank-math", status: "active" },
      ]);

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("rankmath");
    });
  });

  describe("SEO Metadata Extraction", () => {
    beforeEach(async () => {
      // Set up with Yoast detected
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wordpress-seo", status: "active" }]);
      await client.initializeSEO();
    });

    it("should extract Yoast SEO metadata", async () => {
      const mockPost = {
        id: 123,
        title: { rendered: "Test Post" },
        content: { rendered: "Test content" },
        yoast_head_json: {
          title: "Optimized Title",
          description: "Optimized description",
          canonical: "https://example.com/test-post",
          og_title: "OpenGraph Title",
          og_description: "OpenGraph Description",
          twitter_title: "Twitter Title",
          twitter_description: "Twitter Description",
        },
      };

      mockWordPressClient.get.mockResolvedValueOnce(mockPost);

      const result = await client.getSEOMetadata(123);

      expect(result).toEqual({
        postId: 123,
        plugin: "yoast",
        title: "Optimized Title",
        description: "Optimized description",
        canonical: "https://example.com/test-post",
        focusKeyword: null,
        openGraph: {
          title: "OpenGraph Title",
          description: "OpenGraph Description",
        },
        twitter: {
          title: "Twitter Title",
          description: "Twitter Description",
        },
        raw: mockPost.yoast_head_json,
      });
    });

    it("should handle post without SEO metadata", async () => {
      const mockPost = {
        id: 123,
        title: { rendered: "Test Post" },
        content: { rendered: "Test content" },
      };

      mockWordPressClient.get.mockResolvedValueOnce(mockPost);

      const result = await client.getSEOMetadata(123);

      expect(result).toEqual({
        postId: 123,
        plugin: "yoast",
        title: null,
        description: null,
        canonical: null,
        focusKeyword: null,
        openGraph: {
          title: null,
          description: null,
        },
        twitter: {
          title: null,
          description: null,
        },
        raw: {},
      });
    });

    it("should handle RankMath metadata", async () => {
      // Reset with RankMath detected
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "seo-by-rank-math", status: "active" }]);
      await client.initializeSEO();

      const mockPost = {
        id: 123,
        title: { rendered: "Test Post" },
        content: { rendered: "Test content" },
        meta: {
          rank_math_title: "RankMath Title",
          rank_math_description: "RankMath Description",
          rank_math_focus_keyword: "test keyword",
          rank_math_canonical_url: "https://example.com/canonical",
        },
      };

      mockWordPressClient.get.mockResolvedValueOnce(mockPost);

      const result = await client.getSEOMetadata(123);

      expect(result.title).toBe("RankMath Title");
      expect(result.description).toBe("RankMath Description");
      expect(result.focusKeyword).toBe("test keyword");
      expect(result.canonical).toBe("https://example.com/canonical");
      expect(result.plugin).toBe("rankmath");
    });

    it("should handle SEOPress metadata", async () => {
      // Reset with SEOPress detected
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wp-seopress", status: "active" }]);
      await client.initializeSEO();

      const mockPost = {
        id: 123,
        title: { rendered: "Test Post" },
        content: { rendered: "Test content" },
        meta: {
          _seopress_titles_title: "SEOPress Title",
          _seopress_titles_desc: "SEOPress Description",
          _seopress_analysis_target_kw: "seopress keyword",
        },
      };

      mockWordPressClient.get.mockResolvedValueOnce(mockPost);

      const result = await client.getSEOMetadata(123);

      expect(result.title).toBe("SEOPress Title");
      expect(result.description).toBe("SEOPress Description");
      expect(result.focusKeyword).toBe("seopress keyword");
      expect(result.plugin).toBe("seopress");
    });

    it("should handle API errors gracefully", async () => {
      mockWordPressClient.get.mockRejectedValueOnce(new Error("Post not found"));

      await expect(client.getSEOMetadata(123)).rejects.toThrow("Post not found");
    });

    it("should handle pages correctly", async () => {
      const mockPage = {
        id: 456,
        title: { rendered: "Test Page" },
        content: { rendered: "Test page content" },
        yoast_head_json: {
          title: "Page Title",
          description: "Page description",
        },
      };

      mockWordPressClient.get.mockResolvedValueOnce(mockPage);

      const result = await client.getSEOMetadata(456, "page");

      expect(mockWordPressClient.get).toHaveBeenCalledWith("/wp/v2/pages/456");
      expect(result.title).toBe("Page Title");
    });
  });

  describe("Bulk SEO Operations", () => {
    beforeEach(async () => {
      // Set up with Yoast detected
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wordpress-seo", status: "active" }]);
      await client.initializeSEO();
    });

    it("should process bulk metadata requests", async () => {
      const mockPosts = [
        {
          id: 1,
          yoast_head_json: { title: "Post 1", description: "Desc 1" },
        },
        {
          id: 2,
          yoast_head_json: { title: "Post 2", description: "Desc 2" },
        },
        {
          id: 3,
          yoast_head_json: { title: "Post 3", description: "Desc 3" },
        },
      ];

      mockWordPressClient.get
        .mockResolvedValueOnce(mockPosts[0])
        .mockResolvedValueOnce(mockPosts[1])
        .mockResolvedValueOnce(mockPosts[2]);

      const result = await client.bulkGetSEOMetadata({
        postIds: [1, 2, 3],
        batchSize: 2,
      });

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe("Post 1");
      expect(result[1].title).toBe("Post 2");
      expect(result[2].title).toBe("Post 3");
      expect(mockWordPressClient.get).toHaveBeenCalledTimes(4); // 1 for plugin detection + 3 for posts
    });

    it("should handle batch size correctly", async () => {
      const postIds = [1, 2, 3, 4, 5];
      const mockResponses = postIds.map((id) => ({
        id,
        yoast_head_json: { title: `Post ${id}` },
      }));

      // Mock each individual post request
      mockResponses.forEach((post) => {
        mockWordPressClient.get.mockResolvedValueOnce(post);
      });

      const result = await client.bulkGetSEOMetadata({
        postIds,
        batchSize: 2,
      });

      expect(result).toHaveLength(5);
      expect(mockWordPressClient.get).toHaveBeenCalledTimes(6); // 1 for plugin detection + 5 for posts
    });

    it("should handle individual post failures in bulk operations", async () => {
      mockWordPressClient.get
        .mockResolvedValueOnce({ id: 1, yoast_head_json: { title: "Post 1" } })
        .mockRejectedValueOnce(new Error("Post 2 not found"))
        .mockResolvedValueOnce({ id: 3, yoast_head_json: { title: "Post 3" } });

      const result = await client.bulkGetSEOMetadata({
        postIds: [1, 2, 3],
        continueOnError: true,
      });

      // Should return results for successful posts only
      expect(result).toHaveLength(2);
      expect(result[0].postId).toBe(1);
      expect(result[1].postId).toBe(3);
    });

    it("should respect continueOnError setting", async () => {
      mockWordPressClient.get
        .mockResolvedValueOnce({ id: 1, yoast_head_json: { title: "Post 1" } })
        .mockRejectedValueOnce(new Error("Post 2 not found"));

      // With continueOnError: false, should throw on first error
      await expect(
        client.bulkGetSEOMetadata({
          postIds: [1, 2, 3],
          continueOnError: false,
        }),
      ).rejects.toThrow("Post 2 not found");
    });

    it("should handle empty post IDs array", async () => {
      const result = await client.bulkGetSEOMetadata({
        postIds: [],
      });

      expect(result).toEqual([]);
      expect(mockWordPressClient.get).toHaveBeenCalledTimes(1); // Only plugin detection
    });

    it("should handle mixed post types in bulk operations", async () => {
      mockWordPressClient.get
        .mockResolvedValueOnce({ id: 1, yoast_head_json: { title: "Post 1" } })
        .mockResolvedValueOnce({ id: 2, yoast_head_json: { title: "Page 2" } });

      const result = await client.bulkGetSEOMetadata({
        postIds: [1, 2],
        type: "post",
      });

      expect(result).toHaveLength(2);
      expect(mockWordPressClient.get).toHaveBeenCalledWith("/wp/v2/posts/1");
      expect(mockWordPressClient.get).toHaveBeenCalledWith("/wp/v2/posts/2");
    });
  });

  describe("SEO Metadata Updates", () => {
    beforeEach(async () => {
      // Set up with Yoast detected
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wordpress-seo", status: "active" }]);
      await client.initializeSEO();
    });

    it("should update Yoast SEO metadata", async () => {
      const updates = {
        title: "New Title",
        description: "New Description",
        canonical: "https://example.com/new-canonical",
        focusKeyword: "new keyword",
      };

      mockWordPressClient.post.mockResolvedValueOnce({ success: true });

      const result = await client.updateSEOMetadata(123, updates);

      expect(result.success).toBe(true);
      expect(mockWordPressClient.post).toHaveBeenCalledWith(
        "/wp/v2/posts/123/meta",
        expect.objectContaining({
          _yoast_wpseo_title: "New Title",
          _yoast_wpseo_metadesc: "New Description",
          _yoast_wpseo_canonical: "https://example.com/new-canonical",
          _yoast_wpseo_focuskw: "new keyword",
        }),
      );
    });

    it("should update RankMath metadata", async () => {
      // Reset with RankMath detected
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "seo-by-rank-math", status: "active" }]);
      await client.initializeSEO();

      const updates = {
        title: "RankMath Title",
        description: "RankMath Description",
      };

      mockWordPressClient.post.mockResolvedValueOnce({ success: true });

      await client.updateSEOMetadata(123, updates);

      expect(mockWordPressClient.post).toHaveBeenCalledWith(
        "/wp/v2/posts/123/meta",
        expect.objectContaining({
          rank_math_title: "RankMath Title",
          rank_math_description: "RankMath Description",
        }),
      );
    });

    it("should update SEOPress metadata", async () => {
      // Reset with SEOPress detected
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wp-seopress", status: "active" }]);
      await client.initializeSEO();

      const updates = {
        title: "SEOPress Title",
        description: "SEOPress Description",
      };

      mockWordPressClient.post.mockResolvedValueOnce({ success: true });

      await client.updateSEOMetadata(123, updates);

      expect(mockWordPressClient.post).toHaveBeenCalledWith(
        "/wp/v2/posts/123/meta",
        expect.objectContaining({
          _seopress_titles_title: "SEOPress Title",
          _seopress_titles_desc: "SEOPress Description",
        }),
      );
    });

    it("should handle no plugin detected gracefully", async () => {
      // Reset with no SEO plugin detected
      mockWordPressClient.get.mockResolvedValueOnce([]);
      await client.initializeSEO();

      const updates = { title: "New Title" };

      const result = await client.updateSEOMetadata(123, updates);

      expect(result.success).toBe(false);
      expect(result.message).toContain("No SEO plugin detected");
      expect(mockWordPressClient.post).not.toHaveBeenCalled();
    });

    it("should handle API errors during updates", async () => {
      const updates = { title: "New Title" };

      mockWordPressClient.post.mockRejectedValueOnce(new Error("Update failed"));

      await expect(client.updateSEOMetadata(123, updates)).rejects.toThrow("Update failed");
    });

    it("should handle partial updates", async () => {
      const updates = {
        title: "Only Title Updated",
      };

      mockWordPressClient.post.mockResolvedValueOnce({ success: true });

      await client.updateSEOMetadata(123, updates);

      expect(mockWordPressClient.post).toHaveBeenCalledWith(
        "/wp/v2/posts/123/meta",
        expect.objectContaining({
          _yoast_wpseo_title: "Only Title Updated",
        }),
      );

      // Should not include other fields
      const callArgs = mockWordPressClient.post.mock.calls[0][1];
      expect(callArgs._yoast_wpseo_metadesc).toBeUndefined();
      expect(callArgs._yoast_wpseo_canonical).toBeUndefined();
    });

    it("should update pages correctly", async () => {
      const updates = { title: "Page Title" };

      mockWordPressClient.post.mockResolvedValueOnce({ success: true });

      await client.updateSEOMetadata(456, updates, "page");

      expect(mockWordPressClient.post).toHaveBeenCalledWith("/wp/v2/pages/456/meta", expect.any(Object));
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      mockWordPressClient.get.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.initializeSEO()).resolves.not.toThrow();
      expect(client.detectedPlugin).toBe("none");
    });

    it("should handle malformed plugin data", async () => {
      mockWordPressClient.get.mockResolvedValueOnce([
        {
          /* missing slug and status */
        },
        null,
        undefined,
      ]);

      await client.initializeSEO();

      expect(client.detectedPlugin).toBe("none");
    });

    it("should handle malformed SEO metadata", async () => {
      const mockPost = {
        id: 123,
        title: { rendered: "Test Post" },
        yoast_head_json: null,
      };

      mockWordPressClient.get
        .mockResolvedValueOnce([{ slug: "wordpress-seo", status: "active" }])
        .mockResolvedValueOnce(mockPost);

      await client.initializeSEO();
      const result = await client.getSEOMetadata(123);

      expect(result.title).toBe(null);
      expect(result.raw).toEqual({});
    });
  });

  describe("Integration Status", () => {
    beforeEach(async () => {
      mockWordPressClient.get.mockResolvedValueOnce([{ slug: "wordpress-seo", status: "active" }]);
      await client.initializeSEO();
    });

    it("should report integration status", () => {
      const status = client.getIntegrationStatus();

      expect(status).toEqual({
        hasPlugin: true,
        plugin: "yoast",
        canReadMetadata: true,
        canWriteMetadata: true,
        features: {
          metaTags: true,
          schema: true,
          socialMedia: true,
          xmlSitemap: false, // Would need additional API calls
          breadcrumbs: false,
        },
      });
    });

    it("should report no plugin status", async () => {
      // Reset with no plugin
      const noPluginClient = new SEOWordPressClient({
        baseUrl: "https://test.example.com",
        auth: {
          method: "app-password",
          username: "testuser",
          appPassword: "test password",
        },
      });
      Object.assign(noPluginClient, mockWordPressClient);

      mockWordPressClient.get.mockResolvedValueOnce([]);
      await noPluginClient.initializeSEO();

      const status = noPluginClient.getIntegrationStatus();

      expect(status).toEqual({
        hasPlugin: false,
        plugin: "none",
        canReadMetadata: false,
        canWriteMetadata: false,
        features: {
          metaTags: false,
          schema: false,
          socialMedia: false,
          xmlSitemap: false,
          breadcrumbs: false,
        },
      });
    });
  });
});
