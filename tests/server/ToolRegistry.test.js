/**
 * Protocol-level tests for ToolRegistry's schema handling: the `site`
 * parameter must be genuinely required (both in the advertised JSON Schema
 * and in actual Zod argument validation) when multiple sites are
 * configured, and JSON-Schema-to-Zod conversion must preserve declared
 * constraints (string length/pattern, numeric bounds) rather than silently
 * dropping them.
 */
import { vi } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "@/server/ToolRegistry.js";

function createMockServer() {
  const registeredTools = new Map();
  return {
    tool: vi.fn((name, description, schema) => {
      registeredTools.set(name, { name, description, schema });
    }),
    server: {
      setRequestHandler: vi.fn(),
    },
    _registeredTools: registeredTools,
  };
}

function simpleTool(overrides = {}) {
  return {
    name: "wp_test_tool",
    description: "A test tool",
    inputSchema: { type: "object", properties: {} },
    handler: async () => "ok",
    ...overrides,
  };
}

describe("ToolRegistry", () => {
  describe("site parameter requirement", () => {
    it("does not mark 'site' as required in the cached tools/list schema for a single site", () => {
      const server = createMockServer();
      const registry = new ToolRegistry(server, new Map([["default", {}]]));

      const cachedSchema = registry.buildCachedInputSchema(simpleTool());

      expect(cachedSchema.properties.site).toBeDefined();
      expect(cachedSchema.required ?? []).not.toContain("site");
    });

    it("marks 'site' as required in the cached tools/list schema when multiple sites are configured", () => {
      const server = createMockServer();
      const registry = new ToolRegistry(
        server,
        new Map([
          ["site1", {}],
          ["site2", {}],
        ]),
      );

      const cachedSchema = registry.buildCachedInputSchema(simpleTool());

      expect(cachedSchema.required).toContain("site");
    });

    it("keeps 'site' optional in the live Zod schema for a single site", () => {
      const server = createMockServer();
      const registry = new ToolRegistry(server, new Map([["default", {}]]));

      registry.registerTool(simpleTool());

      const { schema } = server._registeredTools.get("wp_test_tool");
      const result = z.object(schema).safeParse({});

      expect(result.success).toBe(true);
    });

    it("fails Zod validation before the handler runs when 'site' is omitted in multi-site mode", () => {
      const server = createMockServer();
      const registry = new ToolRegistry(
        server,
        new Map([
          ["site1", {}],
          ["site2", {}],
        ]),
      );

      registry.registerTool(simpleTool());

      const { schema } = server._registeredTools.get("wp_test_tool");
      const missingSite = z.object(schema).safeParse({});
      const withSite = z.object(schema).safeParse({ site: "site1" });

      expect(missingSite.success).toBe(false);
      expect(withSite.success).toBe(true);
    });
  });

  describe("JSON-Schema-to-Zod constraint preservation", () => {
    let registry;
    let server;

    beforeEach(() => {
      server = createMockServer();
      registry = new ToolRegistry(server, new Map([["default", {}]]));
    });

    it("preserves string minLength/maxLength/pattern", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: {
              slug: { type: "string", minLength: 3, maxLength: 5, pattern: "^[a-z]+$" },
            },
            required: ["slug"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ slug: "ab" }).success).toBe(false); // too short
      expect(zodSchema.safeParse({ slug: "abcdef" }).success).toBe(false); // too long
      expect(zodSchema.safeParse({ slug: "AB" }).success).toBe(false); // pattern mismatch (uppercase)
      expect(zodSchema.safeParse({ slug: "abc" }).success).toBe(true);
    });

    it("preserves numeric minimum/maximum", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: {
              per_page: { type: "number", minimum: 1, maximum: 100 },
            },
            required: ["per_page"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ per_page: 0 }).success).toBe(false);
      expect(zodSchema.safeParse({ per_page: 101 }).success).toBe(false);
      expect(zodSchema.safeParse({ per_page: 50 }).success).toBe(true);
    });

    it("preserves array item constraints", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: {
              ids: { type: "array", items: { type: "number" } },
            },
            required: ["ids"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ ids: [1, 2, 3] }).success).toBe(true);
      expect(zodSchema.safeParse({ ids: ["not-a-number"] }).success).toBe(false);
    });

    it("preserves nested object property schemas instead of collapsing to an unconstrained record", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: {
              meta: {
                type: "object",
                properties: {
                  count: { type: "number", minimum: 0 },
                },
              },
            },
            required: ["meta"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ meta: { count: 5 } }).success).toBe(true);
      expect(zodSchema.safeParse({ meta: { count: -1 } }).success).toBe(false);
    });
  });
});
