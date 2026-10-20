import { describe, expect, it, vi } from "vitest";
import SystemTools, { handleListPlugins, handleListThemes } from "../../dist/tools/system.js";

describe("System inspection tools", () => {
  it("registers the plugin and theme inspection tools", () => {
    const tools = new SystemTools().getTools();

    expect(tools.map((tool) => tool.name)).toEqual(["wp_check_version", "wp_list_plugins", "wp_list_themes"]);
    expect(tools[1].description).toContain("activate_plugins");
    expect(tools[2].description).toContain("switch_themes");
  });

  it("returns plugin details from the WordPress plugins endpoint", async () => {
    const plugins = [{ plugin: "shop/shop.php", status: "active", name: "Shop", version: "2.0", author: "Author" }];
    const client = { get: vi.fn().mockResolvedValue(plugins) };

    await expect(handleListPlugins(client)).resolves.toBe(plugins);
    expect(client.get).toHaveBeenCalledWith("plugins");
  });

  it("returns theme details from the WordPress themes endpoint", async () => {
    const themes = [{ name: "Child", status: "active", version: "1.0", parent: "Parent", tags: { features: ["editor-style"] } }];
    const client = { get: vi.fn().mockResolvedValue(themes) };

    await expect(handleListThemes(client)).resolves.toBe(themes);
    expect(client.get).toHaveBeenCalledWith("themes");
  });

  it.each([
    [handleListPlugins, "plugins"],
    [handleListThemes, "themes"],
  ])("preserves WordPress errors when listing %s", async (handler, endpoint) => {
    const client = { get: vi.fn().mockRejectedValue(new Error("permission denied")) };

    await expect(handler(client)).rejects.toThrow(`Failed to list ${endpoint}: permission denied`);
  });
});
