import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthTools } from "@/tools/auth.js";
import { WordPressAPIError } from "@/types/client.js";

const authenticateSpy = vi.fn();

vi.mock("@/client/api.js", async () => {
  const actual = await vi.importActual("@/client/api.js");

  class MockVerificationWordPressClient {
    constructor(config) {
      this.config = config;
    }

    authenticate() {
      return authenticateSpy(this.config);
    }
  }

  return {
    ...actual,
    WordPressClient: MockVerificationWordPressClient,
  };
});

describe("AuthTools", () => {
  let authTools;
  let mockClient;

  beforeEach(() => {
    // Mock WordPressClient with all required methods
    mockClient = {
      ping: vi.fn(),
      getCurrentUser: vi.fn(),
      isAuthenticated: true,
      config: {
        baseUrl: "https://example.com",
        auth: {
          method: "app-password",
        },
        timeout: 30000,
        maxRetries: 3,
      },
    };
    authenticateSpy.mockReset();

    authTools = new AuthTools();
  });

  describe("getTools", () => {
    it("should return an array of authentication tools", () => {
      const tools = authTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(3);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_test_auth");
      expect(toolNames).toContain("wp_get_auth_status");
      expect(toolNames).toContain("wp_switch_auth_method");
    });

    it("should have proper tool definitions with required properties", () => {
      const tools = authTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.name).toBe("string");
        expect(typeof tool.description).toBe("string");
        expect(typeof tool.inputSchema).toBe("object");
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should have detailed descriptions for each tool", () => {
      const tools = authTools.getTools();

      const testAuthTool = tools.find((t) => t.name === "wp_test_auth");
      expect(testAuthTool.description).toContain("Tests the authentication and connectivity");
      expect(testAuthTool.description).toContain("Usage Examples");

      const statusTool = tools.find((t) => t.name === "wp_get_auth_status");
      expect(statusTool.description).toContain("Gets the current authentication status");

      const switchTool = tools.find((t) => t.name === "wp_switch_auth_method");
      expect(switchTool.description).toContain("Validates an alternative authentication method");
    });

    it("should have proper parameter definitions for wp_switch_auth_method", () => {
      const tools = authTools.getTools();
      const switchTool = tools.find((t) => t.name === "wp_switch_auth_method");

      expect(Object.keys(switchTool.inputSchema.properties)).toHaveLength(5);

      const methodProp = switchTool.inputSchema.properties.method;
      expect(methodProp).toBeDefined();
      expect(switchTool.inputSchema.required).toContain("method");
      expect(methodProp.enum).toEqual(["app-password", "jwt", "basic", "api-key"]);

      const usernameProp = switchTool.inputSchema.properties.username;
      expect(usernameProp).toBeDefined();
      expect(switchTool.inputSchema.required).not.toContain("username");

      const passwordProp = switchTool.inputSchema.properties.password;
      expect(passwordProp).toBeDefined();
      expect(switchTool.inputSchema.required).not.toContain("password");

      const jwtSecretProp = switchTool.inputSchema.properties.jwt_secret;
      expect(jwtSecretProp).toBeDefined();
      expect(switchTool.inputSchema.required).not.toContain("jwt_secret");

      const apiKeyProp = switchTool.inputSchema.properties.api_key;
      expect(apiKeyProp).toBeDefined();
      expect(switchTool.inputSchema.required).not.toContain("api_key");
    });
  });

  describe("handleTestAuth", () => {
    it("should successfully test authentication with valid client", async () => {
      // Mock successful authentication
      mockClient.ping.mockResolvedValue(true);
      mockClient.getCurrentUser.mockResolvedValue({
        name: "Test User",
        slug: "testuser",
        roles: ["administrator", "editor"],
      });

      const result = await authTools.handleTestAuth(mockClient, {});

      expect(result).toHaveProperty("content");
      expect(result.content).toContain("✅ **Authentication successful!**");
      expect(result.content).toContain("Site:** https://example.com");
      expect(result.content).toContain("Method:** app-password");
      expect(result.content).toContain("User:** Test User (@testuser)");
      expect(result.content).toContain("Roles:** administrator, editor");
      expect(result.content).toContain("Your WordPress connection is working properly.");

      expect(mockClient.ping).toHaveBeenCalledTimes(1);
      expect(mockClient.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it("should handle ping failures gracefully", async () => {
      // Mock ping failure
      mockClient.ping.mockRejectedValue(new Error("Connection failed"));

      await expect(authTools.handleTestAuth(mockClient, {})).rejects.toThrow(
        "Authentication test failed: Connection failed",
      );

      expect(mockClient.ping).toHaveBeenCalledTimes(1);
      expect(mockClient.getCurrentUser).not.toHaveBeenCalled();
    });

    it("preserves statusCode/code from a typed client error instead of discarding them", async () => {
      mockClient.ping.mockRejectedValue(new WordPressAPIError("Not logged in", 401, "authentication_failed"));

      const error = await authTools.handleTestAuth(mockClient, {}).catch((e) => e);

      expect(error).toBeInstanceOf(WordPressAPIError);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("authentication_failed");
    });

    it("should fail immediately when ping returns false without calling getCurrentUser", async () => {
      // Real ping() never throws — it returns false on failure
      mockClient.ping.mockResolvedValue(false);

      await expect(authTools.handleTestAuth(mockClient, {})).rejects.toThrow(
        "Authentication test failed: Site unreachable: https://example.com",
      );

      expect(mockClient.ping).toHaveBeenCalledTimes(1);
      expect(mockClient.getCurrentUser).not.toHaveBeenCalled();
    });

    it("should time out after 10 seconds and not hang indefinitely", async () => {
      vi.useFakeTimers();
      try {
        // Simulate an unreachable site: ping never resolves
        mockClient.ping.mockImplementation(() => new Promise(() => {}));

        const authPromise = authTools.handleTestAuth(mockClient, {});
        vi.advanceTimersByTime(10_000);

        await expect(authPromise).rejects.toThrow("Authentication test failed: Connection timed out after 10s");

        expect(mockClient.ping).toHaveBeenCalledTimes(1);
        expect(mockClient.getCurrentUser).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("should not call getCurrentUser if ping resolves after the timeout already fired", async () => {
      vi.useFakeTimers();
      try {
        let resolvePing;
        mockClient.ping.mockImplementation(
          () =>
            new Promise((resolve) => {
              resolvePing = resolve;
            }),
        );

        const authPromise = authTools.handleTestAuth(mockClient, {});
        // Attach a handler immediately so the eventual rejection isn't
        // reported as unhandled while timers/microtasks advance below.
        const assertion = expect(authPromise).rejects.toThrow(
          "Authentication test failed: Connection timed out after 10s",
        );

        vi.advanceTimersByTime(10_000);
        await assertion;

        // ping() finally resolves, but only after the race already settled
        resolvePing(true);
        await Promise.resolve();
        await Promise.resolve();

        expect(mockClient.getCurrentUser).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("should handle getCurrentUser failures after successful ping", async () => {
      // Mock successful ping but failed user fetch
      mockClient.ping.mockResolvedValue(true);
      mockClient.getCurrentUser.mockRejectedValue(new Error("User fetch failed"));

      await expect(authTools.handleTestAuth(mockClient, {})).rejects.toThrow(
        "Authentication test failed: User fetch failed",
      );

      expect(mockClient.ping).toHaveBeenCalledTimes(1);
      expect(mockClient.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it("should handle user with no roles", async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.getCurrentUser.mockResolvedValue({
        name: "Basic User",
        slug: "basicuser",
        roles: null,
      });

      const result = await authTools.handleTestAuth(mockClient, {});

      expect(result.content).toContain("Roles:** N/A");
    });

    it("should handle user with empty roles array", async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.getCurrentUser.mockResolvedValue({
        name: "Basic User",
        slug: "basicuser",
        roles: [],
      });

      const result = await authTools.handleTestAuth(mockClient, {});

      expect(result.content).toContain("Roles:** N/A");
    });

    it("should handle different authentication methods in config", async () => {
      mockClient.config.auth.method = "jwt";
      mockClient.ping.mockResolvedValue(true);
      mockClient.getCurrentUser.mockResolvedValue({
        name: "JWT User",
        slug: "jwtuser",
        roles: ["subscriber"],
      });

      const result = await authTools.handleTestAuth(mockClient, {});

      expect(result.content).toContain("Method:** jwt");
    });
  });

  describe("handleGetAuthStatus", () => {
    it("should return authenticated status for authenticated client", async () => {
      mockClient.isAuthenticated = true;
      mockClient.getCurrentUser.mockResolvedValue({
        name: "Test User",
        slug: "testuser",
      });

      const result = await authTools.handleGetAuthStatus(mockClient, {});

      expect(result).toHaveProperty("content");
      expect(result.content).toContain("**Authentication Status for https://example.com**");
      expect(result.content).toContain("**Authenticated:** ✅ Yes");
      expect(result.content).toContain("**Method:** app-password");
      expect(result.content).toContain("**User:** Test User (@testuser)");

      expect(mockClient.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it("should return not authenticated status for unauthenticated client", async () => {
      // Simulate WordPress rejecting the credentials (live probe behaviour)
      mockClient.getCurrentUser.mockRejectedValue(new Error("Unauthorized"));

      const result = await authTools.handleGetAuthStatus(mockClient, {});

      expect(result.content).toContain("**Authenticated:** ❌ No");
      expect(result.content).toContain("**Status:** Not connected. Use 'wp_test_auth' to verify credentials.");

      expect(mockClient.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it("should handle getCurrentUser failure gracefully and report not-connected", async () => {
      // A failed live probe means not connected — should not throw
      mockClient.getCurrentUser.mockRejectedValue(new Error("User fetch failed"));

      const result = await authTools.handleGetAuthStatus(mockClient, {});

      expect(result.content).toContain("**Authenticated:** ❌ No");
      expect(result.content).toContain("Not connected");
    });

    it("should handle different base URLs", async () => {
      mockClient.config.baseUrl = "https://mysite.wordpress.com";
      mockClient.isAuthenticated = false;

      const result = await authTools.handleGetAuthStatus(mockClient, {});

      expect(result.content).toContain("**Authentication Status for https://mysite.wordpress.com**");
    });

    it("should handle different authentication methods", async () => {
      mockClient.config.auth.method = "jwt";
      mockClient.isAuthenticated = true;
      mockClient.getCurrentUser.mockResolvedValue({
        name: "JWT User",
        slug: "jwtuser",
      });

      const result = await authTools.handleGetAuthStatus(mockClient, {});

      expect(result.content).toContain("**Method:** jwt");
    });
  });

  describe("handleSwitchAuthMethod", () => {
    it("switches to app-password and verifies it", async () => {
      authenticateSpy.mockResolvedValue(true);

      const result = await authTools.handleSwitchAuthMethod(mockClient, {
        method: "app-password",
        username: "user",
        password: "app-password-value",
      });

      expect(authenticateSpy).toHaveBeenCalledWith({
        baseUrl: "https://example.com",
        timeout: 30000,
        maxRetries: 3,
        auth: {
          method: "app-password",
          username: "user",
          appPassword: "app-password-value",
        },
      });
      expect(mockClient.config.auth).toEqual({
        method: "app-password",
      });
      expect(result.content).toContain("Validated");
      expect(result.content).toContain("shared site client was not changed");
    });

    it("does not mutate the shared client auth config on successful validation", async () => {
      const originalAuth = { method: "app-password", username: "orig", appPassword: "origpass" };
      mockClient.config.auth = originalAuth;
      authenticateSpy.mockResolvedValue(true);

      await authTools.handleSwitchAuthMethod(mockClient, {
        method: "basic",
        username: "user",
        password: "pass",
      });

      expect(mockClient.config.auth).toBe(originalAuth);
      expect(mockClient.config.auth.method).toBe("app-password");
    });

    it("switches to basic auth and verifies it", async () => {
      authenticateSpy.mockResolvedValue(true);

      await authTools.handleSwitchAuthMethod(mockClient, {
        method: "basic",
        username: "user",
        password: "pass",
      });

      expect(authenticateSpy).toHaveBeenCalledWith({
        baseUrl: "https://example.com",
        timeout: 30000,
        maxRetries: 3,
        auth: {
          method: "basic",
          username: "user",
          password: "pass",
        },
      });
    });

    it("switches to jwt and verifies it", async () => {
      authenticateSpy.mockResolvedValue(true);

      await authTools.handleSwitchAuthMethod(mockClient, {
        method: "jwt",
        username: "user",
        password: "pass",
        jwt_secret: "secret123",
      });

      expect(authenticateSpy).toHaveBeenCalledWith({
        baseUrl: "https://example.com",
        timeout: 30000,
        maxRetries: 3,
        auth: {
          method: "jwt",
          username: "user",
          password: "pass",
          secret: "secret123",
        },
      });
    });

    it("switches to api-key but does not claim the key was verified (regression: api-key has no live verification step)", async () => {
      authenticateSpy.mockResolvedValue(true);

      const result = await authTools.handleSwitchAuthMethod(mockClient, {
        method: "api-key",
        api_key: "key123",
      });

      expect(authenticateSpy).toHaveBeenCalledWith({
        baseUrl: "https://example.com",
        timeout: 30000,
        maxRetries: 3,
        auth: {
          method: "api-key",
          apiKey: "key123",
        },
      });
      expect(result.content).not.toContain("verified it successfully");
      expect(result.content).toContain("not verified with a live request");
    });

    it("rejects a method missing its required fields without touching the client", async () => {
      await expect(authTools.handleSwitchAuthMethod(mockClient, { method: "jwt", username: "user" })).rejects.toThrow(
        "'jwt' requires 'username', 'password', and 'jwt_secret'.",
      );

      expect(authenticateSpy).not.toHaveBeenCalled();
    });

    it("leaves the shared client auth config unchanged when the new credentials fail verification", async () => {
      const originalAuth = { method: "app-password", username: "orig", appPassword: "origpass" };
      mockClient.config.auth = originalAuth;
      authenticateSpy.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(
        authTools.handleSwitchAuthMethod(mockClient, { method: "basic", username: "user", password: "wrong" }),
      ).rejects.toThrow("Failed to validate auth method: 401 Unauthorized");

      expect(mockClient.config.auth).toBe(originalAuth);
    });

    it("rejects an empty method", async () => {
      await expect(authTools.handleSwitchAuthMethod(mockClient, {})).rejects.toThrow("Failed to validate auth method:");
      expect(authenticateSpy).not.toHaveBeenCalled();
    });

    it("does not touch the shared client instance while validating alternate credentials", async () => {
      authenticateSpy.mockResolvedValue(true);
      mockClient.setAuthConfig = vi.fn();
      mockClient.clearCache = vi.fn();

      await authTools.handleSwitchAuthMethod(mockClient, {
        method: "basic",
        username: "user",
        password: "pass",
      });

      expect(mockClient.setAuthConfig).not.toHaveBeenCalled();
      expect(mockClient.clearCache).not.toHaveBeenCalled();
    });

    it("surfaces isolated verification failures without mutating the shared client", async () => {
      const originalAuth = { method: "jwt", username: "orig", password: "origpass", secret: "origsecret" };
      mockClient.config.auth = originalAuth;
      authenticateSpy.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(
        authTools.handleSwitchAuthMethod(mockClient, { method: "basic", username: "user", password: "wrong" }),
      ).rejects.toThrow("Failed to validate auth method: 401 Unauthorized");

      expect(mockClient.config.auth).toBe(originalAuth);
      expect(authenticateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling edge cases", () => {
    it("should handle null client gracefully in handleTestAuth", async () => {
      await expect(authTools.handleTestAuth(null, {})).rejects.toThrow();
    });

    it("should handle client without config in handleTestAuth", async () => {
      const badClient = { ping: vi.fn(), getCurrentUser: vi.fn() };
      badClient.ping.mockResolvedValue(true);

      await expect(authTools.handleTestAuth(badClient, {})).rejects.toThrow();
    });

    it("should handle client without config in handleGetAuthStatus", async () => {
      const badClient = { isAuthenticated: true };

      await expect(authTools.handleGetAuthStatus(badClient, {})).rejects.toThrow();
    });

    it("should handle unexpected error types in handleTestAuth", async () => {
      mockClient.ping.mockRejectedValue("String error");

      await expect(authTools.handleTestAuth(mockClient, {})).rejects.toThrow(
        "Authentication test failed: String error",
      );
    });

    it("should handle unexpected error types in handleGetAuthStatus gracefully", async () => {
      // A non-Error rejection from the live probe should still return not-connected, not throw
      mockClient.getCurrentUser.mockRejectedValue(123); // Number as error

      const result = await authTools.handleGetAuthStatus(mockClient, {});

      expect(result.content).toContain("**Authenticated:** ❌ No");
    });
  });

  describe("authentication method validation", () => {
    it("should accept all valid authentication methods in tool parameters", () => {
      const tools = authTools.getTools();
      const switchTool = tools.find((t) => t.name === "wp_switch_auth_method");
      const methodProp = switchTool.inputSchema.properties.method;

      const validMethods = ["app-password", "jwt", "basic", "api-key"];
      expect(methodProp.enum).toEqual(validMethods);

      // Ensure all methods are strings
      methodProp.enum.forEach((method) => {
        expect(typeof method).toBe("string");
        expect(method.length).toBeGreaterThan(0);
      });
    });

    it("should have consistent parameter types", () => {
      const tools = authTools.getTools();
      const switchTool = tools.find((t) => t.name === "wp_switch_auth_method");

      Object.entries(switchTool.inputSchema.properties).forEach(([name, prop]) => {
        expect(typeof name).toBe("string");
        expect(prop).toHaveProperty("type");
        expect(prop).toHaveProperty("description");
        expect(typeof prop.type).toBe("string");
        expect(typeof prop.description).toBe("string");
      });
    });
  });

  describe("integration scenarios", () => {
    it("should work with real-world user data structures", async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.getCurrentUser.mockResolvedValue({
        ID: 1,
        user_login: "admin",
        user_nicename: "admin",
        user_email: "admin@example.com",
        user_url: "https://example.com",
        user_registered: "2023-01-01 00:00:00",
        user_activation_key: "",
        user_status: 0,
        display_name: "Administrator",
        name: "Administrator",
        slug: "admin",
        roles: ["administrator"],
        capabilities: {
          administrator: true,
        },
        meta: {},
      });

      const result = await authTools.handleTestAuth(mockClient, {});

      expect(result.content).toContain("**User:** Administrator (@admin)");
      expect(result.content).toContain("**Roles:** administrator");
    });

    it("should handle complex authentication configs", async () => {
      mockClient.config = {
        baseUrl: "https://complex-site.example.com/wp-json",
        auth: {
          method: "app-password",
          username: "complex-user",
          appPassword: "xxxx xxxx xxxx xxxx",
        },
        timeout: 30000,
        maxRetries: 3,
      };

      mockClient.ping.mockResolvedValue(true);
      mockClient.getCurrentUser.mockResolvedValue({
        name: "Complex User",
        slug: "complex-user",
        roles: ["administrator", "editor", "author"],
      });

      const result = await authTools.handleTestAuth(mockClient, {});

      expect(result.content).toContain("**Site:** https://complex-site.example.com/wp-json");
      expect(result.content).toContain("**Method:** app-password");
      expect(result.content).toContain("**Roles:** administrator, editor, author");
    });
  });
});
