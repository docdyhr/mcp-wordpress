/**
 * Enhanced tests for error handling utilities
 */
import { jest } from "@jest/globals";
import { 
  getErrorMessage, 
  isError, 
  logAndReturn, 
  handleToolError,
  validateRequired,
  validateSite
} from "../../src/utils/error.ts";
// import { Logger } from "../../dist/utils/logger.js";

// Mock the logger
jest.mock("../../src/utils/logger.ts", () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    child: jest.fn(() => mockLogger)
  };
  
  return {
    Logger: jest.fn(() => mockLogger),
    LoggerFactory: {
      server: jest.fn(() => mockLogger),
      api: jest.fn(() => mockLogger),
      cache: jest.fn(() => mockLogger),
      tool: jest.fn(() => mockLogger)
    }
  };
});

describe("Enhanced Error Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getErrorMessage", () => {
    it("should extract message from Error object", () => {
      const error = new Error("Test error message");
      expect(getErrorMessage(error)).toBe("Test error message");
    });

    it("should return string as-is", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    it("should extract message from object with message property", () => {
      const errorLike = { message: "Object error", code: 500 };
      expect(getErrorMessage(errorLike)).toBe("Object error");
    });

    it("should handle null and undefined", () => {
      expect(getErrorMessage(null)).toBe("Unknown error occurred");
      expect(getErrorMessage(undefined)).toBe("Unknown error occurred");
    });

    it("should handle non-standard objects", () => {
      expect(getErrorMessage({ error: "No message prop" })).toBe("Unknown error occurred");
      expect(getErrorMessage(123)).toBe("Unknown error occurred");
      expect(getErrorMessage(true)).toBe("Unknown error occurred");
    });

    it("should convert non-string message properties", () => {
      expect(getErrorMessage({ message: 404 })).toBe("404");
      expect(getErrorMessage({ message: null })).toBe("null");
      expect(getErrorMessage({ message: undefined })).toBe("undefined");
    });
  });

  describe("isError", () => {
    it("should identify Error instances", () => {
      expect(isError(new Error())).toBe(true);
      expect(isError(new TypeError())).toBe(true);
      expect(isError(new RangeError())).toBe(true);
    });

    it("should reject non-Error objects", () => {
      expect(isError("error")).toBe(false);
      expect(isError({ message: "error" })).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError(123)).toBe(false);
    });
  });

  describe("logAndReturn", () => {
    it("should log warning and return default value", () => {
      const { LoggerFactory } = require("../../dist/utils/logger.js");
      const mockLogger = LoggerFactory.server();
      
      const result = logAndReturn(new Error("Test error"), "default");
      
      expect(result).toBe("default");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Error occurred - returning default value",
        expect.objectContaining({
          error: "Test error"
        })
      );
    });

    it("should handle non-Error objects", () => {
      const { LoggerFactory } = require("../../dist/utils/logger.js");
      const mockLogger = LoggerFactory.server();
      
      const result = logAndReturn("String error", 42);
      
      expect(result).toBe(42);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Error occurred - returning default value",
        expect.objectContaining({
          error: "String error"
        })
      );
    });

    it("should work with complex default values", () => {
      const defaultObj = { status: "ok", data: [] };
      const result = logAndReturn(new Error(), defaultObj);
      
      expect(result).toBe(defaultObj);
    });
  });

  describe("handleToolError", () => {
    it("should throw formatted error for connection issues", () => {
      expect(() => {
        handleToolError(new Error("ECONNREFUSED"), "fetch posts");
      }).toThrow("Connection failed during fetch posts. Please check your WordPress site URL and network connection.");
      
      expect(() => {
        handleToolError(new Error("ENOTFOUND"), "update post");
      }).toThrow("Connection failed during update post. Please check your WordPress site URL and network connection.");
    });

    it("should throw formatted error for authentication issues", () => {
      expect(() => {
        handleToolError(new Error("401 Unauthorized"), "create post");
      }).toThrow("Authentication failed during create post. Please check your WordPress credentials.");
      
      expect(() => {
        handleToolError(new Error("Request failed with status 401"), "delete post");
      }).toThrow("Authentication failed during delete post. Please check your WordPress credentials.");
    });

    it("should throw formatted error for permission issues", () => {
      expect(() => {
        handleToolError(new Error("403 Forbidden"), "publish post");
      }).toThrow("Permission denied during publish post. Please check your user permissions.");
      
      expect(() => {
        handleToolError(new Error("Status: 403"), "moderate comment");
      }).toThrow("Permission denied during moderate comment. Please check your user permissions.");
    });

    it("should throw formatted error for rate limiting", () => {
      expect(() => {
        handleToolError(new Error("429 Too Many Requests"), "batch update");
      }).toThrow("Rate limit exceeded during batch update. Please try again later.");
      
      expect(() => {
        handleToolError(new Error("Too Many Requests"), "bulk delete");
      }).toThrow("Rate limit exceeded during bulk delete. Please try again later.");
    });

    it("should throw generic error for unknown issues", () => {
      expect(() => {
        handleToolError(new Error("Something went wrong"), "process data");
      }).toThrow("Failed to process data: Something went wrong");
    });

    it("should log error details", () => {
      const { LoggerFactory } = require("../../dist/utils/logger.js");
      const mockLogger = LoggerFactory.server();
      
      try {
        handleToolError(new Error("Test error"), "test operation", { id: 123 });
      } catch (_e) {
        // Expected to throw
      }
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error in test operation",
        expect.objectContaining({
          error: "Test error",
          context: { id: 123 }
        })
      );
    });

    it("should log stack trace for Error objects", () => {
      const { LoggerFactory } = require("../../dist/utils/logger.js");
      const mockLogger = LoggerFactory.server();
      
      const error = new Error("Test");
      error.stack = "Error: Test\n    at test.js:1:1";
      
      try {
        handleToolError(error, "test");
      } catch (_e) {
        // Expected to throw
      }
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Error stack trace",
        expect.objectContaining({
          stack: error.stack
        })
      );
    });
  });

  describe("validateRequired", () => {
    it("should pass when all required fields are present", () => {
      expect(() => {
        validateRequired(
          { name: "John", email: "john@example.com", age: 30 },
          ["name", "email"]
        );
      }).not.toThrow();
    });

    it("should throw when required fields are missing", () => {
      expect(() => {
        validateRequired(
          { name: "John" },
          ["name", "email", "phone"]
        );
      }).toThrow("Missing required parameters: email, phone");
    });

    it("should throw when required fields are null or undefined", () => {
      expect(() => {
        validateRequired(
          { name: "John", email: null, phone: undefined },
          ["name", "email", "phone"]
        );
      }).toThrow("Missing required parameters: email, phone");
    });

    it("should pass when required fields are empty strings", () => {
      expect(() => {
        validateRequired(
          { name: "", email: "" },
          ["name", "email"]
        );
      }).not.toThrow();
    });

    it("should pass when required fields are 0 or false", () => {
      expect(() => {
        validateRequired(
          { count: 0, enabled: false },
          ["count", "enabled"]
        );
      }).not.toThrow();
    });

    it("should handle empty required array", () => {
      expect(() => {
        validateRequired({ anything: "value" }, []);
      }).not.toThrow();
    });
  });

  describe("validateSite", () => {
    it("should return the only site when site param is undefined", () => {
      const result = validateSite(undefined, ["site1"]);
      expect(result).toBe("site1");
    });

    it("should throw when site param is undefined with multiple sites", () => {
      expect(() => {
        validateSite(undefined, ["site1", "site2", "site3"]);
      }).toThrow("Site parameter is required when multiple sites are configured. Available sites: site1, site2, site3");
    });

    it("should return valid site when specified", () => {
      const result = validateSite("site2", ["site1", "site2", "site3"]);
      expect(result).toBe("site2");
    });

    it("should throw when site is not in available sites", () => {
      expect(() => {
        validateSite("invalid", ["site1", "site2"]);
      }).toThrow("Site 'invalid' not found. Available sites: site1, site2");
    });

    it("should handle empty string site param", () => {
      expect(() => {
        validateSite("", ["site1", "site2"]);
      }).toThrow("Site parameter is required when multiple sites are configured. Available sites: site1, site2");
    });

    it("should work with single site even when site param provided", () => {
      const result = validateSite("site1", ["site1"]);
      expect(result).toBe("site1");
    });

    it("should throw when wrong site provided with single available site", () => {
      expect(() => {
        validateSite("site2", ["site1"]);
      }).toThrow("Site 'site2' not found. Available sites: site1");
    });
  });

  describe("Edge Cases", () => {
    it("should handle circular references in error objects", () => {
      const circular = { message: "Error" };
      circular.self = circular;
      
      expect(getErrorMessage(circular)).toBe("Error");
    });

    it("should handle very long error messages", () => {
      const longMessage = "A".repeat(10000);
      expect(getErrorMessage(longMessage)).toBe(longMessage);
    });

    it("should handle errors with no stack trace", () => {
      const error = new Error("No stack");
      delete error.stack;
      
      const { LoggerFactory } = require("../../dist/utils/logger.js");
      const mockLogger = LoggerFactory.server();
      
      try {
        handleToolError(error, "test");
      } catch (_e) {
        // Expected to throw
      }
      
      // Should not call debug since no stack
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it("should handle validateRequired with non-object params", () => {
      expect(() => {
        validateRequired(null, ["field"]);
      }).toThrow();
      
      expect(() => {
        validateRequired(undefined, ["field"]);
      }).toThrow();
      
      expect(() => {
        validateRequired("string", ["field"]);
      }).toThrow();
    });

    it("should handle validateSite with empty available sites", () => {
      expect(() => {
        validateSite("site1", []);
      }).toThrow("Site 'site1' not found. Available sites: ");
    });
  });
});