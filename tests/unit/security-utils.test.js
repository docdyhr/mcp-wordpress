import { describe, it, expect } from "@jest/globals";
import { SecurityUtils } from "../../dist/security/SecurityUtils.js";
import { SecurityConfig } from "../../dist/security/SecurityConfig.js";

describe("SecurityUtils", () => {
  describe("sanitizeInput", () => {
    it("should remove script tags from input", () => {
      const malicious = '<script>alert("xss")</script>Hello';
      const result = SecurityUtils.sanitizeInput(malicious);
      expect(result).toBe("Hello");
    });

    it("should remove event handlers", () => {
      const malicious = '<div onclick="alert()">Hello</div>';
      const result = SecurityUtils.sanitizeInput(malicious);
      expect(result).toBe("<div>Hello</div>");
    });

    it("should preserve safe HTML", () => {
      const safe = "<p>Hello <strong>world</strong></p>";
      const result = SecurityUtils.sanitizeInput(safe);
      expect(result).toBe(safe);
    });
  });

  describe("isValidWordPressId", () => {
    it("should accept positive integers", () => {
      expect(SecurityUtils.isValidWordPressId(1)).toBe(true);
      expect(SecurityUtils.isValidWordPressId(123)).toBe(true);
    });

    it("should reject non-integers", () => {
      expect(SecurityUtils.isValidWordPressId(0)).toBe(false);
      expect(SecurityUtils.isValidWordPressId(-1)).toBe(false);
      expect(SecurityUtils.isValidWordPressId(1.5)).toBe(false);
      expect(SecurityUtils.isValidWordPressId("1")).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("should accept valid email addresses", () => {
      expect(SecurityUtils.isValidEmail("test@example.com")).toBe(true);
      expect(SecurityUtils.isValidEmail("user.name+tag@domain.co.uk")).toBe(
        true,
      );
    });

    it("should reject invalid email addresses", () => {
      expect(SecurityUtils.isValidEmail("invalid")).toBe(false);
      expect(SecurityUtils.isValidEmail("@domain.com")).toBe(false);
      expect(SecurityUtils.isValidEmail("test@")).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("should accept valid URLs", () => {
      expect(SecurityUtils.isValidUrl("https://example.com")).toBe(true);
      expect(SecurityUtils.isValidUrl("http://localhost:8080")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(SecurityUtils.isValidUrl("not-a-url")).toBe(false);
      expect(SecurityUtils.isValidUrl("javascript:alert()")).toBe(false);
      expect(SecurityUtils.isValidUrl("data:text/html,<script>")).toBe(false);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate tokens of specified length", () => {
      const token16 = SecurityUtils.generateSecureToken(16);
      const token32 = SecurityUtils.generateSecureToken(32);

      expect(token16).toHaveLength(16);
      expect(token32).toHaveLength(32);
    });

    it("should generate unique tokens", () => {
      const token1 = SecurityUtils.generateSecureToken(16);
      const token2 = SecurityUtils.generateSecureToken(16);

      expect(token1).not.toBe(token2);
    });

    it("should only contain safe characters", () => {
      const token = SecurityUtils.generateSecureToken(100);
      const safePattern = /^[A-Za-z0-9]+$/;

      expect(safePattern.test(token)).toBe(true);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limit", () => {
      const userId = "test-user-1";
      const config = SecurityConfig.rateLimiting.default;

      // Should allow initial request
      expect(SecurityUtils.checkRateLimit(userId, config)).toBe(true);
    });

    it("should block requests exceeding limit", () => {
      const userId = "test-user-2";
      const config = { windowMs: 1000, maxRequests: 2 };

      // Allow first two requests
      expect(SecurityUtils.checkRateLimit(userId, config)).toBe(true);
      expect(SecurityUtils.checkRateLimit(userId, config)).toBe(true);

      // Block third request
      expect(SecurityUtils.checkRateLimit(userId, config)).toBe(false);
    });

    it("should reset after time window", async () => {
      const userId = "test-user-3";
      const config = { windowMs: 100, maxRequests: 1 };

      // Use up the limit
      expect(SecurityUtils.checkRateLimit(userId, config)).toBe(true);
      expect(SecurityUtils.checkRateLimit(userId, config)).toBe(false);

      // Wait for window to reset
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow again
      expect(SecurityUtils.checkRateLimit(userId, config)).toBe(true);
    });
  });
});
