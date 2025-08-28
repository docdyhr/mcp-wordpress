/**
 * Tests for BaseToolManager
 * 
 * Tests the base class for all WordPress tool managers including
 * tool definition handling, parameter validation, and execution patterns.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BaseToolManager } from "@/tools/BaseToolManager.js";

// Mock WordPress Client
const mockWordPressClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  baseUrl: "https://test.example.com",
  config: {
    auth: { method: "app-password" },
    baseUrl: "https://test.example.com",
  },
};

// Mock logger to avoid console output
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    tool: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      time: vi.fn().mockImplementation((name, fn) => fn()),
    }),
  },
}));

// Mock tool wrapper
vi.mock("../../dist/utils/toolWrapper.js", () => ({
  toolWrapper: vi.fn().mockImplementation((fn) => fn),
}));

describe("BaseToolManager", () => {
  let toolManager;

  // Create concrete implementation for testing
  class TestToolManager extends BaseToolManager {
    constructor(client) {
      super(client);
      this.toolCategory = "test";
    }

    getTools() {
      return [
        {
          name: "test_get_item",
          description: "Get a test item",
          inputSchema: {
            type: "object",
            properties: {
              id: {
                type: "number",
                description: "Item ID",
              },
              site: {
                type: "string",
                description: "Site identifier",
              },
            },
            required: ["id"],
          },
          handler: this.getItem.bind(this),
        },
        {
          name: "test_create_item",
          description: "Create a test item",
          inputSchema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Item title",
              },
              content: {
                type: "string",
                description: "Item content",
              },
              site: {
                type: "string",
                description: "Site identifier",
              },
            },
            required: ["title"],
          },
          handler: this.createItem.bind(this),
        },
      ];
    }

    async getItem(params) {
      const { id, site } = params;
      const client = this.getClientForSite(site);
      
      return await client.get(`/test/items/${id}`);
    }

    async createItem(params) {
      const { title, content, site } = params;
      const client = this.getClientForSite(site);
      
      return await client.post("/test/items", { title, content });
    }
  }

  beforeEach(() => {
    toolManager = new TestToolManager(mockWordPressClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with WordPress client", () => {
      expect(toolManager).toBeDefined();
      expect(toolManager.client).toBe(mockWordPressClient);
    });

    it("should initialize logger", () => {
      expect(toolManager.logger).toBeDefined();
    });

    it("should set tool category", () => {
      expect(toolManager.toolCategory).toBe("test");
    });

    it("should throw error if client is not provided", () => {
      expect(() => new TestToolManager()).toThrow("WordPress client is required");
    });
  });

  describe("Tool Definition Management", () => {
    it("should return array of tool definitions", () => {
      const tools = toolManager.getTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(2);
      
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should validate tool schema structure", () => {
      const tools = toolManager.getTools();
      
      tools.forEach(tool => {
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
        
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      });
    });

    it("should include site parameter in all tools", () => {
      const tools = toolManager.getTools();
      
      tools.forEach(tool => {
        expect(tool.inputSchema.properties.site).toBeDefined();
        expect(tool.inputSchema.properties.site.type).toBe("string");
      });
    });

    it("should have unique tool names", () => {
      const tools = toolManager.getTools();
      const names = tools.map(tool => tool.name);
      const uniqueNames = [...new Set(names)];
      
      expect(names).toHaveLength(uniqueNames.length);
    });

    it("should prefix tool names with category", () => {
      const tools = toolManager.getTools();
      
      tools.forEach(tool => {
        expect(tool.name).toMatch(/^test_/);
      });
    });
  });

  describe("Parameter Validation", () => {
    it("should validate required parameters", async () => {
      const validParams = { id: 123, site: "test-site" };
      
      await expect(toolManager.getItem(validParams)).resolves.toBeDefined();
    });

    it("should throw error for missing required parameters", async () => {
      const invalidParams = { site: "test-site" }; // Missing required 'id'
      
      await expect(toolManager.getItem(invalidParams)).rejects.toThrow();
    });

    it("should validate parameter types", async () => {
      const invalidParams = { id: "not-a-number", site: "test-site" };
      
      // This would be caught by input validation in real implementation
      await expect(toolManager.validateToolInput("test_get_item", invalidParams)).rejects.toThrow();
    });

    it("should accept valid optional parameters", async () => {
      const validParams = { title: "Test Item" };
      
      await expect(toolManager.createItem(validParams)).resolves.toBeDefined();
    });
  });

  describe("Client Management", () => {
    it("should return default client when no site specified", () => {
      const client = toolManager.getClientForSite();
      
      expect(client).toBe(mockWordPressClient);
    });

    it("should return default client for undefined site", () => {
      const client = toolManager.getClientForSite(undefined);
      
      expect(client).toBe(mockWordPressClient);
    });

    it("should return default client for empty site", () => {
      const client = toolManager.getClientForSite("");
      
      expect(client).toBe(mockWordPressClient);
    });

    it("should handle multi-site configuration", () => {
      // Mock multi-site setup
      toolManager.siteClients = new Map([
        ["site1", { baseUrl: "https://site1.com" }],
        ["site2", { baseUrl: "https://site2.com" }],
      ]);
      
      const client1 = toolManager.getClientForSite("site1");
      const client2 = toolManager.getClientForSite("site2");
      
      expect(client1.baseUrl).toBe("https://site1.com");
      expect(client2.baseUrl).toBe("https://site2.com");
    });

    it("should throw error for invalid site", () => {
      toolManager.siteClients = new Map([
        ["valid-site", mockWordPressClient],
      ]);
      
      expect(() => toolManager.getClientForSite("invalid-site")).toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle client errors gracefully", async () => {
      mockWordPressClient.get.mockRejectedValue(new Error("API Error"));
      
      await expect(toolManager.getItem({ id: 123 })).rejects.toThrow("API Error");
    });

    it("should format error messages consistently", async () => {
      mockWordPressClient.post.mockRejectedValue(new Error("Validation failed"));
      
      await expect(toolManager.createItem({ title: "Test" })).rejects.toThrow("Validation failed");
    });

    it("should handle authentication errors", async () => {
      mockWordPressClient.get.mockRejectedValue({
        status: 401,
        message: "Unauthorized",
      });
      
      await expect(toolManager.getItem({ id: 123 })).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      mockWordPressClient.get.mockRejectedValue({
        code: "ECONNREFUSED",
        message: "Connection refused",
      });
      
      await expect(toolManager.getItem({ id: 123 })).rejects.toThrow();
    });
  });

  describe("Tool Execution", () => {
    it("should execute tool handlers successfully", async () => {
      mockWordPressClient.get.mockResolvedValue({ id: 123, title: "Test Item" });
      
      const _result = await toolManager.getItem({ id: 123 });
      
      expect(result).toEqual({ id: 123, title: "Test Item" });
      expect(mockWordPressClient.get).toHaveBeenCalledWith("/test/items/123");
    });

    it("should pass parameters correctly to handlers", async () => {
      mockWordPressClient.post.mockResolvedValue({ id: 456, title: "Created Item" });
      
      const params = { title: "New Item", content: "Item content" };
      const _result = await toolManager.createItem(params);
      
      expect(mockWordPressClient.post).toHaveBeenCalledWith(
        "/test/items",
        { title: "New Item", content: "Item content" }
      );
    });

    it("should handle async tool execution", async () => {
      mockWordPressClient.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ id: 123 }), 100)
        )
      );
      
      const startTime = Date.now();
      const _result = await toolManager.getItem({ id: 123 });
      const duration = Date.now() - startTime;
      
      expect(result).toEqual({ id: 123 });
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it("should maintain tool context during execution", async () => {
      mockWordPressClient.get.mockResolvedValue({ id: 123 });
      
      const _result = await toolManager.getItem({ id: 123, site: "test-site" });
      
      expect(toolManager.logger).toBeDefined();
      expect(result).toBeDefined();
    });
  });

  describe("Tool Discovery", () => {
    it("should provide tool metadata", () => {
      const tools = toolManager.getTools();
      
      expect(tools[0]).toMatchObject({
        name: "test_get_item",
        description: "Get a test item",
        inputSchema: expect.any(Object),
        handler: expect.any(Function),
      });
    });

    it("should support tool filtering by category", () => {
      const category = toolManager.getToolCategory();
      
      expect(category).toBe("test");
    });

    it("should provide tool count", () => {
      const count = toolManager.getToolCount();
      
      expect(count).toBe(2);
    });

    it("should find tools by name", () => {
      const tool = toolManager.findToolByName("test_get_item");
      
      expect(tool).toBeDefined();
      expect(tool.name).toBe("test_get_item");
    });

    it("should return null for non-existent tools", () => {
      const tool = toolManager.findToolByName("non_existent_tool");
      
      expect(tool).toBeNull();
    });
  });

  describe("Logging and Monitoring", () => {
    it("should log tool executions", async () => {
      mockWordPressClient.get.mockResolvedValue({ id: 123 });
      
      await toolManager.getItem({ id: 123 });
      
      expect(toolManager.logger.info).toHaveBeenCalled();
    });

    it("should log errors during execution", async () => {
      mockWordPressClient.get.mockRejectedValue(new Error("Test error"));
      
      await expect(toolManager.getItem({ id: 123 })).rejects.toThrow();
      expect(toolManager.logger.error).toHaveBeenCalled();
    });

    it("should track tool performance", async () => {
      mockWordPressClient.get.mockResolvedValue({ id: 123 });
      
      await toolManager.getItem({ id: 123 });
      
      expect(toolManager.logger.time).toHaveBeenCalled();
    });

    it("should support debug logging", async () => {
      mockWordPressClient.get.mockResolvedValue({ id: 123 });
      
      await toolManager.getItem({ id: 123 });
      
      expect(toolManager.logger.debug).toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    it("should access tool configuration", () => {
      const config = toolManager.getToolConfig();
      
      expect(config).toBeDefined();
    });

    it("should support tool-specific settings", () => {
      toolManager.setToolSetting("maxRetries", 3);
      
      const setting = toolManager.getToolSetting("maxRetries");
      expect(setting).toBe(3);
    });

    it("should provide default settings", () => {
      const timeout = toolManager.getToolSetting("timeout", 30000);
      
      expect(timeout).toBe(30000);
    });

    it("should validate configuration changes", () => {
      expect(() => toolManager.setToolSetting("maxRetries", -1)).toThrow();
    });
  });

  describe("Extension Points", () => {
    it("should support tool lifecycle hooks", async () => {
      const beforeHook = vi.fn();
      const afterHook = vi.fn();
      
      toolManager.registerHook("beforeExecution", beforeHook);
      toolManager.registerHook("afterExecution", afterHook);
      
      mockWordPressClient.get.mockResolvedValue({ id: 123 });
      await toolManager.getItem({ id: 123 });
      
      expect(beforeHook).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalled();
    });

    it("should support custom validators", () => {
      const customValidator = vi.fn().mockReturnValue(true);
      
      toolManager.addValidator("customValidator", customValidator);
      
      const validators = toolManager.getValidators();
      expect(validators).toContain("customValidator");
    });

    it("should support middleware", async () => {
      const middleware = vi.fn().mockImplementation((params, next) => next(params));
      
      toolManager.use(middleware);
      
      mockWordPressClient.get.mockResolvedValue({ id: 123 });
      await toolManager.getItem({ id: 123 });
      
      expect(middleware).toHaveBeenCalled();
    });
  });

  describe("Integration", () => {
    it("should work with MCP tool registry", () => {
      const tools = toolManager.getTools();
      
      // Simulate MCP registration
      const mcpTools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
      
      expect(mcpTools).toHaveLength(2);
      expect(mcpTools[0].name).toBe("test_get_item");
    });

    it("should support tool composition", async () => {
      // Mock dependent tool call
      mockWordPressClient.get.mockResolvedValue({ id: 123, title: "Test" });
      mockWordPressClient.post.mockResolvedValue({ id: 124, title: "Updated" });
      
      const item = await toolManager.getItem({ id: 123 });
      const updated = await toolManager.createItem({ 
        title: item.title + " Updated",
      });
      
      expect(updated.title).toBe("Updated");
    });

    it("should handle concurrent tool executions", async () => {
      mockWordPressClient.get.mockResolvedValue({ id: 123 });
      
      const promises = [
        toolManager.getItem({ id: 1 }),
        toolManager.getItem({ id: 2 }),
        toolManager.getItem({ id: 3 }),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(mockWordPressClient.get).toHaveBeenCalledTimes(3);
    });
  });
});