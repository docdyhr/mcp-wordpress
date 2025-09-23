/**
 * Error Handler Implementation
 * Provides standardized error handling and logging for managers
 */

import { WordPressAPIError } from "@/types/client.js";
import { debug, logError } from "@/utils/debug.js";
import { getErrorMessage } from "@/utils/error.js";
import type { ErrorHandler, ConfigurationProvider } from "../interfaces/ManagerInterfaces.js";

export class ErrorHandlerImpl implements ErrorHandler {
  constructor(private configProvider: ConfigurationProvider) {}

  /**
   * Handle and transform errors with context
   */
  handleError(error: unknown, operation: string): never {
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
        throw new WordPressAPIError(`Request timeout after ${this.configProvider.config.timeout}ms`, 408, "timeout");
      }

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new WordPressAPIError(
          `Cannot connect to WordPress site: ${this.configProvider.config.baseUrl}`,
          503,
          "connection_failed",
        );
      }
    }

    const message = getErrorMessage(error);
    throw new WordPressAPIError(`${operation} failed: ${message}`, 500, "unknown_error");
  }

  /**
   * Log successful operations
   */
  logSuccess(operation: string, details?: unknown): void {
    debug.log(`${operation} completed successfully`, details);
  }

  /**
   * Handle authentication errors specifically
   */
  handleAuthError(error: unknown, operation: string): never {
    logError(`Authentication failed during ${operation}:`, error as Record<string, unknown>);

    if (error instanceof WordPressAPIError) {
      throw error;
    }

    const message = getErrorMessage(error);
    throw new WordPressAPIError(`Authentication failed during ${operation}: ${message}`, 401, "auth_failed");
  }

  /**
   * Handle rate limit errors specifically
   */
  handleRateLimitError(retryAfter?: number): never {
    const message = retryAfter ? `Rate limit exceeded. Retry after ${retryAfter} seconds.` : "Rate limit exceeded.";

    throw new WordPressAPIError(message, 429, "rate_limited");
  }

  /**
   * Create context-aware error
   */
  createContextualError(baseError: unknown, context: Record<string, unknown>): WordPressAPIError {
    const message = getErrorMessage(baseError);
    const contextString = Object.entries(context)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(", ");

    return new WordPressAPIError(`${message} (Context: ${contextString})`, 500, "contextual_error");
  }
}
