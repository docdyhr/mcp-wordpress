/**
 * Tests for BaseToolUtils
 *
 * Tests the utility functions for WordPress tool parameter validation
 * and error handling patterns.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger to avoid console output
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    server: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    }),
  },
}));

// Mock error utilities
vi.mock("../../dist/utils/error.js", () => ({
  getErrorMessage: vi.fn().mockImplementation((error) => error?.message || String(error)),
}));

// Import after mocks
import { BaseToolUtils } from "../../dist/tools/BaseToolManager.js";

describe("BaseToolUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Parameter Validation", () => {
    it("should validate required parameters successfully", () => {
      const params = { id: 123, title: "Test" };
      const rules = [
        { key: "id", required: true, type: "number" },
        { key: "title", required: true, type: "string" },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(123);
        expect(result.data.title).toBe("Test");
      }
    });

    it("should reject missing required parameters", () => {
      const params = { title: "Test" }; // missing id
      const rules = [
        { key: "id", required: true, type: "number" },
        { key: "title", required: true, type: "string" },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("id");
      }
    });

    it("should accept valid optional parameters", () => {
      const params = { title: "Test" }; // missing optional parameter
      const rules = [
        { key: "title", required: true, type: "string" },
        { key: "description", required: false, type: "string" },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(true);
    });

    it("should reject invalid parameter types", () => {
      const params = { id: "not a number", title: "Test" };
      const rules = [
        { key: "id", required: true, type: "number" },
        { key: "title", required: true, type: "string" },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(false);
    });

    it("should reject non-object parameters", () => {
      const params = "invalid";
      const rules = [{ key: "id", required: true, type: "number" }];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("object");
      }
    });

    it("should reject null parameters", () => {
      const params = null;
      const rules = [{ key: "id", required: true, type: "number" }];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(false);
    });

    it("should reject array parameters", () => {
      const params = [];
      const rules = [{ key: "id", required: true, type: "number" }];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(false);
    });
  });

  describe("Parameter Validation with Custom Validators", () => {
    it("should use custom validator when provided", () => {
      const params = { email: "test@example.com" };
      const rules = [
        {
          key: "email",
          required: true,
          validator: (value) => typeof value === "string" && value.includes("@"),
        },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(true);
    });

    it("should fail custom validator when invalid", () => {
      const params = { email: "invalid-email" };
      const rules = [
        {
          key: "email",
          required: true,
          validator: (value) => typeof value === "string" && value.includes("@"),
        },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(false);
    });
  });

  describe("Parameter Transformation", () => {
    it("should transform parameters when transformer provided", () => {
      const params = { count: "123" };
      const rules = [
        {
          key: "count",
          required: true,
          transformer: (value) => parseInt(String(value), 10),
        },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(123);
        expect(typeof result.data.count).toBe("number");
      }
    });
  });

  describe("Error Handling", () => {
    it("should provide detailed error messages", () => {
      const params = {};
      const rules = [
        {
          key: "required_field",
          required: true,
          errorMessage: "This field is absolutely required",
        },
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(false);
      if (!result.success) {
        // The error uses custom message when provided
        expect(result.error.message).toContain("This field is absolutely required");
      }
    });
  });

  describe("Complex Validation Scenarios", () => {
    it("should handle mixed required and optional parameters", () => {
      const params = {
        id: 123,
        title: "Test Post",
        // description is optional and not provided
        tags: ["tag1", "tag2"],
      };
      const rules = [
        { key: "id", required: true, type: "number" },
        { key: "title", required: true, type: "string" },
        { key: "description", required: false, type: "string" },
        { key: "tags", required: true, type: "object" }, // arrays are objects in JS
      ];

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(true);
    });

    it("should handle empty object validation", () => {
      const params = {};
      const rules = []; // no validation rules

      const result = BaseToolUtils.validateParams(params, rules);

      expect(result.success).toBe(true);
    });
  });
});
