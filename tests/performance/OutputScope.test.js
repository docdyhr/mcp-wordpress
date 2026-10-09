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

  it("formattedMessage shows the actual value to at most two decimals", () => {
    const text = formatAlertMessage({
      severity: "warning",
      message: "High response time: 2096ms",
      metric: "averageResponseTime",
      actualValue: 2096.285714285714,
      threshold: 2000,
    });

    expect(text).toBe("WARNING: High response time: 2096ms (averageResponseTime: 2096.29 vs threshold: 2000)");
    expect(
      formatAlertMessage({
        severity: "error",
        message: "m",
        metric: "errorRate",
        actualValue: 0.0213,
        threshold: 0.05,
      }),
    ).toBe("ERROR: m (errorRate: 0.02 vs threshold: 0.05)");
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
  });

  it("wp_performance_history labels its averages as a window over snapshots", async () => {
    const { data } = await run("wp_performance_history", { timeframe: "1h", includeTrends: false });

    expect(data.summary.scope).toMatch(/1h/);
    expect(data.summary.scope).toMatch(/all sites combined/);
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

    expect(data.cache_stats.hit_rate).toBe("17%");
    expect(data.cache_stats.scope).toMatch(/this site only/);
  });

  it("wp_cache_info says the current stats cover this site only", async () => {
    const result = await cacheTools.handleGetCacheInfo(cachedClient(), {});
    const data = result.data ?? result;

    expect(data.current_stats.scope).toMatch(/this site only/);
  });
});
