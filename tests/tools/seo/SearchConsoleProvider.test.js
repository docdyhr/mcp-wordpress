/**
 * Tests for src/tools/seo/providers/SearchConsoleProvider.ts
 *
 * Injects a mock webmasters client directly — avoids mocking the googleapis
 * module, which is complex due to dist-file import resolution in Vitest.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { SearchConsoleProvider } from "../../../dist/tools/seo/providers/SearchConsoleProvider.js";

const SITE_URL = "https://dyhr.com/";

function makeProvider(mockQuery) {
  const mockSitesList = vi.fn().mockResolvedValue({ data: { siteEntry: [{ siteUrl: SITE_URL }] } });
  const mockWebmasters = {
    searchanalytics: { query: mockQuery },
    sites: { list: mockSitesList },
  };
  return new SearchConsoleProvider("client-id", "client-secret", "refresh-token", mockWebmasters);
}

describe("SearchConsoleProvider.getPositions", () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = vi.fn();
  });

  it("returns real position data from Search Console response", async () => {
    mockQuery.mockResolvedValueOnce({
      data: {
        rows: [{ position: 3.7, clicks: 42, impressions: 800, ctr: 0.0525, keys: ["wordpress seo"] }],
      },
    });

    const results = await makeProvider(mockQuery).getPositions(SITE_URL, ["wordpress seo"]);

    expect(results).toHaveLength(1);
    expect(results[0].keyword).toBe("wordpress seo");
    expect(results[0].estimatedPosition).toBe(4); // Math.round(3.7)
    expect(results[0].clicks).toBe(42);
    expect(results[0].impressions).toBe(800);
    expect(results[0].ctr).toBeCloseTo(0.0525);
    expect(results[0].matchingPosts).toEqual([]);
  });

  it("returns null position when Search Console has no data for keyword", async () => {
    mockQuery.mockResolvedValueOnce({ data: { rows: [] } });

    const results = await makeProvider(mockQuery).getPositions(SITE_URL, ["unknown keyword"]);

    expect(results[0].estimatedPosition).toBeNull();
    expect(results[0].clicks).toBe(0);
    expect(results[0].impressions).toBe(0);
  });

  it("handles API errors gracefully and returns null position", async () => {
    mockQuery.mockRejectedValueOnce(new Error("API quota exceeded"));

    const results = await makeProvider(mockQuery).getPositions(SITE_URL, ["test keyword"]);

    expect(results).toHaveLength(1);
    expect(results[0].estimatedPosition).toBeNull();
    expect(results[0].clicks).toBe(0);
  });

  it("processes multiple keywords independently", async () => {
    mockQuery
      .mockResolvedValueOnce({ data: { rows: [{ position: 1.2, clicks: 100, impressions: 500, ctr: 0.2 }] } })
      .mockResolvedValueOnce({ data: { rows: [] } })
      .mockResolvedValueOnce({ data: { rows: [{ position: 8.5, clicks: 5, impressions: 200, ctr: 0.025 }] } });

    const results = await makeProvider(mockQuery).getPositions(SITE_URL, ["seo", "wordpress", "mcp"]);

    expect(results).toHaveLength(3);
    expect(results[0].estimatedPosition).toBe(1);
    expect(results[1].estimatedPosition).toBeNull();
    expect(results[2].estimatedPosition).toBe(9); // Math.round(8.5)
  });
});

describe("SearchConsoleProvider.getTopQueries", () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = vi.fn();
  });

  it("maps Search Console rows to KeywordSuggestion format", async () => {
    mockQuery.mockResolvedValueOnce({
      data: {
        rows: [
          { keys: ["wordpress seo tips"], position: 3, clicks: 50, impressions: 1200, ctr: 0.04 },
          { keys: ["seo wordpress plugin"], position: 12, clicks: 10, impressions: 400, ctr: 0.025 },
        ],
      },
    });

    const suggestions = await makeProvider(mockQuery).getTopQueries(SITE_URL, "wordpress seo");

    expect(suggestions).toHaveLength(2);

    // Sorted by impressions desc: 1200 first, 400 second
    expect(suggestions[0].keyword).toBe("wordpress seo tips");
    expect(suggestions[0].type).toBe("related");
    expect(suggestions[0].estimatedVolume).toBe(1200); // impressions
    expect(suggestions[0].existingCoverage).toBe(50); // clicks

    // Lower rank = lower difficulty
    expect(suggestions[1].difficulty).toBeLessThan(suggestions[0].difficulty);
  });

  it("marks exact seed keyword match as type seed", async () => {
    mockQuery.mockResolvedValueOnce({
      data: {
        rows: [{ keys: ["wordpress seo"], position: 2, clicks: 80, impressions: 2000, ctr: 0.04 }],
      },
    });

    const suggestions = await makeProvider(mockQuery).getTopQueries(SITE_URL, "wordpress seo");

    expect(suggestions[0].keyword).toBe("wordpress seo");
    expect(suggestions[0].type).toBe("seed");
    expect(suggestions[0].relevance).toBe(100);
  });

  it("returns empty array when API throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("network error"));

    const suggestions = await makeProvider(mockQuery).getTopQueries(SITE_URL, "any keyword");

    expect(suggestions).toEqual([]);
  });
});
