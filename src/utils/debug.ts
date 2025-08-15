/**
 * Debug Utility for MCP Server
 *
 * This module provides debug logging that only outputs when DEBUG mode is enabled.
 * This prevents console.log from interfering with MCP STDIO communication.
 */

import type { DebugInfo } from "../types/index.js";
import { config } from "../config/Config.js";

// Log levels
export type LogLevel = "debug" | "info" | "warn" | "error";

// Logger interface
export interface Logger {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

// Enhanced logger with structured logging
export interface StructuredLogger extends Logger {
  logStructured(info: DebugInfo): void;
  child(context: Record<string, unknown>): StructuredLogger;
}

import { ConfigHelpers } from "../config/Config.js";

// Check if debug mode is enabled
const isDebugMode = (): boolean => ConfigHelpers.shouldDebug();

// Get current timestamp
const getTimestamp = (): string => new Date().toISOString();

// Format log message with timestamp and level
const formatMessage = (level: LogLevel, args: unknown[]): string => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return `${prefix} ${args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
    .join(" ")}`;
};

// Handle circular references in objects
const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      },
      2,
    );
  } catch (_error) {
    return "[Object with circular reference]";
  }
};

/**
 * Debug logger that only outputs in debug mode
 */
export const debug: Logger = {
  log: (...args: unknown[]): void => {
    if (isDebugMode()) {
      // eslint-disable-next-line no-console
      console.error(formatMessage("debug", args)); // Use stderr for debug to avoid STDIO interference
    }
  },

  info: (...args: unknown[]): void => {
    if (isDebugMode()) {
      // eslint-disable-next-line no-console
      console.error(formatMessage("info", args));
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDebugMode()) {
      // eslint-disable-next-line no-console
      console.error(formatMessage("warn", args));
    }
  },

  error: (...args: unknown[]): void => {
    if (isDebugMode()) {
      // eslint-disable-next-line no-console
      console.error(formatMessage("error", args));
    }
  },
};

/**
 * Silent logger for production use
 */
export const silent: Logger = {
  log: (): void => {},
  warn: (): void => {},
  error: (): void => {},
  info: (): void => {},
};

/**
 * Enhanced structured logger
 */
class StructuredLoggerImpl implements StructuredLogger {
  private context: Record<string, unknown>;
  private enabled: boolean;

  constructor(context: Record<string, unknown> = {}, enabled = isDebugMode()) {
    this.context = context;
    this.enabled = enabled;
  }

  private output(level: LogLevel, args: unknown[]): void {
    if (!this.enabled) return;

    const debugInfo: DebugInfo = {
      timestamp: Date.now(),
      level,
      message: args.map((arg) => (typeof arg === "object" ? safeStringify(arg) : String(arg))).join(" "),
      ...(Object.keys(this.context).length > 0 && { context: this.context }),
    };

    // eslint-disable-next-line no-console
    console.error(safeStringify(debugInfo));
  }

  log(...args: unknown[]): void {
    this.output("debug", args);
  }

  info(...args: unknown[]): void {
    this.output("info", args);
  }

  warn(...args: unknown[]): void {
    this.output("warn", args);
  }

  error(...args: unknown[]): void {
    this.output("error", args);
  }

  logStructured(info: DebugInfo): void {
    if (!this.enabled) return;

    const enhancedInfo: DebugInfo = {
      ...info,
      context: { ...this.context, ...info.context },
    };

    // eslint-disable-next-line no-console
    console.error(safeStringify(enhancedInfo));
  }

  child(context: Record<string, unknown>): StructuredLogger {
    return new StructuredLoggerImpl({ ...this.context, ...context }, this.enabled);
  }
}

/**
 * Create a structured logger instance
 */
export const createStructuredLogger = (context: Record<string, unknown> = {}): StructuredLogger => {
  return new StructuredLoggerImpl(context);
};

/**
 * Default logger instance
 */
export const logger: Logger = debug;

/**
 * Create a logger with context
 */
export const createLogger = (context: Record<string, unknown> = {}): StructuredLogger => {
  return createStructuredLogger(context);
};

/**
 * Performance measurement utility
 */
export interface PerformanceTimer {
  end(): number;
  endWithLog(message?: string): number;
}

export const startTimer = (label?: string): PerformanceTimer => {
  const start = Date.now();

  return {
    end(): number {
      return Date.now() - start;
    },

    endWithLog(message = "Operation"): number {
      const duration = Date.now() - start;
      debug.info(`${message} completed in ${duration}ms${label ? ` [${label}]` : ""}`);
      return duration;
    },
  };
};

/**
 * Log error with stack trace
 */
export const logError = (error: Error | string, context?: Record<string, unknown>): void => {
  if (typeof error === "string") {
    debug.error(error, context);
  } else {
    debug.error(`${error.name}: ${error.message}`, {
      stack: error.stack,
      ...context,
    });
  }
};

/**
 * Conditional logging
 */
export const logIf = (condition: boolean, level: LogLevel = "debug") => {
  if (!condition) return silent;

  const loggers = {
    log: debug.log,
    info: debug.info,
    warn: debug.warn,
    error: debug.error,
  };

  return loggers[level as keyof typeof loggers] || debug.log;
};

/**
 * Type-safe environment variable getter with security logging
 */
export const getEnvVar = (key: string, defaultValue?: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined && defaultValue !== undefined) {
    // Don't log sensitive environment variable names in production
    const isSecretVar = /password|secret|token|key|auth/i.test(key);
    if (!isSecretVar || !config().app.isProduction) {
      debug.warn(`Environment variable ${key} not found, using default`);
    }
    return defaultValue;
  }
  return value;
};

/**
 * Validate required environment variables with secure error messages
 */
export const validateEnvVars = (required: string[]): void => {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // In production, don't expose which specific env vars are missing
    const errorMessage = config().app.isProduction
      ? `Missing ${missing.length} required environment variable(s)`
      : `Missing required environment variables: ${missing.join(", ")}`;
    const error = new Error(errorMessage);
    logError(error);
    throw error;
  }
};

/**
 * Sanitize environment variable for logging
 */
export const sanitizeEnvValue = (key: string, value: string): string => {
  const sensitiveKeys = /password|secret|token|key|auth|credential/i;

  if (sensitiveKeys.test(key)) {
    if (!value || value.length === 0) {
      return "[EMPTY]";
    }
    return `[REDACTED:${value.length}chars]`;
  }

  return value;
};

/**
 * Get sanitized environment summary for debugging
 */
export const getEnvSummary = (keys: string[]): Record<string, string> => {
  const summary: Record<string, string> = {};

  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined) {
      summary[key] = sanitizeEnvValue(key, value);
    } else {
      summary[key] = "[NOT_SET]";
    }
  }

  return summary;
};
