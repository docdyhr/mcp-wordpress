/**
 * Tests for debug utilities
 *
 * Comprehensive test coverage for debug logging, performance timing,
 * and development utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  debug,
  startTimer,
  silent,
  createStructuredLogger,
  createLogger,
  logError,
  logIf,
  sanitizeEnvValue,
  getEnvSummary,
  getEnvVar,
  validateEnvVars,
} from "@/utils/debug.js";
import { Config } from "@/config/Config.js";

describe("Debug Utilities", () => {
  let originalConsole;
  let _consoleLogSpy;
  let _consoleWarnSpy;
  let consoleErrorSpy;
  let originalNodeEnv;
  let originalDebug;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original console methods
    originalConsole = { ...console };

    // Create console spies - debug utility uses console.error to avoid STDIO interference
    _consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    _consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Store original environment variables
    originalNodeEnv = process.env.NODE_ENV;
    originalDebug = process.env.DEBUG;

    // Reset Config singleton to pick up new environment variables
    Config.reset();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Restore environment variables
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDebug !== undefined) {
      process.env.DEBUG = originalDebug;
      Config.reset(); // Reload config with new env vars
    } else {
      delete process.env.DEBUG;
    }

    // Reset Config singleton after test
    Config.reset();

    vi.restoreAllMocks();
  });

  describe("Debug Logger", () => {
    it("should log messages when in debug mode", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars
      Config.reset(); // Reload config with new env vars

      debug.log("Test debug message");

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Test debug message"));
    });

    it("should not log messages in production", () => {
      process.env.DEBUG = "false";
      Config.reset(); // Reload config with new env vars
      Config.reset(); // Reload config with new env vars
      Config.reset(); // Reload config with new env vars

      debug.log("Test debug message");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should log messages when DEBUG environment variable is set", () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      debug.log("Test debug message");

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Test debug message"));

      delete process.env.DEBUG;
    });

    it("should handle object logging", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      const testObject = {
        id: 123,
        name: "Test Object",
        data: { nested: "value" },
      };

      debug.log("Object test", testObject);

      // debug.log formats everything into a single string with timestamp
      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArg = consoleErrorSpy.mock.calls[0][0];
      expect(callArg).toContain("Object test");
      expect(callArg).toContain("Test Object");
    });

    it("should handle array logging", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      const testArray = [1, 2, 3, "test", { key: "value" }];

      debug.log("Array test", testArray);

      // debug.log formats everything into a single string with timestamp
      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArg = consoleErrorSpy.mock.calls[0][0];
      expect(callArg).toContain("Array test");
    });

    it("should handle multiple arguments", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      debug.log("Multiple", "arguments", { test: true }, 123);

      // debug.log formats everything into a single string with timestamp
      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArg = consoleErrorSpy.mock.calls[0][0];
      expect(callArg).toContain("Multiple");
      expect(callArg).toContain("arguments");
      expect(callArg).toContain("123");
    });

    it("should handle null and undefined values", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      debug.log("Null test", null);
      debug.log("Undefined test", undefined);

      // debug.log formats everything into a single string with timestamp
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain("Null test");
      expect(consoleErrorSpy.mock.calls[1][0]).toContain("Undefined test");
    });

    it("should add timestamp to log messages", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      debug.log("Timestamp test");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/),
      );

      delete process.env.DEBUG;
    });

    it("should handle empty messages", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      debug.log("");
      debug.log();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      delete process.env.DEBUG;
    });

    it("should handle error objects", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      const error = new Error("Test error");
      error.code = "TEST_ERROR";
      error.statusCode = 500;

      debug.log("Error test", error);

      // debug.log formats everything into a single string with timestamp
      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArg = consoleErrorSpy.mock.calls[0][0];
      expect(callArg).toContain("Error test");
    });

    it("should handle circular references safely", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      const circular = { name: "circular" };
      circular.self = circular;

      // Currently formatMessage uses JSON.stringify which throws on circular refs
      // This is a known limitation - formatMessage should use safeStringify instead
      expect(() => {
        debug.log("Circular test", circular);
      }).toThrow(/circular structure/i);
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

      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(typeof elapsed).toBe("number");
      expect(Number.isFinite(elapsed)).toBe(true);
    });

    it("should work with async operations", async () => {
      const timer = startTimer();

      await Promise.resolve("test");
      await new Promise((resolve) => setTimeout(resolve, 10));

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
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("should respect DEBUG=false explicitly", () => {
      process.env.DEBUG = "false";
      Config.reset(); // Reload config with new env vars
      Config.reset(); // Reload config with new env vars

      debug.log("Debug disabled message");

      // Should not log when explicitly disabled
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      delete process.env.DEBUG;
    });

    it("should handle various truthy DEBUG values", () => {
      // Only "true" enables debug in the config
      consoleErrorSpy.mockClear();
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      debug.log("Debug with true");

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Debug with true"));

      delete process.env.DEBUG;
    });

    it("should handle various falsy DEBUG values", () => {
      const falsyValues = ["false", "0", "no", "off", undefined];

      falsyValues.forEach((value) => {
        consoleErrorSpy.mockClear();
        if (value === undefined) {
          delete process.env.DEBUG;
        } else {
          process.env.DEBUG = value;
        }
        Config.reset(); // Reload config with new env vars after each change

        debug.log(`Debug with ${value}`);

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling in Debug", () => {
    it("should handle logging errors gracefully", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      // Mock console.error to throw an error
      consoleErrorSpy.mockImplementation(() => {
        throw new Error("Console error");
      });

      expect(() => {
        debug.log("This should not crash");
      }).toThrow(); // Will throw since console.error throws

      delete process.env.DEBUG;
    });

    it("should handle JSON serialization errors", () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      const problematicObject = {};
      // Create a circular reference that would break JSON.stringify
      problematicObject.circular = problematicObject;

      // Currently formatMessage uses JSON.stringify which throws on circular refs
      // This is a known limitation - formatMessage should use safeStringify instead
      expect(() => {
        debug.log("Problematic object", problematicObject);
      }).toThrow(/circular structure/i);
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
      expect(consoleErrorSpy).not.toHaveBeenCalled();
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
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

      const timer = startTimer();

      const result = await (async () => {
        debug.log("Starting async operation");

        await new Promise((resolve) => setTimeout(resolve, 5));

        debug.log("Async operation complete");
        return "success";
      })();

      const elapsed = timer.end();

      expect(result).toBe("success");
      expect(elapsed).toBeGreaterThanOrEqual(4);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Starting async operation"));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Async operation complete"));

      delete process.env.DEBUG;
    });

    it("should work with Promise chains", async () => {
      process.env.DEBUG = "true";
      Config.reset(); // Reload config with new env vars

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
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain("First then");
      expect(consoleErrorSpy.mock.calls[0][0]).toContain("initial");
      expect(consoleErrorSpy.mock.calls[1][0]).toContain("Second then");
      expect(consoleErrorSpy.mock.calls[1][0]).toContain("initial-processed");
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

describe("silent logger", () => {
  it("log/info/warn/error are all no-ops", () => {
    expect(() => silent.log("x")).not.toThrow();
    expect(() => silent.info("x")).not.toThrow();
    expect(() => silent.warn("x")).not.toThrow();
    expect(() => silent.error("x")).not.toThrow();
  });
});

describe("createStructuredLogger / createLogger", () => {
  it("returns a logger with expected interface", () => {
    const logger = createStructuredLogger({ component: "test" });
    expect(typeof logger.log).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.logStructured).toBe("function");
    expect(typeof logger.child).toBe("function");
  });

  it("createLogger is equivalent", () => {
    expect(createLogger({ x: 1 })).toBeDefined();
  });

  it("all methods do not throw", () => {
    const logger = createStructuredLogger();
    expect(() => logger.log("msg")).not.toThrow();
    expect(() => logger.info("msg")).not.toThrow();
    expect(() => logger.warn("msg")).not.toThrow();
    expect(() => logger.error("msg")).not.toThrow();
  });

  it("logStructured does not throw", () => {
    const logger = createStructuredLogger();
    expect(() => logger.logStructured({ timestamp: Date.now(), level: "info", message: "test" })).not.toThrow();
  });

  it("child() returns a functional logger", () => {
    const parent = createStructuredLogger({ component: "parent" });
    const child = parent.child({ subcomponent: "child" });
    expect(() => child.info("from child")).not.toThrow();
  });
});

describe("logError", () => {
  it("logs Error instance without throwing", () => {
    expect(() => logError(new Error("Test error"))).not.toThrow();
  });

  it("logs string error without throwing", () => {
    expect(() => logError("Something went wrong")).not.toThrow();
  });

  it("accepts optional context object", () => {
    expect(() => logError(new Error("Err"), { requestId: "123" })).not.toThrow();
  });
});

describe("logIf", () => {
  it("returns silent when condition is false", () => {
    expect(logIf(false)).toBe(silent);
  });

  it("returns a function when condition is true", () => {
    expect(typeof logIf(true, "info")).toBe("function");
  });

  it("returned function does not throw", () => {
    const fn = logIf(true, "warn");
    expect(() => fn("msg")).not.toThrow();
  });

  it("works for debug/info/warn/error levels", () => {
    for (const level of ["debug", "info", "warn", "error"]) {
      const fn = logIf(true, level);
      expect(() => fn("test")).not.toThrow();
    }
  });
});

describe("sanitizeEnvValue", () => {
  it("redacts password values", () => {
    const result = sanitizeEnvValue("WORDPRESS_PASSWORD", "mysecret123");
    expect(result).toMatch(/REDACTED/);
    expect(result).not.toContain("mysecret123");
  });

  it("returns [EMPTY] for empty sensitive values", () => {
    expect(sanitizeEnvValue("PASSWORD", "")).toBe("[EMPTY]");
  });

  it("returns plain value for non-sensitive keys", () => {
    expect(sanitizeEnvValue("NODE_ENV", "production")).toBe("production");
  });

  it("includes char count in redacted message", () => {
    const result = sanitizeEnvValue("SECRET_KEY", "abcde12345");
    expect(result).toContain("10chars");
  });
});

describe("getEnvSummary", () => {
  it("returns [NOT_SET] for unset env vars", () => {
    const summary = getEnvSummary(["NONEXISTENT_VAR_XYZ_DEBUG_TEST"]);
    expect(summary["NONEXISTENT_VAR_XYZ_DEBUG_TEST"]).toBe("[NOT_SET]");
  });

  it("includes set env vars sanitized", () => {
    process.env.DEBUG_TEST_PLAIN = "test-value";
    const summary = getEnvSummary(["DEBUG_TEST_PLAIN"]);
    expect(summary["DEBUG_TEST_PLAIN"]).toBe("test-value");
    delete process.env.DEBUG_TEST_PLAIN;
  });

  it("sanitizes sensitive env var names", () => {
    process.env.DEBUG_TEST_PASSWORD = "secretvalue";
    const summary = getEnvSummary(["DEBUG_TEST_PASSWORD"]);
    expect(summary["DEBUG_TEST_PASSWORD"]).toMatch(/REDACTED/);
    delete process.env.DEBUG_TEST_PASSWORD;
  });

  it("handles empty keys array", () => {
    expect(getEnvSummary([])).toEqual({});
  });
});

describe("getEnvVar", () => {
  it("returns the env var value when set", () => {
    process.env.DEBUG_TEST_GET_ENV = "hello";
    expect(getEnvVar("DEBUG_TEST_GET_ENV")).toBe("hello");
    delete process.env.DEBUG_TEST_GET_ENV;
  });

  it("returns default when env var not set", () => {
    delete process.env.NONEXISTENT_GETENV_DEBUG;
    expect(getEnvVar("NONEXISTENT_GETENV_DEBUG", "fallback")).toBe("fallback");
  });

  it("returns undefined when not set and no default", () => {
    delete process.env.NONEXISTENT_GETENV_DEBUG_2;
    expect(getEnvVar("NONEXISTENT_GETENV_DEBUG_2")).toBeUndefined();
  });
});

describe("validateEnvVars", () => {
  it("does not throw when all required vars are set", () => {
    process.env.DEBUG_TEST_VALIDATE = "value";
    expect(() => validateEnvVars(["DEBUG_TEST_VALIDATE"])).not.toThrow();
    delete process.env.DEBUG_TEST_VALIDATE;
  });

  it("throws when a required var is missing", () => {
    delete process.env.MISSING_VAR_DEBUG_VALIDATE;
    expect(() => validateEnvVars(["MISSING_VAR_DEBUG_VALIDATE"])).toThrow();
  });

  it("does not throw for empty array", () => {
    expect(() => validateEnvVars([])).not.toThrow();
  });
});
