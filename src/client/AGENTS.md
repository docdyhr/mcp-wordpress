# src/client/

## Purpose

The WordPress REST API client: authentication, request pipeline, and per-resource CRUD operations.

## Ownership

Owns `src/client/` including `operations/` (per-resource CRUD) and `managers/` (see below). Consumed by
`src/tools/AGENTS.md`; depends on `src/cache/AGENTS.md` (via `CachedWordPressClient`) and `src/config/AGENTS.md`
(via `ServerConfiguration`).

## Local Contracts

**Composition, not inheritance**: `WordPressClient` (`api.ts:116`, `implements IWordPressClient`) builds seven
operation instances in its constructor (`api.ts:156`) — `PostsOperations`, `PagesOperations`, `MediaOperations`,
`UsersOperations`, `CommentsOperations`, `TaxonomiesOperations`, `SiteOperations` — passing itself in as a narrow
interface (e.g. `PostsClientBase` in `operations/posts.ts:11` exposes only `get/post/put/delete`). Public methods
(e.g. `getPosts()`, `api.ts:959`) delegate to the matching operations instance. New resource operations should follow
this same narrow-interface pattern.

**`managers/` is dead code** (`ComposedWordPressClient`, `ComposedManagerFactory`, `AuthenticationManager`,
`RequestManager`, `AuthManager`, and their `interfaces/`/`implementations/`/`composed/` subdirectories) — a parallel
client architecture with its own tests but **not imported by `api.ts`, `ServerConfiguration.ts`, or any production
path**. Do not extend it or route new work through it without checking with the user first; the production client is
`src/client/api.ts`.

**Auth methods** (5, implemented directly in `api.ts`): App Passwords, JWT, Basic, API Key — all four configurable
via `.env`/`mcp-wordpress.config.json` (`ConfigurationSchema`'s `AuthMethodSchema`) — plus Cookie, which is
implemented (`api.ts:407`, `447`, `532`) but intentionally excluded from `AuthMethodSchema` and only constructible
programmatically (`{ method: "cookie", nonce }`), not via config. `authenticateWithBasic` (`api.ts:466`, covers both
App Passwords and Basic), `authenticateWithJWT` (`api.ts:493`, POSTs to `${baseUrl}/wp-json/jwt-auth/v1/token`),
API Key header (`api.ts:401-405`, `X-API-Key`, no handshake).
`src/client/auth.ts` (`WordPressAuth`, provider classes, `createAuthProvider`) is a second, unwired implementation —
same dead-code caveat as `managers/`.

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
(`src/types/client.ts:285/299/307`).

**Subclasses**: `CachedWordPressClient` (transparent GET caching + write-invalidation via `src/cache/`),
`SEOWordPressClient` (Yoast/RankMath metadata), `MockWordPressClient` (tests/CI, no live WP backend).

## Work Guidance

New auth methods or request-pipeline changes go in `api.ts`, matching existing method signatures — do not add to
`managers/` or `auth.ts` unless directed to revive that architecture.

## Verification

```bash
npm run build && npx vitest run tests/client/
```

## Child DOX Index

None.
