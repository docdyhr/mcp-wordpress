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
