# src/cache/

## Purpose

In-memory and HTTP-level caching for WordPress REST API responses, per site.

## Ownership

Owns `src/cache/` including `__tests__/`. Consumed by `src/client/AGENTS.md` (`CachedWordPressClient`).

## Local Contracts

- `CacheManager.ts` — Map-based in-memory store: TTL, LRU eviction, FNV-1a hashed keys (`generateKey`,
  `CacheManager.ts:62-75`), hit/miss stats, `CachePresets` TTL tiers (STATIC/SEMI_STATIC/DYNAMIC/SESSION/REALTIME).
  Cache keys are always `siteId:endpoint[:paramHash]`, enabling per-site invalidation via prefix match (`clearSite`).
- `HttpCacheWrapper.ts` — HTTP-semantics layer on top of `CacheManager` (constructor injection): ETag/Last-Modified
  conditional revalidation, Cache-Control generation; only caches GET requests.
- `CacheInvalidation.ts` — event-based invalidation (create/update/delete) with a rule registry and queued async
  processing; depends on `HttpCacheWrapper`, not `CacheManager` directly. Also exports `WordPressCachePatterns` and
  `CacheWarmer`.
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
npm run build && npx vitest run tests/cache/ src/cache/__tests__/
```

## Child DOX Index

None.
