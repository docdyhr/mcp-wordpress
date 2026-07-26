# Production Deployment Guide

Guide for running MCP WordPress Server in production. This server is an **MCP (Model Context Protocol) server that
communicates over stdio** — it has no HTTP listener, no port to expose, and no built-in reverse-proxy/load-balancer
story. It is spawned as a child process by an MCP client (Claude Desktop, another MCP-compatible client, or Docker run
interactively) and talks to that client over stdin/stdout. "Production" here means "reliably configured, correctly
authenticated, and monitored" — not "a scaled, internet-facing HTTP service."

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Models](#deployment-models)
- [Configuration](#configuration)
- [Environment Variable Reference](#environment-variable-reference)
- [Security](#security)
- [Docker](#docker)
- [Health Checks & Logging](#health-checks--logging)
- [Backup](#backup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js **>=20.8.1** (see `package.json`'s `engines` field) or Docker
- A WordPress site with the REST API enabled
- An authentication method configured on that site: Application Passwords (recommended, WordPress 5.6+), Basic Auth, JWT
  (requires a JWT Authentication plugin), or an API key

### Pre-deployment checklist

```bash
npm run build           # tsc && tsc-alias
npm test                # full test suite
npm run typecheck
npm run lint
npm run security:scan   # blocking production dependency audit (scripts/security-audit-gate.js)
```

## Deployment Models

### 1. Local/native (Node.js)

The most common setup: the MCP client's own configuration spawns the server directly.

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-wordpress/dist/index.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  }
}
```

Generate this automatically with `npm run setup` (`bin/setup.js`), or run `npm run build && npm start` to launch it
directly against a `.env` file for manual testing.

### 2. Docker (interactive/stdio)

The published image (`docdyhr/mcp-wordpress`) runs the same stdio server — there is no separate "Docker mode" with
different capabilities. Point an MCP client at `docker run` instead of `node`:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--env-file", "/absolute/path/to/.env", "docdyhr/mcp-wordpress:latest"]
    }
  }
}
```

`-i` (interactive, keeps stdin open) is required — without it the client's stdio connection to the container never
works. See [Docker](#docker) below for `docker-compose.yml` usage and multi-site config mounting.

## Configuration

### Single-site (`.env`)

```bash
WORDPRESS_SITE_URL=https://your-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password
```

### Multi-site (`mcp-wordpress.config.json`)

Supports up to **50 sites** (`ConfigurationSchema.ts`'s `MultiSiteConfigSchema`). Never commit this file — it's
gitignored, same as `.env`.

```json
{
  "sites": [
    {
      "id": "production",
      "name": "Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    },
    {
      "id": "staging",
      "name": "Staging Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://staging.your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  ]
}
```

`ServerConfiguration.ts` fails startup loudly on invalid config (no silent fallback) — a typo or missing required field
for the chosen auth method is caught immediately, not at first request.

## Environment Variable Reference

Every variable below is read somewhere in `src/` — this list is generated from the actual `process.env.*` call sites,
not aspirational. Full per-auth-method requirements live in `src/config/ConfigurationSchema.ts`.

| Variable                 | Purpose                                                   | Default        |
| ------------------------ | --------------------------------------------------------- | -------------- |
| `WORDPRESS_SITE_URL`     | Site base URL (single-site mode)                          | — (required)   |
| `WORDPRESS_USERNAME`     | Username for app-password/basic/jwt auth                  | —              |
| `WORDPRESS_APP_PASSWORD` | Application Password (recommended auth method)            | —              |
| `WORDPRESS_PASSWORD`     | Password for basic/jwt auth                               | —              |
| `WORDPRESS_JWT_SECRET`   | JWT Authentication plugin secret                          | —              |
| `WORDPRESS_API_KEY`      | API key auth                                              | —              |
| `WORDPRESS_AUTH_METHOD`  | `app-password` \| `basic` \| `jwt` \| `api-key`           | `app-password` |
| `WORDPRESS_TIMEOUT`      | Request timeout (ms)                                      | `30000`        |
| `WORDPRESS_MAX_RETRIES`  | Max retry attempts for retryable requests                 | `3`            |
| `DEBUG`                  | Verbose debug logging                                     | `false`        |
| `LOG_LEVEL`              | Logger level                                              | —              |
| `DISABLE_CACHE`          | Disable in-memory/HTTP caching entirely                   | `false`        |
| `CACHE_TTL`              | Default cache TTL (seconds)                               | `300`          |
| `CACHE_MAX_ITEMS`        | Max in-memory cache entries                               | —              |
| `CACHE_MAX_MEMORY_MB`    | Approximate cache memory ceiling                          | —              |
| `RATE_LIMIT`             | Client-side rate limit (requests/window)                  | `60`           |
| `RATE_LIMIT_ENABLED`     | Enable client-side rate limiting                          | `true`         |
| `RATE_LIMIT_REQUESTS`    | Requests per window                                       | `100`          |
| `RATE_LIMIT_WINDOW`      | Window size (ms)                                          | `60000`        |
| `ALLOW_INSECURE_HTTP`    | Escape hatch: allow `http://` site URLs                   | `false`        |
| `ALLOW_PRIVATE_URLS`     | Escape hatch: allow private/loopback/link-local hostnames | `false`        |

`ALLOW_INSECURE_HTTP`/`ALLOW_PRIVATE_URLS` intentionally bypass the SSRF/HTTPS enforcement in
`src/utils/validation/network.ts` — only set these for local development against a non-HTTPS or private WordPress
instance, never in a real deployment reachable from untrusted input.

`npm run setup` (`bin/setup.js`) writes `WORDPRESS_*`, `DEBUG`, `DISABLE_CACHE`, and `RATE_LIMIT` for you interactively.

## Security

- **HTTPS/SSRF enforcement is on by default** for both single-site (`ConfigurationSchema`'s `UrlSchema`) and the live
  client (`WordPressClient.validateAndSanitizeUrl`) — private, loopback, link-local, and cloud-metadata hostnames are
  rejected unless `ALLOW_PRIVATE_URLS=true`, and non-HTTPS URLs are rejected unless `ALLOW_INSECURE_HTTP=true`.
- **Never commit** `.env` or `mcp-wordpress.config.json` (both gitignored) — they hold plaintext credentials.
- **Run `npm run security:scan` regularly** — it's a real, blocking gate (`scripts/security-audit-gate.js`) against a
  reviewed, time-boxed exception list (`security-exceptions.json`), not a demo. See `SECURITY.md` for the current
  known-issues list and how to add or renew an exception.
- **Rotate Application Passwords** periodically from WordPress's own Users → Profile → Application Passwords screen —
  revoking one there takes effect immediately, with no server restart needed here.

## Docker

```bash
# Pull the published image
docker pull docdyhr/mcp-wordpress:latest

# Run against a single-site .env file (interactive, for an MCP client to attach to)
docker run -i --rm --env-file .env docdyhr/mcp-wordpress:latest

# Or mount a multi-site config
docker run -i --rm -v "$(pwd)/mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro" docdyhr/mcp-wordpress:latest
```

The repository's own `docker-compose.yml` mounts `mcp-wordpress.config.json` and/or `.env` read-only, sets resource
limits via the standard (non-Swarm) `mem_limit`/`cpus` keys, and wires up the real container `HEALTHCHECK`. It also
includes an optional `wordpress` + `db` service pair (behind the `dev` profile) for spinning up a local WordPress
instance to test against — not part of this server's own runtime.

The image (`Dockerfile`) is a multi-stage `node:22-alpine` build, non-root (`mcp` user), `tini` as PID 1, with the same
`--health-check` flag as the healthcheck below.

## Health Checks & Logging

There is no HTTP `/health` endpoint — health is checked by actually running the server's own health-check path:

```bash
node dist/index.js --health-check   # what the Docker HEALTHCHECK and docker-compose.yml both run
npm run health                       # scripts/health-check.js — broader local diagnostic
npm run status                       # bin/status.js — connection/auth status for configured site(s)
```

Logging goes through `src/utils/logger.ts` (structured, with credential redaction — confirmed by
`tests/bin/status.test.js`'s redaction tests). Set `DEBUG=true` for verbose output; there is no separate
`LOG_LEVEL=debug` HTTP-service-style log pipeline to configure.

## Backup

There is no local database and no persistent server-side state beyond the in-memory cache (which is intentionally
ephemeral and rebuilds itself from WordPress on the next request). The only things worth backing up are your credentials
and configuration:

```bash
tar -czf mcp-wordpress-config-backup-$(date +%Y%m%d).tar.gz .env mcp-wordpress.config.json
```

Store that archive somewhere access-controlled — it contains plaintext credentials.

## Troubleshooting

### WordPress connection / authentication issues

```bash
npm run status                                          # current auth status for configured site(s)
npm run fix:rest-auth                                    # fixes the common Authorization-header-stripped-by-.htaccess case
curl -I https://your-wordpress-site.com/wp-json/wp/v2/   # confirm the REST API itself is reachable
```

If Application Password authentication returns 401s specifically on shared hosting, the most common cause is the host
stripping the `Authorization` header before it reaches WordPress — `npm run fix:rest-auth` adds the standard `.htaccess`
rewrite rule for this (see the root `AGENTS.md` Troubleshooting section).

### Debug mode

```bash
DEBUG=true npm run dev   # build + run with verbose logging
```

### Cache issues

```bash
rm -rf cache/            # clears the on-disk cache directory, if present
# or set DISABLE_CACHE=true to bypass caching entirely for a session
```
