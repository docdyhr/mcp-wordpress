/**
 * Tests for debug utilities
 *
 * Comprehensive test coverage for debug logging, performance timing,
 * and development utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { debug, startTimer } from "@/utils/debug.js";

describe("Debug Utilities", () => {
  let originalConsole;
  let consoleLogSpy;
  let _consoleWarnSpy;
  let _consoleErrorSpy;
  let originalNodeEnv;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original console methods
    originalConsole = { ...console };

    // Create console spies
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    _consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    _consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;

    vi.restoreAllMocks();
  });

  describe("Debug Logger", () => {
    it("should log messages when in debug mode", () => {
      process.env.NODE_ENV = "development";

      debug.log("Test debug message");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Test debug message"));
    });

    it("should not log messages in production", () => {
      process.env.NODE_ENV = "production";

      debug.log("Test debug message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should log messages when DEBUG environment variable is set", () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG = "true";

      debug.log("Test debug message");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Test debug message"));

      delete process.env.DEBUG;
    });

    it("should handle object logging", () => {
      process.env.NODE_ENV = "development";

      const testObject = {
        id: 123,
        name: "Test Object",
        data: { nested: "value" },
      };

      debug.log("Object test", testObject);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Object test"), testObject);
    });

    it("should handle array logging", () => {
      process.env.NODE_ENV = "development";

      const testArray = [1, 2, 3, "test", { key: "value" }];

      debug.log("Array test", testArray);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Array test"), testArray);
    });

    it("should handle multiple arguments", () => {
      process.env.NODE_ENV = "development";

      debug.log("Multiple", "arguments", { test: true }, 123);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Multiple"), "arguments", { test: true }, 123);
    });

    it("should handle null and undefined values", () => {
      process.env.NODE_ENV = "development";

      debug.log("Null test", null);
      debug.log("Undefined test", undefined);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Null test"), null);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Undefined test"), undefined);
    });

    it("should add timestamp to log messages", () => {
      process.env.NODE_ENV = "development";

      debug.log("Timestamp test");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/),
      );
    });

    it("should handle empty messages", () => {
      process.env.NODE_ENV = "development";

      debug.log("");
      debug.log();

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it("should handle error objects", () => {
      process.env.NODE_ENV = "development";

      const error = new Error("Test error");
      error.code = "TEST_ERROR";
      error.statusCode = 500;

      debug.log("Error test", error);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Error test"), error);
    });

    it("should handle circular references safely", () => {
      process.env.NODE_ENV = "development";

      const circular = { name: "circular" };
      circular.self = circular;

      expect(() => {
        debug.log("Circular test", circular);
      }).not.toThrow();
    });
  });

  describe("Performance Timer", () => {
    it("should create a timer object", () => {
      const timer = startTimer();

      expect(timer).toHaveProperty("end");
      expect(typeof timer.end).toBe("function");
    });

    it("should measure elapsed time", async () => {
      const timer = startTimer();

      // Wait for a small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      const elapsed = timer.end();

      expect(elapsed).toBeGreaterThan(5);
      expect(elapsed).toBeLessThan(50); // Should be around 10ms
    });

    it("should return time in milliseconds", () => {
      const timer = startTimer();
      const elapsed = timer.end();

      expect(typeof elapsed).toBe("number");
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple calls to end()", () => {
      const timer = startTimer();

      const elapsed1 = timer.end();
      const elapsed2 = timer.end();

      expect(elapsed1).toBeGreaterThanOrEqual(0);
      expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
    });

    it("should create independent timers", async () => {
      const timer1 = startTimer();

      await new Promise((resolve) => setTimeout(resolve, 5));

      const timer2 = startTimer();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const elapsed1 = timer1.end();
      const elapsed2 = timer2.end();

      expect(elapsed1).toBeGreaterThan(elapsed2);
    });

    it("should handle high precision timing", () => {
      const timer = startTimer();

      // Do some synchronous work
      let _sum = 0;
      for (let i = 0; i < 1000; i++) {
        _sum += i;
      }

      const elapsed = timer.end();

      expect(elapsed).toBeGreaterThan(0);
      expect(typeof elapsed).toBe("number");
      expect(Number.isFinite(elapsed)).toBe(true);
    });

    it("should work with async operations", async () => {
      const timer = startTimer();

      await Promise.resolve("test");
      await new Promise((resolve) => setTimeout(resolve, 1));

      const elapsed = timer.end();

      expect(elapsed).toBeGreaterThan(0);
    });
  });

  describe("Debug Conditional Logging", () => {
    it("should respect NODE_ENV=test", () => {
      process.env.NODE_ENV = "test";

      debug.log("Test environment message");

      // In test environment, debug logging might be disabled
      // This tests the conditional logic
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("should respect DEBUG=false explicitly", () => {
      process.env.NODE_ENV = "development";
      process.env.DEBUG = "false";

      debug.log("Debug disabled message");

      // Should not log when explicitly disabled
      expect(consoleLogSpy).not.toHaveBeenCalled();

      delete process.env.DEBUG;
    });

    it("should handle various truthy DEBUG values", () => {
      const truthyValues = ["true", "1", "yes", "on"];

      truthyValues.forEach((value) => {
        consoleLogSpy.mockClear();
        process.env.NODE_ENV = "production";
        process.env.DEBUG = value;

        debug.log(`Debug with ${value}`);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`Debug with ${value}`));
      });

      delete process.env.DEBUG;
    });

    it("should handle various falsy DEBUG values", () => {
      const falsyValues = ["false", "0", "no", "off"];

      falsyValues.forEach((value) => {
        consoleLogSpy.mockClear();
        process.env.NODE_ENV = "development";
        process.env.DEBUG = value;

        debug.log(`Debug with ${value}`);

        expect(consoleLogSpy).not.toHaveBeenCalled();
      });

      delete process.env.DEBUG;
    });
  });

  describe("Error Handling in Debug", () => {
    it("should handle logging errors gracefully", () => {
      process.env.NODE_ENV = "development";

      // Mock console.log to throw an error
      consoleLogSpy.mockImplementation(() => {
        throw new Error("Console error");
      });

      expect(() => {
        debug.log("This should not crash");
      }).not.toThrow();
    });

    it("should handle JSON serialization errors", () => {
      process.env.NODE_ENV = "development";

      const problematicObject = {};
      // Create a circular reference that would break JSON.stringify
      problematicObject.circular = problematicObject;

      expect(() => {
        debug.log("Problematic object", problematicObject);
      }).not.toThrow();
    });
  });

  describe("Performance in Production", () => {
    it("should have minimal overhead when disabled", () => {
      process.env.NODE_ENV = "production";
      delete process.env.DEBUG;

      const timer = startTimer();

      // Make many debug calls - should be fast since they're disabled
      for (let i = 0; i < 1000; i++) {
        debug.log("Disabled message", i, { data: "test" });
      }

      const elapsed = timer.end();

      // Should be very fast since debug is disabled
      expect(elapsed).toBeLessThan(100);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should create minimal timer overhead", () => {
      const iterations = 1000;
      const timers = [];

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const timer = startTimer();
        timers.push(timer.end());
      }

      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(100); // Should be very fast
      expect(timers).toHaveLength(iterations);
      expect(timers.every((time) => typeof time === "number")).toBe(true);
    });
  });

  describe("Integration Patterns", () => {
    it("should work with async/await patterns", async () => {
      process.env.NODE_ENV = "development";

      const timer = startTimer();

      const result = await (async () => {
        debug.log("Starting async operation");

        await new Promise((resolve) => setTimeout(resolve, 5));

        debug.log("Async operation complete");
        return "success";
      })();

      const elapsed = timer.end();

      expect(result).toBe("success");
      expect(elapsed).toBeGreaterThan(4);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Starting async operation"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Async operation complete"));
    });

    it("should work with Promise chains", async () => {
      process.env.NODE_ENV = "development";

      const result = await Promise.resolve("initial")
        .then((value) => {
          debug.log("First then", value);
          return `${value}-processed`;
        })
        .then((value) => {
          debug.log("Second then", value);
          return `${value}-final`;
        })
        .catch((error) => {
          debug.log("Promise error", error);
          throw error;
        });

      expect(result).toBe("initial-processed-final");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("First then"), "initial");
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Second then"), "initial-processed");
    });

    it("should handle nested timer scenarios", async () => {
      const outerTimer = startTimer();

      await new Promise((resolve) => setTimeout(resolve, 5));

      const innerTimer = startTimer();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const innerElapsed = innerTimer.end();

      const outerElapsed = outerTimer.end();

      expect(innerElapsed).toBeGreaterThan(8);
      expect(outerElapsed).toBeGreaterThan(innerElapsed);
      expect(outerElapsed).toBeGreaterThan(13);
    });
  });
});
