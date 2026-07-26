# src/security/

## Purpose

Input validation/sanitization for MCP tool calls, plus a self-contained AI-assisted security scanning, review,
remediation, and CI-gate pipeline for this codebase (not WordPress content).

## Ownership

Owns `src/security/` (12 files, barrel-exported via `index.ts`).

## Local Contracts

- `InputValidator.ts` — `InputSanitizer`, `SecuritySchemas`, `SecurityLimiter`, `ToolSchemas` — **the single
  sanitization surface every MCP tool input should route through.** Wired into
  `src/server/ToolRegistry.ts`'s `getZodTypeForProperty()`/`getZodTypeForParameter()`: every string-typed tool
  parameter is layered with `isUnsafePlainText` (script tags, `javascript:`/`data:` URLs, event-handler attributes),
  except parameters named `content`/`excerpt` (WordPress post/page/comment body text), which get the narrower
  `isUnsafeWordPressContent` so legitimate Gutenberg block markup isn't rejected. **Do not confuse
  `InputSanitizer.sanitizeHtml()` here with the differently-purposed `sanitizeHtml()` in
  `src/utils/validation/security.ts`** — the latter post-processes already-fetched WordPress content for read-side
  output (used by `PostHandlers.ts`), not incoming tool-call arguments; the two are unrelated despite the identical
  name.
- `SecurityConfig.ts` — static security constants, `SecurityUtils`, `createSecureError`, `getEnvironmentSecurity`.
- `AISecurityScanner.ts` — AI-powered vulnerability detection.
- `AutomatedRemediation.ts` — automated fix generation for detected vulnerabilities.
- `SecurityReviewer.ts` — AI-powered security code review.
- `SecurityConfigManager.ts` — centralized security policy/configuration management.
- `SecurityMonitoring.ts` — real-time monitoring, threat detection, incident response.
- `SecurityCIPipeline.ts` — thin orchestrator composing `SecurityGateExecutor` + `SecurityReportGenerator` +
  `SecurityTypes`. **New gate logic belongs in `SecurityGateExecutor.ts`, not the pipeline.**
- `SecurityReportGenerator.ts` — report/statistics generation.
- `SecurityTypes.ts` — shared types (`SecurityGate`, etc.) for the CI/CD pipeline.

## Work Guidance

Route all new MCP tool input validation through `InputValidator.ts`. Extend the CI security pipeline via
`SecurityGateExecutor.ts`, not `SecurityCIPipeline.ts`.

## Verification

```bash
npm run build && npx vitest run tests/security/
npm run security:scan
```

## Child DOX Index

None.
