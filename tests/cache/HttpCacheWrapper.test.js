/**
 * Regression tests for HttpCacheWrapper's upstream request behavior.
 *
 * Fresh, non-expired cache hits must never make a network call. Only a
 * stale entry with real validators should trigger a conditional
 * revalidation request, and a 304 response must refresh the entry's TTL
 * without discarding it. Cache invalidation and per-site isolation must
 * both still force a genuine upstream request.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpCacheWrapper } from "@/cache/HttpCacheWrapper.js";
import { CacheManager } from "@/cache/CacheManager.js";

vi.mock("../../dist/config/Config.js", () => ({
  config: () => ({
    app: { isDevelopment: true, isProduction: false, isTest: true, isDXT: false, isCI: false },
  }),
  ConfigHelpers: { isTest: vi.fn(() => true) },
}));

const baseOptions = { method: "GET", url: "https://example.com/wp-json/wp/v2/posts" };

async function letStaleEntryAge() {
  // ttl: 1 so the entry is stale almost immediately, without racing the
  // millisecond boundary that a ttl of 0 could hit on a fast machine.
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("HttpCacheWrapper upstream request counting", () => {
  let cacheManager;
  let httpCache;

  beforeEach(() => {
    cacheManager = new CacheManager({ maxSize: 1000, defaultTTL: 300000, enableLRU: true, enableStats: true });
    httpCache = new HttpCacheWrapper(cacheManager, "site-a");
  });

  afterEach(() => {
    cacheManager.destroy?.();
  });

  it("returns a fresh cache hit without any upstream request", async () => {
    const requestFn = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200, headers: {} });

    const first = await httpCache.request(requestFn, baseOptions);
    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(first.cached).toBeFalsy();

    const second = await httpCache.request(requestFn, baseOptions);
    expect(requestFn).toHaveBeenCalledTimes(1); // still 1 — fresh hit made no network call
    expect(second.cached).toBe(true);
    expect(second.data).toEqual({ id: 1 });
  });

  it("revalidates a stale entry with exactly one conditional request", async () => {
    const requestFn = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 1 }, status: 200, headers: { etag: '"abc"' } })
      .mockResolvedValueOnce({ data: null, status: 304, headers: {} });

    await httpCache.request(requestFn, baseOptions, { ttl: 1 });
    expect(requestFn).toHaveBeenCalledTimes(1);

    await letStaleEntryAge();

    const revalidated = await httpCache.request(requestFn, baseOptions, { ttl: 1 });
    expect(requestFn).toHaveBeenCalledTimes(2);
    // The first response only supplied an ETag; cacheAndReturn() synthesizes
    // a Last-Modified fallback when the origin didn't send one, so both
    // conditional headers end up present on the revalidation request.
    expect(requestFn.mock.calls[1][0]).toMatchObject({ "If-None-Match": '"abc"' });
    expect(revalidated.cached).toBe(true);
    expect(revalidated.data).toEqual({ id: 1 });
  });

  it("fetches a fresh body when a stale entry's revalidation returns changed content", async () => {
    const requestFn = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 1 }, status: 200, headers: { etag: '"v1"' } })
      .mockResolvedValueOnce({ data: { id: 2 }, status: 200, headers: { etag: '"v2"' } });

    await httpCache.request(requestFn, baseOptions, { ttl: 1 });
    await letStaleEntryAge();
    const updated = await httpCache.request(requestFn, baseOptions, { ttl: 1 });

    expect(requestFn).toHaveBeenCalledTimes(2);
    expect(updated.cached).toBeFalsy();
    expect(updated.data).toEqual({ id: 2 });
  });

  it("forces an upstream request after explicit invalidation", async () => {
    const requestFn = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200, headers: {} });

    await httpCache.request(requestFn, baseOptions);
    expect(requestFn).toHaveBeenCalledTimes(1);

    httpCache.invalidate("posts");

    await httpCache.request(requestFn, baseOptions);
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it("keeps caches for different sites isolated even when sharing one CacheManager", async () => {
    const requestFnA = vi.fn().mockResolvedValue({ data: { site: "a" }, status: 200, headers: {} });
    const requestFnB = vi.fn().mockResolvedValue({ data: { site: "b" }, status: 200, headers: {} });
    const httpCacheB = new HttpCacheWrapper(cacheManager, "site-b");

    await httpCache.request(requestFnA, baseOptions);
    await httpCacheB.request(requestFnB, baseOptions);

    expect(requestFnA).toHaveBeenCalledTimes(1);
    expect(requestFnB).toHaveBeenCalledTimes(1);

    // Same endpoint/options on both sites: each should still get its own
    // fresh hit (no upstream call) and its own site's data, not the other's.
    const hitA = await httpCache.request(requestFnA, baseOptions);
    const hitB = await httpCacheB.request(requestFnB, baseOptions);

    expect(requestFnA).toHaveBeenCalledTimes(1);
    expect(requestFnB).toHaveBeenCalledTimes(1);
    expect(hitA.data).toEqual({ site: "a" });
    expect(hitB.data).toEqual({ site: "b" });
  });

  it("does not cache non-GET requests and always calls upstream", async () => {
    const requestFn = vi.fn().mockResolvedValue({ data: { ok: true }, status: 200, headers: {} });

    await httpCache.request(requestFn, { method: "POST", url: baseOptions.url });
    await httpCache.request(requestFn, { method: "POST", url: baseOptions.url });

    expect(requestFn).toHaveBeenCalledTimes(2);
  });
});
