/**
 * Performance history was always empty in production.
 *
 * Snapshots were filtered by `system.uptime` as if it were a timestamp, but uptime is a duration (ms since the server
 * started, ~3.6e6 after an hour) and the cut-offs are epoch times (~1.8e12). So `getHistoricalData(start)` matched
 * nothing, and `cleanupOldData()` / `PerformanceAnalytics.addDataPoint()` deleted every snapshot as soon as it was
 * stored — wp_performance_history had no data points, and trends/anomalies never saw the 5 samples they need.
 * Snapshots were also shallow copies, so each one shared the live `requests` counters.
 */
import { vi } from "vitest";
import { PerformanceMonitor } from "../../dist/performance/PerformanceMonitor.js";
import { MetricsCollector } from "../../dist/performance/MetricsCollector.js";
import { PerformanceAnalytics } from "../../dist/performance/PerformanceAnalytics.js";
import { processHistoricalDataForChart } from "../../dist/tools/performance/PerformanceHelpers.js";
import PerformanceTools from "../../dist/tools/performance/PerformanceTools.js";

const HOUR = 60 * 60 * 1000;
const START = new Date("2026-10-09T08:00:00Z").getTime();

describe("performance history window", () => {
  let monitor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    monitor = new PerformanceMonitor({ enableHistoricalData: true, retentionPeriod: 24 * HOUR });
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  it("stamps every metrics read with the time it was taken", () => {
    expect(monitor.getMetrics().timestamp).toBe(START);
  });

  it("returns a snapshot that later requests do not change", () => {
    const before = monitor.getMetrics();
    monitor.recordRequest(100, true);
    monitor.recordRequest(100, true);

    expect(before.requests.total).toBe(0);
    expect(monitor.getMetrics().requests.total).toBe(2);
  });

  it("selects snapshots by when they were taken", () => {
    monitor.recordSnapshot(); // 08:00
    vi.setSystemTime(START + 2 * HOUR);
    monitor.recordRequest(100, true);
    monitor.recordSnapshot(); // 10:00

    const lastHour = monitor.getHistoricalData(Date.now() - HOUR);

    expect(lastHour).toHaveLength(1);
    expect(lastHour[0].timestamp).toBe(START + 2 * HOUR);
    expect(lastHour[0].requests.total).toBe(1);
    expect(monitor.getHistoricalData()).toHaveLength(2);
  });

  it("keeps snapshots for the retention period and drops older ones", () => {
    monitor.recordSnapshot(); // 08:00
    vi.setSystemTime(START + 23 * HOUR);
    monitor.recordSnapshot();
    expect(monitor.getHistoricalData()).toHaveLength(2);

    vi.setSystemTime(START + 25 * HOUR);
    monitor.recordSnapshot();
    expect(monitor.getHistoricalData().map((s) => s.timestamp)).toEqual([START + 23 * HOUR, START + 25 * HOUR]);
  });

  it("charts snapshots by their timestamp, not by uptime", () => {
    monitor.recordSnapshot();
    const chart = processHistoricalDataForChart(monitor.getHistoricalData(), ["requestVolume"]);

    expect(chart.requestVolume[0].timestamp).toBe(START);
  });
});

describe("PerformanceAnalytics data points", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps points inside the lookback period, so trend analysis gets its 5 samples", () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const monitor = new PerformanceMonitor({ enableHistoricalData: true });
    const analytics = new PerformanceAnalytics(new MetricsCollector(monitor), { lookbackPeriod: 24 * HOUR });

    for (let i = 0; i < 6; i++) {
      vi.setSystemTime(START + i * 60_000);
      for (let r = 0; r < 5; r++) monitor.recordRequest(100 + i * 200, true); // response time climbs
      analytics.addDataPoint(monitor.getMetrics());
    }

    const trends = analytics.analyzeTrends();
    expect(trends.length).toBeGreaterThan(0);
    expect(trends.find((t) => t.metric === "responseTime")).toBeDefined();
    monitor.stop();
  });
});

// With history actually collected, code paths that never ran before became live. These pin their behaviour on real data.
describe("history once it accumulates", () => {
  let monitor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    monitor = new PerformanceMonitor({ enableHistoricalData: true, retentionPeriod: 24 * HOUR });
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  it("is filled by the collection timer", () => {
    monitor.startCollection(); // not started automatically in the test environment
    vi.advanceTimersByTime(30_000 * 3);
    expect(monitor.getHistoricalData()).toHaveLength(3);
  });

  // Nothing that reads history uses the per-tool maps; storing them made every snapshot several KB.
  it("stores snapshots without the per-tool maps", () => {
    monitor.recordToolCall("wp_list_posts", 120, true);
    monitor.recordSnapshot();
    const [snapshot] = monitor.getHistoricalData();
    expect(snapshot.tools).toBeUndefined();
    expect(snapshot.requests).toBeDefined();
    expect(monitor.getMetrics().tools.toolUsageCount.wp_list_posts).toBe(1); // live metrics keep them
  });
});

describe("history tool output size", () => {
  let tools;
  const run = (name, params = {}) =>
    tools
      .getTools()
      .find((t) => t.name === name)
      .handler({}, params);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    tools = new PerformanceTools();
    // A day of snapshots at the default 30 s interval.
    for (let i = 0; i < 2880; i++) {
      vi.setSystemTime(START + i * 30_000);
      tools.monitor.recordRequest(100 + (i % 50), true);
      tools.monitor.recordSnapshot();
    }
  });

  afterEach(() => {
    tools.monitor.stop();
    vi.useRealTimers();
  });

  it("wp_performance_history charts at most 100 points per metric", async () => {
    const { data } = await run("wp_performance_history", { timeframe: "24h", includeTrends: false });

    expect(data.dataPoints).toBe(2880);
    for (const series of Object.values(data.historicalData)) {
      expect(series.length).toBeLessThanOrEqual(100);
      expect(series.at(-1).timestamp).toBe(START + 2879 * 30_000); // the newest snapshot is always kept
    }
  });

  it("wp_performance_export samples history instead of returning every snapshot", async () => {
    const result = await run("wp_performance_export", { format: "json", timeRange: "24h" });

    expect(result.data.historicalData.length).toBeLessThanOrEqual(100);
    expect(result.data.historicalDataPoints).toBe(2880);
    expect(JSON.stringify(result).length).toBeLessThan(250_000);
  });
});

describe("anomaly detection on real history", () => {
  let analytics;
  let monitor;
  const point = ({ rt = 320, total = 100, failed = 0, hitRate = 0.9 } = {}) => ({
    timestamp: Date.now(),
    requests: { averageResponseTime: rt, total, failed, requestsPerSecond: 1 },
    cache: { hitRate },
    system: { memoryUsage: 10 },
  });
  const baseline = (n = 10, values = {}) => {
    for (let i = 0; i < n; i++) {
      vi.setSystemTime(START + i * 30_000);
      analytics.addDataPoint(point(values));
    }
    vi.setSystemTime(START + n * 30_000);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    monitor = new PerformanceMonitor({ enableHistoricalData: true });
    analytics = new PerformanceAnalytics(new MetricsCollector(monitor), { lookbackPeriod: 24 * HOUR });
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  // Each point used to be part of its own baseline, and a flat baseline has zero spread: 320 → 321 ms scored z = 3.
  it("does not flag a negligible change after a flat baseline", () => {
    baseline();
    analytics.addDataPoint(point({ rt: 321 }));
    analytics.addDataPoint(point({ total: 101, failed: 1 }));
    expect(analytics.getAnomalies()).toEqual([]);
  });

  it("flags a real spike with a finite deviation", () => {
    baseline();
    analytics.addDataPoint(point({ rt: 2000 }));

    const [anomaly] = analytics.getAnomalies();
    expect(anomaly).toMatchObject({ metric: "responseTime", actualValue: 2000, expectedValue: 320 });
    expect(Number.isFinite(anomaly.deviation)).toBe(true);
  });

  it("gives a finite deviation when the baseline is zero", () => {
    baseline(10, { total: 100, failed: 0 });
    analytics.addDataPoint(point({ total: 100, failed: 50 }));

    const errorAnomaly = analytics.getAnomalies().find((a) => a.metric === "errorRate");
    expect(errorAnomaly).toBeDefined();
    expect(Number.isFinite(errorAnomaly.deviation)).toBe(true);
  });

  it("forgets anomalies older than the lookback period", () => {
    baseline();
    analytics.addDataPoint(point({ rt: 2000 }));
    expect(analytics.getAnomalies()).toHaveLength(1);

    vi.setSystemTime(START + 25 * HOUR);
    expect(analytics.getAnomalies()).toEqual([]);
  });
});

describe("trend analysis on real history", () => {
  let analytics;
  let monitor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    monitor = new PerformanceMonitor({ enableHistoricalData: true });
    analytics = new PerformanceAnalytics(new MetricsCollector(monitor), {
      lookbackPeriod: 24 * HOUR,
      enableAnomalyDetection: false,
    });
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  const add = (rt, rps = 1) =>
    analytics.addDataPoint({
      timestamp: Date.now(),
      requests: { averageResponseTime: rt, total: 10, failed: 0, requestsPerSecond: rps },
      cache: { hitRate: 0.9 },
      system: { memoryUsage: 10 },
    });

  it("reports a flat series as stable with finite numbers", () => {
    for (let i = 0; i < 6; i++) add(300);

    for (const trend of analytics.analyzeTrends()) {
      expect(Number.isFinite(trend.confidence), trend.metric).toBe(true);
      expect(Number.isFinite(trend.changeRate), trend.metric).toBe(true);
      expect(trend.direction).toBe("stable");
    }
  });

  // A previous value of 0 divided by zero: the insight read "declining at Infinity% rate".
  it("keeps the change rate finite when the previous value is zero", () => {
    for (let i = 0; i < 5; i++) add(i * 100, 0);
    add(600, 5);

    for (const trend of analytics.analyzeTrends()) {
      expect(Number.isFinite(trend.changeRate), trend.metric).toBe(true);
    }
    expect(JSON.stringify(analytics.generateInsights())).not.toMatch(/Infinity|NaN/);
  });
});
