/**
 * Tests for SEOTools.analyzeContent() parameter defaults.
 *
 * Regression: the wp_seo_analyze_content schema marks `analysisType` optional ("default: full") and only
 * requires `postId`, but analyzeContent() validated `analysisType` as required, so a call without it failed
 * with "Missing required parameters: analysisType".
 */

import { describe, it, expect, vi } from "vitest";
import { SEOTools } from "../../../dist/tools/seo/SEOTools.js";
import { handleAnalyzeContent } from "../../../dist/tools/seo/SEOHandlers.js";
import { analyzeContentTool } from "../../../dist/tools/seo/SEOToolDefinitions.js";

const postFor = (id) => ({
  id,
  title: { rendered: "Caching for WordPress" },
  content: { rendered: "<p>WordPress caching makes pages faster. Caching stores responses.</p>" },
  excerpt: { rendered: "" },
  link: `https://example.com/?p=${id}`,
  status: "publish",
});

const clientFor = (id) => ({ getPost: vi.fn().mockResolvedValue(postFor(id)) });

describe("SEOTools.analyzeContent()", () => {
  it("keeps analysisType optional in the tool schema", () => {
    expect(analyzeContentTool.inputSchema.required).toEqual(["postId"]);
  });

  it("analyzes the post when analysisType is omitted", async () => {
    const client = clientFor(9101);
    const result = await new SEOTools().analyzeContent(client, { postId: 9101, site: "s1" });

    expect(client.getPost).toHaveBeenCalledWith(9101);
    expect(result.metrics.wordCount).toBeGreaterThan(0);
  });

  it("treats an omitted analysisType as full, sharing the cached full analysis", async () => {
    const tools = new SEOTools();
    const client = clientFor(9102);

    await tools.analyzeContent(client, { postId: 9102, site: "s1", analysisType: "full" });
    await tools.analyzeContent(client, { postId: 9102, site: "s1" });

    // The second call is a cache hit on the same key, so the post is fetched once.
    expect(client.getPost).toHaveBeenCalledTimes(1);
  });

  // The cache key left out focusKeywords, but the analysis scores the first keyword: a second call with other
  // keywords got the first call's keyword analysis back.
  it("does not share a cached analysis between different focus keywords", async () => {
    const tools = new SEOTools();
    const client = clientFor(9104);

    const caching = await tools.analyzeContent(client, { postId: 9104, site: "s1", focusKeywords: ["caching"] });
    const faster = await tools.analyzeContent(client, { postId: 9104, site: "s1", focusKeywords: ["faster"] });
    await tools.analyzeContent(client, { postId: 9104, site: "s1", focusKeywords: ["caching"] });

    expect(client.getPost).toHaveBeenCalledTimes(2); // the repeat of "caching" is a cache hit
    expect(faster).not.toEqual(caching);
  });

  it("still rejects a call without postId", async () => {
    await expect(new SEOTools().analyzeContent(clientFor(1), { site: "s1" })).rejects.toThrow(/postId/);
  });
});

describe("handleAnalyzeContent()", () => {
  it("works without analysisType through the tool handler", async () => {
    const client = clientFor(9103);
    const result = await handleAnalyzeContent(client, { postId: 9103, site: "s1" });

    expect(result.metrics.wordCount).toBeGreaterThan(0);
  });
});
