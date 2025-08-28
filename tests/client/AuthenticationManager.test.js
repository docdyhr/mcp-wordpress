/**
 * Tests for AuthenticationManager
 * 
 * Comprehensive test coverage for all authentication methods,
 * configuration validation, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthenticationManager } from "@/client/managers/AuthenticationManager.js";
import { AuthenticationError } from "@/types/client.js";
import { AUTH_METHODS } from "@/types/wordpress.js";

describe("AuthenticationManager", () => {
  let authManager;
  let mockConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Default valid config
    mockConfig = {
      siteUrl: "https://example.wordpress.com",
      authMethod: AUTH_METHODS.APP_PASSWORD,
      username: "testuser",
      appPassword: "test-app-password",
      timeout: 30000
    };

    authManager = new AuthenticationManager(mockConfig);
  });

  describe("Constructor", () => {
    it("should initialize with valid config", () => {
      expect(authManager).toBeDefined();
      expect(authManager.getConfig()).toEqual(expect.objectContaining({
        siteUrl: "https://example.wordpress.com",
        authMethod: AUTH_METHODS.APP_PASSWORD,
        username: "testuser",
        appPassword: "test-app-password"
      }));
    });

    it("should throw error for missing site URL", () => {
      expect(() => {
        new AuthenticationManager({ ...mockConfig, siteUrl: "" });
      }).toThrow(AuthenticationError);
    });

    it("should throw error for invalid site URL format", () => {
      expect(() => {
        new AuthenticationManager({ ...mockConfig, siteUrl: "not-a-url" });
      }).toThrow(AuthenticationError);
    });

    it("should throw error for invalid auth method", () => {
      expect(() => {
        new AuthenticationManager({ ...mockConfig, authMethod: "invalid-method" });
      }).toThrow(AuthenticationError);
    });

    it("should normalize site URL by removing trailing slash", () => {
      const manager = new AuthenticationManager({
        ...mockConfig,
        siteUrl: "https://example.com/"
      });
      
      expect(manager.getConfig().siteUrl).toBe("https://example.com");
    });
  });

  describe("Environment Configuration", () => {
    it("should get app password auth from env", () => {
      vi.doMock("../../dist/config/Config.js", () => ({
        config: () => ({
          wordpress: {
            authMethod: AUTH_METHODS.APP_PASSWORD,
            username: "env-user",
            appPassword: "env-password"
          }
        })
      }));

      const authConfig = AuthenticationManager.getAuthFromEnv();
      
      expect(authConfig).toEqual({
        method: AUTH_METHODS.APP_PASSWORD,
        username: "env-user",
        appPassword: "env-password"
      });
    });

    it("should get JWT auth from env", () => {
      vi.doMock("../../dist/config/Config.js", () => ({
        config: () => ({
          wordpress: {
            authMethod: AUTH_METHODS.JWT,
            username: "jwt-user",
            password: "jwt-password",
            jwtSecret: "jwt-secret"
          }
        })
      }));

      const authConfig = AuthenticationManager.getAuthFromEnv();
      
      expect(authConfig).toEqual({
        method: AUTH_METHODS.JWT,
        username: "jwt-user",
        password: "jwt-password",
        secret: "jwt-secret"
      });
    });

    it("should get basic auth from env", () => {
      vi.doMock("../../dist/config/Config.js", () => ({
        config: () => ({
          wordpress: {
            authMethod: AUTH_METHODS.BASIC,
            username: "basic-user",
            password: "basic-password"
          }
        })
      }));

      const authConfig = AuthenticationManager.getAuthFromEnv();
      
      expect(authConfig).toEqual({
        method: AUTH_METHODS.BASIC,
        username: "basic-user",
        password: "basic-password"
      });
    });

    it("should get API key auth from env", () => {
      vi.doMock("../../dist/config/Config.js", () => ({
        config: () => ({
          wordpress: {
            authMethod: AUTH_METHODS.API_KEY,
            apiKey: "test-api-key"
          }
        })
      }));

      const authConfig = AuthenticationManager.getAuthFromEnv();
      
      expect(authConfig).toEqual({
        method: AUTH_METHODS.API_KEY,
        apiKey: "test-api-key"
      });
    });

    it("should throw error for unsupported auth method", () => {
      vi.doMock("../../dist/config/Config.js", () => ({
        config: () => ({
          wordpress: {
            authMethod: "unsupported-method"
          }
        })
      }));

      expect(() => {
        AuthenticationManager.getAuthFromEnv();
      }).toThrow(AuthenticationError);
    });
  });

  describe("Authentication Headers", () => {
    it("should generate app password headers", () => {
      const headers = authManager.getAuthHeaders();
      
      expect(headers).toHaveProperty("Authorization");
      expect(headers.Authorization).toMatch(/^Basic /);
      
      // Verify base64 encoding
      const encoded = headers.Authorization.replace("Basic ", "");
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      expect(decoded).toBe("testuser:test-app-password");
    });

    it("should generate JWT headers", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "test-jwt-token"
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      const headers = jwtManager.getAuthHeaders();
      
      expect(headers).toEqual({
        Authorization: "Bearer test-jwt-token"
      });
    });

    it("should generate basic auth headers", () => {
      const basicConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.BASIC,
        username: "basicuser",
        password: "basicpass"
      };
      
      const basicManager = new AuthenticationManager(basicConfig);
      const headers = basicManager.getAuthHeaders();
      
      expect(headers).toHaveProperty("Authorization");
      expect(headers.Authorization).toMatch(/^Basic /);
      
      const encoded = headers.Authorization.replace("Basic ", "");
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      expect(decoded).toBe("basicuser:basicpass");
    });

    it("should generate API key headers", () => {
      const apiConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.API_KEY,
        apiKey: "test-api-key"
      };
      
      const apiManager = new AuthenticationManager(apiConfig);
      const headers = apiManager.getAuthHeaders();
      
      expect(headers).toEqual({
        "X-API-Key": "test-api-key"
      });
    });

    it("should generate empty headers for cookie auth", () => {
      const cookieConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.COOKIE
      };
      
      const cookieManager = new AuthenticationManager(cookieConfig);
      const headers = cookieManager.getAuthHeaders();
      
      expect(headers).toEqual({});
    });

    it("should throw error for missing app password credentials", () => {
      const invalidConfig = {
        ...mockConfig,
        appPassword: undefined
      };
      
      const invalidManager = new AuthenticationManager(invalidConfig);
      
      expect(() => {
        invalidManager.getAuthHeaders();
      }).toThrow(AuthenticationError);
    });

    it("should throw error for missing JWT token", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      expect(() => {
        jwtManager.getAuthHeaders();
      }).toThrow(AuthenticationError);
    });

    it("should throw error for unsupported auth method", () => {
      // Force invalid method by modifying config after creation
      authManager.config.authMethod = "invalid-method";
      
      expect(() => {
        authManager.getAuthHeaders();
      }).toThrow(AuthenticationError);
    });
  });

  describe("Configuration Validation", () => {
    it("should validate app password config successfully", () => {
      expect(() => {
        authManager.validateAuthConfig();
      }).not.toThrow();
    });

    it("should validate JWT config successfully", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        username: "jwtuser",
        password: "jwtpass",
        jwtSecret: "jwtsecret"
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      expect(() => {
        jwtManager.validateAuthConfig();
      }).not.toThrow();
    });

    it("should validate basic auth config successfully", () => {
      const basicConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.BASIC,
        username: "basicuser",
        password: "basicpass"
      };
      
      const basicManager = new AuthenticationManager(basicConfig);
      
      expect(() => {
        basicManager.validateAuthConfig();
      }).not.toThrow();
    });

    it("should validate API key config successfully", () => {
      const apiConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.API_KEY,
        apiKey: "test-api-key"
      };
      
      const apiManager = new AuthenticationManager(apiConfig);
      
      expect(() => {
        apiManager.validateAuthConfig();
      }).not.toThrow();
    });

    it("should throw error for missing auth method", () => {
      const invalidConfig = { ...mockConfig };
      delete invalidConfig.authMethod;
      
      const invalidManager = new AuthenticationManager(invalidConfig);
      
      expect(() => {
        invalidManager.validateAuthConfig();
      }).toThrow(AuthenticationError);
    });

    it("should throw error for incomplete app password config", () => {
      const invalidConfig = {
        ...mockConfig,
        appPassword: undefined
      };
      
      const invalidManager = new AuthenticationManager(invalidConfig);
      
      expect(() => {
        invalidManager.validateAuthConfig();
      }).toThrow(AuthenticationError);
    });

    it("should throw error for incomplete JWT config", () => {
      const invalidConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        username: "user",
        // Missing password and secret
      };
      
      const invalidManager = new AuthenticationManager(invalidConfig);
      
      expect(() => {
        invalidManager.validateAuthConfig();
      }).toThrow(AuthenticationError);
    });
  });

  describe("Credential Validation", () => {
    it("should validate app password credentials", () => {
      expect(() => {
        authManager.validateCredentials();
      }).not.toThrow();
    });

    it("should validate JWT credentials", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "valid-jwt-token"
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      expect(() => {
        jwtManager.validateCredentials();
      }).not.toThrow();
    });

    it("should throw error for missing username", () => {
      const invalidConfig = {
        ...mockConfig,
        username: undefined
      };
      
      const invalidManager = new AuthenticationManager(invalidConfig);
      
      expect(() => {
        invalidManager.validateCredentials();
      }).toThrow(AuthenticationError);
    });

    it("should throw error for missing JWT token", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      expect(() => {
        jwtManager.validateCredentials();
      }).toThrow(AuthenticationError);
    });

    it("should throw error for invalid auth method", () => {
      authManager.config.authMethod = "invalid";
      
      expect(() => {
        authManager.validateCredentials();
      }).toThrow(AuthenticationError);
    });
  });

  describe("Authentication Method Updates", () => {
    it("should update to app password authentication", () => {
      const credentials = {
        username: "newuser",
        appPassword: "new-app-password"
      };
      
      authManager.updateAuthMethod(AUTH_METHODS.APP_PASSWORD, credentials);
      
      expect(authManager.config.authMethod).toBe(AUTH_METHODS.APP_PASSWORD);
      expect(authManager.config.username).toBe("newuser");
      expect(authManager.config.appPassword).toBe("new-app-password");
    });

    it("should update to JWT authentication", () => {
      const credentials = {
        jwtToken: "new-jwt-token",
        username: "jwtuser"
      };
      
      authManager.updateAuthMethod(AUTH_METHODS.JWT, credentials);
      
      expect(authManager.config.authMethod).toBe(AUTH_METHODS.JWT);
      expect(authManager.config.jwtToken).toBe("new-jwt-token");
      expect(authManager.config.username).toBe("jwtuser");
    });

    it("should update to basic authentication", () => {
      const credentials = {
        username: "basicuser",
        password: "basicpass"
      };
      
      authManager.updateAuthMethod(AUTH_METHODS.BASIC, credentials);
      
      expect(authManager.config.authMethod).toBe(AUTH_METHODS.BASIC);
      expect(authManager.config.username).toBe("basicuser");
      expect(authManager.config.password).toBe("basicpass");
    });

    it("should update to API key authentication", () => {
      const credentials = {
        apiKey: "new-api-key"
      };
      
      authManager.updateAuthMethod(AUTH_METHODS.API_KEY, credentials);
      
      expect(authManager.config.authMethod).toBe(AUTH_METHODS.API_KEY);
      expect(authManager.config.apiKey).toBe("new-api-key");
    });

    it("should clear previous credentials when updating method", () => {
      // Start with app password
      expect(authManager.config.appPassword).toBeDefined();
      
      // Update to JWT
      const jwtCredentials = { jwtToken: "jwt-token" };
      authManager.updateAuthMethod(AUTH_METHODS.JWT, jwtCredentials);
      
      // App password should be cleared
      expect(authManager.config.appPassword).toBeUndefined();
      expect(authManager.config.jwtToken).toBe("jwt-token");
    });

    it("should throw error for invalid auth method", () => {
      const credentials = { username: "user" };
      
      expect(() => {
        authManager.updateAuthMethod("invalid-method", credentials);
      }).toThrow(AuthenticationError);
    });

    it("should throw error for incomplete credentials", () => {
      const incompleteCredentials = {}; // Missing required fields
      
      expect(() => {
        authManager.updateAuthMethod(AUTH_METHODS.APP_PASSWORD, incompleteCredentials);
      }).toThrow(AuthenticationError);
    });
  });

  describe("Token Management", () => {
    it("should detect expired JWT tokens", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "expired-token",
        tokenExpiry: Date.now() - 1000 // Expired 1 second ago
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      expect(jwtManager.isTokenExpired()).toBe(true);
    });

    it("should detect valid JWT tokens", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "valid-token",
        tokenExpiry: Date.now() + (60 * 60 * 1000) // Valid for 1 hour
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      expect(jwtManager.isTokenExpired()).toBe(false);
    });

    it("should treat missing expiry as expired", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "token-without-expiry"
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      expect(jwtManager.isTokenExpired()).toBe(true);
    });

    it("should return false for non-JWT auth methods", () => {
      expect(authManager.isTokenExpired()).toBe(false);
    });

    it("should refresh JWT token with mock implementation", async () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "old-token"
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      
      // Mock refresh method for testing
      jwtManager.refreshJwtToken = vi.fn().mockResolvedValue({
        token: "new-token",
        expires_in: 3600
      });
      
      await jwtManager.refreshToken();
      
      expect(jwtManager.config.jwtToken).toBe("new-token");
      expect(jwtManager.config.tokenExpiry).toBeGreaterThan(Date.now());
    });

    it("should throw error when refreshing non-JWT tokens", async () => {
      await expect(authManager.refreshToken()).rejects.toThrow(AuthenticationError);
    });
  });

  describe("Authentication Status", () => {
    it("should return authentication status for app password", () => {
      const status = authManager.getAuthStatus();
      
      expect(status).toEqual({
        method: AUTH_METHODS.APP_PASSWORD,
        username: "testuser",
        isAuthenticated: true,
        tokenExpired: false
      });
    });

    it("should return authentication status for JWT", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "valid-token",
        tokenExpiry: Date.now() + (60 * 60 * 1000)
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      const status = jwtManager.getAuthStatus();
      
      expect(status).toEqual({
        method: AUTH_METHODS.JWT,
        username: "testuser",
        isAuthenticated: true,
        tokenExpired: false,
        tokenExpiry: expect.any(Number)
      });
    });

    it("should return expired status for JWT with expired token", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "expired-token",
        tokenExpiry: Date.now() - 1000
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      const status = jwtManager.getAuthStatus();
      
      expect(status).toEqual({
        method: AUTH_METHODS.JWT,
        username: "testuser",
        isAuthenticated: false,
        tokenExpired: true,
        tokenExpiry: expect.any(Number)
      });
    });
  });

  describe("Test Authentication", () => {
    it("should pass test authentication with valid headers", async () => {
      const result = await authManager.testAuthentication();
      expect(result).toBe(true);
      expect(authManager.isAuthenticated()).toBe(true);
    });

    it("should handle authentication test failure", async () => {
      // Simulate invalid credentials
      authManager.config.appPassword = undefined;
      
      const result = await authManager.testAuthentication();
      expect(result).toBe(false);
      expect(authManager.isAuthenticated()).toBe(false);
    });
  });

  describe("Clear Authentication", () => {
    it("should clear authentication state", () => {
      authManager.clearAuthentication();
      
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it("should clear JWT token", () => {
      const jwtConfig = {
        ...mockConfig,
        authMethod: AUTH_METHODS.JWT,
        jwtToken: "test-token"
      };
      
      const jwtManager = new AuthenticationManager(jwtConfig);
      jwtManager.clearAuthentication();
      
      expect(jwtManager.isAuthenticated()).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle configuration errors gracefully", () => {
      expect(() => {
        new AuthenticationManager({
          siteUrl: "",
          authMethod: AUTH_METHODS.APP_PASSWORD
        });
      }).toThrow(AuthenticationError);
    });

    it("should handle missing credentials gracefully", () => {
      const invalidManager = new AuthenticationManager({
        siteUrl: "https://example.com",
        authMethod: AUTH_METHODS.APP_PASSWORD,
        username: "user"
        // Missing appPassword
      });
      
      expect(() => {
        invalidManager.validateCredentials();
      }).toThrow(AuthenticationError);
    });

    it("should handle invalid method gracefully", () => {
      expect(() => {
        authManager.updateAuthMethod("invalid", {});
      }).toThrow(AuthenticationError);
    });
  });
});