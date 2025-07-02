/**
 * Base utility class for tool managers to reduce code duplication
 */

import { getErrorMessage } from '../utils/error.js';

export class BaseToolUtils {
  /**
   * Validate required parameters
   */
  static validateParams(params: Record<string, any>, required: string[]): void {
    for (const field of required) {
      if (
        !(field in params) ||
        params[field] === undefined ||
        params[field] === null
      ) {
        throw new Error(`Missing required parameter: ${field}`);
      }
    }
  }

  /**
   * Validate ID parameter
   */
  static validateId(id: unknown, name = 'id'): number {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new Error(`Invalid ${name}: must be a positive integer`);
    }
    return numId;
  }

  /**
   * Handle errors consistently across all tools
   */
  static handleError(error: unknown, operation: string): string {
    const errorMessage = getErrorMessage(error);
    return `Error in ${operation}: ${errorMessage}`;
  }

  /**
   * Cache key generation helper
   */
  static generateCacheKey(
    operation: string,
    params: Record<string, unknown>
  ): string {
    const site = params.site || 'default';
    const paramStr = Object.entries(params)
      .filter(([key]) => key !== 'site')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    return `${site}:${operation}:${paramStr}`;
  }

  /**
   * Format consistent response messages
   */
  static formatSuccessMessage(operation: string, details?: string): string {
    return details
      ? `${operation}: ${details}`
      : `${operation} completed successfully`;
  }
}
