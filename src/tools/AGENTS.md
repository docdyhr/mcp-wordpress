# src/tools/

## Purpose

The 73 MCP tools the server exposes, grouped by WordPress resource.

## Ownership

Owns `src/tools/` including `posts/`, `performance/`, and `seo/` (with `analyzers/`, `auditors/`, `generators/`,
`optimizers/`, `providers/`, `validators/`). Does not own the WordPress client (`src/client/AGENTS.md`) or input
sanitization internals (`src/security/AGENTS.md`) that tools call into.

## Local Contracts

**Tool anatomy**: a tool is a plain object `{ name, description, inputSchema }` matching `MCPTool`
(`src/types/mcp.ts:33-37`) with hand-written JSON-Schema `inputSchema`, paired with an `async handler(client, params)`
function. Zod is applied centrally at registration time (`src/server/ToolRegistry.ts`), not at the definition site —
don't add per-tool Zod schemas.

**Taxonomy deletes are permanent**: `wp_delete_category` and `wp_delete_tag` must pass `force=true` to the client.
WordPress terms have no trash, so the client's default `force=false` is always rejected; there is deliberately no
`force` input. Keep the tool descriptions saying "Permanently deletes".

**Registration contract**: each exported class (`src/tools/index.ts`) must implement
`getTools(): { name, description, inputSchema, handler }[]`. `ToolRegistry.registerAllTools()` instantiates every class
(some, like `CacheTools`/`PerformanceTools`, take the `wordpressClients` map in their constructor), converts each
`inputSchema` to Zod at runtime, auto-injects a `site` parameter in multi-site mode, and wraps handlers in try/catch for
auth-error/`EnhancedError` handling. A new tool must satisfy this contract to be picked up.

**File pattern**: multiple tools per file, grouped by resource — not file-per-tool. Newer/larger categories (`posts/`,
`seo/`, `performance/`) split into `*ToolDefinitions.ts` (schemas) + `*Handlers.ts` (logic) + `index.ts` (class wiring);
older categories (`pages.ts`, `users.ts`, `comments.ts`, `taxonomies.ts`, `cache.ts`, `site.ts`, `auth.ts`) are single
files. `posts.ts` and `performance.ts` are `@deprecated` re-export shims — edit the subdirectory versions, not the
shims.

**Category map** (73 tools / 12 categories — verified against source):

| Category    | File(s)                                     | Count |
| ----------- | ------------------------------------------- | ----- |
| Posts       | `posts/PostToolDefinitions.ts`              | 6     |
| Pages       | `pages.ts`                                  | 6     |
| Media       | `media.ts`                                  | 5     |
| Users       | `users.ts`                                  | 6     |
| Comments    | `comments.ts`                               | 7     |
| Taxonomies  | `taxonomies.ts`                             | 10    |
| Site        | `site.ts` (settings/search)                 | 3     |
| Auth        | `auth.ts` (3) + `site.ts` app-passwords (3) | 6     |
| Cache       | `cache.ts`                                  | 4     |
| Performance | `performance/PerformanceTools.ts`           | 6     |
| SEO         | `seo/SEOToolDefinitions.ts`                 | 11    |
| System      | `system.ts`, `version.ts`                   | 3     |

**SEO engines** (`seo/`) — each subdirectory is one engine-per-concern, orchestrated by `seo/SEOTools.ts`:
`analyzers/ContentAnalyzer.ts` (readability/keyword scoring), `auditors/SiteAuditor.ts` (site-wide audit),
`generators/MetaGenerator.ts` + `SchemaGenerator.ts` (meta tags, JSON-LD), `optimizers/InternalLinkingSuggester.ts`,
`providers/SearchConsoleProvider.ts` (Google Search Console). `validators/` is currently empty (reserved).

**Rendered fields are HTML**: WordPress returns `title.rendered`, `excerpt.rendered` and `caption.rendered`
entity-encoded (`Q&#038;A`); excerpts and captions come wrapped in `<p>`, titles can contain inline markup. The post,
page and media tools print them through `displayTitle()` / `htmlToPlainText()` (`src/utils/htmlText.ts`); do the same in
any new text output. The SEO engines (`seo/`) still pass `title.rendered` through unchanged in their structured results.

**Post types** (`posts/`): the five post CRUD tools take `post_type` (default `post`; the schema bounds it to a
WordPress post type key, `^[a-z0-9_-]+$`, max 20). Any other type resolves through `/wp/v2/types` to its `rest_base`. A
type missing there (not registered, or `show_in_rest` false) or registered under another `rest_namespace` fails with the
available wp/v2 types, because the client only addresses `wp/v2` routes. Items of a type without title support carry no
`title`, so read `title?.rendered`. A trash (`force=false`) succeeds when WordPress returns the item with
`status: "trash"`; only a permanent delete returns `{ deleted, previous }`.

**Inspection output** (`system.ts`): `wp_list_plugins` and `wp_list_themes` print a summary (status, version, plain-text
author, WP/PHP requirements; active theme first with its parent, features capped at 12), never the raw REST objects,
whose descriptions are third-party HTML.

**Pagination contract**: list tools accept `page` and `per_page` (max 100) in their `inputSchema` — a property missing
from the schema is stripped by the argument validator, so it never reaches the handler. Handlers forward them to
WordPress, which defaults to 10 per page, and end a full page with a next-page note (`pageHint()` in `params.ts`;
`postsPaginationNote()` for posts, including the >50-post streaming path). The note is the only signal that more results
exist because the X-WP-Total header is not exposed to tools; never label a page's size as a site total.

**Schema and descriptions are the contract**: where a tool checks required parameters in code (the SEO tools'
`validateRequired()`), the list must not be stricter than its `inputSchema.required`, and a default named in a property
description ("default: full") must be the one the code applies, and a documented parameter must change the result —
remove one the code ignores rather than keep it. SEO results are cached under `seoResultKey()` keys with
`SEOCacheManager.ttlFor()` TTLs (seconds); a post-based tool fetches the post before the cache lookup, because the
post's last modification is part of the key (contract: `src/cache/AGENTS.md`).

**Shared imports**: `@/client/api.js` (`WordPressClient`), `@/utils/error.js`, `@/types/wordpress.js`,
`@/utils/validation/security.js` (`sanitizeHtml`), `@/utils/htmlText.js` (`displayTitle`, `htmlToPlainText`),
`src/tools/params.ts` (`toolParams<T>`, `parseId`, `parseIdAndForce`).

**Auth tool isolation**: `wp_switch_auth_method` must never mutate the shared per-site `WordPressClient` instance stored
by the server for later tool invocations. When validating alternate credentials, verify them with an isolated throwaway
client and leave the shared client/config/cache untouched.

**Performance and cache output** (`performance/`, `cache.ts`): scope labels, hit-rate formatting, history windows and
alert-number rounding are contracts in `src/performance/AGENTS.md` — read it before editing these files.

## Work Guidance

Adding a `wp_*` tool: define it alongside its category's existing tools, register a handler, and ensure the class's
`getTools()` includes it. Mirror the test layout in `tests/tools/`.

## Verification

```bash
npm run build && npx vitest run tests/tools/
```

## Child DOX Index

None — SEO engine subdirectories are covered above; no further AGENTS.md files under `src/tools/`.
