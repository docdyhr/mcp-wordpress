/**
 * Output regressions for the smaller list/info tools: category/tag/comment pagination, term name
 * decoding, wp_cache_info's configuration values and the users roles summary.
 */
import { vi } from "vitest";
import { TaxonomyTools } from "../../dist/tools/taxonomies.js";
import { CommentTools } from "../../dist/tools/comments.js";
import { UserTools } from "../../dist/tools/users.js";
import { CacheTools } from "../../dist/tools/cache.js";
import { CachedWordPressClient } from "../../dist/client/CachedWordPressClient.js";
import { SecurityConfig } from "../../dist/security/SecurityConfig.js";
import { pageHint } from "../../dist/tools/params.js";

const toolByName = (instance, name) => instance.getTools().find((t) => t.name === name);

describe("pageHint", () => {
  it("is empty while the page is not full", () => {
    expect(pageHint(3, {})).toBe("");
    expect(pageHint(9, { per_page: 10 })).toBe("");
  });

  it("points at the next page once a page is full (WordPress defaults to 10 per page)", () => {
    expect(pageHint(10, {})).toContain("`page=2`");
    expect(pageHint(20, { per_page: 20, page: 3 })).toContain("`page=4`");
    expect(pageHint(20, { per_page: 20, page: 3 })).toContain("Page 3");
  });

  it("tolerates non-numeric params", () => {
    expect(pageHint(10, { per_page: "x", page: null })).toContain("`page=2`");
  });
});

describe("list tool pagination parameters", () => {
  // Regression: these tools had no per_page/page in their schema, so the argument validator dropped
  // them and every listing was silently capped at WordPress's default of 10.
  it.each([
    ["wp_list_categories", new TaxonomyTools()],
    ["wp_list_tags", new TaxonomyTools()],
    ["wp_list_comments", new CommentTools()],
  ])("%s accepts per_page and page", (name, instance) => {
    const { properties } = toolByName(instance, name).inputSchema;
    expect(properties.per_page).toMatchObject({ type: "number" });
    expect(properties.page).toMatchObject({ type: "number" });
  });
});

describe("wp_list_categories / wp_list_tags output", () => {
  const tools = new TaxonomyTools();

  it("decodes entity-encoded term names", async () => {
    const client = { getCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Tips &amp; Tricks", count: 4 }]) };

    const text = await tools.handleListCategories(client, {});

    expect(text).toContain("**Tips & Tricks**");
    expect(text).not.toContain("&amp;");
  });

  it("points at the next page when a full page came back", async () => {
    const tags = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `t${i}`, count: 0 }));
    const client = { getTags: vi.fn().mockResolvedValue(tags) };

    const text = await tools.handleListTags(client, {});

    expect(text).toContain("`page=2`");
  });

  it("forwards per_page and page to the client", async () => {
    const client = { getCategories: vi.fn().mockResolvedValue([{ id: 1, name: "A", count: 0 }]) };

    await tools.handleListCategories(client, { per_page: 50, page: 2 });

    expect(client.getCategories).toHaveBeenCalledWith({ per_page: 50, page: 2 });
  });
});

describe("wp_list_comments output", () => {
  it("points at the next page when a full page came back", async () => {
    const comments = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      author_name: "A",
      post: 1,
      date: "2024-01-01T00:00:00",
      status: "approved",
      content: { rendered: "<p>hi</p>" },
    }));
    const client = { getComments: vi.fn().mockResolvedValue(comments) };

    const text = await new CommentTools().handleListComments(client, {});

    expect(text).toContain("`page=2`");
  });
});

describe("wp_list_users roles summary", () => {
  const baseUser = { id: 1, name: "Ann", slug: "ann", description: "", url: "" };

  // Regression: without list_users/edit capability WordPress omits `roles`, and the summary line
  // printed "Roles Distribution: " with nothing after it.
  it("says the distribution is restricted instead of printing an empty line", async () => {
    const client = {
      getSiteUrl: () => "https://x.example",
      getUsers: vi.fn().mockResolvedValue([baseUser, { ...baseUser, id: 2, slug: "bob" }]),
    };

    const text = await new UserTools().handleListUsers(client, {});

    expect(text).toContain("**Roles Distribution**: Restricted (requires admin)");
    expect(text).not.toMatch(/Roles Distribution\*\*: ?(\n|$)/);
  });

  it("still lists the distribution when roles are available", async () => {
    const client = {
      getSiteUrl: () => "https://x.example",
      getUsers: vi.fn().mockResolvedValue([
        { ...baseUser, roles: ["editor"] },
        { ...baseUser, id: 2, slug: "bob", roles: ["editor"] },
        { ...baseUser, id: 3, slug: "cy", roles: ["author"] },
      ]),
    };

    const text = await new UserTools().handleListUsers(client, {});

    expect(text).toContain("**Roles Distribution**: editor: 2, author: 1");
  });
});

describe("wp_cache_info configuration", () => {
  function cachedClient() {
    const client = {
      getCacheStats: vi.fn().mockReturnValue({
        cache: { totalSize: 3, hitRate: 0.5, hits: 3, misses: 3, evictions: 0, expirations: 0 },
        invalidation: { queueSize: 0, rulesCount: 1, processing: false },
      }),
    };
    return Object.setPrototypeOf(client, CachedWordPressClient.prototype);
  }

  // Regression: these were the literal strings "Configured in SecurityConfig.cache.maxSize" etc.
  it("reports the effective cache settings, not pointers to where they are configured", async () => {
    const tools = new CacheTools(new Map([["default", cachedClient()]]));
    const info = await toolByName(tools, "wp_cache_info").handler(cachedClient(), {});

    expect(info.cache_configuration).toEqual({
      max_size: SecurityConfig.cache.maxSize,
      default_ttl: expect.stringMatching(/^\d+ ?(seconds?|minutes?|hours?)/),
      default_ttl_ms: SecurityConfig.cache.defaultTTL,
      lru_enabled: SecurityConfig.cache.enableLRU,
      stats_enabled: SecurityConfig.cache.enableStats,
    });
    expect(JSON.stringify(info)).not.toContain("Configured in SecurityConfig");
  });

  it("derives the TTL presets from the configured values", async () => {
    const tools = new CacheTools(new Map([["default", cachedClient()]]));
    const info = await toolByName(tools, "wp_cache_info").handler(cachedClient(), {});

    expect(info.ttl_presets.static_data).toBe("4 hours (site settings, user roles)");
    expect(info.ttl_presets.semi_static_data).toBe("2 hours (categories, tags, user profiles)");
    expect(info.ttl_presets.dynamic_data).toBe("15 minutes (posts, pages, comments)");
    expect(info.ttl_presets.session_data).toBe("30 minutes (authentication, current user)");
    expect(info.ttl_presets.realtime_data).toBe("1 minute (real-time data)");
  });
});
