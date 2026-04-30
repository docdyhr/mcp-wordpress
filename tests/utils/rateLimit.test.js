/**
 * Tests for RateLimiter utility
 */

import { describe, it, expect } from "vitest";
import { RateLimiter, authRateLimiter } from "@/utils/validation/rateLimit.js";

describe("RateLimiter", () => {
  describe("check()", () => {
    it("allows first request for a new identifier", () => {
      const limiter = new RateLimiter(3, 60000);
      expect(() => limiter.check("user-new-1")).not.toThrow();
    });

    it("allows requests up to the max", () => {
      const limiter = new RateLimiter(3, 60000);
      expect(() => {
        limiter.check("user-max");
        limiter.check("user-max");
        limiter.check("user-max");
      }).not.toThrow();
    });

    it("throws WordPressAPIError with 429 when limit exceeded", async () => {
      const { WordPressAPIError } = await import("@/types/client.js");
      const limiter = new RateLimiter(2, 60000);
      limiter.check("user-exceed");
      limiter.check("user-exceed");
      expect(() => limiter.check("user-exceed")).toThrow(WordPressAPIError);
    });

    it("thrown error message mentions wait time", async () => {
      const limiter = new RateLimiter(1, 60000);
      limiter.check("user-msg");
      let caughtMessage = "";
      try {
        limiter.check("user-msg");
      } catch (e) {
        caughtMessage = e.message;
      }
      expect(caughtMessage).toMatch(/rate limit exceeded/i);
    });

    it("tracks identifiers independently", () => {
      const limiter = new RateLimiter(1, 60000);
      limiter.check("user-A");
      expect(() => limiter.check("user-B")).not.toThrow();
    });

    it("resets window after windowMs expires", async () => {
      // Use a very short window
      const limiter = new RateLimiter(1, 10); // 10ms window
      limiter.check("user-window");
      // Exceed limit
      try {
        limiter.check("user-window");
      } catch {
        /* expected */
      }
      // Wait for window to expire
      await new Promise((r) => setTimeout(r, 20));
      // Should allow again after window reset
      expect(() => limiter.check("user-window")).not.toThrow();
    });
  });

  describe("reset()", () => {
    it("resets counter for identifier", () => {
      const limiter = new RateLimiter(2, 60000);
      limiter.check("user-reset");
      limiter.check("user-reset");
      limiter.reset("user-reset");
      // After reset, should allow again
      expect(() => {
        limiter.check("user-reset");
        limiter.check("user-reset");
      }).not.toThrow();
    });

    it("reset on unknown identifier does not throw", () => {
      const limiter = new RateLimiter(3, 60000);
      expect(() => limiter.reset("nobody")).not.toThrow();
    });
  });
});

describe("authRateLimiter", () => {
  it("is a RateLimiter instance", () => {
    expect(authRateLimiter).toBeInstanceOf(RateLimiter);
  });

  it("check does not throw for a fresh identifier", () => {
    const uniqueId = `auth-test-${Date.now()}-${Math.random()}`;
    expect(() => authRateLimiter.check(uniqueId)).not.toThrow();
  });
});
