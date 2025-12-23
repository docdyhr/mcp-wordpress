/**
 * Centralized Logging System
 *
 * Replaces scattered console.log usage with structured, configurable logging.
 * Integrates with the centralized Config system for environment-aware behavior.
 */

import { ConfigHelpers } from "@/config/Config.js";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type LogContext = Record<string, unknown>;

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: LogContext | undefined;
  readonly component?: string | undefined;
  readonly requestId?: string | undefined;
  readonly siteId?: string | undefined;
  readonly userId?: string | undefined;
}

export interface LoggerOptions {
  readonly component?: string | undefined;
  readonly context?: LogContext | undefined;
  readonly siteId?: string | undefined;
  readonly requestId?: string | undefined;
}

/**
 * Log level priorities (higher number = more important)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/**
 * Get minimum log level from configuration
 */
function getMinLogLevel(): LogLevel {
  const configInstance = ConfigHelpers.get();
  const appConfig = configInstance.get();
  const configLevel = appConfig.debug.logLevel.toLowerCase();
  return LOG_LEVELS[configLevel as LogLevel] !== undefined ? (configLevel as LogLevel) : "info";
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const component = entry.component ? `[${entry.component}]` : "";
  const siteId = entry.siteId ? `{site:${entry.siteId}}` : "";
  const requestId = entry.requestId ? `{req:${entry.requestId.slice(0, 8)}}` : "";

  let message = `${timestamp} ${level} ${component}${siteId}${requestId} ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = JSON.stringify(entry.context);
    message += ` ${contextStr}`;
  }

  return message;
}

/**
 * Sanitize sensitive data from log context
 */
function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const keyLower = key.toLowerCase();
    const isSensitive =
      keyLower.includes("password") ||
      keyLower.includes("secret") ||
      keyLower.includes("token") ||
      keyLower.includes("key") ||
      keyLower.includes("credential");

    if (isSensitive) {
      if (typeof value === "string") {
        sanitized[key] = value.length > 0 ? `[REDACTED:${value.length}chars]` : "[EMPTY]";
      } else if (Array.isArray(value)) {
        sanitized[key] = "[EMPTY]"; // Redact entire array for sensitive fields
      } else {
        sanitized[key] = value; // Keep non-string, non-array values as-is
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Output log entry to appropriate destination
 */
function outputLog(entry: LogEntry): void {
  // In test environment, only log errors and fatals
  if (ConfigHelpers.isTest() && LOG_LEVELS[entry.level] < LOG_LEVELS.error) {
    return;
  }

  // In DXT mode, suppress most logging
  if (ConfigHelpers.isDXT() && LOG_LEVELS[entry.level] < LOG_LEVELS.warn) {
    return;
  }

  const formatted = formatLogEntry(entry);

  // Use stderr for all log output to avoid STDIO interference
  console.error(formatted);
}

/**
 * Main Logger Class
 */
export class Logger {
  private readonly options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = options;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalOptions: LoggerOptions): Logger {
    return new Logger({
      component: additionalOptions.component ?? this.options.component,
      siteId: additionalOptions.siteId ?? this.options.siteId,
      requestId: additionalOptions.requestId ?? this.options.requestId,
      context: {
        ...this.options.context,
        ...additionalOptions.context,
      },
    });
  }

  /**
   * Log at specific level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) {
      return;
    }

    const mergedContext = context ? sanitizeContext({ ...this.options.context, ...context }) : this.options.context;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(mergedContext && Object.keys(mergedContext).length > 0 && { context: mergedContext }),
      ...(this.options.component && { component: this.options.component }),
      ...(this.options.requestId && { requestId: this.options.requestId }),
      ...(this.options.siteId && { siteId: this.options.siteId }),
    };

    outputLog(entry);
  }

  // Convenience methods
  trace(message: string, context?: LogContext): void {
    this.log("trace", message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void;
  error(error: Error, context?: LogContext): void;
  error(messageOrError: string | Error, context?: LogContext): void {
    if (messageOrError instanceof Error) {
      this.log("error", messageOrError.message, {
        ...context,
        errorName: messageOrError.name,
        errorStack: messageOrError.stack,
      });
    } else {
      this.log("error", messageOrError, context);
    }
  }

  fatal(message: string, context?: LogContext): void;
  fatal(error: Error, context?: LogContext): void;
  fatal(messageOrError: string | Error, context?: LogContext): void {
    if (messageOrError instanceof Error) {
      this.log("fatal", messageOrError.message, {
        ...context,
        errorName: messageOrError.name,
        errorStack: messageOrError.stack,
      });
    } else {
      this.log("fatal", messageOrError, context);
    }
  }

  /**
   * Time a function execution
   */
  time<T>(message: string, fn: () => T): T;
  time<T>(message: string, fn: () => Promise<T>): Promise<T>;
  time<T>(message: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${message}`);

    try {
      const result = fn();

      // Check if result is a Promise by checking for then method
      if (result && typeof result === "object" && "then" in result) {
        // Cast to Promise<T> since we know it has a then method
        const promiseResult = result as Promise<T>;
        return promiseResult
          .then((value: T) => {
            const duration = Date.now() - start;
            this.debug(`Completed: ${message}`, { duration: `${duration}ms` });
            return value;
          })
          .catch((error: unknown) => {
            const duration = Date.now() - start;
            this.error(`Failed: ${message}`, {
              duration: `${duration}ms`,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          });
      } else {
        const duration = Date.now() - start;
        this.debug(`Completed: ${message}`, { duration: `${duration}ms` });
        return result;
      }
    } catch (_error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${message}`, {
        duration: `${duration}ms`,
        _error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create component-specific logger
 */
export function createLogger(component: string, options: Omit<LoggerOptions, "component"> = {}): Logger {
  return new Logger({ ...options, component });
}

/**
 * Create site-specific logger
 */
export function createSiteLogger(siteId: string, component?: string | undefined): Logger {
  return new Logger({
    siteId,
    ...(component && { component }),
  });
}

/**
 * Create request-specific logger
 */
export function createRequestLogger(
  requestId: string,
  component?: string | undefined,
  siteId?: string | undefined,
): Logger {
  return new Logger({
    requestId,
    ...(component && { component }),
    ...(siteId && { siteId }),
  });
}

/**
 * Logger factory for common scenarios
 */
export const LoggerFactory = {
  /**
   * Create logger for WordPress API operations
   */
  api: (siteId?: string | undefined) => createLogger("API", siteId ? { siteId } : {}),

  /**
   * Create logger for cache operations
   */
  cache: (siteId?: string | undefined) => createLogger("CACHE", siteId ? { siteId } : {}),

  /**
   * Create logger for tool operations
   */
  tool: (toolName: string, siteId?: string | undefined) => createLogger(`TOOL:${toolName}`, siteId ? { siteId } : {}),

  /**
   * Create logger for authentication
   */
  auth: (siteId?: string | undefined) => createLogger("AUTH", siteId ? { siteId } : {}),

  /**
   * Create logger for configuration
   */
  config: () => createLogger("CONFIG"),

  /**
   * Create logger for security operations
   */
  security: () => createLogger("SECURITY"),

  /**
   * Create logger for performance monitoring
   */
  performance: () => createLogger("PERF"),

  /**
   * Create logger for server operations
   */
  server: () => createLogger("SERVER"),
};
