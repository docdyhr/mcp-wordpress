/**
 * Core Validation Utilities
 *
 * Basic validation functions for common data types including IDs, strings, and arrays.
 * These validators form the foundation for more specific validation logic.
 */

import { WordPressAPIError } from "@/types/client.js";
import { WordPressId, createWordPressId } from "@/types/enhanced.js";

/**
 * Validates and sanitizes numeric IDs with comprehensive edge case handling
 * Returns branded WordPress ID type for enhanced type safety
 */
export function validateId(id: unknown, fieldName: string = "id"): WordPressId {
  // Handle null/undefined
  if (id === null || id === undefined) {
    throw new WordPressAPIError(`${fieldName} is required`, 400, "MISSING_PARAMETER");
  }

  // Convert to string first to handle various input types
  const strId = String(id).trim();

  // Check for empty string after trim
  if (strId === "") {
    throw new WordPressAPIError(`${fieldName} cannot be empty`, 400, "INVALID_PARAMETER");
  }

  // Handle decimal inputs
  if (strId.includes(".")) {
    throw new WordPressAPIError(`${fieldName} must be a whole number, not a decimal`, 400, "INVALID_PARAMETER");
  }

  const numId = parseInt(strId, 10);

  // Check for NaN
  if (isNaN(numId)) {
    throw new WordPressAPIError(`Invalid ${fieldName}: "${id}" is not a valid number`, 400, "INVALID_PARAMETER");
  }

  // Check for negative or zero
  if (numId <= 0) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: must be a positive number (got ${numId})`,
      400,
      "INVALID_PARAMETER",
    );
  }

  // Check for max int32 limit (WordPress database limit)
  if (numId > 2147483647) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: exceeds maximum allowed value (2147483647)`,
      400,
      "INVALID_PARAMETER",
    );
  }

  return createWordPressId(numId);
}

/**
 * Validates string length within bounds
 */
export function validateString(
  value: unknown,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 1000,
): string {
  if (typeof value !== "string") {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be a string`, 400, "INVALID_PARAMETER");
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: length must be between ${minLength} and ${maxLength} characters`,
      400,
      "INVALID_PARAMETER",
    );
  }

  return trimmed;
}

/**
 * Validates arrays with size constraints and type safety
 */
export function validateArray<T>(value: unknown, fieldName: string, minItems: number = 0, maxItems: number = 100): T[] {
  if (!Array.isArray(value)) {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be an array`, 400, "INVALID_PARAMETER");
  }

  if (value.length < minItems) {
    throw new WordPressAPIError(`Invalid ${fieldName}: must have at least ${minItems} items`, 400, "INVALID_PARAMETER");
  }

  if (value.length > maxItems) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: cannot have more than ${maxItems} items`,
      400,
      "INVALID_PARAMETER",
    );
  }

  return value as T[];
}
