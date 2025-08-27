/**
 * Base utility class for tool managers with enhanced type safety
 */

import { getErrorMessage } from "../utils/error.js";
import { WordPressId, createWordPressId, DeepReadonly, Result, createSuccess, createError } from "../types/enhanced.js";

interface EnhancedError extends Error {
  originalError?: unknown;
  operation?: string;
  context?: Record<string, unknown> | undefined;
  timestamp?: Date;
}

export interface ParameterValidationRule<T = unknown> {
  readonly key: string;
  readonly required: boolean;
  readonly type?: string;
  readonly validator?: (value: unknown) => value is T;
  readonly transformer?: (value: unknown) => T;
  readonly errorMessage?: string;
}

export interface CacheKeyOptions {
  readonly namespace?: string;
  readonly includeTimestamp?: boolean;
  readonly customHasher?: (params: Record<string, unknown>) => string;
}

export class BaseToolUtils {
  /**
   * Validate required parameters with enhanced type safety
   */
  static validateParams<T extends Record<string, unknown>>(
    params: unknown,
    rules: readonly ParameterValidationRule[],
  ): Result<T, Error> {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return createError(new ValidationError("Parameters must be a non-null object", "params", params));
    }

    const typedParams = params as Record<string, unknown>;
    const errors: Error[] = [];

    for (const rule of rules) {
      const value = typedParams[rule.key];
      const exists = rule.key in typedParams;

      // Check required fields
      if (rule.required && (!exists || value === undefined || value === null)) {
        errors.push(
          new ValidationError(rule.errorMessage || `Missing required parameter: ${rule.key}`, rule.key, value),
        );
        continue;
      }

      // Skip optional fields that don't exist
      if (!rule.required && !exists) {
        continue;
      }

      // Type validation
      if (rule.type && typeof value !== rule.type) {
        errors.push(
          new ValidationError(
            `Parameter ${rule.key} must be of type ${rule.type}, got ${typeof value}`,
            rule.key,
            value,
          ),
        );
        continue;
      }

      // Custom validation
      if (rule.validator && !rule.validator(value)) {
        errors.push(
          new ValidationError(rule.errorMessage || `Parameter ${rule.key} failed validation`, rule.key, value),
        );
        continue;
      }

      // Transform value if transformer provided
      if (rule.transformer) {
        try {
          typedParams[rule.key] = rule.transformer(value);
        } catch (_error) {
          errors.push(
            new ValidationError(
              `Failed to transform parameter ${rule.key}: ${getErrorMessage(error)}`,
              rule.key,
              value,
            ),
          );
        }
      }
    }

    if (errors.length > 0) {
      return createError(errors[0]); // Return first error for simplicity
    }

    return createSuccess(typedParams as T);
  }

  /**
   * Validate ID parameter with WordPress ID branding
   */
  static validateId(id: unknown, name = "id"): Result<WordPressId, Error> {
    try {
      const numId = Number(id);
      if (!Number.isInteger(numId) || numId <= 0) {
        return createError(new ValidationError(`Invalid ${name}: must be a positive integer`, name, id));
      }
      return createSuccess(createWordPressId(numId));
    } catch (_error) {
      return createError(new ValidationError(`Invalid ${name}: ${getErrorMessage(error)}`, name, id));
    }
  }

  /**
   * Validate multiple IDs at once
   */
  static validateIds(ids: unknown[], name = "ids"): Result<readonly WordPressId[], Error> {
    const validatedIds: WordPressId[] = [];

    for (let i = 0; i < ids.length; i++) {
      const result = this.validateId(ids[i], `${name}[${i}]`);
      if (!result.success) {
        return result;
      }
      validatedIds.push(result.data);
    }

    return createSuccess(validatedIds as readonly WordPressId[]);
  }

  /**
   * Handle errors consistently with enhanced error context
   */
  static handleError(error: unknown, operation: string, context?: Record<string, unknown> | undefined): Error {
    const errorMessage = getErrorMessage(error);
    const enhancedMessage = `Error in ${operation}: ${errorMessage}`;

    const enhancedError = new Error(enhancedMessage) as EnhancedError;
    enhancedError.originalError = error;
    enhancedError.operation = operation;
    enhancedError.context = context;
    enhancedError.timestamp = new Date();

    return enhancedError;
  }

  /**
   * Generate cache keys with enhanced options
   */
  static generateCacheKey(
    operation: string,
    params: DeepReadonly<Record<string, unknown>>,
    options: CacheKeyOptions = {},
  ): string {
    const { namespace = "wp", includeTimestamp = false, customHasher } = options;

    const site = params.site || "default";

    let paramStr: string;
    if (customHasher) {
      paramStr = customHasher(params as Record<string, unknown>);
    } else {
      paramStr = Object.entries(params)
        .filter(([key]) => key !== "site")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
        .join("|");
    }

    let cacheKey = `${namespace}:${site}:${operation}:${paramStr}`;

    if (includeTimestamp) {
      const timestamp = Math.floor(Date.now() / 1000);
      cacheKey += `:${timestamp}`;
    }

    return cacheKey;
  }

  /**
   * Format consistent success response messages
   */
  static formatSuccessMessage(operation: string, details?: string, count?: number): string {
    let message = operation;

    if (count !== undefined) {
      message += ` (${count} ${count === 1 ? "item" : "items"})`;
    }

    if (details) {
      message += `: ${details}`;
    } else {
      message += " completed successfully";
    }

    return message;
  }

  /**
   * Validate string parameters with enhanced checks
   */
  static validateString(
    value: unknown,
    name: string,
    options: {
      readonly required?: boolean;
      readonly minLength?: number;
      readonly maxLength?: number;
      readonly pattern?: RegExp;
      readonly allowEmpty?: boolean;
    } = {},
  ): Result<string, Error> {
    const { required = true, minLength, maxLength, pattern, allowEmpty = false } = options;

    if (value === undefined || value === null) {
      if (required) {
        return createError(new ValidationError(`${name} is required`, name, value));
      }
      return createSuccess("");
    }

    if (typeof value !== "string") {
      return createError(new ValidationError(`${name} must be a string`, name, value));
    }

    if (!allowEmpty && value.trim().length === 0) {
      return createError(new ValidationError(`${name} cannot be empty`, name, value));
    }

    if (minLength !== undefined && value.length < minLength) {
      return createError(new ValidationError(`${name} must be at least ${minLength} characters long`, name, value));
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return createError(new ValidationError(`${name} must be no more than ${maxLength} characters long`, name, value));
    }

    if (pattern && !pattern.test(value)) {
      return createError(new ValidationError(`${name} does not match required pattern`, name, value));
    }

    return createSuccess(value);
  }

  /**
   * Type-safe parameter extraction
   */
  static extractParam<T>(params: DeepReadonly<Record<string, unknown>>, key: string, defaultValue?: T): T | undefined {
    const value = params[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Safe array extraction with type validation
   */
  static extractArray<T>(
    params: DeepReadonly<Record<string, unknown>>,
    key: string,
    itemValidator?: (item: unknown) => item is T,
  ): readonly T[] {
    const value = params[key];

    if (!Array.isArray(value)) {
      return [];
    }

    if (itemValidator) {
      return value.filter(itemValidator);
    }

    return value as readonly T[];
  }
}

// Custom ValidationError class for enhanced error handling
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
