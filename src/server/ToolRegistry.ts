import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WordPressClient } from "@/client/api.js";
import { getErrorMessage } from "@/utils/error.js";
import { EnhancedError, ErrorHandlers } from "@/utils/enhancedError.js";
import * as Tools from "@/tools/index.js";
import { z } from "zod";
import type { MCPToolSchema, JSONSchemaProperty } from "@/types/mcp.js";

/**
 * Interface for tool definition
 */
export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    enum?: string[];
    items?: { type?: string };
  }>;
  inputSchema?: MCPToolSchema;
  handler: (client: WordPressClient, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Registry for managing MCP tools
 * Handles tool registration, parameter validation, and execution
 */
export class ToolRegistry {
  // Exposed for tests that assert presence of these fields
  public server: McpServer;
  public wordpressClients: Map<string, WordPressClient>;
  private _cachedToolsListResponse: { tools: unknown[] } | null = null;

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
      let toolInstance: { getTools(): unknown[] };

      // Cache and Performance tools need the clients map
      if (ToolClass.name === "CacheTools" || ToolClass.name === "PerformanceTools") {
        toolInstance = new ToolClass(this.wordpressClients);
      } else {
        toolInstance = new (ToolClass as new () => { getTools(): unknown[] })();
      }

      const tools = toolInstance.getTools();

      tools.forEach((tool: unknown) => {
        this.registerTool(tool as ToolDefinition);
      });
    });

    // After all tools are registered, install a cached tools/list handler to avoid
    // repeated Zod→JSON-Schema conversion on every tools/list request.
    this.installCachedToolsListHandler();
  }

  /**
   * Build and install a cached tools/list handler, bypassing the SDK's per-request
   * Zod→JSON-Schema conversion for all 71 tools.
   */
  private installCachedToolsListHandler(): void {
    if (!this._cachedToolsListResponse) return;
    const cachedResponse = this._cachedToolsListResponse;
    // Replace the MCP SDK's tools/list handler (which re-converts Zod schemas on
    // every request) with one that returns the pre-built JSON Schema response.
    this.server.server.setRequestHandler(ListToolsRequestSchema, () => cachedResponse);
  }

  /**
   * Register a single tool with parameter validation and execution handling
   */
  private registerTool(tool: ToolDefinition): void {
    // In multi-site mode, `site` must be a genuinely required Zod field so
    // the SDK's own argument validation rejects an omitted `site` before
    // the handler ever runs — a manual in-handler check alone would let an
    // invalid call reach the handler and only fail (or worse, silently
    // pick a site) from inside application code.
    const isMultiSite = this.wordpressClients.size > 1;
    const siteDescription = isMultiSite
      ? "The ID of the WordPress site to target (from mcp-wordpress.config.json). Required when multiple sites are configured."
      : "The ID of the WordPress site to target (from mcp-wordpress.config.json). Required if multiple sites are configured.";
    const siteSchema = isMultiSite
      ? z.string().describe(siteDescription)
      : z.string().optional().describe(siteDescription);

    const baseSchema = { site: siteSchema };

    // Merge with tool-specific parameters
    const parameterSchema = this.buildParameterSchema(tool, baseSchema);

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

          // Auto-select the only site in single-site configurations.
          if (!siteId) {
            siteId = this.selectBestSite();
          }

          const client = this.wordpressClients.get(siteId as string);

          if (!client) {
            const availableSites = Array.from(this.wordpressClients.keys());
            const error = ErrorHandlers.siteNotFound(siteId as string, availableSites);
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
        } catch (_error) {
          if (this.isAuthenticationError(_error)) {
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
          if (_error instanceof EnhancedError) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: _error.toString(),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${getErrorMessage(_error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Accumulate into the tools/list cache (built in JSON Schema format so we can
    // avoid per-request Zod→JSON-Schema conversion once all tools are registered).
    if (!this._cachedToolsListResponse) {
      this._cachedToolsListResponse = { tools: [] };
    }
    this._cachedToolsListResponse.tools.push({
      name: tool.name,
      description: tool.description || `WordPress tool: ${tool.name}`,
      inputSchema: this.buildCachedInputSchema(tool),
    });
  }

  /**
   * Build a plain JSON Schema object for a tool's input, including the `site` parameter.
   * Used to pre-build the tools/list response so the SDK's per-request Zod conversion
   * is replaced by a single pre-computed snapshot.
   */
  private buildCachedInputSchema(tool: ToolDefinition): Record<string, unknown> {
    const isMultiSite = this.wordpressClients.size > 1;
    const siteDescription = isMultiSite
      ? "The ID of the WordPress site to target (from mcp-wordpress.config.json). Required when multiple sites are configured."
      : "The ID of the WordPress site to target (from mcp-wordpress.config.json). Required if multiple sites are configured.";

    const properties: Record<string, unknown> = {
      site: { type: "string", description: siteDescription },
    };
    // Kept in sync with registerTool()'s Zod schema: `site` is only a
    // genuinely required Zod field in multi-site mode, so the advertised
    // JSON Schema must say the same thing here.
    const required: string[] = isMultiSite ? ["site"] : [];

    if (tool.inputSchema) {
      Object.assign(properties, tool.inputSchema.properties || {});
      required.push(...(tool.inputSchema.required || []));
    } else if (tool.parameters) {
      for (const param of tool.parameters) {
        const propDef: Record<string, unknown> = { type: param.type || "string" };
        if (param.description) propDef.description = param.description;
        if (param.enum) propDef.enum = param.enum;
        if (param.items) propDef.items = param.items;
        properties[param.name] = propDef;
        if (param.required) required.push(param.name);
      }
    }

    const schema: Record<string, unknown> = { type: "object", properties };
    if (required.length > 0) schema.required = required;
    return schema;
  }

  /**
   * Build Zod parameter schema from tool definition
   */
  private buildParameterSchema(tool: ToolDefinition, baseSchema: Record<string, unknown>): Record<string, unknown> {
    // If tool has inputSchema (new format), convert it to Zod schema
    if (tool.inputSchema) {
      const schema = { ...baseSchema };
      const properties = tool.inputSchema.properties || {};
      const required = tool.inputSchema.required || [];

      for (const [propName, propDef] of Object.entries(properties)) {
        let zodType = this.getZodTypeForProperty(propDef);

        if (propDef.description) {
          zodType = zodType.describe(propDef.description);
        }

        if (!required.includes(propName)) {
          zodType = zodType.optional();
        }

        schema[propName] = zodType;
      }

      return schema;
    }

    // Fall back to old parameters format
    return (
      tool.parameters?.reduce(
        (
          schema: Record<string, unknown>,
          param: { name: string; type?: string; required?: boolean; [key: string]: unknown },
        ) => {
          let zodType = this.getZodTypeForParameter(param);

          if (param.description) {
            zodType = zodType.describe(param.description as string);
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
   * Get appropriate Zod type for inputSchema property definition
   */
  private getZodTypeForProperty(propDef: JSONSchemaProperty): z.ZodType {
    // Handle enum types
    if (propDef.enum && propDef.enum.length > 0) {
      const enumValues = propDef.enum as [string | number, ...(string | number)[]];
      return z.enum(enumValues as [string, ...string[]]);
    }

    // Handle array types — recurse so constraints/enums on the item schema
    // itself (not just its bare type) are preserved too.
    if (propDef.type === "array") {
      const itemSchema = propDef.items ? this.getZodTypeForProperty(propDef.items) : z.string();
      return z.array(itemSchema);
    }

    // Handle nested object types. JSONSchemaProperty has no per-nested-field
    // "required" list, so nested properties are treated as optional — that's
    // the most permissive interpretation the current schema shape supports.
    if (propDef.type === "object") {
      if (propDef.properties) {
        const shape: Record<string, z.ZodType> = {};
        for (const [key, nestedDef] of Object.entries(propDef.properties)) {
          let nestedType = this.getZodTypeForProperty(nestedDef).optional();
          if (nestedDef.description) {
            nestedType = nestedType.describe(nestedDef.description);
          }
          shape[key] = nestedType;
        }
        return z.object(shape);
      }
      return z.record(z.string(), z.unknown());
    }

    // Handle primitive types, preserving numeric/string bounds and pattern.
    switch (propDef.type) {
      case "string": {
        let schema = z.string();
        if (propDef.minLength !== undefined) schema = schema.min(propDef.minLength);
        if (propDef.maxLength !== undefined) schema = schema.max(propDef.maxLength);
        if (propDef.pattern !== undefined) schema = schema.regex(new RegExp(propDef.pattern));
        return schema;
      }
      case "number": {
        let schema = z.number();
        if (propDef.minimum !== undefined) schema = schema.min(propDef.minimum);
        if (propDef.maximum !== undefined) schema = schema.max(propDef.maximum);
        return schema;
      }
      case "boolean":
        return z.boolean();
      default:
        return z.string();
    }
  }

  /**
   * Get appropriate Zod type for parameter definition (old format)
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
        return z.record(z.string(), z.unknown());
      default:
        return z.string();
    }
  }

  /**
   * Return the single configured site ID.
   * Only called after the multi-site guard (which requires an explicit `site` param),
   * so this path is only reached in single-site mode.
   */
  private selectBestSite(): string {
    const keys = Array.from(this.wordpressClients.keys());
    return keys[0] ?? "default";
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: unknown): boolean {
    const errorObj = error as { response?: { status?: number }; code?: string };
    if (errorObj?.response?.status && [401, 403].includes(errorObj.response.status)) {
      return true;
    }
    return errorObj?.code === "WORDPRESS_AUTH_ERROR";
  }
}
