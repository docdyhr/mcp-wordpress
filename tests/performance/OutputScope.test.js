/**
 * Performance output polish from the v4.0.9 re-test:
 *  - alert messages printed raw floats ("High response time: 2096.285714285714ms");
 *  - the cache hit rate differed across tools in the same minute (stats 6.3%, alerts 2%, site1 16.7%) because
 *    each figure has a different scope — all sites since start, the value when an alert was raised, one site —
 *    and nothing said which. Every place that reports a hit rate now labels its scope.
 */
import { vi } from "vitest";
import { evaluateAlertConditions, DEFAULT_ALERT_THRESHOLDS } from "../../dist/performance/PerformanceMonitor.js";
import PerformanceTools from "../../dist/tools/performance/PerformanceTools.js";
import { formatAlertMessage } from "../../dist/tools/performance/PerformanceHelpers.js";
import { CacheTools } from "../../dist/tools/cache.js";
import { CachedWordPressClient } from "../../dist/client/CachedWordPressClient.js";

const cacheStats = (hits, misses) => ({
  hits,
  misses,
  hitRate: hits / (hits + misses),
  totalSize: hits + misses,
  evictions: 0,
  expirations: 0,
});

describe("alert messages", () => {
  it("round the average response time to whole milliseconds", () => {
    const [condition] = evaluateAlertConditions(
      {
        requests: { total: 7, failed: 0, averageResponseTime: 2096.285714285714 },
        cache: { hitRate: 0.95, hits: 95, misses: 5 },
        system: { memoryUsage: 10 },
      },
      DEFAULT_ALERT_THRESHOLDS,
    );

    expect(condition.message).toBe("High response time: 2096ms");
    expect(condition.actualValue).toBe(2096.285714285714); // the raw value stays available
  });

  it("formattedMessage rounds without hiding a breach", () => {
    const alert = (metric, actualValue, threshold) =>
      formatAlertMessage({ severity: "warning", message: "m", metric, actualValue, threshold });

    expect(alert("averageResponseTime", 2096.285714285714, 2000)).toBe(
      "WARNING: m (averageResponseTime: 2096.29 vs threshold: 2000)",
    );
    // A rate keeps 3 significant digits: 1 error in 19 requests is 0.0526, not "0.05 vs threshold 0.05".
    expect(alert("errorRate", 1 / 19, 0.05)).toBe("WARNING: m (errorRate: 0.0526 vs threshold: 0.05)");
    // Where 3 digits would still equal the threshold, more are kept.
    expect(alert("cacheHitRate", 0.7996, 0.8)).toBe("WARNING: m (cacheHitRate: 0.7996 vs threshold: 0.8)");
  });
});

describe("cache hit rate scope labels", () => {
  let tools;
  const run = (name, params = {}) =>
    tools
      .getTools()
      .find((t) => t.name === name)
      .handler({}, params);

  beforeEach(() => {
    tools = new PerformanceTools();
    tools.collector.registerCacheManager("site1", { getStats: () => cacheStats(1, 5) });
    tools.collector.registerCacheManager("site2", { getStats: () => cacheStats(0, 10) });
  });

  afterEach(() => {
    tools.monitor.stop();
    vi.restoreAllMocks();
  });

  it("wp_performance_stats labels the cache section as all sites combined", async () => {
    const { data } = await run("wp_performance_stats", { category: "cache" });

    expect(data.cache.scope).toMatch(/all sites combined/);
    expect(data.cache.hitRate).toBe("6.3%"); // 1 hit of 16 lookups across both sites
  });

  it("wp_performance_stats labels the per-site block and formats its hit rate like the others", async () => {
    const { data } = await run("wp_performance_stats", { category: "cache", site: "site1" });

    expect(data.siteSpecific.scope).toMatch(/site1 only/);
    expect(data.siteSpecific.cache.hitRate).toBe("16.7%");
    expect(data.siteSpecific.cache.hits).toBe(1);
  });

  it("wp_performance_alerts says recorded messages are the value when the alert was raised", async () => {
    tools.monitor.addAlert("warning", "cache", "Low cache hit rate: 2%", "cacheHitRate", 0.8, 0.02);

    const { data } = await run("wp_performance_alerts", {});

    expect(data.scope.alerts).toMatch(/when (the|each) alert was raised/);
    expect(data.scope.alerts).toMatch(/all sites combined/);
    expect(data.scope.activeAlerts).toMatch(/now/);
    // Anomalies carry their own actualValue/expectedValue (a cacheHitRate anomaly is another hit-rate figure).
    expect(data.scope.anomalies).toMatch(/all sites combined/);
  });

  it("wp_performance_benchmark and wp_performance_optimize label their figures", async () => {
    const benchmark = await run("wp_performance_benchmark", {});
    expect(benchmark.data.metadata.scope).toMatch(/all sites combined/);

    const optimize = await run("wp_performance_optimize", {});
    expect(optimize.data.metadata.scope.recommendations).toMatch(/all sites combined/);
    // Predictions come from the analytics' history, not from the current metrics.
    expect(optimize.data.metadata.scope.predictions).toMatch(/24-hour history/);
  });

  it.each(["json", "csv", "summary"])(
    "wp_performance_export (%s) carries a scope map in its metadata",
    async (format) => {
      const result = await run("wp_performance_export", { format });

      expect(result.metadata.scope.currentMetrics).toMatch(/all sites combined/);
      expect(result.metadata.scope.siteComparison).toMatch(/each site/);
      expect(result.metadata.scope.historicalData).toMatch(/since the server started/);
      expect(result.metadata.scope.analytics).toMatch(/24-hour history/);
    },
  );

  it("wp_performance_export labels only the sections it includes", async () => {
    const result = await run("wp_performance_export", {
      format: "json",
      site: "site1",
      includeHistorical: false,
      includeAnalytics: false,
    });

    expect(Object.keys(result.metadata.scope).sort()).toEqual(["aggregatedStats", "currentMetrics"]);
  });

  it("wp_performance_history labels its averages as a window over snapshots", async () => {
    const { data } = await run("wp_performance_history", { timeframe: "1h", includeTrends: false });

    expect(data.scope.summary).toMatch(/the last 1h/);
    expect(data.scope.summary).toMatch(/all sites combined/);
    // The timeframe only selects snapshots; each snapshot's counters run from server start.
    expect(data.scope.summary).toMatch(/since the server started/);
    // Trends come from the analytics' own history, whatever the timeframe.
    expect(data.scope.trends).toMatch(/24-hour history/);
  });

  it.each([
    ["6h", "the last 6h"],
    ["7d", "history is kept for 24 hours; 7d was requested"],
    ["2h", '"2h" is not a supported timeframe'],
  ])("wp_performance_history describes the window it really covers for %s", async (timeframe, expected) => {
    const { data } = await run("wp_performance_history", { timeframe, includeTrends: false });
    expect(data.scope.summary).toContain(expected);
  });

  // Each snapshot's requests.total is cumulative, so summing them counted the same requests once per snapshot.
  it("wp_performance_history counts the requests made between the first and last snapshot", async () => {
    const snapshot = (total) => ({
      requests: { total, failed: 0, averageResponseTime: 100 },
      cache: { hitRate: 0.5 },
      system: { memoryUsage: 10, uptime: 0 },
    });
    vi.spyOn(tools.monitor, "getHistoricalData").mockReturnValue([snapshot(100), snapshot(150), snapshot(230)]);

    const { data } = await run("wp_performance_history", { timeframe: "1h", includeTrends: false });

    expect(data.dataPoints).toBe(3);
    expect(data.summary.totalRequests).toBe(130); // not 100 + 150 + 230
  });

  it("wp_performance_history reports zero requests with fewer than two snapshots", async () => {
    vi.spyOn(tools.monitor, "getHistoricalData").mockReturnValue([]);

    const { data } = await run("wp_performance_history", { timeframe: "1h", includeTrends: false });

    expect(data.summary.totalRequests).toBe(0);
  });
});

describe("wp_cache_stats / wp_cache_info scope", () => {
  const cacheTools = new CacheTools();

  function cachedClient() {
    const client = {
      getCacheStats: vi.fn().mockReturnValue({
        cache: cacheStats(1, 5),
        invalidation: { queueSize: 0, rulesCount: 3, processing: false },
      }),
    };
    Object.setPrototypeOf(client, CachedWordPressClient.prototype);
    return client;
  }

  it("wp_cache_stats says the figures cover this site only", async () => {
    const result = await cacheTools.handleGetCacheStats(cachedClient(), {});
    const data = result.data ?? result;

    expect(data.cache_stats.hit_rate).toBe("16.7%"); // same format as wp_performance_stats
    expect(data.cache_stats.scope).toMatch(/this site only/);
  });

  it("wp_cache_info says the current stats cover this site only", async () => {
    const result = await cacheTools.handleGetCacheInfo(cachedClient(), {});
    const data = result.data ?? result;

    expect(data.current_stats.scope).toMatch(/this site only/);
  });
});
