/**
 * Error handling utilities
 */
import { LoggerFactory } from "./logger.js";

const logger = LoggerFactory.server().child({ component: "ErrorUtils" });

// Environment flag to control legacy console logging noise. Default enabled to preserve
// backward compatibility and existing test expectations. Set LEGACY_ERROR_LOGS=0 to disable
// the direct console.error side-channel (structured logger still emits).
const LEGACY_ERROR_LOGS_ENABLED = process.env.LEGACY_ERROR_LOGS !== "0";

// Internal helper to avoid sprinkling conditionals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyConsoleError(...args: any[]) {
  if (LEGACY_ERROR_LOGS_ENABLED) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

// Test hook: exported only for instrumentation in unit tests (tree-shakeable)
// @__PURE__ This constant has no side effects and can be dropped in production builds
export const __errorUtilsLogger = logger;

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
  const message = getErrorMessage(error);
  // Legacy console logging (can be disabled via LEGACY_ERROR_LOGS=0)
  legacyConsoleError("Error occurred:", message);
  logger.warn("Error occurred - returning default value", {
    error: message,
  });
  return defaultValue;
}

/**
 * Enhanced error handler for consistent tool error handling
 */
export function handleToolError(error: unknown, operation: string, context?: Record<string, unknown>): never {
  const message = getErrorMessage(error);
  const errObj = error instanceof Error ? error : new Error(message);
  // Legacy console logging (can be disabled via LEGACY_ERROR_LOGS=0)
  legacyConsoleError(`Error in ${operation}:`, errObj);
  if (context) {
    legacyConsoleError("Context:", context);
  }
  logger.error(`Error in ${operation}`, {
    error: message,
    ...(context && { context }),
  });

  if (error instanceof Error && error.stack) {
    logger.debug("Error stack trace", { stack: error.stack });
  }

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
export function validateRequired(params: Record<string, unknown> | unknown, required: string[]): void {
  // Runtime guard: ensure params is a non-null object (tests expect throw on invalid input)
  if (params === null || typeof params !== "object") {
    throw new Error("Parameters must be an object");
  }
  // Only treat undefined or null as missing; accept legitimate falsy values: 0, false, ""
  const obj = params as Record<string, unknown>;
  const missing = required.filter((key) => obj[key] === undefined || obj[key] === null);
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
