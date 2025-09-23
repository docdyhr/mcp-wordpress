import { getErrorMessage, handleToolError, validateRequired, validateSite } from "../dist/utils/error.js";

describe("Error Handling Utilities", () => {
  describe("getErrorMessage", () => {
    test("should extract message from Error object", () => {
      const error = new Error("Test error message");
      expect(getErrorMessage(error)).toBe("Test error message");
    });

    test("should return string errors as-is", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    test("should extract message from object with message property", () => {
      const error = { message: "Object error message" };
      expect(getErrorMessage(error)).toBe("Object error message");
    });

    test("should return default message for unknown error types", () => {
      expect(getErrorMessage(null)).toBe("Unknown error occurred");
      expect(getErrorMessage(undefined)).toBe("Unknown error occurred");
      expect(getErrorMessage(123)).toBe("Unknown error occurred");
    });
  });

  describe("handleToolError", () => {
    test("should throw connection error for ECONNREFUSED", () => {
      const error = new Error("ECONNREFUSED connection failed");
      expect(() => handleToolError(error, "test operation")).toThrow(
        "Connection failed during test operation. Please check your WordPress site URL and network connection.",
      );
    });

    test("should throw authentication error for 401", () => {
      const error = new Error("401 Unauthorized access");
      expect(() => handleToolError(error, "test operation")).toThrow(
        "Authentication failed during test operation. Please check your WordPress credentials.",
      );
    });

    test("should throw permission error for 403", () => {
      const error = new Error("403 Forbidden access");
      expect(() => handleToolError(error, "test operation")).toThrow(
        "Permission denied during test operation. Please check your user permissions.",
      );
    });

    test("should throw rate limit error for 429", () => {
      const error = new Error("429 Too Many Requests");
      expect(() => handleToolError(error, "test operation")).toThrow(
        "Rate limit exceeded during test operation. Please try again later.",
      );
    });

    test("should throw generic error for other cases", () => {
      const error = new Error("Generic error");
      expect(() => handleToolError(error, "test operation")).toThrow("Failed to test operation: Generic error");
    });
  });

  describe("validateRequired", () => {
    test("should pass validation when all required params are present", () => {
      const params = { id: 1, title: "Test", content: "Test content" };
      expect(() => validateRequired(params, ["id", "title"])).not.toThrow();
    });

    test("should throw error when required params are missing", () => {
      const params = { title: "Test" };
      expect(() => validateRequired(params, ["id", "title", "content"])).toThrow(
        "Missing required parameters: id, content",
      );
    });

    test("should handle empty required array", () => {
      const params = {};
      expect(() => validateRequired(params, [])).not.toThrow();
    });
  });

  describe("validateSite", () => {
    test("should return single site when no site specified and only one available", () => {
      expect(validateSite(undefined, ["site1"])).toBe("site1");
    });

    test("should throw error when no site specified and multiple available", () => {
      expect(() => validateSite(undefined, ["site1", "site2"])).toThrow(
        "Site parameter is required when multiple sites are configured. Available sites: site1, site2",
      );
    });

    test("should return valid site when specified", () => {
      expect(validateSite("site2", ["site1", "site2", "site3"])).toBe("site2");
    });

    test("should throw error when invalid site specified", () => {
      expect(() => validateSite("invalid", ["site1", "site2"])).toThrow(
        "Site 'invalid' not found. Available sites: site1, site2",
      );
    });
  });
});
