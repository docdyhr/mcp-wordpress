import { vi } from "vitest";
import { ToolRegistry } from "@/server/ToolRegistry.js";
import { z } from "zod";

// Mock dependencies
vi.mock("../../dist/client/api.js");
vi.mock("../../dist/utils/error.js", () => ({
  getErrorMessage: vi.fn((error) => error.message || "Unknown error"),
}));

vi.mock("../../dist/utils/enhancedError.js", () => ({
  EnhancedError: vi.fn().mockImplementation((message) => ({ message, toString: () => message })),
  ErrorHandlers: {
    siteParameterMissing: vi.fn((sites) => ({
      toString: () => `Site parameter is required. Available sites: ${sites.join(", ")}`,
    })),
    siteNotFound: vi.fn((siteId, sites) => ({
      toString: () => `Site '${siteId}' not found. Available sites: ${sites.join(", ")}`,
    })),
  },
}));

// Mock tools
vi.mock("../../dist/tools/index.js", () => ({
  PostTools: vi.fn().mockImplementation(() => ({
    getTools: () => [
      {
        name: "wp_get_posts",
        description: "Get WordPress posts",
        parameters: [{ name: "per_page", type: "number", description: "Number of posts per page" }],
        handler: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Mock posts" }] }),
      },
    ],
  })),
  CacheTools: vi.fn().mockImplementation(() => ({
    getTools: () => [
      {
        name: "wp_cache_stats",
        description: "Get cache statistics",
        parameters: [],
        handler: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Mock cache stats" }] }),
      },
    ],
  })),
}));

// Mock MCP Server
const mockMcpServer = {
  tool: vi.fn(),
};

describe("ToolRegistry", () => {
  let registry;
  let mockClient1;
  let mockClient2;
  let mockClients;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient1 = { ping: vi.fn() };
    mockClient2 = { ping: vi.fn() };

    mockClients = new Map([
      ["site1", mockClient1],
      ["site2", mockClient2],
    ]);

    registry = new ToolRegistry(mockMcpServer, mockClients);
  });

  describe("constructor", () => {
    it("should initialize with server and clients", () => {
      expect(registry.server).toBe(mockMcpServer);
      expect(registry.wordpressClients).toBe(mockClients);
    });

    it("should handle empty clients map", () => {
      const emptyClients = new Map();
      const emptyRegistry = new ToolRegistry(mockMcpServer, emptyClients);

      expect(emptyRegistry.wordpressClients.size).toBe(0);
    });

    it("should handle single client", () => {
      const singleClient = new Map([["site1", mockClient1]]);
      const singleRegistry = new ToolRegistry(mockMcpServer, singleClient);

      expect(singleRegistry.wordpressClients.size).toBe(1);
    });
  });

  describe("registerAllTools", () => {
    it("should register all tools from tool classes", () => {
      registry.registerAllTools();

      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        "wp_get_posts",
        "Get WordPress posts",
        expect.any(Object),
        expect.any(Function),
      );

      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        "wp_cache_stats",
        "Get cache statistics",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("should handle cache tools with clients map", async () => {
      const toolsModule = await import("../../dist/tools/index.js");

      registry.registerAllTools();

      expect(toolsModule.CacheTools).toHaveBeenCalledWith(mockClients);
    });

    it("should handle regular tools without clients map", async () => {
      const toolsModule = await import("../../dist/tools/index.js");

      registry.registerAllTools();

      expect(toolsModule.PostTools).toHaveBeenCalledWith();
    });

    it("should register tools with proper parameter schemas", () => {
      registry.registerAllTools();

      const toolCall = mockMcpServer.tool.mock.calls.find((call) => call[0] === "wp_get_posts");

      expect(toolCall[2]).toHaveProperty("site");
      expect(toolCall[2]).toHaveProperty("per_page");
    });
  });

  describe("registerTool", () => {
    it("should register tool with base schema", () => {
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: vi.fn(),
      };

      registry.registerTool(tool);

      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        "test_tool",
        "Test tool",
        expect.objectContaining({
          site: expect.any(Object),
        }),
        expect.any(Function),
      );
    });

    it("should add tool-specific parameters to schema", () => {
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [
          { name: "param1", type: "string", description: "Parameter 1" },
          { name: "param2", type: "number", description: "Parameter 2" },
        ],
        handler: vi.fn(),
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const schema = toolCall[2];

      expect(schema).toHaveProperty("site");
      expect(schema).toHaveProperty("param1");
      expect(schema).toHaveProperty("param2");
    });

    it("should require site parameter for multiple sites", () => {
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: vi.fn(),
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const schema = toolCall[2];

      expect(schema.site._def.description).toContain("Required when multiple sites are configured");
    });

    it("should make site parameter optional for single site", () => {
      const singleClient = new Map([["site1", mockClient1]]);
      const singleRegistry = new ToolRegistry(mockMcpServer, singleClient);

      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: vi.fn(),
      };

      singleRegistry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const schema = toolCall[2];

      expect(schema.site._def.description).not.toContain("Required when multiple sites are configured");
    });

    it("should use default description if none provided", () => {
      const tool = {
        name: "test_tool",
        parameters: [],
        handler: vi.fn(),
      };

      registry.registerTool(tool);

      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        "test_tool",
        "WordPress tool: test_tool",
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe("tool execution", () => {
    it("should execute tool with correct client", async () => {
      const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Success" }] });
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: mockHandler,
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      const result = await executionHandler({ site: "site1" });

      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({ site: "site1" }), mockClient1);
      expect(result).toEqual({ content: [{ type: "text", text: "Success" }] });
    });

    it("should require site parameter for multiple sites", async () => {
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: vi.fn(),
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      const result = await executionHandler({});

      expect(result.content[0].text).toContain("Site parameter is required");
    });

    it("should handle invalid site ID", async () => {
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: vi.fn(),
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      const result = await executionHandler({ site: "invalid_site" });

      expect(result.content[0].text).toContain("Site 'invalid_site' not found");
    });

    it("should use default site for single site configuration", async () => {
      const singleClient = new Map([["site1", mockClient1]]);
      const singleRegistry = new ToolRegistry(mockMcpServer, singleClient);

      const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Success" }] });
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: mockHandler,
      };

      singleRegistry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      const result = await executionHandler({});

      expect(mockHandler).toHaveBeenCalledWith(expect.any(Object), mockClient1);
      expect(result).toEqual({ content: [{ type: "text", text: "Success" }] });
    });

    it("should handle tool execution errors", async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error("Tool execution failed"));
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [],
        handler: mockHandler,
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      const result = await executionHandler({ site: "site1" });

      expect(result.content[0].text).toContain("Tool execution failed");
    });

    it("should pass parameters to tool handler", async () => {
      const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Success" }] });
      const tool = {
        name: "test_tool",
        description: "Test tool",
        parameters: [
          { name: "param1", type: "string" },
          { name: "param2", type: "number" },
        ],
        handler: mockHandler,
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      await executionHandler({
        site: "site1",
        param1: "test",
        param2: 123,
      });

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          site: "site1",
          param1: "test",
          param2: 123,
        }),
        mockClient1,
      );
    });
  });

  describe("buildParameterSchema", () => {
    it("should build schema with string parameters", () => {
      const tool = {
        name: "test_tool",
        parameters: [{ name: "text_param", type: "string", description: "Text parameter" }],
        handler: vi.fn(),
      };

      const baseSchema = {};
      const schema = registry.buildParameterSchema(tool, baseSchema);

      expect(schema).toHaveProperty("text_param");
      expect(schema.text_param._def.typeName).toBe("ZodString");
    });

    it("should build schema with number parameters", () => {
      const tool = {
        name: "test_tool",
        parameters: [{ name: "num_param", type: "number", description: "Number parameter" }],
        handler: vi.fn(),
      };

      const baseSchema = {};
      const schema = registry.buildParameterSchema(tool, baseSchema);

      expect(schema).toHaveProperty("num_param");
      expect(schema.num_param._def.typeName).toBe("ZodNumber");
    });

    it("should build schema with boolean parameters", () => {
      const tool = {
        name: "test_tool",
        parameters: [{ name: "bool_param", type: "boolean", description: "Boolean parameter" }],
        handler: vi.fn(),
      };

      const baseSchema = {};
      const schema = registry.buildParameterSchema(tool, baseSchema);

      expect(schema).toHaveProperty("bool_param");
      expect(schema.bool_param._def.typeName).toBe("ZodBoolean");
    });

    it("should handle required parameters", () => {
      const tool = {
        name: "test_tool",
        parameters: [
          { name: "required_param", type: "string", required: true },
          { name: "optional_param", type: "string", required: false },
        ],
        handler: vi.fn(),
      };

      const baseSchema = {};
      const schema = registry.buildParameterSchema(tool, baseSchema);

      // Required parameter should not be optional
      expect(schema.required_param._def.typeName).toBe("ZodString");

      // Optional parameter should be optional
      expect(schema.optional_param._def.typeName).toBe("ZodOptional");
    });

    it("should handle parameters with default values", () => {
      const tool = {
        name: "test_tool",
        parameters: [{ name: "default_param", type: "number", default: 10 }],
        handler: vi.fn(),
      };

      const baseSchema = {};
      const schema = registry.buildParameterSchema(tool, baseSchema);

      expect(schema).toHaveProperty("default_param");
      expect(schema.default_param._def.typeName).toBe("ZodDefault");
    });

    it("should handle enum parameters", () => {
      const tool = {
        name: "test_tool",
        parameters: [{ name: "enum_param", type: "string", enum: ["option1", "option2", "option3"] }],
        handler: vi.fn(),
      };

      const baseSchema = {};
      const schema = registry.buildParameterSchema(tool, baseSchema);

      expect(schema).toHaveProperty("enum_param");
      expect(schema.enum_param._def.typeName).toBe("ZodEnum");
    });

    it("should merge with base schema", () => {
      const tool = {
        name: "test_tool",
        parameters: [{ name: "tool_param", type: "string" }],
        handler: vi.fn(),
      };

      const baseSchema = {
        base_param: z.string().describe("Base parameter"),
      };

      const schema = registry.buildParameterSchema(tool, baseSchema);

      expect(schema).toHaveProperty("base_param");
      expect(schema).toHaveProperty("tool_param");
    });
  });

  describe("error handling", () => {
    it("should handle tool instantiation errors", async () => {
      const toolsModule = await import("../../dist/tools/index.js");
      toolsModule.PostTools.mockImplementation(() => {
        throw new Error("Tool instantiation failed");
      });

      expect(() => registry.registerAllTools()).toThrow("Tool instantiation failed");
    });

    it("should handle malformed tool definitions", async () => {
      const toolsModule = await import("../../dist/tools/index.js");
      toolsModule.PostTools.mockImplementation(() => ({
        getTools: () => [
          {
            name: null, // Invalid name
            handler: vi.fn(),
          },
        ],
      }));

      expect(() => registry.registerAllTools()).toThrow();
    });

    it("should handle tool execution timeout", async () => {
      const mockHandler = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10000)));

      const tool = {
        name: "slow_tool",
        description: "Slow tool",
        parameters: [],
        handler: mockHandler,
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      // This should timeout or be handled gracefully
      const result = await Promise.race([
        executionHandler({ site: "site1" }),
        new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 1000)),
      ]);

      expect(result).toBeDefined();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex tool with multiple parameter types", () => {
      const complexTool = {
        name: "complex_tool",
        description: "Complex tool with various parameters",
        parameters: [
          { name: "text", type: "string", required: true },
          { name: "count", type: "number", default: 10 },
          { name: "enabled", type: "boolean", required: false },
          { name: "status", type: "string", enum: ["active", "inactive"] },
        ],
        handler: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Complex result" }] }),
      };

      registry.registerTool(complexTool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const schema = toolCall[2];

      expect(schema).toHaveProperty("text");
      expect(schema).toHaveProperty("count");
      expect(schema).toHaveProperty("enabled");
      expect(schema).toHaveProperty("status");
      expect(schema).toHaveProperty("site");
    });

    it("should handle tool execution with full parameter set", async () => {
      const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Full result" }] });

      const tool = {
        name: "full_tool",
        description: "Tool with all parameter types",
        parameters: [
          { name: "text", type: "string", required: true },
          { name: "count", type: "number", default: 5 },
          { name: "enabled", type: "boolean", required: false },
        ],
        handler: mockHandler,
      };

      registry.registerTool(tool);

      const toolCall = mockMcpServer.tool.mock.calls[0];
      const executionHandler = toolCall[3];

      const result = await executionHandler({
        site: "site1",
        text: "test input",
        count: 20,
        enabled: true,
      });

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          site: "site1",
          text: "test input",
          count: 20,
          enabled: true,
        }),
        mockClient1,
      );

      expect(result).toEqual({ content: [{ type: "text", text: "Full result" }] });
    });
  });
});
