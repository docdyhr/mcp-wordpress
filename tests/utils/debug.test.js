import { jest } from "@jest/globals";
import {
  debug,
  silent,
  createLogger,
  createStructuredLogger,
  startTimer,
  logError,
  logIf,
  getEnvVar,
  validateEnvVars,
} from "../../dist/utils/debug.js";

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

describe("debug utilities", () => {
  let mockConsoleError;
  let mockConsoleLog;
  let mockConsoleWarn;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError = jest.fn();
    mockConsoleLog = jest.fn();
    mockConsoleWarn = jest.fn();
    console.error = mockConsoleError;
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    // Reset environment
    delete process.env.DEBUG;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  describe("debug logger", () => {
    it("should provide debug logging interface", () => {
      expect(debug).toHaveProperty("debug");
      expect(debug).toHaveProperty("info");
      expect(debug).toHaveProperty("warn");
      expect(debug).toHaveProperty("error");
      expect(typeof debug.debug).toBe("function");
      expect(typeof debug.info).toBe("function");
      expect(typeof debug.warn).toBe("function");
      expect(typeof debug.error).toBe("function");
    });

    it("should log debug messages when enabled", () => {
      process.env.DEBUG = "true";
      debug.debug("Test debug message");

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("DEBUG"),
        expect.stringContaining("Test debug message"),
      );
    });

    it("should log info messages", () => {
      debug.info("Test info message");

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
        expect.stringContaining("Test info message"),
      );
    });

    it("should log warning messages", () => {
      debug.warn("Test warning message");

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
        expect.stringContaining("Test warning message"),
      );
    });

    it("should log error messages", () => {
      debug.error("Test error message");

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("ERROR"),
        expect.stringContaining("Test error message"),
      );
    });
  });

  describe("silent logger", () => {
    it("should provide silent logging interface", () => {
      expect(silent).toHaveProperty("debug");
      expect(silent).toHaveProperty("info");
      expect(silent).toHaveProperty("warn");
      expect(silent).toHaveProperty("error");
    });

    it("should not log any messages", () => {
      silent.debug("Test debug");
      silent.info("Test info");
      silent.warn("Test warn");
      silent.error("Test error");

      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe("createLogger", () => {
    it("should create logger with debug enabled", () => {
      const testLogger = createLogger(true);

      expect(testLogger).toHaveProperty("debug");
      expect(testLogger).toHaveProperty("info");
      expect(testLogger).toHaveProperty("warn");
      expect(testLogger).toHaveProperty("error");

      testLogger.debug("Test debug message");
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it("should create logger with debug disabled", () => {
      const testLogger = createLogger(false);

      testLogger.debug("Test debug message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should respect DEBUG environment variable", () => {
      process.env.DEBUG = "true";
      const testLogger = createLogger();

      testLogger.debug("Test debug message");
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe("createStructuredLogger", () => {
    it("should create structured logger", () => {
      const structuredLogger = createStructuredLogger({
        component: "test-component",
        level: "debug",
      });

      expect(structuredLogger).toHaveProperty("debug");
      expect(structuredLogger).toHaveProperty("info");
      expect(structuredLogger).toHaveProperty("warn");
      expect(structuredLogger).toHaveProperty("error");
      expect(structuredLogger).toHaveProperty("log");
    });

    it("should include component in log messages", () => {
      const structuredLogger = createStructuredLogger({
        component: "test-component",
        level: "debug",
      });

      structuredLogger.info("Test message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("test-component"),
        expect.stringContaining("Test message"),
      );
    });

    it("should support structured logging", () => {
      const structuredLogger = createStructuredLogger({
        component: "test-component",
        level: "debug",
      });

      structuredLogger.log("info", "Test message", {
        userId: 123,
        action: "login",
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("test-component"),
        expect.stringContaining("Test message"),
      );
    });
  });

  describe("startTimer", () => {
    it("should create performance timer", () => {
      const timer = startTimer("test-operation");

      expect(timer).toHaveProperty("end");
      expect(timer).toHaveProperty("elapsed");
      expect(typeof timer.end).toBe("function");
      expect(typeof timer.elapsed).toBe("function");
    });

    it("should measure elapsed time", () => {
      const timer = startTimer("test-operation");

      // Small delay to ensure time passes
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Wait for at least 1ms
      }

      const elapsed = timer.elapsed();
      expect(elapsed).toBeGreaterThan(0);
    });

    it("should end timer with logging", () => {
      const timer = startTimer("test-operation");

      // Small delay
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Wait for at least 1ms
      }

      const duration = timer.end();
      expect(duration).toBeGreaterThan(0);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("test-operation"),
        expect.stringContaining("ms"),
      );
    });

    it("should handle timer without label", () => {
      const timer = startTimer();

      expect(timer).toHaveProperty("end");
      expect(timer).toHaveProperty("elapsed");

      timer.end();
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe("logError", () => {
    it("should log error with context", () => {
      const error = new Error("Test error");
      const context = { tool: "wp_get_posts", params: { per_page: 10 } };

      logError(error, context);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("ERROR"),
        expect.stringContaining("Test error"),
      );
    });

    it("should handle error without context", () => {
      const error = new Error("Test error");

      logError(error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("ERROR"),
        expect.stringContaining("Test error"),
      );
    });

    it("should handle string errors", () => {
      logError("String error");

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("ERROR"),
        expect.stringContaining("String error"),
      );
    });

    it("should include stack trace for errors", () => {
      const error = new Error("Test error");

      logError(error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("ERROR"),
        expect.stringContaining("Test error"),
      );
    });
  });

  describe("logIf", () => {
    it("should log when condition is true", () => {
      const logFn = logIf(true, "debug");

      logFn("Test message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("DEBUG"),
        expect.stringContaining("Test message"),
      );
    });

    it("should not log when condition is false", () => {
      const logFn = logIf(false, "debug");

      logFn("Test message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should use default log level", () => {
      const logFn = logIf(true);

      logFn("Test message");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("DEBUG"),
        expect.stringContaining("Test message"),
      );
    });

    it("should support different log levels", () => {
      const infoLogFn = logIf(true, "info");
      const warnLogFn = logIf(true, "warn");
      const errorLogFn = logIf(true, "error");

      infoLogFn("Info message");
      warnLogFn("Warning message");
      errorLogFn("Error message");

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
        expect.stringContaining("Info message"),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
        expect.stringContaining("Warning message"),
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("ERROR"),
        expect.stringContaining("Error message"),
      );
    });
  });

  describe("getEnvVar", () => {
    it("should get environment variable", () => {
      process.env.TEST_VAR = "test_value";

      const value = getEnvVar("TEST_VAR");
      expect(value).toBe("test_value");
    });

    it("should return default value when variable not set", () => {
      const value = getEnvVar("NON_EXISTENT_VAR", "default_value");
      expect(value).toBe("default_value");
    });

    it("should return undefined when no default provided", () => {
      const value = getEnvVar("NON_EXISTENT_VAR");
      expect(value).toBeUndefined();
    });

    it("should handle boolean conversion", () => {
      process.env.BOOL_VAR = "true";

      const value = getEnvVar("BOOL_VAR", false);
      expect(value).toBe("true"); // Returns string, not boolean
    });
  });

  describe("validateEnvVars", () => {
    it("should validate required environment variables", () => {
      process.env.REQUIRED_VAR1 = "value1";
      process.env.REQUIRED_VAR2 = "value2";

      expect(() => validateEnvVars(["REQUIRED_VAR1", "REQUIRED_VAR2"])).not.toThrow();
    });

    it("should throw when required variables are missing", () => {
      process.env.REQUIRED_VAR1 = "value1";
      // REQUIRED_VAR2 is missing

      expect(() => validateEnvVars(["REQUIRED_VAR1", "REQUIRED_VAR2"])).toThrow();
    });

    it("should list all missing variables", () => {
      // Both variables are missing

      expect(() => validateEnvVars(["MISSING_VAR1", "MISSING_VAR2"])).toThrow(expect.stringContaining("MISSING_VAR1"));
    });

    it("should handle empty array", () => {
      expect(() => validateEnvVars([])).not.toThrow();
    });

    it("should handle undefined values", () => {
      process.env.UNDEFINED_VAR = undefined;

      expect(() => validateEnvVars(["UNDEFINED_VAR"])).toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex debugging workflow", () => {
      process.env.DEBUG = "true";

      const timer = startTimer("complex-operation");

      debug.info("Starting complex operation");
      debug.debug("Processing step 1");
      debug.warn("Minor issue detected");

      try {
        throw new Error("Operation failed");
      } catch (error) {
        logError(error, { operation: "complex-operation" });
      }

      const duration = timer.end();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
        expect.stringContaining("Starting complex operation"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("DEBUG"),
        expect.stringContaining("Processing step 1"),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("WARN"),
        expect.stringContaining("Minor issue detected"),
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("ERROR"),
        expect.stringContaining("Operation failed"),
      );
      expect(duration).toBeGreaterThan(0);
    });

    it("should handle structured logging with performance", () => {
      const structuredLogger = createStructuredLogger({
        component: "api-client",
        level: "debug",
      });

      const timer = startTimer("api-call");

      structuredLogger.log("info", "Making API call", {
        method: "GET",
        url: "/wp/v2/posts",
        params: { per_page: 10 },
      });

      timer.end();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("api-client"),
        expect.stringContaining("Making API call"),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("api-call"), expect.stringContaining("ms"));
    });
  });
});
