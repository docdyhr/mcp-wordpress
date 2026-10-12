/**
 * SEOCacheManager TTLs are seconds — the SEO_CACHE_*_TTL settings, its DEFAULT_TTL table and every SEO caller give
 * seconds ("21600 // 6 hours") — but the base CacheManager counts milliseconds. Nothing converted, so a "6 hour"
 * analysis expired after 21.6 s and a "1 hour" audit after 3.6 s.
 */
import { vi } from "vitest";
import { SEOCacheManager } from "../../dist/cache/SEOCacheManager.js";

const HOUR = 60 * 60 * 1000;

describe("SEOCacheManager TTLs are seconds", () => {
  let cache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T08:00:00Z"));
    cache = new SEOCacheManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a 21600 s entry for 6 hours, not 21.6 seconds", () => {
    cache.set("k", { v: 1 }, 21600);

    vi.advanceTimersByTime(HOUR);
    expect(cache.get("k")).toEqual({ v: 1 });

    vi.advanceTimersByTime(5 * HOUR + 1000);
    expect(cache.get("k")).toBeNull();
  });

  it("uses a 6-hour default when no TTL is given", () => {
    cache.set("k", { v: 1 });

    vi.advanceTimersByTime(5 * HOUR);
    expect(cache.get("k")).toEqual({ v: 1 });
  });

  it("cacheAudit keeps an audit for its 1-hour default", async () => {
    await cache.cacheAudit("full", { score: 80 }, "s1");

    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(cache.getCachedAudit("full", "s1")).toEqual({ score: 80 });

    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(cache.getCachedAudit("full", "s1")).toBeNull();
  });
});

// getAllKeys() returned [] (a placeholder), so these never found an entry; and keys built by SEOTools must keep the
// site and post as their own segments for them to work at all.
describe("SEOCacheManager invalidation and stats", () => {
  let cache;
  const post = { modified_gmt: "2026-10-11T08:00:00" };

  beforeEach(async () => {
    const { seoResultKey } = await import("../../dist/cache/SEOCacheManager.js");
    cache = new SEOCacheManager();
    cache.set(seoResultKey("analyze", { site: "s1", postId: 5, focusKeywords: ["a"] }, post), "s1-p5-analysis", 3600);
    cache.set(seoResultKey("schema", { site: "s1", postId: 5, schemaType: "Article" }, post), "s1-p5-schema", 3600);
    cache.set(seoResultKey("analyze", { site: "s1", postId: 50 }, post), "s1-p50", 3600);
    cache.set(seoResultKey("analyze", { site: "s10", postId: 5 }, post), "s10-p5", 3600);
    cache.set(seoResultKey("audit", { site: "s1", maxPages: 10 }), "s1-audit", 3600);
    await cache.cacheAnalysis(5, "full", "legacy-s1-p5", "s1");
  });

  const remaining = () => cache.keys().map((k) => cache.get(k));

  it("invalidatePostSEO clears that post on that site only", async () => {
    await cache.invalidatePostSEO(5, "s1");
    expect(remaining().sort()).toEqual(["s1-audit", "s1-p50", "s10-p5"]);
  });

  it("invalidateSiteSEO clears that site only (not s10 for s1)", async () => {
    await cache.invalidateSiteSEO("s1");
    expect(remaining()).toEqual(["s10-p5"]);
  });

  it("clearSEOCache clears every SEO entry", async () => {
    await cache.clearSEOCache();
    expect(remaining()).toEqual([]);
  });

  it("getSEOCacheStats counts entries by kind", () => {
    expect(cache.getSEOCacheStats()).toMatchObject({
      totalEntries: 6,
      byType: { analyze: 3, schema: 1, audit: 1, analysis: 1 },
    });
  });
});
