import { jest } from "@jest/globals";
import { AuthTools } from "../../dist/tools/auth.js";

describe("AuthTools", () => {
  let authTools;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      getStats: jest.fn(),
      validateConnection: jest.fn(),
      getRawWordPressClient: jest.fn(),
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

    it("should have proper tool definitions", () => {
      const tools = authTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("parameters");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });
  });

  describe("wp_test_auth", () => {
    it("should successfully test authentication", async () => {
      mockClient.validateConnection.mockResolvedValue({
        isConnected: true,
        message: "Connected successfully",
        details: {
          authMethod: "app-password",
          site: {
            name: "Test Site",
            url: "https://example.com",
            authentication: {
              required: true,
              method: "application-passwords",
            },
          },
        },
      });

      const tools = authTools.getTools();
      const testAuthTool = tools.find((t) => t.name === "wp_test_auth");
      const result = await testAuthTool.handler({}, mockClient);

      expect(result).toMatchObject({
        content: [
          {
            type: "text",
            text: expect.stringContaining("✅ Successfully connected to WordPress site"),
          },
        ],
      });
      expect(mockClient.validateConnection).toHaveBeenCalled();
    });

    it("should handle authentication failures", async () => {
      mockClient.validateConnection.mockRejectedValue(new Error("Authentication failed"));

      const tools = authTools.getTools();
      const testAuthTool = tools.find((t) => t.name === "wp_test_auth");
      const result = await testAuthTool.handler({}, mockClient);

      expect(result).toMatchObject({
        content: [
          {
            type: "text",
            text: expect.stringContaining("❌ Failed to connect"),
          },
        ],
      });
    });

    it("should handle connection with warnings", async () => {
      mockClient.validateConnection.mockResolvedValue({
        isConnected: true,
        message: "Connected with warnings",
        warnings: ["Rate limit approaching"],
        details: {
          authMethod: "jwt",
          site: { name: "Test Site" },
        },
      });

      const tools = authTools.getTools();
      const testAuthTool = tools.find((t) => t.name === "wp_test_auth");
      const result = await testAuthTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("⚠️ Connected with warnings");
      expect(result.content[0].text).toContain("Rate limit approaching");
    });
  });

  describe("wp_get_auth_status", () => {
    it("should return authentication status", async () => {
      mockClient.getStats.mockReturnValue({
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        rateLimitHits: 0,
        cacheStats: {
          hits: 30,
          misses: 70,
          hitRate: 0.3,
        },
      });

      const tools = authTools.getTools();
      const authStatusTool = tools.find((t) => t.name === "wp_get_auth_status");
      const result = await authStatusTool.handler({}, mockClient);

      expect(result).toMatchObject({
        content: [
          {
            type: "text",
            text: expect.stringContaining("Authentication Status"),
          },
        ],
      });
      expect(result.content[0].text).toContain("✅ Authenticated");
      expect(result.content[0].text).toContain("Total Requests: 100");
      expect(result.content[0].text).toContain("Success Rate: 95.00%");
    });

    it("should handle missing stats gracefully", async () => {
      mockClient.getStats.mockReturnValue(null);

      const tools = authTools.getTools();
      const authStatusTool = tools.find((t) => t.name === "wp_get_auth_status");
      const result = await authStatusTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("❌ Not authenticated");
    });

    it("should show rate limit warnings", async () => {
      mockClient.getStats.mockReturnValue({
        totalRequests: 100,
        successfulRequests: 90,
        failedRequests: 10,
        rateLimitHits: 5,
        cacheStats: {
          hits: 20,
          misses: 80,
          hitRate: 0.2,
        },
      });

      const tools = authTools.getTools();
      const authStatusTool = tools.find((t) => t.name === "wp_get_auth_status");
      const result = await authStatusTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("⚠️ Rate limit hits detected");
    });
  });

  describe("wp_switch_auth_method", () => {
    it("should switch authentication method successfully", async () => {
      const mockRawClient = {
        updateAuthMethod: jest.fn().mockResolvedValue(true),
      };
      mockClient.getRawWordPressClient.mockReturnValue(mockRawClient);

      const tools = authTools.getTools();
      const switchAuthTool = tools.find((t) => t.name === "wp_switch_auth_method");
      const result = await switchAuthTool.handler(
        {
          method: "jwt",
          jwt_token: "test-token",
        },
        mockClient,
      );

      expect(result.content[0].text).toContain("Successfully switched authentication method to jwt");
      expect(mockRawClient.updateAuthMethod).toHaveBeenCalledWith("jwt", {
        jwt_token: "test-token",
      });
    });

    it("should validate required credentials for app-password", async () => {
      const tools = authTools.getTools();
      const switchAuthTool = tools.find((t) => t.name === "wp_switch_auth_method");
      const result = await switchAuthTool.handler(
        {
          method: "app-password",
        },
        mockClient,
      );

      expect(result.content[0].text).toContain("Username and app_password are required");
    });

    it("should validate required credentials for jwt", async () => {
      const tools = authTools.getTools();
      const switchAuthTool = tools.find((t) => t.name === "wp_switch_auth_method");
      const result = await switchAuthTool.handler(
        {
          method: "jwt",
        },
        mockClient,
      );

      expect(result.content[0].text).toContain("JWT token is required");
    });

    it("should handle auth method switch errors", async () => {
      const mockRawClient = {
        updateAuthMethod: jest.fn().mockRejectedValue(new Error("Switch failed")),
      };
      mockClient.getRawWordPressClient.mockReturnValue(mockRawClient);

      const tools = authTools.getTools();
      const switchAuthTool = tools.find((t) => t.name === "wp_switch_auth_method");
      const result = await switchAuthTool.handler(
        {
          method: "api-key",
          api_key: "test-key",
        },
        mockClient,
      );

      expect(result.content[0].text).toContain("Failed to switch authentication method");
      expect(result.content[0].text).toContain("Switch failed");
    });
  });

  describe("parameter validation", () => {
    it("should validate auth method enum values", () => {
      const tools = authTools.getTools();
      const switchAuthTool = tools.find((t) => t.name === "wp_switch_auth_method");
      const methodParam = switchAuthTool.parameters.find((p) => p.name === "method");

      expect(methodParam.enum).toEqual(["app-password", "jwt", "basic", "api-key", "cookie"]);
    });
  });
});
