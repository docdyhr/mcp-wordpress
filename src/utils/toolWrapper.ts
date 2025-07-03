/**
 * Tool Wrapper Utility
 * Standardizes error handling and reduces repetitive try-catch blocks
 */

import { getErrorMessage } from "./error.js";

/**
 * Wrapper for tool methods that standardizes error handling
 */
export function withErrorHandling<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw new Error(`${operation}: ${getErrorMessage(error)}`);
    }
  };
}

/**
 * Wrapper for tool methods with validation
 */
export function withValidation<T extends any[], R>(
  operation: string,
  validator: (...args: T) => void,
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      validator(...args);
      return await fn(...args);
    } catch (error) {
      throw new Error(`${operation}: ${getErrorMessage(error)}`);
    }
  };
}

/**
 * Common validation functions
 */
export const validators = {
  requireSite: (client: any, params: any) => {
    if (!client) {
      throw new Error("WordPress client is required");
    }
  },

  requireId: (params: { id?: number | string }) => {
    if (!params.id) {
      throw new Error("ID parameter is required");
    }
  },

  requireNonEmpty: (value: any, fieldName: string) => {
    if (!value || (typeof value === "string" && value.trim() === "")) {
      throw new Error(`${fieldName} cannot be empty`);
    }
  },

  requireFields: (params: any, fields: string[]) => {
    for (const field of fields) {
      if (params[field] === undefined || params[field] === null) {
        throw new Error(`${field} is required`);
      }
    }
  },
};

/**
 * Decorator for class methods to add error handling
 */
export function errorHandler(operation: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        throw new Error(`${operation}: ${getErrorMessage(error)}`);
      }
    };

    return descriptor;
  };
}

/**
 * Helper to format success responses consistently
 */
export function formatSuccessResponse(content: string): string {
  return content;
}

/**
 * Helper to format error responses consistently
 */
export function formatErrorResponse(operation: string, error: any): never {
  const message = getErrorMessage(error);
  throw new Error(`${operation}: ${message}`);
}

/**
 * Simple tool wrapper for standalone async functions
 */
export async function toolWrapper<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
