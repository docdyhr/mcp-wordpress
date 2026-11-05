# src/client/

## Purpose

The WordPress REST API client: authentication, request pipeline, and per-resource CRUD operations.

## Ownership

Owns `src/client/` including `operations/` (per-resource CRUD). Consumed by `src/tools/AGENTS.md`; depends on
`src/cache/AGENTS.md` (via `CachedWordPressClient`) and `src/config/AGENTS.md` (via `ServerConfiguration`).

## Local Contracts

**Composition, not inheritance**: `WordPressClient` (`api.ts:117`, `implements IWordPressClient`) builds seven operation
instances in its constructor (`api.ts:214`) — `PostsOperations`, `PagesOperations`, `MediaOperations`,
`UsersOperations`, `CommentsOperations`, `TaxonomiesOperations`, `SiteOperations` — passing itself in as a narrow
interface (e.g. `PostsClientBase` in `operations/posts.ts:11` exposes only `get/post/put/delete`). Public methods (e.g.
`getPosts()`, `api.ts:1008`) delegate to the matching operations instance. New resource operations should follow this
same narrow-interface pattern. `src/client/managers/` (a parallel, unwired client architecture) and `src/client/auth.ts`
(a second, unwired auth implementation) were both confirmed dead — no production path imported either — and deleted;
`api.ts` has always been the sole production client.

**Auth methods** (5, implemented directly in `api.ts`): App Passwords, JWT, Basic, API Key — all four configurable via
`.env`/`mcp-wordpress.config.json` (`ConfigurationSchema`'s `AuthMethodSchema`) — plus Cookie, which is implemented
(`api.ts:407`, `447`, `532`) but intentionally excluded from `AuthMethodSchema` and only constructible programmatically
(`{ method: "cookie", nonce }`), not via config. `authenticateWithBasic` (`api.ts:466`, covers both App Passwords and
Basic), `authenticateWithJWT` (`api.ts:493`, POSTs to `${baseUrl}/wp-json/jwt-auth/v1/token`), API Key header
(`api.ts:401-405`, `X-API-Key`, no handshake).

**URL validation (SSRF/HTTPS)**: `validateAndSanitizeUrl` (constructor + any `request()` call whose endpoint is an
absolute `http(s)://` URL, `/^https?:\/\//i`; a route that merely starts with `http`, such as a post type's `http_logs`
REST base, stays a route, and `CachedWordPressClient.buildRequestUrl()` classifies the same way) requires `https:` and
rejects private/loopback/link-local/metadata hostnames via the shared `isDisallowedHostname` helper
(`src/utils/validation/network.ts`) — same policy as `ConfigurationSchema`'s `UrlSchema` (`src/config/AGENTS.md`).
Escape hatches: `ALLOW_INSECURE_HTTP=true`, `ALLOW_PRIVATE_URLS=true`. Don't add a second hostname/protocol check here —
extend the shared helper instead.

**Request pipeline**: tool → `WordPressClient` public method → `operations/*.ts` → `request()` (`api.ts:541`) →
`requestRaw()` (`api.ts:574`) — builds URL/auth headers, applies `rateLimit()` (`api.ts:417`), retries GETs always and
mutating requests only when `idempotent:true` (linear backoff, `api.ts:687`), retries only on 5xx/network errors
(`shouldRetryError`, `api.ts:770`), and falls back to `index.php?rest_route=` on pretty-permalink 404s
(`tryIndexPhpFallback`, `api.ts:882`). Native fetch rejects every network failure as `TypeError("fetch failed")` and
keeps the socket error, with its code (`ECONNRESET`, `ENOTFOUND`, `UND_ERR_SOCKET`, `UND_ERR_CONNECT_TIMEOUT`, ...), in
`cause`, so `normalizeRequestError` (`api.ts:739`) appends the cause's code to the message (its message only when it has
no code): `shouldRetryError`'s patterns and the `ECONNREFUSED`/`ENOTFOUND` checks in `src/utils/error.ts` and
`BulkOperations` read only `message`. Never the cause's message when a code exists: it carries hostnames, addresses and
ports, and callers test messages with `includes("404")` (`PostHandlers`) and `includes("401")`/`includes("403")`
(`CircuitBreaker`). Tests of the fetch path mock that shape (`tests/client/WordPressClient.test.js`, "native fetch
network errors"); a bare `new Error("ECONNRESET")` exercises only the message-only path. Throws `WordPressAPIError` /
`AuthenticationError` / `RateLimitError` (`src/types/client.ts:285/299/307`) — when retries are exhausted, the terminal
error re-throws the original typed instance (preserving `statusCode`/`code`/`data`) rather than wrapping it in a new
statusless `WordPressAPIError`; only a genuinely untyped error (e.g. a raw network `Error`) gets wrapped.
`src/tools/*.ts` handlers must use `preserveToolError()` (`src/utils/error.ts`) when rewrapping a caught client error
with an operation-specific message, for the same reason — a plain `throw new Error(...)` silently discards this
metadata.

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
