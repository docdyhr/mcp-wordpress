/**
 * Parameter Validator Implementation
 * Provides comprehensive parameter validation for managers
 */

import { WordPressAPIError } from "@/types/client.js";
import type { ParameterValidator } from "../interfaces/ManagerInterfaces.js";

export class ParameterValidatorImpl implements ParameterValidator {
  /**
   * Validate required parameters are present
   */
  validateRequired(params: Record<string, unknown>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        throw new WordPressAPIError(`Missing required parameter: ${field}`, 400, "missing_parameter");
      }
    }
  }

  /**
   * Validate parameter types and formats
   */
  validateParameters<T>(params: unknown, schema?: unknown): T {
    if (params === null || params === undefined) {
      throw new WordPressAPIError("Parameters cannot be null or undefined", 400, "invalid_parameters");
    }

    // If no schema provided, return params as-is with type assertion
    if (!schema) {
      return params as T;
    }

    // Basic runtime validation (can be extended with schema validation libraries)
    if (typeof params !== "object") {
      throw new WordPressAPIError("Parameters must be an object", 400, "invalid_parameters");
    }

    return params as T;
  }

  /**
   * Validate string parameters
   */
  validateString(value: unknown, fieldName: string, options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }): string {
    if (options?.required && (value === undefined || value === null || value === "")) {
      throw new WordPressAPIError(`${fieldName} is required`, 400, "missing_parameter");
    }

    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value !== "string") {
      throw new WordPressAPIError(`${fieldName} must be a string`, 400, "invalid_parameter_type");
    }

    if (options?.minLength && value.length < options.minLength) {
      throw new WordPressAPIError(
        `${fieldName} must be at least ${options.minLength} characters`, 
        400, 
        "parameter_too_short"
      );
    }

    if (options?.maxLength && value.length > options.maxLength) {
      throw new WordPressAPIError(
        `${fieldName} must be no more than ${options.maxLength} characters`, 
        400, 
        "parameter_too_long"
      );
    }

    if (options?.pattern && !options.pattern.test(value)) {
      throw new WordPressAPIError(
        `${fieldName} format is invalid`, 
        400, 
        "invalid_parameter_format"
      );
    }

    return value;
  }

  /**
   * Validate numeric parameters
   */
  validateNumber(value: unknown, fieldName: string, options?: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  }): number {
    if (options?.required && (value === undefined || value === null)) {
      throw new WordPressAPIError(`${fieldName} is required`, 400, "missing_parameter");
    }

    if (value === undefined || value === null) {
      return 0;
    }

    const numValue = typeof value === "string" ? parseFloat(value) : Number(value);

    if (isNaN(numValue)) {
      throw new WordPressAPIError(`${fieldName} must be a valid number`, 400, "invalid_parameter_type");
    }

    if (options?.integer && !Number.isInteger(numValue)) {
      throw new WordPressAPIError(`${fieldName} must be an integer`, 400, "invalid_parameter_type");
    }

    if (options?.min !== undefined && numValue < options.min) {
      throw new WordPressAPIError(
        `${fieldName} must be at least ${options.min}`, 
        400, 
        "parameter_too_small"
      );
    }

    if (options?.max !== undefined && numValue > options.max) {
      throw new WordPressAPIError(
        `${fieldName} must be no more than ${options.max}`, 
        400, 
        "parameter_too_large"
      );
    }

    return numValue;
  }

  /**
   * Validate array parameters
   */
  validateArray<T>(value: unknown, fieldName: string, options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    itemValidator?: (item: unknown) => T;
  }): T[] {
    if (options?.required && (value === undefined || value === null)) {
      throw new WordPressAPIError(`${fieldName} is required`, 400, "missing_parameter");
    }

    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new WordPressAPIError(`${fieldName} must be an array`, 400, "invalid_parameter_type");
    }

    if (options?.minLength && value.length < options.minLength) {
      throw new WordPressAPIError(
        `${fieldName} must contain at least ${options.minLength} items`, 
        400, 
        "array_too_short"
      );
    }

    if (options?.maxLength && value.length > options.maxLength) {
      throw new WordPressAPIError(
        `${fieldName} must contain no more than ${options.maxLength} items`, 
        400, 
        "array_too_long"
      );
    }

    if (options?.itemValidator) {
      try {
        return value.map((item, index) => {
          try {
            return options.itemValidator!(item);
          } catch (error) {
            throw new WordPressAPIError(
              `${fieldName}[${index}] validation failed: ${getErrorMessage(error)}`,
              400,
              "array_item_invalid"
            );
          }
        });
      } catch (error) {
        if (error instanceof WordPressAPIError) {
          throw error;
        }
        throw new WordPressAPIError(
          `${fieldName} validation failed: ${getErrorMessage(error)}`,
          400,
          "array_validation_failed"
        );
      }
    }

    return value as T[];
  }

  /**
   * Validate WordPress ID parameters
   */
  validateWordPressId(value: unknown, fieldName: string = "id"): number {
    const id = this.validateNumber(value, fieldName, {
      required: true,
      min: 1,
      integer: true
    });

    return id;
  }
}

// Helper function to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}