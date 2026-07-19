# src/security/

## Purpose

Input validation/sanitization for MCP tool calls, plus a self-contained AI-assisted security scanning, review,
remediation, and CI-gate pipeline for this codebase (not WordPress content).

## Ownership

Owns `src/security/` (12 files, barrel-exported via `index.ts`).

## Local Contracts

- `InputValidator.ts` — `InputSanitizer`, `SecuritySchemas`, `SecurityLimiter`, `ToolSchemas` — **the single
  sanitization surface every MCP tool input should route through.**
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
