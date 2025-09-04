/**
 * Base class for all client managers
 * Provides common functionality and error handling
 */

import type { WordPressClientConfig } from "@/types/client.js";
import { WordPressAPIError } from "@/types/client.js";
import { debug, logError } from "@/utils/debug.js";
import { getErrorMessage } from "@/utils/error.js";

export abstract class BaseManager {
  protected config: WordPressClientConfig;

  constructor(config: WordPressClientConfig) {
    this.config = config;
  }

  /**
   * Standardized error handling for all managers
   */
  protected handleError(error: unknown, operation: string): never {
    logError(`${operation} failed:`, error as Record<string, unknown>);

    if (error instanceof WordPressAPIError) {
      throw error;
    }

    // Type guard for error-like objects
    const isErrorLike = (err: unknown): err is { name?: string; code?: string; message?: string } => {
      return typeof err === "object" && err !== null;
    };

    if (isErrorLike(error)) {
      if (error.name === "AbortError" || error.code === "ABORT_ERR") {
        throw new WordPressAPIError(`Request timeout after ${this.config.timeout}ms`, 408, "timeout");
      }

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new WordPressAPIError(`Cannot connect to WordPress site: ${this.config.baseUrl}`, 503, "connection_failed");
      }

      // Preserve custom error properties if they exist
      const customCode = (error as any).code;
      const customDetails = (error as any).details;
      if (customCode && customCode !== "ECONNREFUSED" && customCode !== "ENOTFOUND" && customCode !== "ABORT_ERR") {
        const message = getErrorMessage(error);
        throw new WordPressAPIError(`${operation} failed: ${message}`, 500, customCode, customDetails);
      }
    }

    const message = getErrorMessage(error);
    throw new WordPressAPIError(`${operation} failed: ${message}`, 500, "unknown_error");
  }

  /**
   * Standardized success logging
   */
  protected logSuccess(operation: string, details?: unknown): void {
    debug.log(`${operation} completed successfully`, details);
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, unknown>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        throw new WordPressAPIError(`Missing required parameter: ${field}`, 400, "missing_parameter");
      }
    }
  }
}
