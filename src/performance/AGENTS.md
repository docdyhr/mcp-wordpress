# src/performance/

## Purpose

Performance metrics collection, monitoring/alerting, and analytics for the MCP server.

## Ownership

Owns `src/performance/`.

## Local Contracts

Layered, not duplicative:

- `PerformanceMonitor.ts` — the metrics store/engine: `PerformanceMetrics` shape (requests, cache, system,
  p50/p95/p99 percentiles), `recordRequest()`, `getMetrics()`, `getAlerts()`, `updateCacheMetrics()`.
- `MetricsCollector.ts` — thin real-time collection hub wrapping a constructor-injected `PerformanceMonitor`
  instance; most methods delegate straight to `this.monitor.*`. Adds tool-execution tracking, request interception
  hooks, and system-metrics collection config.
- `PerformanceAnalytics.ts` — trend analysis, anomaly detection, predictive insights, benchmark comparisons, built on
  top of both.

New metrics belong in `PerformanceMonitor`; new collection hooks belong in `MetricsCollector`; new analysis belongs
in `PerformanceAnalytics`.

## Work Guidance

None beyond the layering above.

## Verification

```bash
npm run build && npx vitest run tests/performance/
```

## Child DOX Index

None.
