import { describe, expect, it, vi } from "vitest";
import SystemTools, { handleListPlugins, handleListThemes } from "../../dist/tools/system.js";

// Shapes follow GET /wp/v2/plugins and /wp/v2/themes (WordPress 7.1): plugin fields are plain strings, theme
// name/author/description are { raw, rendered } pairs, and `template` names the parent theme.
const plugins = [
  {
    plugin: "akismet/akismet",
    status: "inactive",
    name: "Akismet Anti-spam: Spam Protection",
    author: "Automattic - Anti-spam Team",
    version: "5.7.2",
    requires_wp: "5.8",
    requires_php: "7.2",
    description: { raw: "Long text", rendered: "<p>Long <strong>HTML</strong> text</p>" },
  },
  {
    plugin: "shop/shop",
    status: "active",
    name: "Shop &amp; Cart",
    author: "<a href='x'>Shop Inc</a>",
    version: "2.0",
  },
  { plugin: "net/net", status: "network-active", name: "Network Tool", author: "Net", version: "1.1" },
];

const themes = [
  {
    stylesheet: "twentytwentyfive",
    template: "twentytwentyfive",
    status: "inactive",
    name: { raw: "Twenty Twenty-Five", rendered: "Twenty Twenty-Five" },
    author: { raw: "the WordPress team", rendered: '<a href="https://wordpress.org">the WordPress team</a>' },
    version: "1.5",
    is_block_theme: true,
    requires_wp: "6.7",
    tags: { raw: Array.from({ length: 15 }, (_, i) => `feature-${i + 1}`), rendered: "" },
  },
  {
    stylesheet: "verify-child",
    template: "twentytwentyfive",
    status: "active",
    name: { raw: "Verify Child", rendered: "Verify Child" },
    author: { raw: "", rendered: "" },
    version: "0.1.0",
    tags: { raw: [], rendered: "" },
  },
];

describe("System inspection tools", () => {
  it("registers the plugin and theme inspection tools", () => {
    const tools = new SystemTools().getTools();

    expect(tools.map((tool) => tool.name)).toEqual(["wp_check_version", "wp_list_plugins", "wp_list_themes"]);
    expect(tools[1].description).toContain("activate_plugins");
    expect(tools[2].description).toContain("switch_themes");
  });

  it("summarises plugins by status with version, plain-text author and requirements", async () => {
    const client = { get: vi.fn().mockResolvedValue(plugins) };

    const text = await handleListPlugins(client);

    expect(client.get).toHaveBeenCalledWith("plugins");
    expect(text).toContain("**Plugins**: 3 installed (2 active, 1 inactive)");
    expect(text).toMatch(/### Active \(2\)\n- \*\*Shop & Cart\*\* \(`shop\/shop`\) — v2\.0 · by Shop Inc/);
    expect(text).toContain("- **Network Tool** (`net/net`) — v1.1 · by Net · network-active");
    expect(text).toContain(
      "### Inactive (1)\n- **Akismet Anti-spam: Spam Protection** (`akismet/akismet`) — v5.7.2 · by Automattic - Anti-spam Team · requires WP 5.8 / PHP 7.2",
    );
    // Descriptions are third-party HTML; the summary leaves them out.
    expect(text).not.toContain("Long");
  });

  it("puts the active theme first and names its parent theme", async () => {
    const client = { get: vi.fn().mockResolvedValue(themes) };

    const text = await handleListThemes(client);

    expect(client.get).toHaveBeenCalledWith("themes");
    expect(text).toContain(
      "**Active theme**: Verify Child (`verify-child`) — child theme of Twenty Twenty-Five (`twentytwentyfive`)",
    );
    const [first, second] = text.split("\n").filter((line) => line.startsWith("- "));
    expect(first).toBe("- **Verify Child** (`verify-child`) — active · v0.1.0 · child of `twentytwentyfive`");
    expect(second).toBe(
      "- **Twenty Twenty-Five** (`twentytwentyfive`) — inactive (parent of the active theme) · v1.5 · by the WordPress team · block theme · requires WP 6.7",
    );
    expect(text).toContain("Features: feature-1, feature-2");
    expect(text).toContain("feature-12 (+3 more)");
    expect(text).not.toContain("feature-13");
  });

  it("strips HTML and decodes entities from raw theme names and authors", async () => {
    const client = {
      get: vi.fn().mockResolvedValue([
        {
          stylesheet: "example",
          template: "example",
          status: "active",
          name: { raw: "<strong>Example &amp; Co</strong>", rendered: "Fallback name" },
          author: { raw: '<a href="https://example.com">Author &amp; Co</a>', rendered: "Fallback author" },
        },
      ]),
    };

    const text = await handleListThemes(client);

    expect(text).toContain("**Active theme**: Example & Co (`example`)");
    expect(text).toContain("- **Example & Co** (`example`) — active · v? · by Author & Co");
    expect(text).not.toMatch(/<strong>|<a href=/);
  });

  it.each([
    [handleListPlugins, "No plugins are installed."],
    [handleListThemes, "No themes are installed."],
  ])("says so when WordPress returns an empty list", async (handler, message) => {
    await expect(handler({ get: vi.fn().mockResolvedValue([]) })).resolves.toBe(message);
  });

  it.each([
    [handleListPlugins, "plugins"],
    [handleListThemes, "themes"],
  ])("preserves WordPress errors when listing %s", async (handler, endpoint) => {
    const client = { get: vi.fn().mockRejectedValue(new Error("permission denied")) };

    await expect(handler(client)).rejects.toThrow(`Failed to list ${endpoint}: permission denied`);
  });
});
