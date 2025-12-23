/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides fault tolerance for external service calls by preventing
 * cascading failures and allowing systems to recover gracefully.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests fail fast
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 *   name: 'wordpress-api'
 * });
 *
 * try {
 *   const result = await breaker.execute(() => apiCall());
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     // Circuit is open, use fallback
 *   }
 * }
 * ```
 */

import { createLogger } from "./logger.js";

/**
 * Circuit breaker states
 */
/**
 * Circuit state values
 */
export const CircuitState = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
} as const;

/**
 * Circuit state type
 */
export type CircuitStateType = (typeof CircuitState)[keyof typeof CircuitState];

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerOptions {
  /** Name for logging and identification */
  name: string;
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting to close circuit (default: 30000) */
  resetTimeout?: number;
  /** Number of successful calls needed to close circuit from half-open (default: 2) */
  successThreshold?: number;
  /** Time window in ms to count failures (default: 60000) */
  failureWindow?: number;
  /** Timeout for individual operations in ms (default: 30000) */
  timeout?: number;
  /** Function to determine if an error should trip the breaker */
  isFailure?: (error: Error) => boolean;
  /** Callback when circuit opens */
  onOpen?: (name: string, failures: number) => void;
  /** Callback when circuit closes */
  onClose?: (name: string) => void;
  /** Callback when circuit enters half-open state */
  onHalfOpen?: (name: string) => void;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitStateType;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  rejectedRequests: number;
  timeInCurrentState: number;
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly resetTime: number,
  ) {
    super(`Circuit breaker '${circuitName}' is open. Retry after ${Math.ceil(resetTime / 1000)}s`);
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Error thrown when operation times out
 */
export class CircuitBreakerTimeoutError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly timeout: number,
  ) {
    super(`Circuit breaker '${circuitName}' operation timed out after ${timeout}ms`);
    this.name = "CircuitBreakerTimeoutError";
  }
}

/**
 * Failure record for tracking failures within time window
 */
interface FailureRecord {
  timestamp: number;
  error: Error;
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
  private state: CircuitStateType = CircuitState.CLOSED;
  private failures: FailureRecord[] = [];
  private successes: number = 0;
  private lastStateChange: number = Date.now();
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;

  // Statistics
  private totalRequests: number = 0;
  private failedRequests: number = 0;
  private successfulRequests: number = 0;
  private rejectedRequests: number = 0;

  // Configuration with defaults
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;
  private readonly failureWindow: number;
  private readonly timeout: number;
  private readonly isFailure: (error: Error) => boolean;
  private readonly onOpen: ((name: string, failures: number) => void) | undefined;
  private readonly onClose: ((name: string) => void) | undefined;
  private readonly onHalfOpen: ((name: string) => void) | undefined;

  private readonly logger = createLogger("CircuitBreaker");

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.successThreshold = options.successThreshold ?? 2;
    this.failureWindow = options.failureWindow ?? 60000;
    this.timeout = options.timeout ?? 30000;
    this.isFailure = options.isFailure ?? this.defaultIsFailure;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onHalfOpen = options.onHalfOpen;

    this.logger.debug(`Circuit breaker '${this.name}' initialized`, {
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      successThreshold: this.successThreshold,
    });
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        this.rejectedRequests++;
        const remainingTime = this.getRemainingResetTime();
        throw new CircuitBreakerOpenError(this.name, remainingTime);
      }
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new CircuitBreakerTimeoutError(this.name, this.timeout));
      }, this.timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successfulRequests++;
    this.lastSuccess = new Date();
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }

    // Clear old failures when successful in closed state
    if (this.state === CircuitState.CLOSED) {
      this.cleanOldFailures();
    }
  }

  /**
   * Handle operation error
   */
  private onError(error: Error): void {
    // Check if this error should count as a failure
    if (!this.isFailure(error)) {
      return;
    }

    this.failedRequests++;
    this.lastFailure = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.transitionTo(CircuitState.OPEN);
      return;
    }

    if (this.state === CircuitState.CLOSED) {
      this.recordFailure(error);

      // Clean old failures and check threshold
      this.cleanOldFailures();
      if (this.failures.length >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Record a failure
   */
  private recordFailure(error: Error): void {
    this.failures.push({
      timestamp: Date.now(),
      error,
    });
  }

  /**
   * Remove failures outside the time window
   */
  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.failureWindow;
    this.failures = this.failures.filter((f) => f.timestamp > cutoff);
  }

  /**
   * Check if we should attempt to reset (transition to half-open)
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChange >= this.resetTimeout;
  }

  /**
   * Get remaining time until reset attempt
   */
  private getRemainingResetTime(): number {
    const elapsed = Date.now() - this.lastStateChange;
    return Math.max(0, this.resetTimeout - elapsed);
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitStateType): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    this.logger.info(`Circuit '${this.name}' state change: ${oldState} -> ${newState}`);

    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      this.failures = [];
      this.successes = 0;
      this.onClose?.(this.name);
    } else if (newState === CircuitState.OPEN) {
      this.successes = 0;
      this.onOpen?.(this.name, this.failures.length);
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
      this.onHalfOpen?.(this.name);
    }
  }

  /**
   * Default failure detection - all errors are failures except timeouts and circuit breaker errors
   */
  private defaultIsFailure(error: Error): boolean {
    // Don't count circuit breaker's own errors as failures
    if (error instanceof CircuitBreakerOpenError || error instanceof CircuitBreakerTimeoutError) {
      return false;
    }

    // Count all other errors as failures
    return true;
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    this.cleanOldFailures();

    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      successfulRequests: this.successfulRequests,
      rejectedRequests: this.rejectedRequests,
      timeInCurrentState: Date.now() - this.lastStateChange,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitStateType {
    // Check for automatic transition to half-open
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }
    return this.state;
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    const state = this.getState();
    return state === CircuitState.CLOSED || state === CircuitState.HALF_OPEN;
  }

  /**
   * Force circuit to open state (for testing or manual intervention)
   */
  forceOpen(): void {
    this.logger.warn(`Circuit '${this.name}' forced open`);
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Force circuit to closed state (for testing or manual intervention)
   */
  forceClose(): void {
    this.logger.warn(`Circuit '${this.name}' forced closed`);
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastStateChange = Date.now();
    this.totalRequests = 0;
    this.failedRequests = 0;
    this.successfulRequests = 0;
    this.rejectedRequests = 0;
    this.lastFailure = null;
    this.lastSuccess = null;

    this.logger.info(`Circuit '${this.name}' reset`);
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();
  private readonly logger = createLogger("CircuitBreakerRegistry");

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  getBreaker(options: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(options.name);

    if (!breaker) {
      breaker = new CircuitBreaker(options);
      this.breakers.set(options.name, breaker);
      this.logger.debug(`Created circuit breaker: ${options.name}`);
    }

    return breaker;
  }

  /**
   * Get existing circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Get health summary of all circuit breakers
   */
  getHealthSummary(): {
    total: number;
    closed: number;
    open: number;
    halfOpen: number;
    healthy: boolean;
  } {
    let closed = 0;
    let open = 0;
    let halfOpen = 0;

    for (const breaker of this.breakers.values()) {
      switch (breaker.getState()) {
        case CircuitState.CLOSED:
          closed++;
          break;
        case CircuitState.OPEN:
          open++;
          break;
        case CircuitState.HALF_OPEN:
          halfOpen++;
          break;
      }
    }

    return {
      total: this.breakers.size,
      closed,
      open,
      halfOpen,
      healthy: open === 0,
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    this.logger.info("All circuit breakers reset");
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
    this.logger.info("All circuit breakers cleared");
  }
}

/**
 * Create a circuit breaker with default WordPress API settings
 */
export function createWordPressCircuitBreaker(
  siteId: string,
  options?: Partial<CircuitBreakerOptions>,
): CircuitBreaker {
  return CircuitBreakerRegistry.getInstance().getBreaker({
    name: `wordpress-api-${siteId}`,
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    failureWindow: 60000,
    timeout: 30000,
    isFailure: (error: Error) => {
      // Don't trip on client errors (4xx) except rate limiting
      const message = error.message.toLowerCase();
      if (message.includes("401") || message.includes("403")) {
        return false; // Auth errors shouldn't trip the breaker
      }
      if (message.includes("404")) {
        return false; // Not found is a valid response
      }
      if (message.includes("429")) {
        return true; // Rate limiting should trip the breaker
      }
      // Server errors (5xx) and network errors should trip
      return (
        message.includes("5") ||
        message.includes("timeout") ||
        message.includes("network") ||
        message.includes("econnrefused") ||
        message.includes("econnreset")
      );
    },
    ...options,
  });
}
