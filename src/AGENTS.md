# src/

## Purpose

TypeScript source for the MCP WordPress server: entry points, tool registry, WordPress client, and all supporting
subsystems.

## Ownership

Owns everything under `src/` not covered by a child AGENTS.md: entry points (`index.ts`, `server.ts`,
`dxt-entry.ts`), `src/server/` (MCP server wiring + `ToolRegistry.ts`), `src/utils/` (logger, error types,
`CircuitBreaker`, validation helpers), `src/types/` (shared TS types), `src/docs/` (README/docs auto-generation).
Domain-specific contracts for tools, the WordPress client, caching, security, performance, and config live in the
child docs indexed below.

## Local Contracts

- Build: `tsc && tsc-alias` — path aliases (`@/*`) resolve to `dist/*` at runtime and in tests; always run
  `npm run build` after source changes before testing or running the CLI.
- Errors: use the `WordPressAPIError` / `AuthenticationError` / `RateLimitError` hierarchy from `src/types/client.ts`
  and helpers in `src/utils/error.ts` / `enhancedError.ts` — don't throw raw `Error`.
- Logging: use `src/utils/logger.ts`, not `console.*`.
- Input sanitization: route all MCP tool input through `src/security/InputValidator.ts`, not ad hoc checks.

## Work Guidance

- TypeScript: mark optional properties `| undefined` explicitly (project convention, not just `?:`).
- ESLint: prefix intentionally-unused variables with `_`.
- Composition over inheritance: new subsystems should take dependencies via constructor injection (see
  `src/client/AGENTS.md` for the canonical pattern) rather than extending base classes.
- `src/client/managers/` contains multiple unused parallel client architectures (see `src/client/AGENTS.md`) — do not
  build new features on them without confirming with the user first; the production path is `src/client/api.ts`.

## Verification

```bash
npm run build       # tsc && tsc-alias
npm run typecheck   # tsc --noEmit
npm run lint         # eslint src/ tests/
```

## Child DOX Index

- `src/tools/AGENTS.md` — tool anatomy, registration contract, 12-category map
- `src/client/AGENTS.md` — WordPressClient composition, auth methods, request pipeline
- `src/cache/AGENTS.md` — CacheManager / HttpCacheWrapper / invalidation
- `src/security/AGENTS.md` — input validation + AI-assisted security scanning pipeline
- `src/performance/AGENTS.md` — metrics collection and analytics
- `src/config/AGENTS.md` — single-site vs multi-site configuration loading
