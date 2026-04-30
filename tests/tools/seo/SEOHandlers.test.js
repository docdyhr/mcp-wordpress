/**
 * Tests for src/tools/seo/SEOHandlers.ts
 *
 * Focuses on:
 *   - Unimplemented stubs throw the right message
 *   - Implemented handlers propagate errors from SEOTools
 *   - Handler parameter assembly (correct fields passed through)
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// vi.hoisted() runs before vi.mock() hoisting so the object is ready when the
// factory captures it — unlike a plain `const` which would be in TDZ.
const seoMock = vi.hoisted(() => ({
  analyzeContent: vi.fn(),
  generateMetadata: vi.fn(),
  bulkUpdateMetadata: vi.fn(),
  generateSchema: vi.fn(),
  validateSchema: vi.fn(),
  suggestInternalLinks: vi.fn(),
  performSiteAudit: vi.fn(),
  testSEOIntegration: vi.fn(),
  getLiveSEOData: vi.fn(),
  trackSERPPositions: vi.fn(),
  keywordResearch: vi.fn(),
}));

vi.mock("../../../dist/tools/seo/SEOTools.js", () => ({
  // Must use class/function (not arrow fn) so `new SEOTools()` is valid
  SEOTools: class MockSEOTools {
    constructor() {
      return seoMock;
    }
  },
}));

import {
  handleAnalyzeContent,
  handleGenerateMetadata,
  handleBulkUpdateMetadata,
  handleGenerateSchema,
  handleValidateSchema,
  handleSuggestInternalLinks,
  handlePerformSiteAudit,
  handleTrackSERPPositions,
  handleKeywordResearch,
  handleTestSEOIntegration,
  handleGetLiveSEOData,
} from "../../../dist/tools/seo/SEOHandlers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockClient = { config: { siteUrl: "https://example.com" } };

beforeEach(() => {
  // Reset only the method mocks, not the constructor
  Object.values(seoMock).forEach((fn) => fn.mockReset());
});

// ---------------------------------------------------------------------------
// handleTrackSERPPositions
// ---------------------------------------------------------------------------

describe("handleTrackSERPPositions()", () => {
  it("propagates errors from SEOTools.trackSERPPositions", async () => {
    seoMock.trackSERPPositions.mockRejectedValue(new Error("serp failed"));
    await expect(handleTrackSERPPositions(mockClient, { keywords: ["wordpress"] })).rejects.toThrow("serp failed");
  });

  it("returns position data on success", async () => {
    const expected = {
      positions: [{ keyword: "wordpress", estimatedPosition: 1, matchingPosts: [], contentScore: 80 }],
      trackedAt: "2026-04-30T00:00:00.000Z",
      dataSource: "wordpress-content-analysis",
      searchEngine: "google",
      upgradeNote: "...",
    };
    seoMock.trackSERPPositions.mockResolvedValue(expected);
    const result = await handleTrackSERPPositions(mockClient, { keywords: ["wordpress"], site: "s1" });
    expect(result).toEqual(expected);
  });

  it("passes optional url/searchEngine/location through to SEOTools", async () => {
    seoMock.trackSERPPositions.mockResolvedValue({});
    await handleTrackSERPPositions(mockClient, {
      keywords: ["wordpress"],
      url: "https://example.com",
      searchEngine: "bing",
      location: "US",
      site: "s1",
    });
    expect(seoMock.trackSERPPositions).toHaveBeenCalledWith(
      mockClient,
      expect.objectContaining({
        keywords: ["wordpress"],
        url: "https://example.com",
        searchEngine: "bing",
        location: "US",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// handleKeywordResearch
// ---------------------------------------------------------------------------

describe("handleKeywordResearch()", () => {
  it("propagates errors from SEOTools.keywordResearch", async () => {
    seoMock.keywordResearch.mockRejectedValue(new Error("research failed"));
    await expect(handleKeywordResearch(mockClient, { seedKeyword: "wordpress" })).rejects.toThrow("research failed");
  });

  it("returns keyword suggestions on success", async () => {
    const expected = {
      seedKeyword: "wordpress",
      suggestions: [{ keyword: "best wordpress", type: "variation", estimatedVolume: 300 }],
      totalSuggestions: 1,
      dataSource: "wordpress-content-analysis",
      upgradeNote: "...",
    };
    seoMock.keywordResearch.mockResolvedValue(expected);
    const result = await handleKeywordResearch(mockClient, { seedKeyword: "wordpress", site: "s1" });
    expect(result).toEqual(expected);
  });

  it("passes optional flags through to SEOTools", async () => {
    seoMock.keywordResearch.mockResolvedValue({});
    await handleKeywordResearch(mockClient, {
      seedKeyword: "seo",
      includeVariations: true,
      includeQuestions: true,
      maxResults: 10,
      site: "s1",
    });
    expect(seoMock.keywordResearch).toHaveBeenCalledWith(
      mockClient,
      expect.objectContaining({
        seedKeyword: "seo",
        includeVariations: true,
        includeQuestions: true,
        maxResults: 10,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Implemented handlers — error propagation
// ---------------------------------------------------------------------------

describe("handleAnalyzeContent()", () => {
  it("propagates errors from SEOTools.analyzeContent", async () => {
    seoMock.analyzeContent.mockRejectedValue(new Error("analysis failed"));
    await expect(handleAnalyzeContent(mockClient, { postId: 1, analysisType: "full", site: "s1" })).rejects.toThrow(
      "analysis failed",
    );
  });

  it("returns the result from SEOTools.analyzeContent", async () => {
    const expected = { score: 85, recommendations: [] };
    seoMock.analyzeContent.mockResolvedValue(expected);
    const result = await handleAnalyzeContent(mockClient, { postId: 1, analysisType: "full", site: "s1" });
    expect(result).toEqual(expected);
  });
});

describe("handleGenerateMetadata()", () => {
  it("propagates errors from SEOTools.generateMetadata", async () => {
    seoMock.generateMetadata.mockRejectedValue(new Error("metadata error"));
    await expect(handleGenerateMetadata(mockClient, { postId: 2, site: "s1" })).rejects.toThrow("metadata error");
  });

  it("passes optional title/description/focusKeyword through to SEOTools", async () => {
    seoMock.generateMetadata.mockResolvedValue({});
    await handleGenerateMetadata(mockClient, {
      postId: 2,
      site: "s1",
      title: "Custom Title",
      description: "Custom Desc",
      focusKeyword: "wordpress",
    });
    expect(seoMock.generateMetadata).toHaveBeenCalledWith(
      mockClient,
      expect.objectContaining({
        title: "Custom Title",
        description: "Custom Desc",
        focusKeywords: ["wordpress"],
      }),
    );
  });
});

describe("handleBulkUpdateMetadata()", () => {
  it("propagates errors from SEOTools.bulkUpdateMetadata", async () => {
    seoMock.bulkUpdateMetadata.mockRejectedValue(new Error("bulk error"));
    await expect(handleBulkUpdateMetadata(mockClient, { postIds: [1, 2], updates: {}, site: "s1" })).rejects.toThrow(
      "bulk error",
    );
  });

  it("returns bulk operation result", async () => {
    const expected = { success: 2, failed: 0 };
    seoMock.bulkUpdateMetadata.mockResolvedValue(expected);
    const result = await handleBulkUpdateMetadata(mockClient, { postIds: [1, 2], updates: {}, site: "s1" });
    expect(result).toEqual(expected);
  });
});

describe("handleGenerateSchema()", () => {
  it("propagates errors from SEOTools.generateSchema", async () => {
    seoMock.generateSchema.mockRejectedValue(new Error("schema error"));
    await expect(handleGenerateSchema(mockClient, { postId: 3, schemaType: "Article", site: "s1" })).rejects.toThrow(
      "schema error",
    );
  });
});

describe("handleValidateSchema()", () => {
  it("propagates errors from SEOTools.validateSchema", async () => {
    seoMock.validateSchema.mockRejectedValue(new Error("invalid schema"));
    await expect(handleValidateSchema(mockClient, { schema: {}, schemaType: "Article", site: "s1" })).rejects.toThrow(
      "invalid schema",
    );
  });
});

describe("handleSuggestInternalLinks()", () => {
  it("propagates errors from SEOTools.suggestInternalLinks", async () => {
    seoMock.suggestInternalLinks.mockRejectedValue(new Error("link error"));
    await expect(handleSuggestInternalLinks(mockClient, { postId: 4, site: "s1" })).rejects.toThrow("link error");
  });
});

describe("handlePerformSiteAudit()", () => {
  it("propagates errors from SEOTools.performSiteAudit", async () => {
    seoMock.performSiteAudit.mockRejectedValue(new Error("audit error"));
    await expect(handlePerformSiteAudit(mockClient, { auditType: "full", site: "s1" })).rejects.toThrow("audit error");
  });

  it("returns audit result on success", async () => {
    const expected = { overallScore: 72, sections: [] };
    seoMock.performSiteAudit.mockResolvedValue(expected);
    const result = await handlePerformSiteAudit(mockClient, { auditType: "full", site: "s1" });
    expect(result).toEqual(expected);
  });
});

describe("handleTestSEOIntegration()", () => {
  it("propagates errors from SEOTools.testSEOIntegration", async () => {
    seoMock.testSEOIntegration.mockRejectedValue(new Error("integration error"));
    await expect(
      handleTestSEOIntegration(mockClient, { checkPlugins: true, testMetadataAccess: true, site: "s1" }),
    ).rejects.toThrow("integration error");
  });
});

describe("handleGetLiveSEOData()", () => {
  it("propagates errors from SEOTools.getLiveSEOData", async () => {
    seoMock.getLiveSEOData.mockRejectedValue(new Error("live data error"));
    await expect(
      handleGetLiveSEOData(mockClient, { postId: 5, includeAnalysis: true, includeRecommendations: false, site: "s1" }),
    ).rejects.toThrow("live data error");
  });
});
