/**
 * Rate Limiting Utilities
 *
 * Simple in-memory rate limiting for authentication and API requests.
 * For production, consider using Redis or similar distributed cache.
 */

import { WordPressAPIError } from "../../types/client.js";

/**
 * Rate limiting tracker (simple in-memory implementation)
 * For production, use Redis or similar
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000, // 1 minute
  ) {}

  check(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || record.resetTime < now) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return;
    }

    if (record.count >= this.maxAttempts) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000);
      throw new WordPressAPIError(
        `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`,
        429,
        "RATE_LIMIT_EXCEEDED",
      );
    }

    record.count++;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Export a default rate limiter for authentication attempts
export const authRateLimiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes

export { RateLimiter };
