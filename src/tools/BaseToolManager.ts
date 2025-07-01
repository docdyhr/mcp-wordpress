/**
 * Base class for tool managers to reduce code duplication
 */

import { WordPressClient } from "../client/api.js";
import { ToolParams, ToolResult } from "../types/mcp.js";

export abstract class BaseToolManager {
  constructor(protected client: WordPressClient) {}

  /**
   * Resolve the WordPress client for a specific site
   */
  protected resolveClient(site?: string): WordPressClient {
    if (site) {
      const siteClient = this.client.getSiteClient?.(site);
      if (!siteClient) {
        throw new Error(`Site '${site}' not found in configuration`);
      }
      return siteClient;
    }
    return this.client;
  }

  /**
   * Validate required parameters
   */
  protected validateParams(params: ToolParams, required: string[]): void {
    for (const field of required) {
      if (
        !(field in params) ||
        params[field] === undefined ||
        params[field] === null
      ) {
        throw new Error(`Missing required parameter: ${field}`);
      }
    }
  }

  /**
   * Validate ID parameter
   */
  protected validateId(id: unknown, name = "id"): number {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new Error(`Invalid ${name}: must be a positive integer`);
    }
    return numId;
  }

  /**
   * Handle errors consistently across all tools
   */
  protected handleError(error: unknown, operation: string): never {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`${operation} failed: ${String(error)}`);
  }

  /**
   * Format success response consistently
   */
  protected formatResponse(data: unknown, message?: string): ToolResult {
    return {
      content: [
        {
          type: "text",
          text: message || "Operation completed successfully",
        },
      ],
      data,
      isError: false,
    };
  }

  /**
   * Cache key generation helper
   */
  protected generateCacheKey(
    operation: string,
    params: Record<string, unknown>,
  ): string {
    const site = params.site || "default";
    const paramStr = Object.entries(params)
      .filter(([key]) => key !== "site")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join("|");
    return `${site}:${operation}:${paramStr}`;
  }

  /**
   * Execute operation with consistent error handling and caching
   */
  protected async executeOperation<T>(
    operation: string,
    params: ToolParams,
    executor: (client: WordPressClient) => Promise<T>,
    options: {
      validateRequired?: string[];
      cacheable?: boolean;
      cacheKey?: string;
    } = {},
  ): Promise<ToolResult> {
    try {
      // Validate required parameters
      if (options.validateRequired) {
        this.validateParams(params, options.validateRequired);
      }

      // Resolve client
      const client = this.resolveClient(params.site as string);

      // Check cache if enabled
      if (options.cacheable && client.cache) {
        const cacheKey =
          options.cacheKey || this.generateCacheKey(operation, params);
        const cached = await client.cache.get(cacheKey);
        if (cached) {
          return this.formatResponse(cached, `${operation} (cached)`);
        }
      }

      // Execute operation
      const result = await executor(client);

      // Store in cache if enabled
      if (options.cacheable && client.cache) {
        const cacheKey =
          options.cacheKey || this.generateCacheKey(operation, params);
        await client.cache.set(cacheKey, result);
      }

      return this.formatResponse(result);
    } catch (error) {
      this.handleError(error, operation);
    }
  }
}
