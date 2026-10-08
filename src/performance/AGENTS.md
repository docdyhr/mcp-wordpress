# src/performance/

## Purpose

Performance metrics collection, monitoring/alerting, and analytics for the MCP server.

## Ownership

Owns `src/performance/`.

## Local Contracts

Layered, not duplicative:

- `PerformanceMonitor.ts` — the metrics store/engine: `PerformanceMetrics` shape (requests, cache, system, p50/p95/p99
  percentiles), `recordRequest()`, `recordToolCall()`, `getMetrics()`, `getAlerts()`, `updateCacheMetrics()`. Keep three
  things apart: HTTP requests (`recordRequest`, fed by the client interceptor), MCP tool calls (`recordToolCall`, fed by
  `ToolRegistry` via `MetricsCollector.start/endToolExecution` — never counted as requests), and expected 4xx responses
  (`requests.clientErrors`, excluded from `failed` and the error rate). `system.memoryUsage` is heap used vs the V8 heap
  limit, not heapUsed/heapTotal (which reads ~100% when healthy).
- `MetricsCollector.ts` — thin real-time collection hub wrapping a constructor-injected `PerformanceMonitor` instance;
  most methods delegate straight to `this.monitor.*`. Adds tool-execution tracking, request interception hooks, and
  system-metrics collection config.
- `PerformanceAnalytics.ts` — trend analysis, anomaly detection, predictive insights, benchmark comparisons, built on
  top of both.

New metrics belong in `PerformanceMonitor`; new collection hooks belong in `MetricsCollector`; new analysis belongs in
`PerformanceAnalytics`.

## Work Guidance

None beyond the layering above.

## Verification

```bash
npm run build && npx vitest run tests/performance/
```

## Child DOX Index

None.
