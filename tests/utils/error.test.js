import { vi } from "vitest";
import {
  getErrorMessage,
  isError,
  logAndReturn,
  handleToolError,
  validateRequired,
  validateSite,
} from "@/utils/error.js";

describe("error utilities", () => {
  describe("getErrorMessage", () => {
    it("should extract message from Error objects", () => {
      const error = new Error("Test error message");
      expect(getErrorMessage(error)).toBe("Test error message");
    });

    it("should handle string errors", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    it("should handle objects with message property", () => {
      const error = { message: "Object error message" };
      expect(getErrorMessage(error)).toBe("Object error message");
    });

    it("should handle null/undefined errors", () => {
      expect(getErrorMessage(null)).toBe("Unknown error occurred");
      expect(getErrorMessage(undefined)).toBe("Unknown error occurred");
    });

    it("should handle objects without message", () => {
      const error = { code: 500, status: "error" };
      expect(getErrorMessage(error)).toBe("Unknown error occurred");
    });

    it("should handle non-string, non-object errors", () => {
      expect(getErrorMessage(123)).toBe("Unknown error occurred");
      expect(getErrorMessage(true)).toBe("Unknown error occurred");
    });
  });

  describe("isError", () => {
    it("should identify Error objects", () => {
      const error = new Error("Test error");
      expect(isError(error)).toBe(true);
    });

    it("should identify TypeError objects", () => {
      const error = new TypeError("Type error");
      expect(isError(error)).toBe(true);
    });

    it("should reject non-Error objects", () => {
      expect(isError("string")).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError({})).toBe(false);
    });
  });

  describe("logAndReturn", () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = vi.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    it("should log error and return default value", () => {
      const error = new Error("Test error");
      const defaultValue = "default";

      const result = logAndReturn(error, defaultValue);

      expect(result).toBe(defaultValue);
      expect(console.error).toHaveBeenCalledWith("Error occurred:", "Test error");
    });

    it("should handle string errors", () => {
      const result = logAndReturn("string error", "default");

      expect(result).toBe("default");
      expect(console.error).toHaveBeenCalledWith("Error occurred:", "string error");
    });

    it("should handle null errors", () => {
      const result = logAndReturn(null, "default");

      expect(result).toBe("default");
      expect(console.error).toHaveBeenCalledWith("Error occurred:", "Unknown error occurred");
    });
  });

  describe("handleToolError", () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = vi.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    it("should throw error for tool errors", () => {
      const error = new Error("Tool failed");
      const operation = "get posts";

      expect(() => handleToolError(error, operation)).toThrow("Failed to get posts: Tool failed");
      expect(console.error).toHaveBeenCalledWith("Error in get posts:", error);
    });

    it("should include context information", () => {
      const error = new Error("Tool failed");
      const operation = "get posts";
      const context = { params: { per_page: 10 } };

      expect(() => handleToolError(error, operation, context)).toThrow("Failed to get posts: Tool failed");
      expect(console.error).toHaveBeenCalledWith("Error in get posts:", error);
      expect(console.error).toHaveBeenCalledWith("Context:", context);
    });

    it("should handle connection errors", () => {
      const error = new Error("ECONNREFUSED");
      const operation = "get posts";

      expect(() => handleToolError(error, operation)).toThrow(
        "Connection failed during get posts. Please check your WordPress site URL and network connection.",
      );
    });

    it("should handle authentication errors", () => {
      const error = new Error("401 Unauthorized");
      const operation = "get posts";

      expect(() => handleToolError(error, operation)).toThrow(
        "Authentication failed during get posts. Please check your WordPress credentials.",
      );
    });

    it("should handle permission errors", () => {
      const error = new Error("403 Forbidden");
      const operation = "create post";

      expect(() => handleToolError(error, operation)).toThrow(
        "Permission denied during create post. Please check your user permissions.",
      );
    });

    it("should handle rate limit errors", () => {
      const error = new Error("429 Too Many Requests");
      const operation = "get posts";

      expect(() => handleToolError(error, operation)).toThrow(
        "Rate limit exceeded during get posts. Please try again later.",
      );
    });

    it("should handle generic errors", () => {
      const error = new Error("Some generic error");
      const operation = "get posts";

      expect(() => handleToolError(error, operation)).toThrow("Failed to get posts: Some generic error");
    });
  });

  describe("validateRequired", () => {
    it("should pass validation for valid parameters", () => {
      const params = { username: "test", password: "pass", email: "test@example.com" };
      const required = ["username", "password"];

      expect(() => validateRequired(params, required)).not.toThrow();
    });

    it("should throw for missing required parameters", () => {
      const params = { username: "test" };
      const required = ["username", "password"];

      expect(() => validateRequired(params, required)).toThrow("Missing required parameters: password");
    });

    it("should throw for multiple missing parameters", () => {
      const params = { username: "test" };
      const required = ["username", "password", "email"];

      expect(() => validateRequired(params, required)).toThrow("Missing required parameters: password, email");
    });

    it("should handle empty parameters object", () => {
      const params = {};
      const required = ["username", "password"];

      expect(() => validateRequired(params, required)).toThrow("Missing required parameters: username, password");
    });

    it("should handle empty required array", () => {
      const params = { username: "test" };
      const required = [];

      expect(() => validateRequired(params, required)).not.toThrow();
    });

    it("should treat only null/undefined as missing (allow empty string/0/false)", () => {
      const params = { username: "", password: null, email: undefined, attempts: 0, active: false };
      const required = ["username", "password", "email", "attempts", "active"];
      expect(() => validateRequired(params, required)).toThrow("Missing required parameters: password, email");
    });
  });

  describe("validateSite", () => {
    it("should validate site parameter for multiple sites", () => {
      const availableSites = ["site1", "site2"];

      expect(validateSite("site1", availableSites)).toBe("site1");
      expect(validateSite("site2", availableSites)).toBe("site2");
    });

    it("should throw for invalid site ID", () => {
      const availableSites = ["site1", "site2"];

      expect(() => validateSite("invalid", availableSites)).toThrow(
        "Site 'invalid' not found. Available sites: site1, site2",
      );
    });

    it("should throw for missing site parameter with multiple sites", () => {
      const availableSites = ["site1", "site2"];

      expect(() => validateSite(undefined, availableSites)).toThrow(
        "Site parameter is required when multiple sites are configured. Available sites: site1, site2",
      );
    });

    it("should return default site for single site configuration", () => {
      const availableSites = ["site1"];

      expect(validateSite(undefined, availableSites)).toBe("site1");
      expect(validateSite("site1", availableSites)).toBe("site1");
    });

    it("should handle empty sites array", () => {
      const availableSites = [];

      expect(() => validateSite("any", availableSites)).toThrow("Site 'any' not found. Available sites: ");
    });
  });

  describe("integration scenarios", () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = vi.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    it("should handle complex error scenarios", () => {
      const complexError = {
        message: "WordPress API Error",
        code: 500,
        data: {
          status: 500,
          error: "Internal Server Error",
        },
      };

      const errorMessage = getErrorMessage(complexError);
      expect(errorMessage).toBe("WordPress API Error");

      expect(() => handleToolError(complexError, "get posts")).toThrow("Failed to get posts: WordPress API Error");
    });

    it("should handle nested error objects", () => {
      const nestedError = {
        error: {
          message: "Database connection failed",
          code: "DB_CONNECTION_ERROR",
        },
      };

      const errorMessage = getErrorMessage(nestedError);
      expect(errorMessage).toBe("Unknown error occurred"); // Current implementation doesn't handle nested
    });

    it("should validate multiple parameters and sites", () => {
      const params = { username: "test", password: "pass", site: "site1" };
      const required = ["username", "password", "site"];
      const availableSites = ["site1", "site2"];

      expect(() => validateRequired(params, required)).not.toThrow();
      expect(validateSite(params.site, availableSites)).toBe("site1");
    });

    it("should handle authentication error workflow", () => {
      const authError = new Error("401 Unauthorized");
      const operation = "get posts";
      const context = { tool: "wp_get_posts", params: { per_page: 10 } };

      expect(() => handleToolError(authError, operation, context)).toThrow(
        "Authentication failed during get posts. Please check your WordPress credentials.",
      );
      expect(console.error).toHaveBeenCalledWith("Error in get posts:", authError);
      expect(console.error).toHaveBeenCalledWith("Context:", context);
    });
  });
});
