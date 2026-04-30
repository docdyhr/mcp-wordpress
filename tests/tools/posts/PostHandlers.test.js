/**
 * Unit tests for the extracted buildListParams and formatPostsResponse helpers.
 * These test the validation logic and rendering in isolation, without a client mock.
 */

import { describe, it, expect } from "vitest";
import { buildListParams, formatPostsResponse } from "../../../dist/tools/posts/PostHandlers.js";

// Minimal post shape used across formatting tests
const makePost = (overrides = {}) => ({
  id: 1,
  title: { rendered: "Test Post" },
  status: "publish",
  date: "2024-06-15T10:00:00",
  excerpt: { rendered: "<p>An excerpt</p>" },
  categories: [10],
  tags: [20],
  link: "https://example.com/test-post",
  author: 7,
  ...overrides,
});

// -------------------------------------------------------------------
// buildListParams
// -------------------------------------------------------------------
describe("buildListParams", () => {
  it("sets per_page default to 10 when not provided", () => {
    expect(buildListParams({}).per_page).toBe(10);
  });

  it("preserves an explicit per_page", () => {
    expect(buildListParams({ per_page: 25 }).per_page).toBe(25);
  });

  it("trims search and removes it when empty after trimming", () => {
    expect(buildListParams({ search: "  " }).search).toBeUndefined();
    expect(buildListParams({ search: " hello " }).search).toBe("hello");
  });

  it("keeps a non-empty search string", () => {
    expect(buildListParams({ search: "wordpress" }).search).toBe("wordpress");
  });

  it("normalises a single status string to array", () => {
    const result = buildListParams({ status: "draft" });
    expect(Array.isArray(result.status)).toBe(true);
    expect(result.status).toContain("draft");
  });

  it("accepts an array of valid statuses", () => {
    const result = buildListParams({ status: ["publish", "draft"] });
    expect(result.status).toEqual(["publish", "draft"]);
  });

  it("throws for an invalid status value", () => {
    expect(() => buildListParams({ status: "invalid_status" })).toThrow();
  });

  it("throws for null params", () => {
    expect(() => buildListParams(null)).toThrow();
  });

  it("validates category IDs", () => {
    const result = buildListParams({ categories: [1, 2] });
    expect(result.categories).toEqual([1, 2]);
  });

  it("validates tag IDs", () => {
    const result = buildListParams({ tags: [5, 6] });
    expect(result.tags).toEqual([5, 6]);
  });
});

// -------------------------------------------------------------------
// formatPostsResponse
// -------------------------------------------------------------------
describe("formatPostsResponse", () => {
  const siteUrl = "https://example.com";
  const emptyMaps = [new Map(), new Map(), new Map()];

  it("includes post title and status", () => {
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 10 }, ...emptyMaps);
    expect(result).toContain("Test Post");
    expect(result).toContain("publish");
  });

  it("shows author name from map when available", () => {
    const authorMap = new Map([[7, "Alice"]]);
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 10 }, authorMap, new Map(), new Map());
    expect(result).toContain("Alice");
  });

  it("shows 'Unknown Author' when author is null", () => {
    const result = formatPostsResponse(
      [makePost({ author: null })],
      siteUrl,
      { per_page: 10 },
      new Map(),
      new Map(),
      new Map(),
    );
    expect(result).toContain("Unknown Author");
    expect(result).not.toContain("User null");
  });

  it("shows 'Unknown Author' when author is undefined", () => {
    const result = formatPostsResponse(
      [makePost({ author: undefined })],
      siteUrl,
      { per_page: 10 },
      new Map(),
      new Map(),
      new Map(),
    );
    expect(result).toContain("Unknown Author");
    expect(result).not.toContain("User undefined");
  });

  it("falls back to 'User {id}' when author not in map", () => {
    const result = formatPostsResponse([makePost({ author: 99 })], siteUrl, { per_page: 10 }, ...emptyMaps);
    expect(result).toContain("User 99");
  });

  it("resolves category and tag names from maps", () => {
    const categoryMap = new Map([[10, "News"]]);
    const tagMap = new Map([[20, "javascript"]]);
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 10 }, new Map(), categoryMap, tagMap);
    expect(result).toContain("News");
    expect(result).toContain("javascript");
  });

  it("falls back to 'Category {id}' when not in map", () => {
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 10 }, ...emptyMaps);
    expect(result).toContain("Category 10");
  });

  it("includes summary and source metadata", () => {
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 10 }, ...emptyMaps);
    expect(result).toContain("Posts Summary");
    expect(result).toContain(siteUrl);
  });

  it("appends pagination tip when post count equals per_page", () => {
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 1 }, ...emptyMaps);
    expect(result).toContain("Pagination Tip");
  });

  it("does not append pagination tip when post count is below per_page", () => {
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 10 }, ...emptyMaps);
    expect(result).not.toContain("Pagination Tip");
  });

  it("shows post link", () => {
    const result = formatPostsResponse([makePost()], siteUrl, { per_page: 10 }, ...emptyMaps);
    expect(result).toContain("https://example.com/test-post");
  });
});
