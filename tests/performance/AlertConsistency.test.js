/**
 * wp_performance_stats said overallHealth "Critical" while wp_performance_alerts said "System Healthy".
 *
 * Two independent models were the cause: the health label came from a score over current metrics, while the
 * alert status counted every alert ever recorded (alerts never expire) and needed more than two error alerts
 * before it said anything. These tests pin one shared rule set — alert conditions are evaluated against the
 * CURRENT metrics — and the invariants that follow from it.
 */
import v8 from "v8";
import { vi } from "vitest";
import {
  PerformanceMonitor,
  evaluateAlertConditions,
  DEFAULT_ALERT_THRESHOLDS,
} from "../../dist/performance/PerformanceMonitor.js";
import {
  calculateHealthStatus,
  calculateActiveAlertStatus,
  calculateAlertStatus,
  worseAlertStatus,
} from "../../dist/tools/performance/PerformanceHelpers.js";
import PerformanceTools from "../../dist/tools/performance/PerformanceTools.js";

const MB = 1024 * 1024;

function metrics({ avg = 200, total = 100, failed = 0, hitRate = 0.95, memory = 10 } = {}) {
  return {
    requests: { total, successful: total - failed, failed, clientErrors: 0, averageResponseTime: avg },
    cache: { hitRate, hits: Math.round(hitRate * 100), misses: 100 - Math.round(hitRate * 100) },
    system: { memoryUsage: memory },
  };
}

describe("evaluateAlertConditions", () => {
  const T = DEFAULT_ALERT_THRESHOLDS;

  it("is empty for healthy metrics", () => {
    expect(evaluateAlertConditions(metrics(), T)).toEqual([]);
  });

  it("flags a slow average response as a warning", () => {
    const [c] = evaluateAlertConditions(metrics({ avg: 2500 }), T);
    expect(c).toMatchObject({ metric: "averageResponseTime", severity: "warning", threshold: 2000, actualValue: 2500 });
  });

  it("flags a high error rate as an error and ignores a zero-request sample", () => {
    const [c] = evaluateAlertConditions(metrics({ total: 100, failed: 8 }), T);
    expect(c).toMatchObject({ metric: "errorRate", severity: "error" });
    expect(evaluateAlertConditions(metrics({ total: 0, failed: 0 }), T)).toEqual([]);
  });

  it("flags a low cache hit rate as a warning", () => {
    const [c] = evaluateAlertConditions(metrics({ hitRate: 0.25 }), T);
    expect(c).toMatchObject({ metric: "cacheHitRate", severity: "warning" });
  });

  // The memoryUsage threshold was configured (80) but never checked anywhere.
  it("flags high heap usage as a warning, and near-exhaustion as an error", () => {
    expect(evaluateAlertConditions(metrics({ memory: 79 }), T)).toEqual([]);
    expect(evaluateAlertConditions(metrics({ memory: 85 }), T)[0]).toMatchObject({
      metric: "memoryUsage",
      severity: "warning",
    });
    expect(evaluateAlertConditions(metrics({ memory: 97 }), T)[0]).toMatchObject({
      metric: "memoryUsage",
      severity: "error",
    });
  });

  // A hit rate with no lookups is undefined, not "0%": with caching disabled (or before the first lookup) the
  // stats showed a permanent "Low cache hit rate: 0%" warning and the health score lost 25 points for it.
  it("does not call a cache with no lookups a low hit rate", () => {
    const idle = { ...metrics(), cache: { hitRate: 0, hits: 0, misses: 0 } };
    expect(evaluateAlertConditions(idle, T)).toEqual([]);
    const missing = { ...metrics(), cache: { hitRate: 0, hits: 0, misses: 7 } };
    expect(evaluateAlertConditions(missing, T)[0]).toMatchObject({ metric: "cacheHitRate" });
  });

  it("honours custom thresholds", () => {
    expect(evaluateAlertConditions(metrics({ avg: 600 }), { ...T, responseTime: 500 })).toHaveLength(1);
  });
});

describe("PerformanceMonitor active alerts vs recorded history", () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enableRealTimeMonitoring: false });
  });

  afterEach(() => {
    monitor.stop();
    vi.restoreAllMocks();
  });

  it("reports only conditions that breach right now — a recovered error rate is no longer active", () => {
    for (let i = 0; i < 4; i++) monitor.recordRequest(100, false); // 100% failures -> error alert
    expect(monitor.getActiveAlerts().map((a) => a.metric)).toContain("errorRate");

    for (let i = 0; i < 200; i++) monitor.recordRequest(100, true); // recovers to ~2%

    expect(monitor.getActiveAlerts().map((a) => a.metric)).not.toContain("errorRate");
    // …while the history still remembers that it happened (alerts never expire by design).
    expect(monitor.getAlerts().some((a) => a.metric === "errorRate")).toBe(true);
  });

  it("does not count expected 4xx responses toward the error rate", () => {
    for (let i = 0; i < 20; i++) monitor.recordRequest(100, false, undefined, { clientError: true });

    expect(monitor.getActiveAlerts().map((a) => a.metric)).not.toContain("errorRate");
  });

  it("records a memory alert (previously never raised) using the same rule", () => {
    vi.spyOn(process, "memoryUsage").mockReturnValue({
      rss: 3000 * MB,
      heapTotal: 3400 * MB,
      heapUsed: 3300 * MB,
      external: 0,
      arrayBuffers: 0,
    });
    vi.spyOn(v8, "getHeapStatistics").mockReturnValue({ heap_size_limit: 4000 * MB });

    monitor.recordRequest(100, true);

    expect(monitor.getActiveAlerts()).toEqual(
      expect.arrayContaining([expect.objectContaining({ metric: "memoryUsage", severity: "warning" })]),
    );
    expect(monitor.getAlerts().some((a) => a.metric === "memoryUsage")).toBe(true);
  });
});

describe("calculateActiveAlertStatus", () => {
  it("uses the same words as the alerts tool", () => {
    expect(calculateActiveAlertStatus([])).toBe("System Healthy");
    expect(calculateActiveAlertStatus([{ severity: "warning" }])).toBe("Performance Warnings");
    expect(calculateActiveAlertStatus([{ severity: "warning" }, { severity: "error" }])).toBe("High Priority Issues");
    expect(calculateActiveAlertStatus([{ severity: "critical" }])).toBe("Critical Issues Detected");
    // sanity: these are exactly the strings calculateAlertStatus already produced
    const none = { total: 0, critical: 0, error: 0, warning: 0 };
    const noAnomalies = { critical: 0, major: 0, moderate: 0, minor: 0 };
    expect(calculateAlertStatus(none, noAnomalies)).toBe("System Healthy");
  });
});

describe("worseAlertStatus", () => {
  it("returns the more severe of two alert statuses", () => {
    expect(worseAlertStatus("System Healthy", "High Priority Issues")).toBe("High Priority Issues");
    expect(worseAlertStatus("Critical Issues Detected", "Performance Warnings")).toBe("Critical Issues Detected");
    expect(worseAlertStatus("Performance Warnings", "System Healthy")).toBe("Performance Warnings");
    expect(worseAlertStatus("System Healthy", "System Healthy")).toBe("System Healthy");
  });
});

describe("calculateHealthStatus with active alerts", () => {
  it("never reads better than the active alerts allow", () => {
    const healthy = metrics();
    expect(calculateHealthStatus(healthy)).toBe("Excellent");
    expect(calculateHealthStatus(healthy, [{ severity: "warning" }])).toBe("Good");
    expect(calculateHealthStatus(healthy, [{ severity: "error" }])).toBe("Fair");
  });

  it("does not penalise the health label for a cache that has had no lookups", () => {
    const idle = { ...metrics(), cache: { hitRate: 0, hits: 0, misses: 0 } };
    expect(calculateHealthStatus(idle)).toBe("Excellent");
    const missing = { ...metrics(), cache: { hitRate: 0, hits: 0, misses: 9 } };
    expect(["Good", "Fair", "Poor"]).toContain(calculateHealthStatus(missing));
  });

  it("does not raise a poor score because there are no alerts", () => {
    const poor = metrics({ avg: 2500, failed: 8, hitRate: 0.25, memory: 90 });
    expect(["Poor", "Critical"]).toContain(calculateHealthStatus(poor, []));
  });
});

describe("health and alerts never contradict each other (default thresholds)", () => {
  const T = DEFAULT_ALERT_THRESHOLDS;
  const ORDER = ["Critical", "Poor", "Fair", "Good", "Excellent"];

  const cases = [];
  for (const avg of [100, 1200, 2500]) {
    for (const failed of [0, 3, 8]) {
      for (const hitRate of [0.25, 0.75, 0.82, 0.99]) {
        for (const memory of [10, 82, 90, 97]) {
          cases.push(metrics({ avg, failed, hitRate, memory }));
        }
      }
    }
  }

  it("a Poor or Critical health always comes with at least one active alert", () => {
    for (const m of cases) {
      const conditions = evaluateAlertConditions(m, T);
      const health = calculateHealthStatus(m, conditions);
      if (health === "Poor" || health === "Critical") {
        expect(calculateActiveAlertStatus(conditions), JSON.stringify(m)).not.toBe("System Healthy");
      }
    }
  });

  it("an alert always caps the health label (warning: at most Good, error: at most Fair)", () => {
    for (const m of cases) {
      const conditions = evaluateAlertConditions(m, T);
      const health = ORDER.indexOf(calculateHealthStatus(m, conditions));
      if (conditions.some((c) => c.severity === "error")) expect(health, JSON.stringify(m)).toBeLessThanOrEqual(2);
      else if (conditions.length > 0) expect(health, JSON.stringify(m)).toBeLessThanOrEqual(3);
    }
  });
});

describe("wp_performance_stats / wp_performance_alerts tools", () => {
  let tools;
  const run = (name, params = {}) =>
    tools
      .getTools()
      .find((t) => t.name === name)
      .handler({}, params);

  beforeEach(() => {
    tools = new PerformanceTools();
  });

  afterEach(() => {
    tools.monitor.stop();
    vi.restoreAllMocks();
  });

  it("shows active alerts and a matching status next to the health label", async () => {
    for (let i = 0; i < 12; i++) tools.monitor.recordRequest(100, false); // 100% server errors

    const { data } = await run("wp_performance_stats", { category: "overview" });
    const o = data.overview;

    expect(o.activeAlerts.error).toBeGreaterThanOrEqual(1);
    expect(o.activeAlerts.conditions.join(" ")).toContain("High error rate");
    expect(o.alertStatus).toBe("High Priority Issues");
    expect(["Fair", "Poor", "Critical"]).toContain(o.overallHealth);

    // The alerts tool must agree. One recorded error alert alone used to read "System Healthy" there (it needed
    // more than two), which is the contradiction that was reported.
    const alerts = (await run("wp_performance_alerts", {})).data.summary;
    expect(alerts.currentStatus).toBe("High Priority Issues");
    expect(alerts.overallStatus).toBe("High Priority Issues");
  });

  it("reports System Healthy with no active alerts when metrics are fine", async () => {
    for (let i = 0; i < 12; i++) tools.monitor.recordRequest(100, true);
    tools.monitor.updateCacheMetrics({ hits: 95, misses: 5, hitRate: 0.95 });

    const { data } = await run("wp_performance_stats", { category: "overview" });

    expect(data.overview.activeAlerts.conditions).toEqual([]);
    expect(data.overview.alertStatus).toBe("System Healthy");
  });

  // wp_performance_alerts used to evaluate the monitor's last cached cache sample, so a freshly degraded cache
  // read "System Healthy" there while wp_performance_stats (which syncs first) already warned.
  it("syncs the registered cache managers before judging wp_performance_alerts", async () => {
    tools.collector.registerCacheManager("site1", {
      getStats: () => ({ hits: 1, misses: 9, hitRate: 0.1, totalSize: 10, evictions: 0, expirations: 0 }),
    });
    for (let i = 0; i < 12; i++) tools.monitor.recordRequest(100, true);

    const { data } = await run("wp_performance_alerts", {});

    expect(data.summary.currentStatus).toBe("Performance Warnings");
    expect(data.summary.activeAlerts.conditions.join(" ")).toContain("Low cache hit rate");
  });

  // overallStatus is documented as covering every alert recorded this session; filters and `limit` must only
  // shape the returned list, not erase history from the status.
  it("computes overallStatus from the unfiltered history, not from the filtered/limited list", async () => {
    tools.monitor.updateCacheMetrics({ hits: 95, misses: 5, hitRate: 0.95 });
    for (let i = 0; i < 12; i++) tools.monitor.recordRequest(100, true);
    for (const metric of ["m1", "m2", "m3"])
      tools.monitor.addAlert("error", "performance", `err ${metric}`, metric, 1, 2);
    for (const metric of ["w1", "w2"]) tools.monitor.addAlert("warning", "cache", `warn ${metric}`, metric, 1, 2);

    const filtered = (await run("wp_performance_alerts", { severity: "warning", limit: 1 })).data.summary;

    expect(filtered.alerts.error).toBe(0); // the returned list is filtered…
    expect(filtered.overallStatus).toBe("High Priority Issues"); // …the history status is not (3 errors > 2)
    expect(filtered.currentStatus).toBe("System Healthy");
  });

  it("gives wp_performance_alerts a currentStatus that ignores recovered history", async () => {
    for (let i = 0; i < 4; i++) tools.monitor.recordRequest(100, false);
    for (let i = 0; i < 300; i++) tools.monitor.recordRequest(100, true);
    tools.monitor.updateCacheMetrics({ hits: 95, misses: 5, hitRate: 0.95 });

    const { data } = await run("wp_performance_alerts", {});

    expect(data.summary.alerts.error).toBeGreaterThanOrEqual(1); // history remembers the spike
    expect(data.summary.currentStatus).toBe("System Healthy"); // …but nothing is wrong now
    expect(data.summary.activeAlerts.total).toBe(0);
  });
});
