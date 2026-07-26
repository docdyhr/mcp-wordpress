# src/cache/

## Purpose

In-memory and HTTP-level caching for WordPress REST API responses, per site.

## Ownership

Owns `src/cache/`. Consumed by `src/client/AGENTS.md` (`CachedWordPressClient`).

## Local Contracts

- `CacheManager.ts` — Map-based in-memory store: TTL, LRU eviction, FNV-1a hashed keys (`generateKey`,
  `CacheManager.ts:62-75`), hit/miss stats, `CachePresets` TTL tiers (STATIC/SEMI_STATIC/DYNAMIC/SESSION/REALTIME).
  Cache keys are always `siteId:endpoint[:paramHash]`, enabling per-site invalidation via prefix match (`clearSite`).
- `HttpCacheWrapper.ts` — HTTP-semantics layer on top of `CacheManager` (constructor injection): ETag/Last-Modified
  conditional revalidation, Cache-Control generation; only caches GET requests.
- `CacheInvalidation.ts` — event-based invalidation (create/update/delete) with a rule registry and queue; depends
  on `HttpCacheWrapper`, not `CacheManager` directly. Also exports `WordPressCachePatterns` and `CacheWarmer`.
  **`trigger()`/`invalidateResource()` resolve only once the queued event has actually been processed** (no
  `setImmediate`/deferred-tick hop) — this is a read-after-write guarantee `CachedWordPressClient`'s mutating
  methods depend on: an immediate read after an awaited write must see fresh data. Don't reintroduce deferred
  processing without adding a separately-named method for it; no current caller wants fire-and-forget invalidation.
- `SEOCacheManager.ts` — `CacheManager` subclass with SEO-specific TTL tiers pulled from `Config`.
- **`get()` vs `peek()`**: `CacheManager.get()` deletes expired entries as a side effect. `peek()`
  (`CacheManager.ts:258-279`) exists so `HttpCacheWrapper` can inspect staleness without destroying the
  ETag/Last-Modified validators needed for conditional requests — use `peek()` for revalidation flows, `get()`
  otherwise.

## Work Guidance

New cache consumers should go through `HttpCacheWrapper`/`CachedWordPressClient`, not `CacheManager` directly, unless
they need raw key/value storage without HTTP semantics.

## Verification

```bash
npm run build && npx vitest run tests/cache/
```

## Child DOX Index

None.
