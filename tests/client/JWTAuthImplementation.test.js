/**
 * Tests for JWTAuthImplementation
 * 
 * Tests the complete JWT authentication implementation including
 * token refresh, validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JWTAuthImplementation } from "@/client/managers/JWTAuthImplementation.js";
import { AuthenticationError as _AuthenticationError } from "@/types/client.js";

// Mock RequestManager
const mockRequestManager = {
  request: vi.fn(),
};

// Mock logger
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    api: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("JWTAuthImplementation", () => {
  let jwtAuth;
  let mockAuthConfig;

  beforeEach(() => {
    mockAuthConfig = {
      method: "jwt",
      username: "testuser",
      password: "testpass",
    };

    jwtAuth = new JWTAuthImplementation(mockRequestManager, mockAuthConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with config", () => {
      expect(jwtAuth).toBeDefined();
      expect(jwtAuth.getToken()).toBeNull();
      expect(jwtAuth.hasValidToken()).toBe(false);
    });
  });

  describe("JWT Authentication", () => {
    it("should authenticate successfully with valid credentials", async () => {
      const mockTokenResponse = {
        token: "jwt-token-123",
        user_email: "test@example.com",
        user_nicename: "testuser",
        user_display_name: "Test User",
        expires_in: 3600,
      };

      const mockValidateResponse = {
        code: "jwt_auth_valid_token",
        data: { status: 200 },
      };

      mockRequestManager.request
        .mockResolvedValueOnce(mockTokenResponse) // Auth request
        .mockResolvedValueOnce(mockValidateResponse); // Validation request

      await jwtAuth.authenticateJWT();

      expect(mockRequestManager.request).toHaveBeenCalledWith(
        "POST",
        "jwt-auth/v1/token",
        {
          username: "testuser",
          password: "testpass",
        },
        expect.objectContaining({
          skipAuth: true,
          timeout: 10000,
        })
      );

      expect(jwtAuth.getToken()).toBe("jwt-token-123");
      expect(jwtAuth.hasValidToken()).toBe(true);
    });

    it("should throw error for missing credentials", async () => {
      const invalidConfig = { method: "jwt" };
      const invalidJWT = new JWTAuthImplementation(mockRequestManager, invalidConfig);

      await expect(invalidJWT.authenticateJWT()).rejects.toThrow(
        "JWT authentication requires username and password"
      );
    });

    it("should throw error when no token received", async () => {
      mockRequestManager.request.mockResolvedValueOnce({
        user_email: "test@example.com",
        // Missing token
      });

      await expect(jwtAuth.authenticateJWT()).rejects.toThrow(
        "JWT token not received in response"
      );
    });

    it("should handle authentication errors", async () => {
      mockRequestManager.request.mockRejectedValueOnce(new Error("Network error"));

      await expect(jwtAuth.authenticateJWT()).rejects.toThrow(
        "JWT authentication failed: Network error"
      );

      expect(jwtAuth.getToken()).toBeNull();
      expect(jwtAuth.hasValidToken()).toBe(false);
    });
  });

  describe("Token Validation", () => {
    beforeEach(() => {
      // Set up authenticated state
      jwtAuth.jwtToken = "test-token";
      jwtAuth.tokenExpiry = Date.now() + 3600000; // 1 hour from now
    });

    it("should validate token successfully", async () => {
      mockRequestManager.request.mockResolvedValueOnce({
        code: "jwt_auth_valid_token",
        data: { status: 200 },
      });

      const isValid = await jwtAuth.validateToken();

      expect(isValid).toBe(true);
      expect(mockRequestManager.request).toHaveBeenCalledWith(
        "POST",
        "jwt-auth/v1/token/validate",
        {},
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-token",
          },
          timeout: 5000,
        })
      );
    });

    it("should handle invalid token", async () => {
      mockRequestManager.request.mockResolvedValueOnce({
        code: "jwt_auth_invalid_token",
        data: { status: 401 },
      });

      const isValid = await jwtAuth.validateToken();

      expect(isValid).toBe(false);
      expect(jwtAuth.getToken()).toBeNull();
    });

    it("should handle validation errors", async () => {
      mockRequestManager.request.mockRejectedValueOnce(new Error("Validation error"));

      const isValid = await jwtAuth.validateToken();

      expect(isValid).toBe(false);
    });

    it("should return false when no token exists", async () => {
      jwtAuth.clearToken();

      const isValid = await jwtAuth.validateToken();

      expect(isValid).toBe(false);
      expect(mockRequestManager.request).not.toHaveBeenCalled();
    });
  });

  describe("Token Refresh", () => {
    beforeEach(() => {
      // Set up with expired token
      jwtAuth.jwtToken = "expired-token";
      jwtAuth.tokenExpiry = Date.now() - 1000; // Expired 1 second ago
    });

    it("should refresh token using refresh endpoint", async () => {
      mockRequestManager.request.mockResolvedValueOnce({
        token: "refreshed-token-456",
        expires_in: 3600,
      });

      await jwtAuth.refreshToken();

      expect(mockRequestManager.request).toHaveBeenCalledWith(
        "POST",
        "jwt-auth/v1/token/refresh",
        {},
        expect.objectContaining({
          headers: {
            Authorization: "Bearer expired-token",
          },
          timeout: 5000,
        })
      );

      expect(jwtAuth.getToken()).toBe("refreshed-token-456");
      expect(jwtAuth.hasValidToken()).toBe(true);
    });

    it("should fall back to re-authentication when refresh fails", async () => {
      // Mock refresh endpoint failure
      mockRequestManager.request
        .mockRejectedValueOnce(new Error("Refresh not supported"))
        // Then successful re-auth
        .mockResolvedValueOnce({
          token: "new-auth-token",
          user_email: "test@example.com",
          user_nicename: "testuser",
          user_display_name: "Test User",
          expires_in: 3600,
        })
        // And validation
        .mockResolvedValueOnce({
          code: "jwt_auth_valid_token",
          data: { status: 200 },
        });

      await jwtAuth.refreshToken();

      expect(jwtAuth.getToken()).toBe("new-auth-token");
      expect(jwtAuth.hasValidToken()).toBe(true);
    });

    it("should throw error when no token to refresh", async () => {
      jwtAuth.clearToken();

      await expect(jwtAuth.refreshToken()).rejects.toThrow(
        "No JWT token to refresh"
      );
    });

    it("should throw error when refresh fails and no original credentials", async () => {
      const noCredsJWT = new JWTAuthImplementation(mockRequestManager, { method: "jwt" });
      noCredsJWT.jwtToken = "test-token";

      mockRequestManager.request.mockRejectedValueOnce(new Error("Refresh failed"));

      await expect(noCredsJWT.refreshToken()).rejects.toThrow(
        "Cannot refresh JWT token: original credentials not available"
      );
    });
  });

  describe("Token Expiry", () => {
    it("should detect expired tokens", () => {
      jwtAuth.tokenExpiry = Date.now() - 1000; // Expired

      expect(jwtAuth.isTokenExpired()).toBe(true);
    });

    it("should detect tokens expiring within 5 minutes", () => {
      jwtAuth.tokenExpiry = Date.now() + (4 * 60 * 1000); // 4 minutes from now

      expect(jwtAuth.isTokenExpired()).toBe(true); // Should be considered expired
    });

    it("should detect valid tokens", () => {
      jwtAuth.tokenExpiry = Date.now() + (10 * 60 * 1000); // 10 minutes from now

      expect(jwtAuth.isTokenExpired()).toBe(false);
    });

    it("should return true when no expiry set", () => {
      jwtAuth.tokenExpiry = null;

      expect(jwtAuth.isTokenExpired()).toBe(true);
    });
  });

  describe("Automatic Token Management", () => {
    it("should authenticate when no token exists", async () => {
      const mockTokenResponse = {
        token: "new-token",
        user_email: "test@example.com",
        user_nicename: "testuser",
        user_display_name: "Test User",
        expires_in: 3600,
      };

      mockRequestManager.request
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce({ code: "jwt_auth_valid_token", data: { status: 200 } });

      await jwtAuth.ensureValidToken();

      expect(jwtAuth.getToken()).toBe("new-token");
      expect(jwtAuth.hasValidToken()).toBe(true);
    });

    it("should refresh when token is expired", async () => {
      jwtAuth.jwtToken = "expired-token";
      jwtAuth.tokenExpiry = Date.now() - 1000;

      mockRequestManager.request.mockResolvedValueOnce({
        token: "refreshed-token",
        expires_in: 3600,
      });

      await jwtAuth.ensureValidToken();

      expect(jwtAuth.getToken()).toBe("refreshed-token");
    });

    it("should do nothing when token is still valid", async () => {
      jwtAuth.jwtToken = "valid-token";
      jwtAuth.tokenExpiry = Date.now() + (10 * 60 * 1000);

      await jwtAuth.ensureValidToken();

      expect(mockRequestManager.request).not.toHaveBeenCalled();
      expect(jwtAuth.getToken()).toBe("valid-token");
    });
  });

  describe("Auth Headers", () => {
    it("should return empty headers when no token", () => {
      const headers = jwtAuth.getAuthHeaders();

      expect(headers).toEqual({});
    });

    it("should return Bearer token header when token exists", () => {
      jwtAuth.jwtToken = "test-token";

      const headers = jwtAuth.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: "Bearer test-token",
      });
    });
  });

  describe("Logout", () => {
    beforeEach(() => {
      jwtAuth.jwtToken = "test-token";
      jwtAuth.tokenExpiry = Date.now() + 3600000;
    });

    it("should invalidate token on server and clear local token", async () => {
      mockRequestManager.request.mockResolvedValueOnce({ success: true });

      await jwtAuth.logout();

      expect(mockRequestManager.request).toHaveBeenCalledWith(
        "POST",
        "jwt-auth/v1/token/invalidate",
        {},
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-token",
          },
          timeout: 5000,
        })
      );

      expect(jwtAuth.getToken()).toBeNull();
      expect(jwtAuth.hasValidToken()).toBe(false);
    });

    it("should clear local token even if server invalidation fails", async () => {
      mockRequestManager.request.mockRejectedValueOnce(new Error("Server error"));

      await jwtAuth.logout();

      expect(jwtAuth.getToken()).toBeNull();
      expect(jwtAuth.hasValidToken()).toBe(false);
    });

    it("should handle logout when no token exists", async () => {
      jwtAuth.clearToken();

      await jwtAuth.logout();

      expect(mockRequestManager.request).not.toHaveBeenCalled();
    });
  });

  describe("Token Info", () => {
    it("should return token info when token exists", () => {
      const expiryTime = Date.now() + (30 * 60 * 1000); // 30 minutes
      jwtAuth.jwtToken = "test-token";
      jwtAuth.tokenExpiry = expiryTime;

      const info = jwtAuth.getTokenInfo();

      expect(info).toEqual({
        hasToken: true,
        isExpired: false,
        expiresAt: new Date(expiryTime).toISOString(),
        expiresIn: expect.any(Number),
      });

      expect(info.expiresIn).toBeGreaterThan(25 * 60 * 1000); // Should be close to 30 minutes
    });

    it("should return token info when no token exists", () => {
      const info = jwtAuth.getTokenInfo();

      expect(info).toEqual({
        hasToken: false,
        isExpired: true,
        expiresAt: null,
        expiresIn: null,
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors during authentication", async () => {
      mockRequestManager.request.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(jwtAuth.authenticateJWT()).rejects.toThrow(
        "JWT authentication failed: ECONNREFUSED"
      );
    });

    it("should handle malformed responses", async () => {
      mockRequestManager.request.mockResolvedValueOnce({
        invalid: "response",
        // Missing required token field
      });

      await expect(jwtAuth.authenticateJWT()).rejects.toThrow(
        "JWT token not received in response"
      );
    });

    it("should handle server errors during refresh", async () => {
      jwtAuth.jwtToken = "test-token";
      mockRequestManager.request.mockRejectedValueOnce({
        status: 500,
        message: "Internal server error",
      });

      await expect(jwtAuth.refreshToken()).rejects.toThrow(
        "JWT token refresh failed"
      );
    });
  });
});