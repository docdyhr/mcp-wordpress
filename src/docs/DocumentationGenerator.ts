/**
 * Comprehensive API Documentation Auto-Generation System
 * Extracts documentation from tool classes, types, and WordPress mappings
 */

import * as fs from "fs";
import * as path from "path";
import * as Tools from "../tools/index.js";
import type { ToolDefinition } from "../server/ToolRegistry.js";

export interface DocumentationConfig {
  outputDir: string;
  includeExamples: boolean;
  includeWordPressMapping: boolean;
  generateOpenAPI: boolean;
  generateInteractiveHtml: boolean;
  validateExamples: boolean;
}

export interface ToolDocumentation {
  name: string;
  category: string;
  description: string;
  parameters: ParameterDocumentation[];
  examples: ExampleUsage[];
  wordpressEndpoint: string | undefined;
  requiredPermissions: string[] | undefined;
  returnType: string;
  errorCodes: ErrorDocumentation[];
  relatedTools: string[];
}

export interface ParameterDocumentation {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue: any;
  allowedValues: string[] | undefined;
  examples: string[];
}

export interface ExampleUsage {
  title: string;
  description: string;
  command: string;
  parameters: Record<string, any>;
  expectedResponse: any;
  errorExample?: {
    scenario: string;
    error: any;
  };
}

export interface ErrorDocumentation {
  code: string;
  message: string;
  description: string;
  resolution: string;
}

export interface DocumentationOutput {
  tools: ToolDocumentation[];
  categories: CategoryDocumentation[];
  types: TypeDocumentation[];
  openApiSpec: OpenAPISpecification | undefined;
  summary: DocumentationSummary;
}

export interface CategoryDocumentation {
  name: string;
  description: string;
  toolCount: number;
  tools: string[];
  usagePatterns: string[];
}

export interface TypeDocumentation {
  name: string;
  description: string;
  properties: PropertyDocumentation[];
  examples: any[];
  wordpressSource?: string;
}

export interface PropertyDocumentation {
  name: string;
  type: string;
  required: boolean;
  description: string;
  format?: string;
}

export interface OpenAPISpecification {
  openapi: string;
  info: any;
  paths: Record<string, any>;
  components: Record<string, any>;
}

export interface DocumentationSummary {
  totalTools: number;
  totalCategories: number;
  totalTypes: number;
  lastUpdated: string;
  version: string;
  coverage: {
    toolsWithExamples: number;
    toolsWithWordPressMapping: number;
    typesDocumented: number;
  };
}

/**
 * Main Documentation Generator
 */
export class DocumentationGenerator {
  private config: DocumentationConfig;
  private toolCategories: Map<string, string[]> = new Map();
  private wordpressEndpoints: Map<string, string> = new Map();

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.config = {
      outputDir: "docs/api",
      includeExamples: true,
      includeWordPressMapping: true,
      generateOpenAPI: true,
      generateInteractiveHtml: true,
      validateExamples: false,
      ...config,
    };

    this.initializeWordPressMapping();
    this.initializeToolCategories();
  }

  /**
   * Generate complete documentation for all tools and types
   */
  async generateFullDocumentation(): Promise<DocumentationOutput> {
    console.log("🚀 Starting API documentation generation...");

    const tools = await this.extractAllToolDocumentation();
    const categories = this.generateCategoryDocumentation(tools);
    const types = await this.extractTypeDocumentation();

    let openApiSpec: OpenAPISpecification | undefined = undefined;
    if (this.config.generateOpenAPI) {
      openApiSpec = this.generateOpenAPISpecification(tools, types);
    }

    const summary = this.generateDocumentationSummary(tools, categories, types);

    const output: DocumentationOutput = {
      tools,
      categories,
      types,
      openApiSpec,
      summary,
    };

    // Write documentation to files
    await this.writeDocumentationFiles(output);

    console.log(
      `✅ Documentation generation complete! ${tools.length} tools documented.`,
    );
    return output;
  }

  /**
   * Extract documentation from all tool classes
   */
  private async extractAllToolDocumentation(): Promise<ToolDocumentation[]> {
    const toolDocs: ToolDocumentation[] = [];

    // Iterate through all tool classes
    for (const [className, ToolClass] of Object.entries(Tools)) {
      try {
        // Create tool instance
        let toolInstance: any;
        if (className === "CacheTools" || className === "PerformanceTools") {
          // These tools need client map - use empty map for doc generation
          toolInstance = new ToolClass(new Map());
        } else {
          toolInstance = new (ToolClass as new () => any)();
        }

        const toolDefinitions = toolInstance.getTools();
        const category = this.extractCategoryFromClassName(className);

        for (const toolDef of toolDefinitions) {
          const doc = await this.extractToolDocumentation(
            toolDef,
            category,
            className,
          );
          toolDocs.push(doc);
        }
      } catch (error) {
        console.warn(
          `⚠️ Failed to extract documentation for ${className}:`,
          error,
        );
      }
    }

    return toolDocs.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Extract documentation for a single tool
   */
  private async extractToolDocumentation(
    toolDef: ToolDefinition,
    category: string,
    className: string,
  ): Promise<ToolDocumentation> {
    const parameters = this.extractParameterDocumentation(
      toolDef.parameters || [],
    );
    const examples = this.generateToolExamples(toolDef, category);
    const wordpressEndpoint = this.wordpressEndpoints.get(toolDef.name);
    const returnType = this.inferReturnType(toolDef.name, category);
    const errorCodes = this.generateErrorDocumentation(toolDef.name);
    const relatedTools = this.findRelatedTools(toolDef.name, category);

    return {
      name: toolDef.name,
      category,
      description: toolDef.description || `${category} tool: ${toolDef.name}`,
      parameters,
      examples,
      wordpressEndpoint,
      requiredPermissions: this.getRequiredPermissions(toolDef.name),
      returnType,
      errorCodes,
      relatedTools,
    };
  }

  /**
   * Extract parameter documentation
   */
  private extractParameterDocumentation(
    parameters: any[],
  ): ParameterDocumentation[] {
    return parameters.map((param) => ({
      name: param.name,
      type: param.type || "string",
      required: param.required || false,
      description: param.description || `${param.name} parameter`,
      defaultValue: this.getDefaultValue(param),
      allowedValues: this.getAllowedValues(param) || undefined,
      examples: this.generateParameterExamples(param),
    }));
  }

  /**
   * Generate usage examples for tools
   */
  private generateToolExamples(
    toolDef: ToolDefinition,
    category: string,
  ): ExampleUsage[] {
    const examples: ExampleUsage[] = [];

    // Basic usage example
    const basicExample = this.generateBasicExample(toolDef, category);
    if (basicExample) {
      examples.push(basicExample);
    }

    // Multi-site example (if applicable)
    if (this.supportsMultiSite(toolDef)) {
      const multiSiteExample = this.generateMultiSiteExample(toolDef, category);
      if (multiSiteExample) {
        examples.push(multiSiteExample);
      }
    }

    // Advanced example with all parameters
    const advancedExample = this.generateAdvancedExample(toolDef, category);
    if (advancedExample) {
      examples.push(advancedExample);
    }

    return examples;
  }

  /**
   * Generate basic usage example
   */
  private generateBasicExample(
    toolDef: ToolDefinition,
    category: string,
  ): ExampleUsage | null {
    const toolName = toolDef.name;
    const basicParams: Record<string, any> = {};

    // Add essential parameters
    const requiredParams = (toolDef.parameters || []).filter((p) => p.required);
    for (const param of requiredParams.slice(0, 2)) {
      // Limit to 2 for basic example
      basicParams[param.name] = this.generateExampleValue(param);
    }

    return {
      title: `Basic ${category} Usage`,
      description: `Simple example of using ${toolName}`,
      command: toolName,
      parameters: basicParams,
      expectedResponse: this.generateExpectedResponse(
        toolName,
        category,
        "basic",
      ),
      errorExample: {
        scenario: "Authentication failure",
        error: {
          error: "Authentication failed",
          message: "Invalid credentials or insufficient permissions",
        },
      },
    };
  }

  /**
   * Generate multi-site example
   */
  private generateMultiSiteExample(
    toolDef: ToolDefinition,
    category: string,
  ): ExampleUsage | null {
    const params = { site: "site1", ...this.getExampleParameters(toolDef, 1) };

    return {
      title: `Multi-Site ${category} Usage`,
      description: `Using ${toolDef.name} with specific site targeting`,
      command: toolDef.name,
      parameters: params,
      expectedResponse: this.generateExpectedResponse(
        toolDef.name,
        category,
        "multisite",
      ),
    };
  }

  /**
   * Generate advanced example with all parameters
   */
  private generateAdvancedExample(
    toolDef: ToolDefinition,
    category: string,
  ): ExampleUsage | null {
    const allParams = this.getExampleParameters(toolDef, "all");

    if (Object.keys(allParams).length <= 2) {
      return null; // Skip if not enough parameters for advanced example
    }

    return {
      title: `Advanced ${category} Configuration`,
      description: "Comprehensive example using all available parameters",
      command: toolDef.name,
      parameters: allParams,
      expectedResponse: this.generateExpectedResponse(
        toolDef.name,
        category,
        "advanced",
      ),
    };
  }

  /**
   * Generate category documentation
   */
  private generateCategoryDocumentation(
    tools: ToolDocumentation[],
  ): CategoryDocumentation[] {
    const categories = new Map<string, ToolDocumentation[]>();

    // Group tools by category
    for (const tool of tools) {
      if (!categories.has(tool.category)) {
        categories.set(tool.category, []);
      }
      categories.get(tool.category)!.push(tool);
    }

    return Array.from(categories.entries()).map(
      ([categoryName, categoryTools]) => ({
        name: categoryName,
        description: this.getCategoryDescription(categoryName),
        toolCount: categoryTools.length,
        tools: categoryTools.map((t) => t.name).sort(),
        usagePatterns: this.generateUsagePatterns(categoryName, categoryTools),
      }),
    );
  }

  /**
   * Extract type documentation from TypeScript definitions
   */
  private async extractTypeDocumentation(): Promise<TypeDocumentation[]> {
    // This would analyze TypeScript files to extract type information
    // For now, we'll provide key WordPress and MCP types
    return [
      {
        name: "WordPressPost",
        description: "WordPress blog post object",
        properties: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "Unique identifier",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Post title",
          },
          {
            name: "content",
            type: "string",
            required: true,
            description: "Post content",
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "Publication status",
          },
        ],
        examples: [this.generateWordPressPostExample()],
        wordpressSource: "/wp-json/wp/v2/posts",
      },
      // Add more types as needed
    ];
  }

  /**
   * Generate OpenAPI specification
   */
  private generateOpenAPISpecification(
    tools: ToolDocumentation[],
    types: TypeDocumentation[],
  ): OpenAPISpecification {
    const paths: Record<string, any> = {};
    const components: Record<string, any> = {
      schemas: {},
      parameters: {},
      responses: {},
    };

    // Convert tools to OpenAPI paths
    for (const tool of tools) {
      const path = `/tools/${tool.name}`;
      paths[path] = {
        post: {
          summary: tool.description,
          description: `Execute ${tool.name} MCP tool`,
          tags: [tool.category],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: this.generateParameterSchema(tool.parameters),
              },
            },
          },
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
            "400": {
              description: "Bad request - invalid parameters",
            },
            "401": {
              description: "Authentication failed",
            },
            "500": {
              description: "Internal server error",
            },
          },
        },
      };
    }

    // Add type schemas to components
    for (const type of types) {
      components.schemas[type.name] = this.convertTypeToJsonSchema(type);
    }

    return {
      openapi: "3.0.3",
      info: {
        title: "WordPress MCP Server API",
        description: "Model Context Protocol server for WordPress management",
        version: "1.2.0",
        contact: {
          name: "MCP WordPress",
          url: "https://github.com/docdyhr/mcp-wordpress",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      paths,
      components,
    };
  }

  /**
   * Write all documentation files
   */
  private async writeDocumentationFiles(
    output: DocumentationOutput,
  ): Promise<void> {
    const outputDir = this.config.outputDir;

    // Ensure output directory exists
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.mkdir(path.join(outputDir, "tools"), { recursive: true });
    await fs.promises.mkdir(path.join(outputDir, "types"), { recursive: true });
    await fs.promises.mkdir(path.join(outputDir, "examples"), {
      recursive: true,
    });
    await fs.promises.mkdir(path.join(outputDir, "categories"), {
      recursive: true,
    });

    // Write main API documentation
    await this.writeApiOverview(output);

    // Write individual tool documentation
    for (const tool of output.tools) {
      await this.writeToolDocumentation(tool);
    }

    // Write category documentation
    for (const category of output.categories) {
      await this.writeCategoryDocumentation(category);
    }

    // Write type documentation
    for (const type of output.types) {
      await this.writeTypeDocumentation(type);
    }

    // Write OpenAPI specification
    if (output.openApiSpec) {
      await fs.promises.writeFile(
        path.join(outputDir, "openapi.json"),
        JSON.stringify(output.openApiSpec, null, 2),
      );
    }

    // Write summary
    await fs.promises.writeFile(
      path.join(outputDir, "summary.json"),
      JSON.stringify(output.summary, null, 2),
    );

    console.log(`📁 Documentation written to ${outputDir}/`);
  }

  // Helper methods for specific documentation tasks...

  private extractCategoryFromClassName(className: string): string {
    return className.replace("Tools", "").toLowerCase();
  }

  private initializeWordPressMapping(): void {
    // Map MCP tools to WordPress REST API endpoints
    this.wordpressEndpoints.set("wp_list_posts", "/wp-json/wp/v2/posts");
    this.wordpressEndpoints.set("wp_get_post", "/wp-json/wp/v2/posts/{id}");
    this.wordpressEndpoints.set("wp_create_post", "/wp-json/wp/v2/posts");
    this.wordpressEndpoints.set("wp_update_post", "/wp-json/wp/v2/posts/{id}");
    this.wordpressEndpoints.set("wp_delete_post", "/wp-json/wp/v2/posts/{id}");
    // Add more mappings...
  }

  private initializeToolCategories(): void {
    this.toolCategories.set("Posts", [
      "wp_list_posts",
      "wp_get_post",
      "wp_create_post",
      "wp_update_post",
      "wp_delete_post",
      "wp_search_posts",
    ]);
    this.toolCategories.set("Pages", [
      "wp_list_pages",
      "wp_get_page",
      "wp_create_page",
      "wp_update_page",
      "wp_delete_page",
      "wp_search_pages",
    ]);
    // Add more categories...
  }

  private generateDocumentationSummary(
    tools: ToolDocumentation[],
    categories: CategoryDocumentation[],
    types: TypeDocumentation[],
  ): DocumentationSummary {
    return {
      totalTools: tools.length,
      totalCategories: categories.length,
      totalTypes: types.length,
      lastUpdated: new Date().toISOString(),
      version: "1.2.0",
      coverage: {
        toolsWithExamples: tools.filter((t) => t.examples.length > 0).length,
        toolsWithWordPressMapping: tools.filter((t) => t.wordpressEndpoint)
          .length,
        typesDocumented: types.length,
      },
    };
  }

  /**
   * Helper methods for documentation generation
   */

  private getDefaultValue(param: any): any {
    const defaults: Record<string, any> = {
      per_page: 10,
      page: 1,
      order: "desc",
      orderby: "date",
      status: "publish",
      format: "summary",
      category: "all",
      includeExamples: true,
      includeTrends: true,
    };
    return defaults[param.name];
  }

  private getAllowedValues(param: any): string[] | undefined {
    const allowedValues: Record<string, string[]> = {
      status: ["publish", "draft", "private", "pending", "future"],
      order: ["asc", "desc"],
      orderby: ["date", "title", "author", "modified"],
      format: ["summary", "detailed", "raw"],
      category: ["overview", "requests", "cache", "system", "tools", "all"],
      timeframe: ["1h", "6h", "12h", "24h", "7d", "30d"],
      priority: ["quick_wins", "medium_term", "long_term", "all"],
      focus: ["speed", "reliability", "efficiency", "scaling"],
    };
    return allowedValues[param.name];
  }

  private generateParameterExamples(param: any): string[] {
    const examples: Record<string, string[]> = {
      id: ["123", "456"],
      title: ["My Blog Post", "Hello World"],
      content: ["<p>Post content here</p>", "This is my post content"],
      site: ["site1", "production", "staging"],
      per_page: ["10", "20", "50"],
      search: ["wordpress", "tutorial"],
      author: ["1", "2"],
      email: ["user@example.com", "admin@site.com"],
      username: ["john_doe", "admin"],
      limit: ["10", "20", "50"],
      timeframe: ["24h", "7d", "1h"],
    };
    return examples[param.name] || ["example"];
  }

  private supportsMultiSite(toolDef: ToolDefinition): boolean {
    // All tools support multi-site via the site parameter
    return toolDef.parameters?.some((p) => p.name === "site") ?? true;
  }

  private generateExampleValue(param: any): any {
    const exampleValues: Record<string, any> = {
      id: 123,
      title: "Example Post Title",
      content: "This is example content for the post.",
      site: "site1",
      per_page: 10,
      page: 1,
      search: "wordpress",
      author: 1,
      email: "user@example.com",
      username: "john_doe",
      status: "publish",
      order: "desc",
      orderby: "date",
      limit: 20,
      timeframe: "24h",
      format: "summary",
      category: "overview",
    };
    return exampleValues[param.name] || "example_value";
  }

  private generateExpectedResponse(
    toolName: string,
    category: string,
    type: string,
  ): any {
    if (toolName.includes("list")) {
      return {
        success: true,
        data: [
          { id: 1, title: `Example ${category} 1`, status: "publish" },
          { id: 2, title: `Example ${category} 2`, status: "draft" },
        ],
        total: 2,
        pages: 1,
      };
    }

    if (toolName.includes("get")) {
      return {
        success: true,
        data: {
          id: 123,
          title: `Example ${category}`,
          content: "Example content",
          status: "publish",
          date: "2024-01-01T00:00:00Z",
        },
      };
    }

    if (toolName.includes("create") || toolName.includes("update")) {
      return {
        success: true,
        data: {
          id: 123,
          title: "Created/Updated successfully",
          status: "publish",
        },
      };
    }

    if (toolName.includes("delete")) {
      return {
        success: true,
        data: {
          deleted: true,
          id: 123,
        },
      };
    }

    if (toolName.includes("performance")) {
      return {
        success: true,
        data: {
          overview: {
            overallHealth: "Good",
            performanceScore: 85,
            averageResponseTime: "245ms",
            cacheHitRate: "87.5%",
          },
        },
      };
    }

    return {
      success: true,
      data: {},
      message: `${toolName} executed successfully`,
    };
  }

  private getExampleParameters(
    toolDef: ToolDefinition,
    type: string | number,
  ): Record<string, any> {
    const params: Record<string, any> = {};
    const parameters = toolDef.parameters || [];

    if (type === "all") {
      // Include all parameters
      for (const param of parameters) {
        params[param.name] = this.generateExampleValue(param);
      }
    } else if (typeof type === "number") {
      // Include limited number of parameters
      for (const param of parameters.slice(0, type)) {
        params[param.name] = this.generateExampleValue(param);
      }
    }

    return params;
  }

  private getCategoryDescription(categoryName: string): string {
    const descriptions: Record<string, string> = {
      posts: "Blog post creation, editing, and management tools",
      pages: "Static page creation and management tools",
      media: "File upload, management, and media library tools",
      users: "User account management and authentication tools",
      comments: "Comment moderation and management tools",
      taxonomies: "Category and tag management tools",
      site: "Site settings and configuration tools",
      auth: "Authentication testing and management tools",
      cache: "Performance caching and optimization tools",
      performance: "Performance monitoring and analytics tools",
    };
    return (
      descriptions[categoryName.toLowerCase()] ||
      `${categoryName} management tools`
    );
  }

  private generateUsagePatterns(
    categoryName: string,
    tools: ToolDocumentation[],
  ): string[] {
    const patterns: Record<string, string[]> = {
      posts: [
        "Create and publish blog posts",
        "Bulk edit multiple posts",
        "Search and filter posts by criteria",
        "Schedule posts for future publication",
      ],
      media: [
        "Upload images and files",
        "Organize media library",
        "Generate thumbnails and variants",
        "Bulk media operations",
      ],
      users: [
        "Manage user accounts and roles",
        "User authentication and permissions",
        "Bulk user operations",
        "User profile management",
      ],
      performance: [
        "Monitor real-time performance metrics",
        "Analyze historical performance trends",
        "Generate optimization recommendations",
        "Export performance reports",
      ],
    };
    return (
      patterns[categoryName.toLowerCase()] || [
        `Manage ${categoryName.toLowerCase()} efficiently`,
        `Bulk ${categoryName.toLowerCase()} operations`,
        `Search and filter ${categoryName.toLowerCase()}`,
      ]
    );
  }

  private generateWordPressPostExample(): any {
    return {
      id: 123,
      title: "Welcome to WordPress",
      content:
        "<p>This is your first post. Edit or delete it to get started!</p>",
      status: "publish",
      date: "2024-01-01T00:00:00Z",
      author: 1,
      categories: [1],
      tags: [1, 2],
      featured_media: 0,
      excerpt: "A sample WordPress post",
      slug: "welcome-to-wordpress",
    };
  }

  private generateParameterSchema(parameters: ParameterDocumentation[]): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const param of parameters) {
      properties[param.name] = {
        type: param.type,
        description: param.description,
      };

      if (param.allowedValues) {
        properties[param.name].enum = param.allowedValues;
      }

      if (param.defaultValue !== undefined) {
        properties[param.name].default = param.defaultValue;
      }

      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  private convertTypeToJsonSchema(type: TypeDocumentation): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const prop of type.properties) {
      properties[prop.name] = {
        type: prop.type,
        description: prop.description,
      };

      if (prop.format) {
        properties[prop.name].format = prop.format;
      }

      if (prop.required) {
        required.push(prop.name);
      }
    }

    return {
      type: "object",
      description: type.description,
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  private inferReturnType(toolName: string, category: string): string {
    if (toolName.includes("list")) return `${category}[]`;
    if (toolName.includes("get")) return category;
    if (toolName.includes("create")) return category;
    if (toolName.includes("update")) return category;
    if (toolName.includes("delete")) return "DeleteResult";
    if (toolName.includes("search")) return `${category}[]`;
    if (toolName.includes("performance")) return "PerformanceMetrics";
    if (toolName.includes("cache")) return "CacheStats";
    return "object";
  }

  private generateErrorDocumentation(toolName: string): ErrorDocumentation[] {
    return [
      {
        code: "AUTHENTICATION_FAILED",
        message: "Authentication failed",
        description: "Invalid credentials or insufficient permissions",
        resolution:
          "Check your authentication credentials and user permissions",
      },
      {
        code: "VALIDATION_ERROR",
        message: "Parameter validation failed",
        description: "One or more required parameters are missing or invalid",
        resolution: "Review the required parameters and their formats",
      },
      {
        code: "NOT_FOUND",
        message: "Resource not found",
        description: "The requested resource does not exist",
        resolution: "Verify the resource ID and ensure it exists",
      },
      {
        code: "PERMISSION_DENIED",
        message: "Insufficient permissions",
        description: "The user does not have permission to perform this action",
        resolution:
          "Contact an administrator to grant the necessary permissions",
      },
    ];
  }

  private findRelatedTools(toolName: string, category: string): string[] {
    // Find tools in the same category
    const categoryTools = this.toolCategories.get(category) || [];
    return categoryTools.filter((tool) => tool !== toolName).slice(0, 3);
  }

  private getRequiredPermissions(toolName: string): string[] | undefined {
    const permissions: Record<string, string[]> = {
      wp_create_post: ["publish_posts", "edit_posts"],
      wp_update_post: ["edit_posts"],
      wp_delete_post: ["delete_posts"],
      wp_create_page: ["publish_pages", "edit_pages"],
      wp_update_page: ["edit_pages"],
      wp_delete_page: ["delete_pages"],
      wp_upload_media: ["upload_files"],
      wp_delete_media: ["delete_files"],
      wp_create_user: ["create_users"],
      wp_update_user: ["edit_users"],
      wp_delete_user: ["delete_users"],
      wp_moderate_comment: ["moderate_comments"],
      wp_get_site_settings: ["manage_options"],
    };
    return permissions[toolName];
  }

  /**
   * File writing implementations
   */

  private async writeApiOverview(output: DocumentationOutput): Promise<void> {
    const { MarkdownFormatter } = await import("./MarkdownFormatter.js");
    const formatter = new MarkdownFormatter();
    const content = formatter.generateApiOverview(output);

    await fs.promises.writeFile(
      path.join(this.config.outputDir, "README.md"),
      content,
    );
  }

  private async writeToolDocumentation(tool: ToolDocumentation): Promise<void> {
    const { MarkdownFormatter } = await import("./MarkdownFormatter.js");
    const formatter = new MarkdownFormatter();
    const content = formatter.generateToolDocumentation(tool);

    await fs.promises.writeFile(
      path.join(this.config.outputDir, "tools", `${tool.name}.md`),
      content,
    );
  }

  private async writeCategoryDocumentation(
    category: CategoryDocumentation,
  ): Promise<void> {
    const { MarkdownFormatter } = await import("./MarkdownFormatter.js");
    const formatter = new MarkdownFormatter();
    const content = formatter.generateCategoryDocumentation(category);

    await fs.promises.writeFile(
      path.join(
        this.config.outputDir,
        "categories",
        `${category.name.toLowerCase()}.md`,
      ),
      content,
    );
  }

  private async writeTypeDocumentation(type: TypeDocumentation): Promise<void> {
    const { MarkdownFormatter } = await import("./MarkdownFormatter.js");
    const formatter = new MarkdownFormatter();
    const content = formatter.generateTypeDocumentation(type);

    await fs.promises.writeFile(
      path.join(this.config.outputDir, "types", `${type.name}.md`),
      content,
    );
  }
}
