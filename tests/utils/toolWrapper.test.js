import { jest } from "@jest/globals";
import {
  withErrorHandling,
  withValidation,
  validators,
  errorHandler,
  formatSuccessResponse,
  formatErrorResponse,
  toolWrapper,
} from "../../dist/utils/toolWrapper.js";

describe("toolWrapper utilities", () => {
  describe("withErrorHandling", () => {
    it("should wrap function with error handling", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const wrappedFn = withErrorHandling("test_operation", mockFn);

      const result = await wrappedFn("arg1", "arg2");

      expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
      expect(result).toBe("success");
    });

    it("should handle errors with operation prefix", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Original error"));
      const wrappedFn = withErrorHandling("test_operation", mockFn);

      await expect(wrappedFn()).rejects.toThrow("test_operation: Original error");
    });

    it("should handle synchronous functions", async () => {
      const mockFn = jest.fn().mockReturnValue("sync result");
      const wrappedFn = withErrorHandling("test_operation", mockFn);

      const result = await wrappedFn();
      expect(result).toBe("sync result");
    });

    it("should handle non-Error objects", async () => {
      const mockFn = jest.fn().mockRejectedValue("string error");
      const wrappedFn = withErrorHandling("test_operation", mockFn);

      await expect(wrappedFn()).rejects.toThrow("test_operation: string error");
    });
  });

  describe("withValidation", () => {
    it("should validate parameters before execution", async () => {
      const mockValidator = jest.fn();
      const mockFn = jest.fn().mockResolvedValue("success");
      const wrappedFn = withValidation("test_operation", mockValidator, mockFn);

      const result = await wrappedFn("arg1", "arg2");

      expect(mockValidator).toHaveBeenCalledWith("arg1", "arg2");
      expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
      expect(result).toBe("success");
    });

    it("should handle validation errors", async () => {
      const mockValidator = jest.fn().mockImplementation(() => {
        throw new Error("Validation failed");
      });
      const mockFn = jest.fn();
      const wrappedFn = withValidation("test_operation", mockValidator, mockFn);

      await expect(wrappedFn()).rejects.toThrow("test_operation: Validation failed");
      expect(mockFn).not.toHaveBeenCalled();
    });

    it("should handle execution errors after validation", async () => {
      const mockValidator = jest.fn();
      const mockFn = jest.fn().mockRejectedValue(new Error("Execution failed"));
      const wrappedFn = withValidation("test_operation", mockValidator, mockFn);

      await expect(wrappedFn()).rejects.toThrow("test_operation: Execution failed");
    });
  });

  describe("validators", () => {
    describe("requireSite", () => {
      it("should pass when client is provided", () => {
        const mockClient = {};
        expect(() => validators.requireSite(mockClient, {})).not.toThrow();
      });

      it("should throw when client is missing", () => {
        expect(() => validators.requireSite(null, {})).toThrow("WordPress client is required");
        expect(() => validators.requireSite(undefined, {})).toThrow("WordPress client is required");
      });
    });

    describe("requireId", () => {
      it("should pass when id is provided", () => {
        expect(() => validators.requireId({ id: "123" })).not.toThrow();
        expect(() => validators.requireId({ id: 123 })).not.toThrow();
      });

      it("should throw when id is missing", () => {
        expect(() => validators.requireId({})).toThrow("ID parameter is required");
        expect(() => validators.requireId({ id: null })).toThrow("ID parameter is required");
        expect(() => validators.requireId({ id: undefined })).toThrow("ID parameter is required");
      });
    });

    describe("requireNonEmpty", () => {
      it("should pass when value is not empty", () => {
        expect(() => validators.requireNonEmpty("test", "field")).not.toThrow();
        expect(() => validators.requireNonEmpty(123, "field")).not.toThrow();
        expect(() => validators.requireNonEmpty([], "field")).not.toThrow();
      });

      it("should throw when value is empty", () => {
        expect(() => validators.requireNonEmpty("", "field")).toThrow("field cannot be empty");
        expect(() => validators.requireNonEmpty("   ", "field")).toThrow("field cannot be empty");
        expect(() => validators.requireNonEmpty(null, "field")).toThrow("field cannot be empty");
        expect(() => validators.requireNonEmpty(undefined, "field")).toThrow("field cannot be empty");
      });
    });

    describe("requireFields", () => {
      it("should pass when all fields are provided", () => {
        const params = { name: "test", age: 25, active: true };
        expect(() => validators.requireFields(params, ["name", "age"])).not.toThrow();
      });

      it("should throw when required field is missing", () => {
        const params = { name: "test" };
        expect(() => validators.requireFields(params, ["name", "age"])).toThrow("age is required");
      });

      it("should throw when required field is null or undefined", () => {
        const params = { name: "test", age: null };
        expect(() => validators.requireFields(params, ["name", "age"])).toThrow("age is required");
      });
    });
  });

  describe("errorHandler decorator", () => {
    it("should add error handling to class methods", async () => {
      class TestClass {
        @errorHandler("test_method")
        async testMethod() {
          return "success";
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod();
      expect(result).toBe("success");
    });

    it("should handle method errors with operation prefix", async () => {
      class TestClass {
        @errorHandler("test_method")
        async testMethod() {
          throw new Error("Method error");
        }
      }

      const instance = new TestClass();
      await expect(instance.testMethod()).rejects.toThrow("test_method: Method error");
    });
  });

  describe("formatSuccessResponse", () => {
    it("should return content as-is", () => {
      const content = "test content";
      const result = formatSuccessResponse(content);
      expect(result).toBe(content);
    });

    it("should handle objects", () => {
      const content = { message: "success" };
      const result = formatSuccessResponse(content);
      expect(result).toBe(content);
    });
  });

  describe("formatErrorResponse", () => {
    it("should throw formatted error", () => {
      const error = new Error("Test error");
      expect(() => formatErrorResponse("test_operation", error)).toThrow("test_operation: Test error");
    });

    it("should handle non-Error objects", () => {
      expect(() => formatErrorResponse("test_operation", "string error")).toThrow("test_operation: string error");
    });
  });

  describe("toolWrapper", () => {
    it("should execute function successfully", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await toolWrapper(mockFn);

      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe("success");
    });

    it("should handle function errors", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Function error"));

      await expect(toolWrapper(mockFn)).rejects.toThrow("Function error");
    });

    it("should handle synchronous functions", async () => {
      const mockFn = jest.fn().mockReturnValue("sync result");
      const result = await toolWrapper(mockFn);

      expect(result).toBe("sync result");
    });

    it("should handle non-Error objects", async () => {
      const mockFn = jest.fn().mockRejectedValue("string error");

      await expect(toolWrapper(mockFn)).rejects.toThrow("string error");
    });
  });

  describe("integration scenarios", () => {
    it("should combine withErrorHandling and validators", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const wrappedFn = withErrorHandling("test_operation", mockFn);

      // Test with validator
      const validatedFn = withValidation("test_operation", validators.requireSite, wrappedFn);

      const result = await validatedFn({}, {});
      expect(result).toBe("success");
    });

    it("should handle complex error scenarios", async () => {
      const mockFn = jest.fn().mockImplementation((params) => {
        if (params.trigger === "validation") {
          throw new Error("Validation failed");
        } else if (params.trigger === "execution") {
          throw new Error("Execution failed");
        }
        return "success";
      });

      const wrappedFn = withErrorHandling("test_operation", mockFn);

      await expect(wrappedFn({ trigger: "validation" })).rejects.toThrow("test_operation: Validation failed");
      await expect(wrappedFn({ trigger: "execution" })).rejects.toThrow("test_operation: Execution failed");

      const result = await wrappedFn({ trigger: "success" });
      expect(result).toBe("success");
    });
  });
});
