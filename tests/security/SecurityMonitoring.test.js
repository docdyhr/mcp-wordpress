/**
 * Tests for SecurityMonitor class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SecurityMonitor } from "@/security/SecurityMonitoring.js";

function makeEventData(overrides = {}) {
  return {
    type: "authentication",
    severity: "low",
    source: "test-source",
    description: "Test event",
    riskScore: 1,
    details: {},
    ...overrides,
  };
}

describe("SecurityMonitor", () => {
  let monitor;

  beforeEach(() => {
    monitor = new SecurityMonitor();
  });

  afterEach(() => {
    if (monitor) {
      // stop if running to clear intervals
      try {
        monitor.stop();
      } catch {
        // ignore if already stopped
      }
    }
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("creates instance without errors", () => {
      expect(monitor).toBeInstanceOf(SecurityMonitor);
    });

    it("starts not monitoring", () => {
      expect(monitor.getStatus().monitoring).toBe(false);
    });

    it("has no events initially", () => {
      expect(monitor.getEvents()).toHaveLength(0);
    });

    it("has no alerts initially", () => {
      expect(monitor.getAlerts()).toHaveLength(0);
    });

    it("has no metrics initially", () => {
      expect(monitor.getMetrics()).toHaveLength(0);
    });
  });

  describe("start / stop", () => {
    it("sets monitoring to true on start", () => {
      monitor.start();
      expect(monitor.getStatus().monitoring).toBe(true);
      monitor.stop();
    });

    it("emits monitoring-started event", () => {
      const handler = vi.fn();
      monitor.on("monitoring-started", handler);
      monitor.start();
      expect(handler).toHaveBeenCalledOnce();
      monitor.stop();
    });

    it("logs warning if already monitoring", () => {
      monitor.start();
      // Second start should not throw, just warn
      expect(() => monitor.start()).not.toThrow();
      monitor.stop();
    });

    it("sets monitoring to false on stop", () => {
      monitor.start();
      monitor.stop();
      expect(monitor.getStatus().monitoring).toBe(false);
    });

    it("emits monitoring-stopped event", () => {
      const handler = vi.fn();
      monitor.on("monitoring-stopped", handler);
      monitor.start();
      monitor.stop();
      expect(handler).toHaveBeenCalledOnce();
    });

    it("logs warning if not monitoring on stop", () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe("logSecurityEvent", () => {
    it("logs a basic event and returns it", async () => {
      const event = await monitor.logSecurityEvent(makeEventData());
      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.handled).toBeDefined();
      expect(event.actions).toBeDefined();
    });

    it("stores event in events list", async () => {
      await monitor.logSecurityEvent(makeEventData());
      expect(monitor.getEvents()).toHaveLength(1);
    });

    it("emits security-event for each logged event", async () => {
      const handler = vi.fn();
      monitor.on("security-event", handler);
      await monitor.logSecurityEvent(makeEventData());
      expect(handler).toHaveBeenCalledOnce();
    });

    it("creates alert for critical events", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "critical", type: "authentication", riskScore: 9 }));
      expect(monitor.getAlerts()).toHaveLength(1);
    });

    it("creates alert for high severity events with risk score > 7", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "high", riskScore: 8 }));
      expect(monitor.getAlerts()).toHaveLength(1);
    });

    it("does not create alert for high severity event with risk score <= 7", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "high", riskScore: 5 }));
      expect(monitor.getAlerts()).toHaveLength(0);
    });

    it("handles authentication events with userId for throttle check", async () => {
      for (let i = 0; i < 7; i++) {
        await monitor.logSecurityEvent(
          makeEventData({ type: "authentication", severity: "high", details: { userId: "user-throttle-test" } }),
        );
      }
      const events = monitor.getEvents({ type: "authentication" });
      expect(events.length).toBeGreaterThan(0);
    });

    it("handles event with ipAddress against threat intel", async () => {
      monitor.addThreatIntelligence({
        id: "threat-1",
        type: "ip",
        value: "1.2.3.4",
        confidence: 0.9,
        severity: "high",
        source: "test",
        description: "Known bad IP",
        indicators: [],
        lastSeen: new Date(),
      });

      const handler = vi.fn();
      monitor.on("ip-blocked", handler);

      await monitor.logSecurityEvent(
        makeEventData({ severity: "high", riskScore: 8, details: { ipAddress: "1.2.3.4" } }),
      );

      expect(handler).toHaveBeenCalled();
    });

    it("processes all event types without throwing", async () => {
      const types = ["authentication", "authorization", "input-validation", "data-access", "system", "anomaly"];
      for (const type of types) {
        await expect(monitor.logSecurityEvent(makeEventData({ type }))).resolves.toBeDefined();
      }
    });
  });

  describe("threat intelligence", () => {
    it("adds threat intelligence entry", () => {
      monitor.addThreatIntelligence({
        id: "ti-1",
        type: "ip",
        value: "10.0.0.1",
        confidence: 0.9,
        severity: "high",
        source: "test",
        description: "Bad actor",
        indicators: [],
        lastSeen: new Date(),
      });
      // No error thrown and value is stored
      expect(monitor.removeThreatIntelligence("10.0.0.1")).toBe(true);
    });

    it("removeThreatIntelligence returns false for unknown value", () => {
      expect(monitor.removeThreatIntelligence("9.9.9.9")).toBe(false);
    });
  });

  describe("updateAlertStatus", () => {
    it("returns false for unknown alert ID", () => {
      expect(monitor.updateAlertStatus("nonexistent-id", "resolved")).toBe(false);
    });

    it("returns true and updates status for existing alert", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "critical", riskScore: 9 }));
      const alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(1);

      const result = monitor.updateAlertStatus(alerts[0].id, "investigating");
      expect(result).toBe(true);
      expect(monitor.getAlerts()[0].status).toBe("investigating");
    });

    it("sets resolution when status is resolved", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "critical", riskScore: 9 }));
      const alerts = monitor.getAlerts();
      monitor.updateAlertStatus(alerts[0].id, "resolved");
      expect(monitor.getAlerts()[0].resolution).toBeDefined();
      expect(monitor.getAlerts()[0].resolution?.action).toBe("manual-resolution");
    });

    it("sets assignee when provided", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "critical", riskScore: 9 }));
      const alerts = monitor.getAlerts();
      monitor.updateAlertStatus(alerts[0].id, "investigating", "admin");
      expect(monitor.getAlerts()[0].assignee).toBe("admin");
    });

    it("emits alert-updated event", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "critical", riskScore: 9 }));
      const handler = vi.fn();
      monitor.on("alert-updated", handler);
      const alerts = monitor.getAlerts();
      monitor.updateAlertStatus(alerts[0].id, "resolved");
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("getEvents", () => {
    it("returns all events with no options", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "low" }));
      await monitor.logSecurityEvent(makeEventData({ severity: "high" }));
      expect(monitor.getEvents()).toHaveLength(2);
    });

    it("filters by severity", async () => {
      await monitor.logSecurityEvent(makeEventData({ severity: "low" }));
      await monitor.logSecurityEvent(makeEventData({ severity: "high", riskScore: 5 }));
      expect(monitor.getEvents({ severity: "low" })).toHaveLength(1);
    });

    it("filters by type", async () => {
      await monitor.logSecurityEvent(makeEventData({ type: "authentication" }));
      await monitor.logSecurityEvent(makeEventData({ type: "system" }));
      expect(monitor.getEvents({ type: "system" })).toHaveLength(1);
    });

    it("filters by since date", async () => {
      await monitor.logSecurityEvent(makeEventData());
      const since = new Date(Date.now() + 1000); // future
      expect(monitor.getEvents({ since })).toHaveLength(0);
    });

    it("applies limit", async () => {
      for (let i = 0; i < 5; i++) {
        await monitor.logSecurityEvent(makeEventData());
      }
      expect(monitor.getEvents({ limit: 2 })).toHaveLength(2);
    });

    it("applies offset", async () => {
      for (let i = 0; i < 5; i++) {
        await monitor.logSecurityEvent(makeEventData());
      }
      expect(monitor.getEvents({ offset: 3 })).toHaveLength(2);
    });
  });

  describe("getAlerts", () => {
    async function createAlert() {
      await monitor.logSecurityEvent(makeEventData({ severity: "critical", riskScore: 9 }));
    }

    it("returns all alerts with no options", async () => {
      await createAlert();
      await createAlert();
      expect(monitor.getAlerts()).toHaveLength(2);
    });

    it("filters by severity", async () => {
      await createAlert();
      expect(monitor.getAlerts({ severity: "critical" })).toHaveLength(1);
      expect(monitor.getAlerts({ severity: "low" })).toHaveLength(0);
    });

    it("filters by status", async () => {
      await createAlert();
      const alerts = monitor.getAlerts();
      monitor.updateAlertStatus(alerts[0].id, "resolved");
      expect(monitor.getAlerts({ status: "resolved" })).toHaveLength(1);
      expect(monitor.getAlerts({ status: "new" })).toHaveLength(0);
    });

    it("filters by since date", async () => {
      await createAlert();
      const since = new Date(Date.now() + 1000);
      expect(monitor.getAlerts({ since })).toHaveLength(0);
    });

    it("applies limit", async () => {
      await createAlert();
      await createAlert();
      await createAlert();
      expect(monitor.getAlerts({ limit: 1 })).toHaveLength(1);
    });

    it("applies offset", async () => {
      await createAlert();
      await createAlert();
      expect(monitor.getAlerts({ offset: 1 })).toHaveLength(1);
    });
  });

  describe("getMetrics", () => {
    it("returns empty array initially", () => {
      expect(monitor.getMetrics()).toHaveLength(0);
    });

    it("filters by since date", () => {
      expect(monitor.getMetrics({ since: new Date() })).toHaveLength(0);
    });

    it("filters by until date", () => {
      expect(monitor.getMetrics({ until: new Date() })).toHaveLength(0);
    });
  });

  describe("getStatus", () => {
    it("returns initial healthy status", () => {
      const status = monitor.getStatus();
      expect(status.monitoring).toBe(false);
      expect(status.eventsToday).toBe(0);
      expect(status.alertsOpen).toBe(0);
      expect(status.threatsBlocked).toBe(0);
      expect(status.systemHealth).toBe("healthy");
    });

    it("shows correct eventsToday count", async () => {
      await monitor.logSecurityEvent(makeEventData());
      expect(monitor.getStatus().eventsToday).toBe(1);
    });

    it("returns degraded health with more than 5 open alerts", async () => {
      for (let i = 0; i < 7; i++) {
        await monitor.logSecurityEvent(makeEventData({ severity: "critical", riskScore: 9 }));
      }
      expect(monitor.getStatus().systemHealth).toBe("degraded");
    });

    it("returns critical health with more than 10 open alerts", async () => {
      for (let i = 0; i < 12; i++) {
        await monitor.logSecurityEvent(makeEventData({ severity: "critical", riskScore: 9 }));
      }
      expect(monitor.getStatus().systemHealth).toBe("critical");
    });
  });
});
