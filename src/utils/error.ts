/**
 * Error handling utilities
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Unknown error occurred";
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function logAndReturn<T>(error: unknown, defaultValue: T): T {
  console.error("Error occurred:", getErrorMessage(error));
  return defaultValue;
}

/**
 * Enhanced error handler for consistent tool error handling
 */
export function handleToolError(error: unknown, operation: string, context?: Record<string, unknown>): never {
  console.error(`Error in ${operation}:`, error);

  if (context) {
    console.error("Context:", context);
  }

  const message = getErrorMessage(error);

  // Provide more specific error messages based on error content
  if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
    throw new Error(
      `Connection failed during ${operation}. Please check your WordPress site URL and network connection.`,
    );
  }

  if (message.includes("401") || message.includes("Unauthorized")) {
    throw new Error(`Authentication failed during ${operation}. Please check your WordPress credentials.`);
  }

  if (message.includes("403") || message.includes("Forbidden")) {
    throw new Error(`Permission denied during ${operation}. Please check your user permissions.`);
  }

  if (message.includes("429") || message.includes("Too Many Requests")) {
    throw new Error(`Rate limit exceeded during ${operation}. Please try again later.`);
  }

  throw new Error(`Failed to ${operation}: ${message}`);
}

/**
 * Validates required parameters
 */
export function validateRequired(params: Record<string, unknown>, required: string[]): void {
  const missing = required.filter((key) => !params[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }
}

/**
 * Validates site parameter for multi-site configurations
 */
export function validateSite(site: string | undefined, availableSites: string[]): string {
  if (!site) {
    if (availableSites.length === 1) {
      return availableSites[0];
    }
    throw new Error(
      `Site parameter is required when multiple sites are configured. Available sites: ${availableSites.join(", ")}`,
    );
  }

  if (!availableSites.includes(site)) {
    throw new Error(`Site '${site}' not found. Available sites: ${availableSites.join(", ")}`);
  }

  return site;
}
