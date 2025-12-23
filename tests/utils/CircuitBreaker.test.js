/**
 * Circuit Breaker Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitState,
  CircuitBreakerOpenError,
  CircuitBreakerTimeoutError,
  createWordPressCircuitBreaker,
} from "../../src/utils/CircuitBreaker.js";

describe("CircuitBreaker", () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: "test-breaker",
      failureThreshold: 3,
      resetTimeout: 1000,
      successThreshold: 2,
      failureWindow: 5000,
      timeout: 100,
    });
  });

  afterEach(() => {
    CircuitBreakerRegistry.getInstance().clear();
  });

  describe("Initial State", () => {
    it("should start in CLOSED state", () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it("should be available when closed", () => {
      expect(breaker.isAvailable()).toBe(true);
    });

    it("should have zero stats initially", () => {
      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.rejectedRequests).toBe(0);
    });
  });

  describe("Successful Operations", () => {
    it("should execute successful operations", async () => {
      const result = await breaker.execute(() => Promise.resolve("success"));
      expect(result).toBe("success");
    });

    it("should track successful requests", async () => {
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker.execute(() => Promise.resolve("ok"));

      const stats = breaker.getStats();
      expect(stats.successfulRequests).toBe(2);
      expect(stats.totalRequests).toBe(2);
    });

    it("should remain closed after successful operations", async () => {
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker.execute(() => Promise.resolve("ok"));

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe("Failure Handling", () => {
    it("should propagate errors from operations", async () => {
      const error = new Error("Operation failed");

      await expect(breaker.execute(() => Promise.reject(error))).rejects.toThrow("Operation failed");
    });

    it("should track failed requests", async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")));
      } catch (_e) {
        // Expected error - we're testing failure tracking
      }

      const stats = breaker.getStats();
      expect(stats.failedRequests).toBe(1);
    });

    it("should open circuit after threshold failures", async () => {
      // Cause 3 failures (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error - triggering circuit open
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it("should reject requests when circuit is open", async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error - opening circuit
        }
      }

      // Next request should be rejected
      await expect(breaker.execute(() => Promise.resolve("ok"))).rejects.toThrow(CircuitBreakerOpenError);
    });

    it("should track rejected requests", async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error - opening circuit
        }
      }

      // Try to make requests
      try {
        await breaker.execute(() => Promise.resolve("ok"));
      } catch (_e) {
        // Expected rejection
      }
      try {
        await breaker.execute(() => Promise.resolve("ok"));
      } catch (_e) {
        // Expected rejection
      }

      const stats = breaker.getStats();
      expect(stats.rejectedRequests).toBe(2);
    });
  });

  describe("Circuit Recovery", () => {
    it("should transition to HALF_OPEN after reset timeout", async () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error - opening circuit
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Advance time past reset timeout
      vi.advanceTimersByTime(1100);

      // Check state (this should trigger transition)
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      vi.useRealTimers();
    });

    it("should close circuit after success threshold in half-open", async () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error - opening circuit
        }
      }

      // Wait for half-open
      vi.advanceTimersByTime(1100);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      vi.useRealTimers();

      // Successful requests should close circuit
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker.execute(() => Promise.resolve("ok"));

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it("should reopen circuit on failure in half-open state", async () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error - opening circuit
        }
      }

      // Wait for half-open
      vi.advanceTimersByTime(1100);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      vi.useRealTimers();

      // Failure should reopen circuit
      try {
        await breaker.execute(() => Promise.reject(new Error("fail again")));
      } catch (_e) {
        // Expected error - reopening circuit
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout slow operations", async () => {
      await expect(breaker.execute(() => new Promise((resolve) => setTimeout(resolve, 200)))).rejects.toThrow(
        CircuitBreakerTimeoutError,
      );
    });

    it("should include circuit name in timeout error", async () => {
      try {
        await breaker.execute(() => new Promise((resolve) => setTimeout(resolve, 200)));
      } catch (error) {
        expect(error.circuitName).toBe("test-breaker");
        expect(error.timeout).toBe(100);
      }
    });
  });

  describe("Failure Window", () => {
    it("should not count old failures outside window", async () => {
      vi.useFakeTimers();

      // Cause 2 failures
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")));
      } catch (_e) {
        // Expected error
      }
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")));
      } catch (_e) {
        // Expected error
      }

      // Advance time past failure window
      vi.advanceTimersByTime(6000);

      // One more failure shouldn't open circuit (old failures expired)
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")));
      } catch (_e) {
        // Expected error
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      vi.useRealTimers();
    });
  });

  describe("Force State Changes", () => {
    it("should force open circuit", () => {
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it("should force close circuit", async () => {
      // Open circuit first
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error
        }
      }

      breaker.forceClose();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it("should reset all statistics", async () => {
      await breaker.execute(() => Promise.resolve("ok"));
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")));
      } catch (_e) {
        // Expected error
      }

      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.state).toBe(CircuitState.CLOSED);
    });
  });

  describe("Callbacks", () => {
    it("should call onOpen when circuit opens", async () => {
      const onOpen = vi.fn();
      const callbackBreaker = new CircuitBreaker({
        name: "callback-test",
        failureThreshold: 2,
        onOpen,
      });

      for (let i = 0; i < 2; i++) {
        try {
          await callbackBreaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error
        }
      }

      expect(onOpen).toHaveBeenCalledWith("callback-test", 2);
    });

    it("should call onClose when circuit closes", async () => {
      vi.useFakeTimers();

      const onClose = vi.fn();
      const callbackBreaker = new CircuitBreaker({
        name: "callback-test",
        failureThreshold: 2,
        resetTimeout: 100,
        successThreshold: 1,
        onClose,
      });

      // Open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await callbackBreaker.execute(() => Promise.reject(new Error("fail")));
        } catch (_e) {
          // Expected error
        }
      }

      // Wait for half-open
      vi.advanceTimersByTime(150);
      callbackBreaker.getState(); // Trigger transition

      vi.useRealTimers();

      // Close circuit
      await callbackBreaker.execute(() => Promise.resolve("ok"));

      expect(onClose).toHaveBeenCalledWith("callback-test");
    });
  });

  describe("Custom Failure Detection", () => {
    it("should use custom isFailure function", async () => {
      const customBreaker = new CircuitBreaker({
        name: "custom-failure",
        failureThreshold: 2,
        isFailure: (error) => error.message.includes("critical"),
      });

      // These shouldn't count as failures
      try {
        await customBreaker.execute(() => Promise.reject(new Error("minor issue")));
      } catch (_e) {
        // Expected error - but not counted as failure
      }
      try {
        await customBreaker.execute(() => Promise.reject(new Error("another issue")));
      } catch (_e) {
        // Expected error - but not counted as failure
      }

      expect(customBreaker.getState()).toBe(CircuitState.CLOSED);

      // These should count as failures
      try {
        await customBreaker.execute(() => Promise.reject(new Error("critical error")));
      } catch (_e) {
        // Expected error - counted as failure
      }
      try {
        await customBreaker.execute(() => Promise.reject(new Error("another critical")));
      } catch (_e) {
        // Expected error - counted as failure
      }

      expect(customBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });
});

describe("CircuitBreakerRegistry", () => {
  beforeEach(() => {
    CircuitBreakerRegistry.getInstance().clear();
  });

  it("should be a singleton", () => {
    const instance1 = CircuitBreakerRegistry.getInstance();
    const instance2 = CircuitBreakerRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should create and return circuit breakers", () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker = registry.getBreaker({ name: "test" });

    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it("should return same breaker for same name", () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker1 = registry.getBreaker({ name: "test" });
    const breaker2 = registry.getBreaker({ name: "test" });

    expect(breaker1).toBe(breaker2);
  });

  it("should get breaker by name", () => {
    const registry = CircuitBreakerRegistry.getInstance();
    registry.getBreaker({ name: "test" });

    const breaker = registry.get("test");
    expect(breaker).toBeDefined();
  });

  it("should return undefined for unknown breaker", () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker = registry.get("unknown");
    expect(breaker).toBeUndefined();
  });

  it("should get all stats", async () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker1 = registry.getBreaker({ name: "breaker1" });
    const breaker2 = registry.getBreaker({ name: "breaker2" });

    await breaker1.execute(() => Promise.resolve("ok"));
    await breaker2.execute(() => Promise.resolve("ok"));

    const allStats = registry.getAllStats();

    expect(allStats.breaker1).toBeDefined();
    expect(allStats.breaker2).toBeDefined();
    expect(allStats.breaker1.successfulRequests).toBe(1);
    expect(allStats.breaker2.successfulRequests).toBe(1);
  });

  it("should get health summary", async () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker1 = registry.getBreaker({ name: "breaker1", failureThreshold: 1 });
    registry.getBreaker({ name: "breaker2" });

    // Open breaker1
    try {
      await breaker1.execute(() => Promise.reject(new Error("fail")));
    } catch (_e) {
      // Expected error to open circuit
    }

    const health = registry.getHealthSummary();

    expect(health.total).toBe(2);
    expect(health.open).toBe(1);
    expect(health.closed).toBe(1);
    expect(health.healthy).toBe(false);
  });

  it("should reset all breakers", async () => {
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker1 = registry.getBreaker({ name: "breaker1" });
    const breaker2 = registry.getBreaker({ name: "breaker2" });

    await breaker1.execute(() => Promise.resolve("ok"));
    await breaker2.execute(() => Promise.resolve("ok"));

    registry.resetAll();

    expect(breaker1.getStats().totalRequests).toBe(0);
    expect(breaker2.getStats().totalRequests).toBe(0);
  });

  it("should remove breaker", () => {
    const registry = CircuitBreakerRegistry.getInstance();
    registry.getBreaker({ name: "test" });

    expect(registry.remove("test")).toBe(true);
    expect(registry.get("test")).toBeUndefined();
  });
});

describe("createWordPressCircuitBreaker", () => {
  beforeEach(() => {
    CircuitBreakerRegistry.getInstance().clear();
  });

  it("should create breaker with WordPress-specific settings", () => {
    const breaker = createWordPressCircuitBreaker("site1");

    expect(breaker).toBeInstanceOf(CircuitBreaker);
    expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
  });

  it("should not trip on 404 errors", async () => {
    const breaker = createWordPressCircuitBreaker("site1", {
      failureThreshold: 1,
    });

    try {
      await breaker.execute(() => Promise.reject(new Error("404 Not Found")));
    } catch (_e) {
      // Expected error - but should not trip circuit
    }

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it("should not trip on 401 errors", async () => {
    const breaker = createWordPressCircuitBreaker("site1", {
      failureThreshold: 1,
    });

    try {
      await breaker.execute(() => Promise.reject(new Error("401 Unauthorized")));
    } catch (_e) {
      // Expected error - but should not trip circuit
    }

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it("should trip on 429 rate limit errors", async () => {
    const breaker = createWordPressCircuitBreaker("site1", {
      failureThreshold: 1,
    });

    try {
      await breaker.execute(() => Promise.reject(new Error("429 Too Many Requests")));
    } catch (_e) {
      // Expected error - should trip circuit
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it("should trip on 500 server errors", async () => {
    const breaker = createWordPressCircuitBreaker("site1", {
      failureThreshold: 1,
    });

    try {
      await breaker.execute(() => Promise.reject(new Error("500 Internal Server Error")));
    } catch (_e) {
      // Expected error - should trip circuit
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it("should trip on network errors", async () => {
    const breaker = createWordPressCircuitBreaker("site1", {
      failureThreshold: 1,
    });

    try {
      await breaker.execute(() => Promise.reject(new Error("ECONNREFUSED")));
    } catch (_e) {
      // Expected error - should trip circuit
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});
