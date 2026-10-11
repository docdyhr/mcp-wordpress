/**
 * SEO result caching and the parameters that shape a result.
 *
 * The SEO caches took seconds while the base cache counts milliseconds, so every SEO result expired within seconds and
 * the cache keys were never tested against real use. With TTLs fixed, a key must cover everything that changes the
 * result: the post's last modification (an analysis must not outlive an edit), the focus keywords for schema and
 * metadata, and maxPages for the site audit. analysisType and auditType were accepted but ignored; they now narrow the
 * result.
 */
import { vi } from "vitest";
import { SEOTools } from "../../../dist/tools/seo/SEOTools.js";
import { SiteAuditor } from "../../../dist/tools/seo/auditors/SiteAuditor.js";
import { performSiteAuditTool } from "../../../dist/tools/seo/SEOToolDefinitions.js";

const HOUR = 60 * 60 * 1000;

// Short, no headings, an image without alt text: one recommendation of each type ContentAnalyzer emits.
const postFor = (id, modified = "2026-10-11T08:00:00") => ({
  id,
  modified,
  modified_gmt: modified,
  title: { rendered: "Caching for WordPress" },
  content: { rendered: '<p>WordPress caching makes pages faster. Caching stores responses.</p><img src="a.jpg">' },
  excerpt: { rendered: "" },
  link: `https://example.com/?p=${id}`,
  status: "publish",
  author: 1,
  date: modified,
  date_gmt: modified,
});

describe("SEO result caching", () => {
  let tools;
  let post;
  let client;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T08:00:00Z"));
    tools = new SEOTools();
    post = postFor(9201);
    client = { getPost: vi.fn(async () => post) };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("serves a content analysis from cache for hours, not seconds", async () => {
    const analyze = vi.spyOn(tools.contentAnalyzer, "analyzePost");

    await tools.analyzeContent(client, { postId: 9201, site: "s1" });
    vi.advanceTimersByTime(HOUR);
    await tools.analyzeContent(client, { postId: 9201, site: "s1" });

    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("re-analyses a post that was edited after it was cached", async () => {
    const analyze = vi.spyOn(tools.contentAnalyzer, "analyzePost");

    await tools.analyzeContent(client, { postId: 9201, site: "s1" });
    post = postFor(9201, "2026-10-11T08:05:00");
    await tools.analyzeContent(client, { postId: 9201, site: "s1" });

    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it("keys schema markup by focus keywords and post edits", async () => {
    const generate = vi.spyOn(tools.schemaGenerator, "generateSchema");
    const schema = (focusKeywords) =>
      tools.generateSchema(client, { postId: 9201, site: "s1", schemaType: "Article", focusKeywords });

    await schema(["caching"]);
    await schema(["caching"]); // cache hit
    await schema(["speed"]);
    post = postFor(9201, "2026-10-11T08:05:00");
    await schema(["speed"]);

    expect(generate).toHaveBeenCalledTimes(3);
  });

  it("keys generated metadata by focus keywords and post edits", async () => {
    const generate = vi.spyOn(tools.metaGenerator, "generateMetadata");
    const meta = (focusKeywords) => tools.generateMetadata(client, { postId: 9201, site: "s1", focusKeywords });

    await meta(["caching"]);
    await meta(["caching"]); // cache hit
    await meta(["speed"]);
    post = postFor(9201, "2026-10-11T08:05:00");
    await meta(["speed"]);

    expect(generate).toHaveBeenCalledTimes(3);
  });

  it("keys the site audit by maxPages and keeps it for an hour", async () => {
    const audit = vi.spyOn(SiteAuditor.prototype, "performSiteAudit").mockResolvedValue({ overallScore: 80 });

    // Asserted step by step: a total alone let the two bugs cancel out (an expired hit plus a wrong hit = 3 calls).
    await tools.performSiteAudit(client, { site: "s1", maxPages: 10 });
    vi.advanceTimersByTime(30 * 60 * 1000);
    await tools.performSiteAudit(client, { site: "s1", maxPages: 10 });
    expect(audit).toHaveBeenCalledTimes(1); // still cached after 30 minutes

    await tools.performSiteAudit(client, { site: "s1", maxPages: 20 });
    expect(audit).toHaveBeenCalledTimes(2); // another maxPages is another audit

    await tools.performSiteAudit(client, { site: "s1", maxPages: 20, force: true });
    expect(audit).toHaveBeenCalledTimes(3); // force bypasses the cache
  });
});

describe("SERP tracking cache", () => {
  afterEach(() => vi.restoreAllMocks());

  // Positions come back in the order the keywords were given, so ["b", "a"] must not reuse ["a", "b"].
  it("keeps keyword order in the key", async () => {
    const tools = new SEOTools();
    const compute = vi
      .spyOn(tools, "computeSERPPositions")
      .mockImplementation(async (_client, params) => ({ positions: params.keywords.map((keyword) => ({ keyword })) }));

    await tools.trackSERPPositions({}, { site: "s1", keywords: ["a", "b"] });
    const reversed = await tools.trackSERPPositions({}, { site: "s1", keywords: ["b", "a"] });

    expect(compute).toHaveBeenCalledTimes(2);
    expect(reversed.positions.map((p) => p.keyword)).toEqual(["b", "a"]);
  });
});

describe("analysisType narrows the analysis", () => {
  const analyze = (analysisType) =>
    new SEOTools().analyzeContent(
      { getPost: vi.fn(async () => postFor(9301)) },
      { postId: 9301, site: "s1", focusKeywords: ["performance"], ...(analysisType && { analysisType }) },
    );
  const types = (result) => [...new Set(result.recommendations.map((r) => r.type))].sort();

  it("full covers every area", async () => {
    const full = await analyze();
    expect(types(full)).toEqual(["content", "keyword", "structure", "technical"]);
    expect(full.keywordAnalysis).toBeDefined();
    expect(full.structure).toBeDefined();
  });

  it("readability keeps only content recommendations", async () => {
    const [full, result] = await Promise.all([analyze(), analyze("readability")]);
    expect(types(result)).toEqual(["content"]);
    expect(result.keywordAnalysis).toBeUndefined();
    expect(result.structure).toBeUndefined();
    // The score and metrics always describe the whole post.
    expect(result.score).toBe(full.score);
    expect(result.metrics).toEqual(full.metrics);
  });

  it("keywords keeps keyword recommendations and the keyword analysis", async () => {
    const result = await analyze("keywords");
    expect(types(result)).toEqual(["keyword"]);
    expect(result.keywordAnalysis).toBeDefined();
    expect(result.structure).toBeUndefined();
  });

  it("structure keeps structure and technical recommendations and the structure analysis", async () => {
    const result = await analyze("structure");
    expect(types(result)).toEqual(["structure", "technical"]);
    expect(result.structure).toBeDefined();
    expect(result.keywordAnalysis).toBeUndefined();
  });
});

describe("auditType selects the audit sections", () => {
  let sections;

  beforeEach(() => {
    vi.spyOn(SiteAuditor.prototype, "performSiteAudit").mockImplementation(function () {
      const { includeTechnical, includeArchitecture, includeContent, includePerformance } = this.config;
      sections = { includeTechnical, includeArchitecture, includeContent, includePerformance };
      return Promise.resolve({ overallScore: 80 });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  const audit = (auditType) => new SEOTools().performSiteAudit({}, { site: "s1", ...(auditType && { auditType }) });

  it.each([
    [undefined, { includeTechnical: true, includeArchitecture: true, includeContent: true, includePerformance: true }],
    ["full", { includeTechnical: true, includeArchitecture: true, includeContent: true, includePerformance: true }],
    [
      "technical",
      { includeTechnical: true, includeArchitecture: true, includeContent: false, includePerformance: false },
    ],
    [
      "content",
      { includeTechnical: false, includeArchitecture: false, includeContent: true, includePerformance: false },
    ],
    [
      "performance",
      { includeTechnical: false, includeArchitecture: false, includeContent: false, includePerformance: true },
    ],
  ])("auditType %s", async (auditType, expected) => {
    await audit(auditType);
    expect(sections).toEqual(expected);
  });
});

describe("wp_seo_site_audit schema", () => {
  const { properties } = performSiteAuditTool.inputSchema;

  it("enforces the documented maxPages range", () => {
    expect(properties.maxPages).toMatchObject({ minimum: 1, maximum: 100 });
  });

  // It was never implemented; checking external links would also mean fetching arbitrary URLs.
  it("does not offer includeExternalLinks", () => {
    expect(properties.includeExternalLinks).toBeUndefined();
  });
});
