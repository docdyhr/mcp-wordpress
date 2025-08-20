import { vi } from "vitest";
import { AuthenticationManager } from "../../dist/client/managers/AuthenticationManager.js";
import { AuthenticationError } from "../../dist/types/client.js";

describe("AuthenticationManager", () => {
  let authManager;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      siteUrl: "https://example.com",
      username: "testuser",
      appPassword: "test-app-password",
      authMethod: "app-password",
    };

    authManager = new AuthenticationManager(mockConfig);
  });

  describe("constructor", () => {
    it("should initialize with valid config", () => {
      expect(authManager.config).toEqual(mockConfig);
    });

    it("should throw error with invalid config", () => {
      expect(() => {
        new AuthenticationManager({});
      }).toThrow("Site URL is required");
    });

    it("should validate authentication method", () => {
      expect(() => {
        new AuthenticationManager({
          siteUrl: "https://example.com",
          authMethod: "invalid-method",
        });
      }).toThrow("Invalid authentication method");
    });
  });

  describe("getAuthHeaders", () => {
    it("should return app-password headers", () => {
      const headers = authManager.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: `Basic ${Buffer.from("testuser:test-app-password").toString("base64")}`,
      });
    });

    it("should return JWT headers", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "test-jwt-token";

      const headers = authManager.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: "Bearer test-jwt-token",
      });
    });

    it("should return API key headers", () => {
      authManager.config.authMethod = "api-key";
      authManager.config.apiKey = "test-api-key";

      const headers = authManager.getAuthHeaders();

      expect(headers).toEqual({
        "X-API-Key": "test-api-key",
      });
    });

    it("should return basic auth headers", () => {
      authManager.config.authMethod = "basic";
      authManager.config.password = "test-password";

      const headers = authManager.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: `Basic ${Buffer.from("testuser:test-password").toString("base64")}`,
      });
    });

    it("should throw error for JWT without token", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = null;

      expect(() => {
        authManager.getAuthHeaders();
      }).toThrow(AuthenticationError);
    });

    it("should throw error for API key without key", () => {
      authManager.config.authMethod = "api-key";
      authManager.config.apiKey = null;

      expect(() => {
        authManager.getAuthHeaders();
      }).toThrow(AuthenticationError);
    });
  });

  describe("validateCredentials", () => {
    it("should validate app-password credentials", () => {
      expect(() => {
        authManager.validateCredentials();
      }).not.toThrow();
    });

    it("should validate JWT credentials", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "valid-token";

      expect(() => {
        authManager.validateCredentials();
      }).not.toThrow();
    });

    it("should throw error for missing username", () => {
      authManager.config.username = null;

      expect(() => {
        authManager.validateCredentials();
      }).toThrow("Username is required");
    });

    it("should throw error for missing app password", () => {
      authManager.config.appPassword = null;

      expect(() => {
        authManager.validateCredentials();
      }).toThrow("App password is required");
    });

    it("should throw error for missing JWT token", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = null;

      expect(() => {
        authManager.validateCredentials();
      }).toThrow("JWT token is required");
    });

    it("should throw error for missing API key", () => {
      authManager.config.authMethod = "api-key";
      authManager.config.apiKey = null;

      expect(() => {
        authManager.validateCredentials();
      }).toThrow("API key is required");
    });

    it("should throw error for missing basic password", () => {
      authManager.config.authMethod = "basic";
      authManager.config.password = null;

      expect(() => {
        authManager.validateCredentials();
      }).toThrow("Password is required");
    });
  });

  describe("updateAuthMethod", () => {
    it("should update to JWT authentication", () => {
      authManager.updateAuthMethod("jwt", {
        jwtToken: "new-jwt-token",
      });

      expect(authManager.config.authMethod).toBe("jwt");
      expect(authManager.config.jwtToken).toBe("new-jwt-token");
    });

    it("should update to API key authentication", () => {
      authManager.updateAuthMethod("api-key", {
        apiKey: "new-api-key",
      });

      expect(authManager.config.authMethod).toBe("api-key");
      expect(authManager.config.apiKey).toBe("new-api-key");
    });

    it("should update to basic authentication", () => {
      authManager.updateAuthMethod("basic", {
        username: "newuser",
        password: "newpass",
      });

      expect(authManager.config.authMethod).toBe("basic");
      expect(authManager.config.username).toBe("newuser");
      expect(authManager.config.password).toBe("newpass");
    });

    it("should throw error for invalid method", () => {
      expect(() => {
        authManager.updateAuthMethod("invalid", {});
      }).toThrow("Invalid authentication method");
    });

    it("should throw error for missing JWT token", () => {
      expect(() => {
        authManager.updateAuthMethod("jwt", {});
      }).toThrow("JWT token is required");
    });

    it("should throw error for missing API key", () => {
      expect(() => {
        authManager.updateAuthMethod("api-key", {});
      }).toThrow("API key is required");
    });
  });

  describe("refreshToken", () => {
    it("should refresh JWT token", async () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "old-token";
      authManager.config.refreshToken = "refresh-token";

      // Mock the refresh API call
      const mockRefresh = vi.fn().mockResolvedValue({
        token: "new-jwt-token",
        expires_in: 3600,
      });
      authManager.refreshJwtToken = mockRefresh;

      await authManager.refreshToken();

      expect(mockRefresh).toHaveBeenCalled();
      expect(authManager.config.jwtToken).toBe("new-jwt-token");
    });

    it("should handle refresh token errors", async () => {
      authManager.config.authMethod = "jwt";
      authManager.config.refreshToken = "invalid-refresh-token";

      const mockRefresh = vi.fn().mockRejectedValue(new Error("Invalid refresh token"));
      authManager.refreshJwtToken = mockRefresh;

      await expect(authManager.refreshToken()).rejects.toThrow("Invalid refresh token");
    });

    it("should not refresh non-JWT auth methods", async () => {
      authManager.config.authMethod = "app-password";

      await expect(authManager.refreshToken()).rejects.toThrow("Token refresh not supported");
    });
  });

  describe("isTokenExpired", () => {
    it("should check if JWT token is expired", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "token";
      authManager.config.tokenExpiry = Date.now() - 1000; // Expired 1 second ago

      expect(authManager.isTokenExpired()).toBe(true);
    });

    it("should check if JWT token is not expired", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "token";
      authManager.config.tokenExpiry = Date.now() + 60000; // Expires in 1 minute

      expect(authManager.isTokenExpired()).toBe(false);
    });

    it("should return false for non-JWT auth methods", () => {
      authManager.config.authMethod = "app-password";

      expect(authManager.isTokenExpired()).toBe(false);
    });

    it("should return true if no expiry set for JWT", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "token";
      authManager.config.tokenExpiry = null;

      expect(authManager.isTokenExpired()).toBe(true);
    });
  });

  describe("getAuthStatus", () => {
    it("should return auth status for app-password", () => {
      const status = authManager.getAuthStatus();

      expect(status).toEqual({
        method: "app-password",
        username: "testuser",
        isAuthenticated: true,
        tokenExpired: false,
      });
    });

    it("should return auth status for JWT", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "valid-token";
      authManager.config.tokenExpiry = Date.now() + 60000;

      const status = authManager.getAuthStatus();

      expect(status).toEqual({
        method: "jwt",
        username: "testuser",
        isAuthenticated: true,
        tokenExpired: false,
        tokenExpiry: expect.any(Number),
      });
    });

    it("should return status for expired JWT", () => {
      authManager.config.authMethod = "jwt";
      authManager.config.jwtToken = "expired-token";
      authManager.config.tokenExpiry = Date.now() - 1000;

      const status = authManager.getAuthStatus();

      expect(status.isAuthenticated).toBe(false);
      expect(status.tokenExpired).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty site URL", () => {
      expect(() => {
        new AuthenticationManager({
          siteUrl: "",
          username: "user",
          appPassword: "pass",
        });
      }).toThrow("Site URL is required");
    });

    it("should handle malformed site URL", () => {
      expect(() => {
        new AuthenticationManager({
          siteUrl: "not-a-url",
          username: "user",
          appPassword: "pass",
        });
      }).toThrow("Invalid site URL");
    });

    it("should handle null credentials", () => {
      const manager = new AuthenticationManager({
        siteUrl: "https://example.com",
        username: null,
        appPassword: null,
        authMethod: "app-password",
      });

      expect(() => {
        manager.validateCredentials();
      }).toThrow("Username is required");
    });

    it("should handle very long credentials", () => {
      const longPassword = "a".repeat(10000);
      const manager = new AuthenticationManager({
        siteUrl: "https://example.com",
        username: "user",
        appPassword: longPassword,
        authMethod: "app-password",
      });

      const headers = manager.getAuthHeaders();
      expect(headers.Authorization).toBeDefined();
    });

    it("should handle special characters in credentials", () => {
      const specialPassword = "pass@#$%^&*()_+-=[]{}|;:,.<>?";
      const manager = new AuthenticationManager({
        siteUrl: "https://example.com",
        username: "user",
        appPassword: specialPassword,
        authMethod: "app-password",
      });

      const headers = manager.getAuthHeaders();
      const decoded = Buffer.from(headers.Authorization.split(" ")[1], "base64").toString();
      expect(decoded).toBe(`user:${specialPassword}`);
    });

    it("should handle unicode characters in credentials", () => {
      const unicodePassword = "pässwörd123";
      const manager = new AuthenticationManager({
        siteUrl: "https://example.com",
        username: "user",
        appPassword: unicodePassword,
        authMethod: "app-password",
      });

      const headers = manager.getAuthHeaders();
      expect(headers.Authorization).toBeDefined();
    });

    it("should handle concurrent auth header requests", () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve(authManager.getAuthHeaders()));
      }

      return Promise.all(promises).then((results) => {
        expect(results).toHaveLength(100);
        results.forEach((headers) => {
          expect(headers.Authorization).toBeDefined();
        });
      });
    });
  });
});
