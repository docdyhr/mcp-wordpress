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
