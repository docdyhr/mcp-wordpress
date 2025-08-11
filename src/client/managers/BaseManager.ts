/**
 * Base class for all client managers
 * Provides common functionality and error handling
 */

import type { WordPressClientConfig } from "../../types/client.js";
import { WordPressAPIError } from "../../types/client.js";
import { debug, logError } from "../../utils/debug.js";
import { getErrorMessage } from "../../utils/error.js";

export abstract class BaseManager {
  protected config: WordPressClientConfig;

  constructor(config: WordPressClientConfig) {
    this.config = config;
  }

  /**
   * Standardized error handling for all managers
   */
  protected handleError(error: unknown, operation: string): never {
    logError(`${operation} failed:`, error);

    if (error instanceof WordPressAPIError) {
      throw error;
    }

    if (error.name === "AbortError" || error.code === "ABORT_ERR") {
      throw new WordPressAPIError(`Request timeout after ${this.config.timeout}ms`, 408, "timeout");
    }

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new WordPressAPIError(`Cannot connect to WordPress site: ${this.config.baseUrl}`, 503, "connection_failed");
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
