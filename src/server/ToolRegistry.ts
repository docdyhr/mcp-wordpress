import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WordPressClient } from "../client/api.js";
import { getErrorMessage } from "../utils/error.js";
import { EnhancedError, ErrorHandlers } from "../utils/enhancedError.js";
import * as Tools from "../tools/index.js";
import { z } from "zod";

/**
 * Interface for tool definition
 */
export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }>;
  handler: (client: WordPressClient, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Registry for managing MCP tools
 * Handles tool registration, parameter validation, and execution
 */
export class ToolRegistry {
  private server: McpServer;
  private wordpressClients: Map<string, WordPressClient>;

  constructor(server: McpServer, wordpressClients: Map<string, WordPressClient>) {
    this.server = server;
    this.wordpressClients = wordpressClients;
  }

  /**
   * Register all available tools with the MCP server
   */
  public registerAllTools(): void {
    // Register all tools from the tools directory
    Object.values(Tools).forEach((ToolClass) => {
      let toolInstance: { getTools(): ToolDefinition[] };

      // Cache and Performance tools need the clients map
      if (ToolClass.name === "CacheTools" || ToolClass.name === "PerformanceTools") {
        toolInstance = new ToolClass(this.wordpressClients);
      } else {
        toolInstance = new (ToolClass as new () => { getTools(): ToolDefinition[] })();
      }

      const tools = toolInstance.getTools();

      tools.forEach((tool: ToolDefinition) => {
        this.registerTool(tool);
      });
    });
  }

  /**
   * Register a single tool with parameter validation and execution handling
   */
  private registerTool(tool: ToolDefinition): void {
    // Create base parameter schema with site parameter
    const baseSchema = {
      site: z
        .string()
        .optional()
        .describe(
          "The ID of the WordPress site to target (from mcp-wordpress.config.json). Required if multiple sites are configured.",
        ),
    };

    // Merge with tool-specific parameters
    const parameterSchema = this.buildParameterSchema(tool, baseSchema);

    // Make site parameter required if multiple sites are configured
    if (this.wordpressClients.size > 1) {
      parameterSchema.site = parameterSchema.site.describe(
        "The ID of the WordPress site to target (from mcp-wordpress.config.json). Required when multiple sites are configured.",
      );
    }

    this.server.tool(
      tool.name,
      tool.description || `WordPress tool: ${tool.name}`,
      parameterSchema,
      async (args: Record<string, unknown>) => {
        try {
          let siteId = args.site;

          // If no site specified and multiple sites configured, require site parameter
          if (!siteId && this.wordpressClients.size > 1) {
            const availableSites = Array.from(this.wordpressClients.keys());
            const error = ErrorHandlers.siteParameterMissing(availableSites);
            return {
              content: [
                {
                  type: "text" as const,
                  text: error.toString(),
                },
              ],
              isError: true,
            };
          }

          // Intelligent site selection for single-site configurations
          if (!siteId) {
            siteId = this.selectBestSite(tool.name, args);
          }

          const client = this.wordpressClients.get(siteId);

          if (!client) {
            const availableSites = Array.from(this.wordpressClients.keys());
            const error = ErrorHandlers.siteNotFound(siteId, availableSites);
            return {
              content: [
                {
                  type: "text" as const,
                  text: error.toString(),
                },
              ],
              isError: true,
            };
          }

          // Call the tool handler with the client and parameters
          const result = await tool.handler(client, args);

          return {
            content: [
              {
                type: "text" as const,
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          if (this.isAuthenticationError(error)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Authentication failed for site '${args.site || "default"}'. Please check your credentials.`,
                },
              ],
              isError: true,
            };
          }

          // Handle enhanced errors with suggestions
          if (error instanceof EnhancedError) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: error.toString(),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${getErrorMessage(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Build Zod parameter schema from tool definition
   */
  private buildParameterSchema(tool: ToolDefinition, baseSchema: Record<string, unknown>): Record<string, unknown> {
    return (
      tool.parameters?.reduce(
        (
          schema: Record<string, unknown>,
          param: { name: string; type?: string; required?: boolean; [key: string]: unknown },
        ) => {
          let zodType = this.getZodTypeForParameter(param);

          if (param.description) {
            zodType = zodType.describe(param.description);
          }

          if (!param.required) {
            zodType = zodType.optional();
          }

          schema[param.name] = zodType;
          return schema;
        },
        { ...baseSchema },
      ) || baseSchema
    );
  }

  /**
   * Get appropriate Zod type for parameter definition
   */
  private getZodTypeForParameter(param: { type?: string; required?: boolean; [key: string]: unknown }): z.ZodType {
    switch (param.type) {
      case "string":
        return z.string();
      case "number":
        return z.number();
      case "boolean":
        return z.boolean();
      case "array":
        return z.array(z.string());
      case "object":
        return z.record(z.any());
      default:
        return z.string();
    }
  }

  /**
   * Intelligent site selection based on context
   */
  private selectBestSite(toolName: string, args: Record<string, unknown>): string {
    const availableSites = Array.from(this.wordpressClients.keys());

    // Single site scenario - use it directly
    if (availableSites.length === 1) {
      return availableSites[0];
    }

    // Multiple sites scenario - intelligent selection
    if (availableSites.length > 1) {
      // Try to find a site based on context clues

      // 1. Check if there's a 'default' site
      if (availableSites.includes("default")) {
        return "default";
      }

      // 2. Check if there's a 'main' or 'primary' site
      const primarySites = availableSites.filter((site) =>
        ["main", "primary", "prod", "production"].includes(site.toLowerCase()),
      );
      if (primarySites.length > 0) {
        return primarySites[0];
      }

      // 3. For development/test operations, prefer dev sites
      if (toolName.includes("test") || process.env.NODE_ENV === "development") {
        const devSites = availableSites.filter((site) =>
          ["dev", "test", "staging", "local"].includes(site.toLowerCase()),
        );
        if (devSites.length > 0) {
          return devSites[0];
        }
      }

      // 4. Default to first available site
      return availableSites[0];
    }

    // Fallback to 'default' if no sites available
    return "default";
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: unknown): boolean {
    if (error?.response?.status && [401, 403].includes(error.response.status)) {
      return true;
    }
    return error?.code === "WORDPRESS_AUTH_ERROR";
  }
}
