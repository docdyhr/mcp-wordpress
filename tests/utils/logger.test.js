/**
 * Tests for the centralized logging system
 */
import { vi } from "vitest";
// Import from source for proper coverage collection
import { Logger, LoggerFactory, createLogger, createSiteLogger, createRequestLogger } from "../../src/utils/logger.ts";
// IMPORTANT: Import Config from the same path the logger uses (@/config/Config.js -> dist)
// to ensure we're resetting the same singleton instance
import { Config } from "../../dist/config/Config.js";

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe("Logger", () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Reset config singleton
    Config.reset();

    // Mock console methods
    consoleErrorSpy = vi.fn();
    consoleLogSpy = vi.fn();
    console.error = consoleErrorSpy;
    console.log = consoleLogSpy;

    // Mock environment for testing
    process.env.NODE_ENV = "test";
    process.env.DEBUG = "false";
    process.env.LOG_LEVEL = "info";
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;

    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.DEBUG;
    delete process.env.LOG_LEVEL;

    // Reset config singleton
    Config.reset();
  });

  describe("Basic Logging", () => {
    it("should create a logger instance", () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should log info messages", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = new Logger();
      logger.info("Test message");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("INFO");
      expect(logOutput).toContain("Test message");
    });

    it("should log with context", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = new Logger();
      logger.info("Test message", { userId: 123, action: "test" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("Test message");
      expect(logOutput).toContain("userId");
      expect(logOutput).toContain("123");
    });

    it("should respect log levels", () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "warn";
      Config.reset();

      const logger = new Logger();

      // Debug should not log
      logger.debug("Debug message");
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Info should not log
      logger.info("Info message");
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Warn should log
      logger.warn("Warning message");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      // Error should log
      logger.error("Error message");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Child Loggers", () => {
    it("should create child logger with additional context", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const parentLogger = new Logger({ component: "Parent" });
      const childLogger = parentLogger.child({ component: "Child", siteId: "site1" });

      childLogger.info("Child message");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[Child]");
      expect(logOutput).toContain("{site:site1}");
    });

    it("should inherit parent context", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const parentLogger = new Logger({ context: { parentKey: "parentValue" } });
      const childLogger = parentLogger.child({ context: { childKey: "childValue" } });

      childLogger.info("Test message");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("parentKey");
      expect(logOutput).toContain("childKey");
    });
  });

  describe("Error Handling", () => {
    it("should log Error objects properly", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = new Logger();
      const error = new Error("Test error");
      logger.error(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("ERROR");
      expect(logOutput).toContain("Test error");
    });

    it("should log error with additional context", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = new Logger();
      const error = new Error("Test error");
      logger.error(error, { operation: "test-operation" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("Test error");
      expect(logOutput).toContain("operation");
    });
  });

  describe("Sensitive Data Sanitization", () => {
    it("should redact passwords", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = new Logger();
      logger.info("Login attempt", {
        username: "testuser",
        password: "secret123",
        appPassword: "app-secret",
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("username");
      expect(logOutput).toContain("testuser");
      expect(logOutput).toContain("[REDACTED:");
      expect(logOutput).not.toContain("secret123");
      expect(logOutput).not.toContain("app-secret");
    });

    it("should redact tokens and keys", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = new Logger();
      logger.info("API call", {
        apiKey: "key123",
        token: "token456",
        secret: "secret789",
        credential: "cred000",
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).not.toContain("key123");
      expect(logOutput).not.toContain("token456");
      expect(logOutput).not.toContain("secret789");
      expect(logOutput).not.toContain("cred000");
      expect(logOutput).toContain("[REDACTED:");
    });
  });

  describe("Environment-Specific Behavior", () => {
    it("should suppress most logs in test environment", () => {
      process.env.NODE_ENV = "test";
      Config.reset();

      const logger = new Logger();

      logger.debug("Debug");
      logger.info("Info");
      logger.warn("Warn");

      // In test mode, only errors are logged
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      logger.error("Error");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should suppress logs in DXT mode", () => {
      process.env.NODE_ENV = "dxt";
      Config.reset();

      const logger = new Logger();

      logger.debug("Debug");
      logger.info("Info");

      // In DXT mode, only warnings and errors are logged
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      logger.warn("Warning");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("LoggerFactory", () => {
    it("should create API logger", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = LoggerFactory.api("site1");
      logger.info("API request");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[API]");
      expect(logOutput).toContain("{site:site1}");
    });

    it("should create cache logger", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = LoggerFactory.cache();
      logger.info("Cache hit");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[CACHE]");
    });

    it("should create tool logger", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = LoggerFactory.tool("wp_posts", "site1");
      logger.info("Tool executed");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[TOOL:wp_posts]");
      expect(logOutput).toContain("{site:site1}");
    });

    it("should create server logger", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = LoggerFactory.server();
      logger.info("Server started");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[SERVER]");
    });
  });

  describe("Helper Functions", () => {
    it("should create component logger", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = createLogger("MyComponent");
      logger.info("Component message");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[MyComponent]");
    });

    it("should create site-specific logger", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = createSiteLogger("site1", "Auth");
      logger.info("Auth check");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[Auth]");
      expect(logOutput).toContain("{site:site1}");
    });

    it("should create request-specific logger", () => {
      process.env.NODE_ENV = "development";
      Config.reset();

      const logger = createRequestLogger("req-123", "API", "site1");
      logger.info("Request processed");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[API]");
      expect(logOutput).toContain("{site:site1}");
      expect(logOutput).toContain("{req:req-123");
    });
  });

  describe("Timing Functions", () => {
    it("should time synchronous operations", () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "debug";
      Config.reset();

      const logger = new Logger();
      const result = logger.time("Test operation", () => {
        return "result";
      });

      expect(result).toBe("result");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      const startLog = consoleErrorSpy.mock.calls[0][0];
      expect(startLog).toContain("Starting: Test operation");

      const endLog = consoleErrorSpy.mock.calls[1][0];
      expect(endLog).toContain("Completed: Test operation");
      expect(endLog).toContain("duration");
    });

    it("should time async operations", async () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "debug";
      Config.reset();

      const logger = new Logger();
      const result = await logger.time("Async operation", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-result";
      });

      expect(result).toBe("async-result");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      const endLog = consoleErrorSpy.mock.calls[1][0];
      expect(endLog).toContain("Completed: Async operation");
      expect(endLog).toContain("duration");
    });

    it("should log timing errors", async () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "debug";
      Config.reset();

      const logger = new Logger();

      await expect(
        logger.time("Failing operation", async () => {
          throw new Error("Operation failed");
        }),
      ).rejects.toThrow("Operation failed");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

      const errorLog = consoleErrorSpy.mock.calls[1][0];
      expect(errorLog).toContain("Failed: Failing operation");
      expect(errorLog).toContain("duration");
    });
  });

  describe("Log Levels", () => {
    it("should support all log levels", () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "trace";
      Config.reset();

      const logger = new Logger();

      logger.trace("Trace message");
      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      logger.error("Error message");
      logger.fatal("Fatal message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(6);

      const messages = consoleErrorSpy.mock.calls.map((call) => call[0]);
      expect(messages[0]).toContain("TRACE");
      expect(messages[1]).toContain("DEBUG");
      expect(messages[2]).toContain("INFO");
      expect(messages[3]).toContain("WARN");
      expect(messages[4]).toContain("ERROR");
      expect(messages[5]).toContain("FATAL");
    });
  });

  describe("LoggerFactory Comprehensive Tests", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      Config.reset();
    });

    it("should create auth logger", () => {
      const logger = LoggerFactory.auth("site1");
      logger.info("Authentication check");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[AUTH]");
      expect(logOutput).toContain("{site:site1}");
    });

    it("should create auth logger without site", () => {
      const logger = LoggerFactory.auth();
      logger.info("Authentication check");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[AUTH]");
      expect(logOutput).not.toContain("{site:");
    });

    it("should create config logger", () => {
      const logger = LoggerFactory.config();
      logger.info("Configuration loaded");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[CONFIG]");
    });

    it("should create security logger", () => {
      const logger = LoggerFactory.security();
      logger.warn("Security alert");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[SECURITY]");
    });

    it("should create performance logger", () => {
      const logger = LoggerFactory.performance();
      logger.info("Performance metric");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[PERF]");
    });

    it("should create API logger without site", () => {
      const logger = LoggerFactory.api();
      logger.info("API request");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[API]");
      expect(logOutput).not.toContain("{site:");
    });

    it("should create cache logger with site", () => {
      const logger = LoggerFactory.cache("site2");
      logger.info("Cache operation");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[CACHE]");
      expect(logOutput).toContain("{site:site2}");
    });

    it("should create tool logger without site", () => {
      const logger = LoggerFactory.tool("wp_posts");
      logger.info("Tool executed");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[TOOL:wp_posts]");
      expect(logOutput).not.toContain("{site:");
    });
  });

  describe("Advanced Error Handling", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      Config.reset();
    });

    it("should handle fatal error messages", () => {
      const logger = new Logger();
      logger.fatal("Fatal system error");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("FATAL");
      expect(logOutput).toContain("Fatal system error");
    });

    it("should handle fatal Error objects", () => {
      const logger = new Logger();
      const error = new Error("Critical failure");
      error.stack = "Error: Critical failure\n    at test";
      logger.fatal(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("FATAL");
      expect(logOutput).toContain("Critical failure");
      expect(logOutput).toContain("errorName");
      expect(logOutput).toContain("errorStack");
    });

    it("should handle fatal Error objects with context", () => {
      const logger = new Logger();
      const error = new Error("Critical failure");
      logger.fatal(error, { operation: "critical-task" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("operation");
      expect(logOutput).toContain("critical-task");
    });

    it("should handle fatal non-Error objects", () => {
      const logger = new Logger();
      const nonErrorObj = { message: "Non-error fatal", code: 500 };
      logger.fatal(nonErrorObj);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("FATAL");
      expect(logOutput).toContain("[object Object]");
    });

    it("should handle fatal non-Error primitives", () => {
      const logger = new Logger();
      logger.fatal(12345);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("FATAL");
      expect(logOutput).toContain("12345");
    });

    it("should handle error Error objects with context", () => {
      const logger = new Logger();
      const error = new Error("Regular error");
      logger.error(error, { operation: "regular-task" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("operation");
      expect(logOutput).toContain("regular-task");
    });
  });

  describe("Context Merging and Sanitization", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      Config.reset();
    });

    it("should merge logger context with message context", () => {
      const logger = new Logger({
        context: { baseKey: "baseValue", shared: "fromLogger" },
      });
      logger.info("Test message", { messageKey: "messageValue", shared: "fromMessage" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("baseKey");
      expect(logOutput).toContain("messageKey");
      expect(logOutput).toContain("fromMessage"); // Message context should override logger context
    });

    it("should sanitize context with empty sensitive values", () => {
      const logger = new Logger();
      logger.info("Test", {
        password: "",
        token: "",
        apiKey: "",
        secret: "",
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[EMPTY]");
      // Password key is preserved but value is sanitized
      expect(logOutput).toContain("password");
      expect(logOutput).not.toContain('""');
    });

    it("should preserve non-string sensitive values", () => {
      const logger = new Logger();
      logger.info("Test", {
        password: 123,
        token: null,
        apiKey: undefined,
        secret: { nested: "value" },
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("123");
      expect(logOutput).toContain("null");
      expect(logOutput).toContain("nested");
    });

    it("should sanitize sensitive fields containing array values", () => {
      const logger = new Logger();
      logger.info("Test", {
        password: ["secret1", "secret2"],
        token: [123, 456],
        apiKey: [null, undefined],
        secret: [{ nested: "value" }, "anotherSecret"],
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      // Sensitive array values should be sanitized, not exposing their contents
      expect(logOutput).toContain("password");
      expect(logOutput).not.toContain("secret1");
      expect(logOutput).not.toContain("secret2");
      expect(logOutput).not.toContain("anotherSecret");
      expect(logOutput).not.toContain("nested");
      expect(logOutput).toContain("token");
      expect(logOutput).toContain("apiKey");
      expect(logOutput).toContain("secret");
    });
  });

  describe("Log Level Configuration", () => {
    it("should respect custom LOG_LEVEL environment variable", () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "error";
      Config.reset();

      const logger = new Logger();

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      logger.error("Error message");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should default to info level for invalid LOG_LEVEL", () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "invalid-level";
      Config.reset();

      const logger = new Logger();

      logger.debug("Debug message");
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      logger.info("Info message");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle LOG_LEVEL case insensitivity", () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "ERROR"; // Uppercase
      Config.reset();

      const logger = new Logger();

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      logger.error("Error message");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Message Formatting Edge Cases", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      Config.reset();
    });

    it("should handle empty context objects", () => {
      const logger = new Logger();
      logger.info("Test message", {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("Test message");
      expect(logOutput).not.toContain("{}");
    });

    it("should handle deeply nested context objects", () => {
      const logger = new Logger();
      const nestedContext = {
        user: {
          id: 123,
          profile: {
            name: "Alice",
            address: {
              city: "Wonderland",
              zip: "12345",
              details: {
                coordinates: { lat: 51.5, lng: -0.1 },
              },
            },
          },
        },
      };
      logger.info("Nested context test", nestedContext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("Nested context test");
      expect(logOutput).toContain("Alice");
      expect(logOutput).toContain("Wonderland");
      expect(logOutput).toContain("51.5");
      expect(logOutput).toContain("-0.1");
    });

    it("should handle loggers with all options", () => {
      const logger = new Logger({
        component: "TestComponent",
        siteId: "site123",
        requestId: "req-abcdef123456789",
        context: { baseContext: "value" },
      });
      logger.info("Full context message", { extraContext: "extra" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[TestComponent]");
      expect(logOutput).toContain("{site:site123}");
      expect(logOutput).toContain("{req:req-abcd"); // Truncated to 8 chars
      expect(logOutput).toContain("baseContext");
      expect(logOutput).toContain("extraContext");
    });

    it("should handle logger without context but with message context", () => {
      const logger = new Logger({ component: "NoContext" });
      logger.info("Message", { messageKey: "messageValue" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("[NoContext]");
      expect(logOutput).toContain("messageKey");
    });
  });

  describe("Logger Edge Cases", () => {
    it("should not log when level is below threshold", () => {
      process.env.NODE_ENV = "development";
      process.env.LOG_LEVEL = "warn";
      Config.reset();

      const logger = new Logger();
      logger.log("debug", "Debug message");
      logger.log("info", "Info message");

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      logger.log("warn", "Warning message");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
