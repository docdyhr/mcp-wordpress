import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WordPressClient } from "../client/api.js";
import { getErrorMessage } from "../utils/error.js";
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
  handler: (client: WordPressClient, args: any) => Promise<any>;
}

/**
 * Registry for managing MCP tools
 * Handles tool registration, parameter validation, and execution
 */
export class ToolRegistry {
  private server: McpServer;
  private wordpressClients: Map<string, WordPressClient>;

  constructor(
    server: McpServer,
    wordpressClients: Map<string, WordPressClient>,
  ) {
    this.server = server;
    this.wordpressClients = wordpressClients;
  }

  /**
   * Register all available tools with the MCP server
   */
  public registerAllTools(): void {
    // Register all tools from the tools directory
    Object.values(Tools).forEach((ToolClass) => {
      let toolInstance: any;

      // Cache and Performance tools need the clients map
      if (
        ToolClass.name === "CacheTools" ||
        ToolClass.name === "PerformanceTools"
      ) {
        toolInstance = new ToolClass(this.wordpressClients);
      } else {
        toolInstance = new (ToolClass as new () => any)();
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
      async (args: any) => {
        try {
          const siteId = args.site || "default";
          const client = this.wordpressClients.get(siteId);

          if (!client) {
            const availableSites = Array.from(
              this.wordpressClients.keys(),
            ).join(", ");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: Site with ID '${siteId}' not found. Available sites: ${availableSites}`,
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
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
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
  private buildParameterSchema(tool: ToolDefinition, baseSchema: any): any {
    return (
      tool.parameters?.reduce(
        (schema: any, param: any) => {
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
  private getZodTypeForParameter(param: any): z.ZodType {
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
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: any): boolean {
    if (error?.response?.status && [401, 403].includes(error.response.status)) {
      return true;
    }
    return error?.code === "WORDPRESS_AUTH_ERROR";
  }
}
