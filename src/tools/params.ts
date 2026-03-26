import { z } from "zod";

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

const IdSchema = z.object({
  id: z.number().int().positive("ID must be a positive integer"),
});

const IdForceSchema = IdSchema.extend({
  force: z.boolean().optional(),
});

/**
 * Validates and returns a positive integer `id` from params.
 * Throws a ZodError with a clear message if the value is missing, not a number, or not a positive integer.
 */
export function parseId(params: Record<string, unknown>): number {
  return IdSchema.parse(params).id;
}

/**
 * Validates and returns `id` (positive integer) and optional `force` (boolean | undefined) from params.
 */
export function parseIdAndForce(params: Record<string, unknown>): { id: number; force?: boolean | undefined } {
  return IdForceSchema.parse(params);
}
