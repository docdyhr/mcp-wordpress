# src/tools/

## Purpose

The 71 MCP tools the server exposes, grouped by WordPress resource.

## Ownership

Owns `src/tools/` including `posts/`, `performance/`, and `seo/` (with `analyzers/`, `auditors/`, `generators/`,
`optimizers/`, `providers/`, `validators/`). Does not own the WordPress client (`src/client/AGENTS.md`) or input
sanitization internals (`src/security/AGENTS.md`) that tools call into.

## Local Contracts

**Tool anatomy**: a tool is a plain object `{ name, description, inputSchema }` matching `MCPTool`
(`src/types/mcp.ts:33-37`) with hand-written JSON-Schema `inputSchema`, paired with an `async handler(client, params)`
function. Zod is applied centrally at registration time (`src/server/ToolRegistry.ts`), not at the definition site —
don't add per-tool Zod schemas.

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

**Category map** (71 tools / 12 categories — verified against source):

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
| System      | `version.ts` (wrapped by `system.ts`)       | 1     |

**SEO engines** (`seo/`) — each subdirectory is one engine-per-concern, orchestrated by `seo/SEOTools.ts`:
`analyzers/ContentAnalyzer.ts` (readability/keyword scoring), `auditors/SiteAuditor.ts` (site-wide audit),
`generators/MetaGenerator.ts` + `SchemaGenerator.ts` (meta tags, JSON-LD), `optimizers/InternalLinkingSuggester.ts`,
`providers/SearchConsoleProvider.ts` (Google Search Console). `validators/` is currently empty (reserved).

**Shared imports**: `@/client/api.js` (`WordPressClient`), `@/utils/error.js`, `@/types/wordpress.js`,
`@/utils/validation/security.js` (`sanitizeHtml`), `src/tools/params.ts` (`toolParams<T>`, `parseId`,
`parseIdAndForce`).

**Auth tool isolation**: `wp_switch_auth_method` must never mutate the shared per-site `WordPressClient` instance stored
by the server for later tool invocations. When validating alternate credentials, verify them with an isolated throwaway
client and leave the shared client/config/cache untouched.

## Work Guidance

Adding a `wp_*` tool: define it alongside its category's existing tools, register a handler, and ensure the class's
`getTools()` includes it. Mirror the test layout in `tests/tools/`.

## Verification

```bash
npm run build && npx vitest run tests/tools/
```

## Child DOX Index

None — SEO engine subdirectories are covered above; no further AGENTS.md files under `src/tools/`.
