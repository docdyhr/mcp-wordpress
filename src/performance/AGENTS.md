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
  (`requests.clientErrors`, excluded from `failed` and the error rate; 401, 408 and 429 still count as failures). A tool
  call that returns `success: false` / `status: "unavailable"` is recorded as failed. `system.memoryUsage` is heap used
  vs the V8 heap limit, not heapUsed/heapTotal (which reads ~100% when healthy). `recordToolCall()` also keeps the last
  50 calls in memory (`getRecentToolCalls()`: tool, site, status, duration and, for a failure, HTTP status, error code
  and error type — never error text or call parameters, which can quote the arguments), shown by
  `wp_performance_stats category=tools` — the diagnostics channel for the DXT, whose stderr the host does not capture.
- `MetricsCollector.ts` — thin real-time collection hub wrapping a constructor-injected `PerformanceMonitor` instance;
  most methods delegate straight to `this.monitor.*`. Adds tool-execution tracking, request interception hooks, and
  system-metrics collection config.
- `PerformanceAnalytics.ts` — trend analysis, anomaly detection, predictive insights, benchmark comparisons, built on
  top of both.
- Alert rules live in one pure function, `evaluateAlertConditions()` (`PerformanceMonitor.ts`). The monitor uses it to
  record alerts (a history that never expires) and `getActiveAlerts()` uses it for what breaches right now; the stats
  tool's `overallHealth` is capped by those active alerts and `alertStatus` is derived from them, so health and alerts
  cannot contradict each other. Do not add a second set of thresholds elsewhere. A cache with no lookups (hits and
  misses both 0) is neutral, not a 0% hit rate.
- Counters (requests, cache hits/misses) are totals since the server started, in the live metrics and in every history
  snapshot. A cache hit rate therefore has one of three scopes: all sites combined (`wp_performance_stats` overview and
  cache, benchmark, optimize, export, history), one site (`wp_cache_stats`, `wp_cache_info`, `siteSpecific`,
  `siteComparison`), or a recorded alert's message (the value when it was raised). Every performance and cache tool
  response that reports one says which, in a `scope` field or `metadata.scope`; keep that when adding output. A history
  summary must not sum cumulative counters across snapshots (it differences first and last). Alert messages and
  `formattedMessage` round their numbers; `actualValue` keeps the raw value.

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
