/**
 * Type-safe parameter casting for tool handlers.
 *
 * Tool handler parameters arrive as Record<string, unknown> but have already
 * been validated by Zod in ToolRegistry.registerTool(). This utility provides
 * a centralized, documented assertion that replaces scattered `as unknown as T`
 * casts throughout tool handlers.
 *
 * @example
 *   const data = toolParams<CreatePostRequest>(params);
 */
export function toolParams<T>(params: Record<string, unknown>): T {
  return params as T;
}
