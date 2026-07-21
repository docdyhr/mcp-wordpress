# src/config/

## Purpose

Loads, validates, and exposes WordPress site connection config (single-site via env vars, or multi-site via JSON
file) plus general app/CI/SEO config.

## Ownership

Owns `src/config/`.

## Local Contracts

- `ConfigurationSchema.ts` — owns all Zod schemas: per-auth-method discriminated unions (`app-password`/`basic`/
  `jwt`/`api-key`), `SiteSchema`/`MultiSiteConfigSchema` (JSON file), `EnvironmentConfigSchema` (single-site env),
  `McpConfigSchema` (client-passed partial config), `ConfigurationValidator`, `buildAuthConfig()`.
- `UrlSchema` requires `https:` and rejects private/loopback/link-local hostnames (via
  `isDisallowedHostname` in `src/utils/validation/network.ts`) by default, regardless of `NODE_ENV` — escape hatches
  are `ALLOW_INSECURE_HTTP=true` and `ALLOW_PRIVATE_URLS=true`. This is the same policy `WordPressClient` enforces
  in `validateAndSanitizeUrl` (`src/client/AGENTS.md`); both call the shared helper so the two can't drift apart —
  don't reintroduce inline hostname/protocol checks in either place.
- `ServerConfiguration.ts` — singleton consumer/orchestrator: decides single-site vs multi-site mode
  (`loadClientConfigurations()`, `ServerConfiguration.ts:75-99`), reads `.env` via dotenv, resolves
  `mcp-wordpress.config.json` if present, validates via `ConfigurationSchema`, and builds one
  `WordPressClient`/`CachedWordPressClient` per site. **Fails startup loudly on invalid config — no silent
  fallback.** Does not define its own validation rules.
- `Config.ts` — singleton reading `process.env` into a typed `AppConfig`; exports `ConfigHelpers`.

**Config files are never committed**: `mcp-wordpress.config.json` and `.env` are gitignored. Any example/test config
must use placeholder site IDs (`site1`, `site2`, ...) and dummy credentials (`xxxx xxxx xxxx xxxx`) — never real
values, per existing convention in `mcp-wordpress.config.json.example` and `tests/config-loading.test.js`.

## Work Guidance

New config fields: add the Zod schema in `ConfigurationSchema.ts` first, then wire consumption in
`ServerConfiguration.ts` or `Config.ts` as appropriate — don't validate ad hoc in the consumer.

## Verification

```bash
npm run build && npx vitest run tests/config/
```

## Child DOX Index

None.
