/**
 * Tests for DocumentationGenerator
 *
 * Basic test coverage for the API documentation auto-generation system.
 * Tests the core functionality of extracting and generating documentation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentationGenerator } from "../../dist/docs/DocumentationGenerator.js";
import * as fs from "fs";

// Mock file system operations
vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue("{}"),
  },
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue("{}"),
}));

// Mock logger to avoid console output during tests
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    docs: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("DocumentationGenerator", () => {
  let generator;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      outputDir: "/tmp/docs",
      includeExamples: true,
      includeWordPressMapping: true,
      generateOpenAPI: false,
      generateInteractiveHtml: false,
      validateExamples: false,
    };

    generator = new DocumentationGenerator(mockConfig);

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with configuration", () => {
      expect(generator).toBeDefined();
      expect(generator.config).toEqual(mockConfig);
    });

    it("should use default configuration when none provided", () => {
      const defaultGenerator = new DocumentationGenerator();
      expect(defaultGenerator).toBeDefined();
      expect(defaultGenerator.config).toBeDefined();
    });
  });

  describe("Configuration", () => {
    it("should validate configuration parameters", () => {
      const invalidConfig = {
        outputDir: "",
        includeExamples: "yes", // Should be boolean
      };

      expect(() => new DocumentationGenerator(invalidConfig)).toThrow();
    });

    it("should merge partial configuration with defaults", () => {
      const partialConfig = {
        outputDir: "/custom/docs",
        includeExamples: false,
      };

      const gen = new DocumentationGenerator(partialConfig);
      expect(gen.config.outputDir).toBe("/custom/docs");
      expect(gen.config.includeExamples).toBe(false);
      expect(gen.config.generateOpenAPI).toBeDefined(); // Should have default
    });
  });

  describe("Tool Documentation Extraction", () => {
    it("should extract basic tool information", () => {
      const mockTool = {
        name: "wp_get_posts",
        description: "Retrieve WordPress posts",
        parameters: {
          type: "object",
          properties: {
            count: {
              type: "number",
              description: "Number of posts to retrieve",
            },
          },
        },
      };

      const result = generator.extractToolDocumentation(mockTool);

      expect(result).toBeDefined();
      expect(result.name).toBe("wp_get_posts");
      expect(result.description).toBe("Retrieve WordPress posts");
      expect(result.parameters).toBeDefined();
    });

    it("should handle tools without parameters", () => {
      const mockTool = {
        name: "wp_health_check",
        description: "Check WordPress site health",
      };

      const result = generator.extractToolDocumentation(mockTool);

      expect(result).toBeDefined();
      expect(result.name).toBe("wp_health_check");
      expect(result.parameters).toEqual([]);
    });

    it("should extract parameter information correctly", () => {
      const mockTool = {
        name: "wp_create_post",
        description: "Create a new WordPress post",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Post title",
            },
            content: {
              type: "string",
              description: "Post content",
            },
            status: {
              type: "string",
              enum: ["draft", "publish"],
              description: "Post status",
            },
          },
          required: ["title", "content"],
        },
      };

      const result = generator.extractToolDocumentation(mockTool);

      expect(result.parameters).toHaveLength(3);

      const titleParam = result.parameters.find((p) => p.name === "title");
      expect(titleParam).toBeDefined();
      expect(titleParam.required).toBe(true);
      expect(titleParam.type).toBe("string");

      const statusParam = result.parameters.find((p) => p.name === "status");
      expect(statusParam).toBeDefined();
      expect(statusParam.required).toBe(false);
      expect(statusParam.allowedValues).toEqual(["draft", "publish"]);
    });
  });

  describe("Documentation Generation", () => {
    it("should generate markdown documentation", async () => {
      const mockTools = [
        {
          name: "wp_get_posts",
          description: "Get posts",
          parameters: { type: "object", properties: {} },
        },
      ];

      await generator.generateMarkdownDocs(mockTools);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it("should handle empty tool list", async () => {
      await generator.generateMarkdownDocs([]);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should create output directory if it doesn't exist", async () => {
      fs.existsSync.mockReturnValue(false);

      await generator.generateMarkdownDocs([]);

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockConfig.outputDir, { recursive: true });
    });
  });

  describe("WordPress Mapping", () => {
    it("should map tools to WordPress endpoints", () => {
      const mockTool = {
        name: "wp_get_posts",
        description: "Get posts",
      };

      const endpoint = generator.mapToWordPressEndpoint(mockTool);

      expect(endpoint).toBeDefined();
      expect(typeof endpoint).toBe("string");
    });

    it("should handle unknown tool names", () => {
      const mockTool = {
        name: "wp_unknown_tool",
        description: "Unknown tool",
      };

      const endpoint = generator.mapToWordPressEndpoint(mockTool);

      expect(endpoint).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle file system errors gracefully", async () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      await expect(generator.generateMarkdownDocs([])).rejects.toThrow("Permission denied");
    });

    it("should handle malformed tool definitions", () => {
      const malformedTool = {
        // Missing required properties
        description: "Malformed tool",
      };

      expect(() => generator.extractToolDocumentation(malformedTool)).toThrow();
    });
  });

  describe("Validation", () => {
    it("should validate example usage when enabled", async () => {
      const configWithValidation = {
        ...mockConfig,
        validateExamples: true,
      };

      const validatingGenerator = new DocumentationGenerator(configWithValidation);

      const mockTool = {
        name: "wp_get_posts",
        description: "Get posts",
        parameters: { type: "object", properties: {} },
      };

      // Should not throw with valid tool
      expect(() => validatingGenerator.extractToolDocumentation(mockTool)).not.toThrow();
    });

    it("should skip validation when disabled", () => {
      const configWithoutValidation = {
        ...mockConfig,
        validateExamples: false,
      };

      const nonValidatingGenerator = new DocumentationGenerator(configWithoutValidation);

      // Should work even with minimal tool definition
      expect(() => nonValidatingGenerator.extractToolDocumentation({ name: "test" })).not.toThrow();
    });
  });

  describe("Output Formatting", () => {
    it("should format tool names consistently", () => {
      const result = generator.formatToolName("wp_get_posts");
      expect(result).toBe("wp_get_posts");
    });

    it("should format parameter types correctly", () => {
      const result = generator.formatParameterType("string");
      expect(result).toBe("string");

      const arrayResult = generator.formatParameterType(["string"]);
      expect(arrayResult).toBe("string[]");
    });

    it("should generate valid markdown headers", () => {
      const result = generator.generateMarkdownHeader("Test Tool", 2);
      expect(result).toBe("## Test Tool");
    });
  });
});
