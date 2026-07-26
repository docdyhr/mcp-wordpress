# src/client/

## Purpose

The WordPress REST API client: authentication, request pipeline, and per-resource CRUD operations.

## Ownership

Owns `src/client/` including `operations/` (per-resource CRUD). Consumed by `src/tools/AGENTS.md`; depends on
`src/cache/AGENTS.md` (via `CachedWordPressClient`) and `src/config/AGENTS.md` (via `ServerConfiguration`).

## Local Contracts

**Composition, not inheritance**: `WordPressClient` (`api.ts:116`, `implements IWordPressClient`) builds seven
operation instances in its constructor (`api.ts:156`) — `PostsOperations`, `PagesOperations`, `MediaOperations`,
`UsersOperations`, `CommentsOperations`, `TaxonomiesOperations`, `SiteOperations` — passing itself in as a narrow
interface (e.g. `PostsClientBase` in `operations/posts.ts:11` exposes only `get/post/put/delete`). Public methods
(e.g. `getPosts()`, `api.ts:959`) delegate to the matching operations instance. New resource operations should follow
this same narrow-interface pattern. `src/client/managers/` (a parallel, unwired client architecture) and
`src/client/auth.ts` (a second, unwired auth implementation) were both confirmed dead — no production path imported
either — and deleted; `api.ts` has always been the sole production client.

**Auth methods** (5, implemented directly in `api.ts`): App Passwords, JWT, Basic, API Key — all four configurable
via `.env`/`mcp-wordpress.config.json` (`ConfigurationSchema`'s `AuthMethodSchema`) — plus Cookie, which is
implemented (`api.ts:407`, `447`, `532`) but intentionally excluded from `AuthMethodSchema` and only constructible
programmatically (`{ method: "cookie", nonce }`), not via config. `authenticateWithBasic` (`api.ts:466`, covers both
App Passwords and Basic), `authenticateWithJWT` (`api.ts:493`, POSTs to `${baseUrl}/wp-json/jwt-auth/v1/token`),
API Key header (`api.ts:401-405`, `X-API-Key`, no handshake).

**URL validation (SSRF/HTTPS)**: `validateAndSanitizeUrl` (constructor + any `request()` call whose endpoint starts
with `http`) requires `https:` and rejects private/loopback/link-local/metadata hostnames via the shared
`isDisallowedHostname` helper (`src/utils/validation/network.ts`) — same policy as `ConfigurationSchema`'s
`UrlSchema` (`src/config/AGENTS.md`). Escape hatches: `ALLOW_INSECURE_HTTP=true`, `ALLOW_PRIVATE_URLS=true`. Don't
add a second hostname/protocol check here — extend the shared helper instead.

**Request pipeline**: tool → `WordPressClient` public method → `operations/*.ts` → `request()` (`api.ts:542`) →
`requestRaw()` (`api.ts:575`) — builds URL/auth headers, applies `rateLimit()` (`api.ts:418`), retries GETs always
and mutating requests only when `idempotent:true` (linear backoff, `api.ts:684`), retries only on 5xx/network errors
(`shouldRetryError`, `api.ts:742`), and falls back to `index.php?rest_route=` on pretty-permalink 404s
(`tryIndexPhpFallback`, `api.ts:833`). Throws `WordPressAPIError` / `AuthenticationError` / `RateLimitError`
(`src/types/client.ts:285/299/307`) — when retries are exhausted, the terminal error re-throws the original typed
instance (preserving `statusCode`/`code`/`data`) rather than wrapping it in a new statusless `WordPressAPIError`;
only a genuinely untyped error (e.g. a raw network `Error`) gets wrapped. `src/tools/*.ts` handlers must use
`preserveToolError()` (`src/utils/error.ts`) when rewrapping a caught client error with an operation-specific
message, for the same reason — a plain `throw new Error(...)` silently discards this metadata.

**Subclasses**: `CachedWordPressClient` (transparent GET caching + write-invalidation via `src/cache/`),
`SEOWordPressClient` (Yoast/RankMath metadata), `MockWordPressClient` (tests/CI, no live WP backend).

## Work Guidance

New auth methods or request-pipeline changes go in `api.ts`, matching existing method signatures.

## Verification

```bash
npm run build && npx vitest run tests/client/
```

## Child DOX Index

None.
