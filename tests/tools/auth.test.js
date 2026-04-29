import { vi } from "vitest";
import { AuthTools } from "@/tools/auth.js";

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
      },
    };

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
      expect(switchTool.description).toContain("Switches the authentication method");
    });

    it("should have proper parameter definitions for wp_switch_auth_method", () => {
      const tools = authTools.getTools();
      const switchTool = tools.find((t) => t.name === "wp_switch_auth_method");

      expect(Object.keys(switchTool.inputSchema.properties)).toHaveLength(4);

      const methodProp = switchTool.inputSchema.properties.method;
      expect(methodProp).toBeDefined();
      expect(switchTool.inputSchema.required).toContain("method");
      expect(methodProp.enum).toEqual(["app-password", "jwt", "basic", "api-key", "cookie"]);

      const usernameProp = switchTool.inputSchema.properties.username;
      expect(usernameProp).toBeDefined();
      expect(switchTool.inputSchema.required).not.toContain("username");

      const passwordProp = switchTool.inputSchema.properties.password;
      expect(passwordProp).toBeDefined();
      expect(switchTool.inputSchema.required).not.toContain("password");

      const jwtProp = switchTool.inputSchema.properties.jwt_token;
      expect(jwtProp).toBeDefined();
      expect(switchTool.inputSchema.required).not.toContain("jwt_token");
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
    it("should always throw error indicating feature is not supported", async () => {
      const testCases = [
        { method: "app-password", username: "user", password: "pass" },
        { method: "jwt", jwt_token: "token123" },
        { method: "basic", username: "user", password: "pass" },
        { method: "api-key", username: "user", password: "pass" },
        { method: "cookie", username: "user", password: "pass" },
      ];

      for (const params of testCases) {
        await expect(authTools.handleSwitchAuthMethod(mockClient, params)).rejects.toThrow(
          "Failed to switch auth method: Dynamic authentication method switching is not currently supported. Please update your configuration file and restart the server.",
        );
      }
    });

    it("should handle empty parameters", async () => {
      await expect(authTools.handleSwitchAuthMethod(mockClient, {})).rejects.toThrow(
        "Failed to switch auth method: Dynamic authentication method switching is not currently supported",
      );
    });

    it("should handle null parameters", async () => {
      await expect(authTools.handleSwitchAuthMethod(mockClient, { method: null })).rejects.toThrow(
        "Failed to switch auth method: Dynamic authentication method switching is not currently supported",
      );
    });

    it("should properly destructure parameters even though feature is not implemented", async () => {
      // This test ensures the parameter destructuring works correctly
      const params = {
        method: "jwt",
        username: "testuser",
        password: "testpass",
        jwt_token: "testtoken",
      };

      await expect(authTools.handleSwitchAuthMethod(mockClient, params)).rejects.toThrow(
        "Dynamic authentication method switching is not currently supported",
      );
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

      const validMethods = ["app-password", "jwt", "basic", "api-key", "cookie"];
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
