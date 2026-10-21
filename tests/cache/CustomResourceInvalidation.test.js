import { describe, expect, it } from "vitest";
import { CacheManager } from "@/cache/CacheManager.js";
import { HttpCacheWrapper } from "@/cache/HttpCacheWrapper.js";
import { CacheInvalidation } from "@/cache/CacheInvalidation.js";

// End to end through the real cache classes (CacheInvalidation.test.js mocks the wrapper): a write to a resource
// without registered rules, such as a custom post type's REST base, must leave no stale list, item or search entry.
describe("Invalidation of custom REST resources", () => {
  function setup() {
    const cacheManager = new CacheManager({ maxSize: 100, defaultTTL: 300000, enableLRU: true, enableStats: true });
    const httpCache = new HttpCacheWrapper(cacheManager, "site1");
    const invalidation = new CacheInvalidation(httpCache);
    const entries = {
      list: ["events", { per_page: 10 }],
      item: ["events/12", { context: "edit" }],
      search: ["search", { search: "fixture" }],
      otherSite: ["events", { per_page: 10 }, "site2"],
      unrelated: ["pages", { per_page: 10 }],
      prefixedResource: ["events-archive", { per_page: 10 }],
    };
    const keyOf = ([endpoint, params, site = "site1"]) => cacheManager.generateKey(site, endpoint, params);
    for (const entry of Object.values(entries)) {
      const [endpoint, params, site] = entry;
      if (site) new HttpCacheWrapper(cacheManager, site).warm(endpoint, [{ id: 1 }], params);
      else httpCache.warm(endpoint, [{ id: 1 }], params);
    }
    const cached = (name) => cacheManager.has(keyOf(entries[name]));
    return { invalidation, cached };
  }

  it("drops the resource's list and item entries and site search, nothing else", async () => {
    const { invalidation, cached } = setup();
    expect(["list", "item", "search", "otherSite", "unrelated", "prefixedResource"].every(cached)).toBe(true);

    await invalidation.processEvent({ type: "update", resource: "events", id: 12, siteId: "site1", timestamp: 0 });

    expect(cached("list")).toBe(false);
    expect(cached("item")).toBe(false);
    expect(cached("search")).toBe(false);
    expect(cached("otherSite")).toBe(true);
    expect(cached("unrelated")).toBe(true);
    expect(cached("prefixedResource")).toBe(true);
  });
});
