/**
 * Tests for the centralized logging system
 */
import { jest } from "@jest/globals";
// Import from built dist to avoid TS parsing issues in Jest environment
import { Logger, LoggerFactory, createLogger, createSiteLogger, createRequestLogger } from "../../dist/utils/logger.js";
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
    consoleErrorSpy = jest.fn();
    consoleLogSpy = jest.fn();
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
        appPassword: "app-secret"
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
        credential: "cred000"
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
        await new Promise(resolve => setTimeout(resolve, 10));
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
        })
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
      
      const messages = consoleErrorSpy.mock.calls.map(call => call[0]);
      expect(messages[0]).toContain("TRACE");
      expect(messages[1]).toContain("DEBUG");
      expect(messages[2]).toContain("INFO");
      expect(messages[3]).toContain("WARN");
      expect(messages[4]).toContain("ERROR");
      expect(messages[5]).toContain("FATAL");
    });
  });
});