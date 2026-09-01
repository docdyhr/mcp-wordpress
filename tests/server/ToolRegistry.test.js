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
import { WordPressAPIError } from "@/types/client.js";

function createMockServer() {
  const registeredTools = new Map();
  return {
    tool: vi.fn((name, description, schema, handler) => {
      registeredTools.set(name, { name, description, schema, handler });
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

  describe("security validation wiring", () => {
    let registry;
    let server;

    beforeEach(() => {
      server = createMockServer();
      registry = new ToolRegistry(server, new Map([["default", {}]]));
    });

    it("rejects a script-tag payload in an ordinary string parameter (e.g. title)", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: { title: { type: "string" } },
            required: ["title"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ title: "<script>alert(1)</script>" }).success).toBe(false);
      expect(zodSchema.safeParse({ title: "My Perfectly Normal Post Title" }).success).toBe(true);
    });

    it("rejects an event-handler payload in an ordinary string parameter", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: { title: { type: "string" } },
            required: ["title"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ title: '<img src=x onerror="alert(1)">' }).success).toBe(false);
    });

    it("rejects a script tag in a 'content' parameter but still accepts legitimate Gutenberg block markup", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: { content: { type: "string" } },
            required: ["content"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ content: "<script>alert(1)</script>" }).success).toBe(false);

      const gutenbergContent =
        "<!-- wp:paragraph --><p>Hello world</p><!-- /wp:paragraph -->" +
        '<!-- wp:image {"id":42} --><figure class="wp-block-image"><img src="https://example.com/photo.jpg" alt="A photo"/></figure><!-- /wp:image -->';
      expect(zodSchema.safeParse({ content: gutenbergContent }).success).toBe(true);
    });

    it("rejects an event handler embedded in a 'content' or 'excerpt' parameter", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: {
              content: { type: "string" },
              excerpt: { type: "string" },
            },
            required: [],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ content: '<p onclick="alert(1)">hi</p>' }).success).toBe(false);
      expect(zodSchema.safeParse({ excerpt: '<p onclick="alert(1)">hi</p>' }).success).toBe(false);
    });

    it("still enforces JSON-Schema minLength/maxLength/pattern alongside the new security check", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: {
              slug: { type: "string", minLength: 3, maxLength: 10, pattern: "^[a-z-]+$" },
            },
            required: ["slug"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ slug: "ab" }).success).toBe(false); // too short
      expect(zodSchema.safeParse({ slug: "a-valid-slug-too-long" }).success).toBe(false); // too long
      expect(zodSchema.safeParse({ slug: "valid-slug" }).success).toBe(true);
      expect(zodSchema.safeParse({ slug: "<script>" }).success).toBe(false); // pattern AND security both reject this
    });

    it("does not restrict non-string parameters (number/boolean/array/object types unaffected)", () => {
      registry.registerTool(
        simpleTool({
          inputSchema: {
            type: "object",
            properties: {
              count: { type: "number" },
              enabled: { type: "boolean" },
              ids: { type: "array", items: { type: "number" } },
            },
            required: ["count", "enabled", "ids"],
          },
        }),
      );

      const { schema } = server._registeredTools.get("wp_test_tool");
      const zodSchema = z.object(schema);

      expect(zodSchema.safeParse({ count: 5, enabled: true, ids: [1, 2, 3] }).success).toBe(true);
    });
  });

  describe("authentication error detection", () => {
    let registry;

    beforeEach(() => {
      const server = createMockServer();
      registry = new ToolRegistry(server, new Map([["default", {}]]));
    });

    it("recognizes a bare 401 WordPressAPIError as an authentication error", () => {
      expect(registry.isAuthenticationError(new WordPressAPIError("Not logged in", 401))).toBe(true);
    });

    it("recognizes a bare 403 WordPressAPIError as an authentication error", () => {
      expect(registry.isAuthenticationError(new WordPressAPIError("Forbidden", 403))).toBe(true);
    });

    it("does not treat a non-auth WordPressAPIError (e.g. 404) as an authentication error", () => {
      expect(registry.isAuthenticationError(new WordPressAPIError("Not found", 404))).toBe(false);
    });

    it("does not treat a 403 with an explicit local code (e.g. UPLOADS_DISABLED) as an authentication error", () => {
      expect(registry.isAuthenticationError(new WordPressAPIError("Uploads disabled", 403, "UPLOADS_DISABLED"))).toBe(
        false,
      );
    });

    it("does not treat a plain Error as an authentication error", () => {
      expect(registry.isAuthenticationError(new Error("boom"))).toBe(false);
    });

    it("surfaces the auth-specific guidance end-to-end when a tool handler throws a real 401", async () => {
      const server = createMockServer();
      const endToEndRegistry = new ToolRegistry(server, new Map([["default", {}]]));

      endToEndRegistry.registerTool(
        simpleTool({
          handler: async () => {
            throw new WordPressAPIError("Not logged in", 401);
          },
        }),
      );

      const { handler } = server._registeredTools.get("wp_test_tool");
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Authentication failed for site");
    });
  });
});
