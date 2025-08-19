import { vi } from "vitest";
import { SiteTools } from "../../dist/tools/site.js";

describe("SiteTools", () => {
  let siteTools;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      request: vi.fn(),
      getSiteSettings: vi.fn(),
      updateSiteSettings: vi.fn(),
      getSiteInfo: vi.fn(),
      getPlugins: vi.fn(),
      getThemes: vi.fn(),
      getSiteHealth: vi.fn(),
    };

    siteTools = new SiteTools();
  });

  describe("getTools", () => {
    it("should return an array of site tools", () => {
      const tools = siteTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(6);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_get_site_settings");
      expect(toolNames).toContain("wp_update_site_settings");
      expect(toolNames).toContain("wp_search_site");
      expect(toolNames).toContain("wp_get_application_passwords");
      expect(toolNames).toContain("wp_create_application_password");
      expect(toolNames).toContain("wp_delete_application_password");
    });

    it("should have proper tool definitions", () => {
      const tools = siteTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("parameters");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });
  });

  describe("wp_get_site_settings", () => {
    it("should return site settings", async () => {
      const mockSettings = {
        title: "My WordPress Site",
        description: "Just another WordPress site",
        url: "https://site.example.com",
        email: "admin@example.com",
        timezone: "America/New_York",
        date_format: "F j, Y",
        time_format: "g:i a",
        start_of_week: 1,
        language: "en_US",
        use_smilies: true,
        default_category: 1,
        default_post_format: "standard",
        posts_per_page: 10,
        default_ping_status: "open",
        default_comment_status: "open",
      };

      mockClient.getSiteSettings.mockResolvedValue(mockSettings);
      mockClient.getSiteUrl = vi.fn().mockReturnValue("https://site.example.com");

      const tools = siteTools.getTools();
      const settingsTool = tools.find((t) => t.name === "wp_get_site_settings");
      const result = await settingsTool.handler(mockClient, {});

      expect(mockClient.getSiteSettings).toHaveBeenCalled();

      expect(typeof result).toBe("string");
      expect(result).toContain("Site Settings");
      expect(result).toContain("Basic Information:");
      expect(result).toContain("**Title:** My WordPress Site");
      expect(result).toContain("**Admin Email:** admin@example.com");
      expect(result).toContain("**Language:** en_US");
      expect(result).toContain("Content Settings:");
      expect(result).toContain("**Default Category:** 1");
      expect(result).toContain("**Posts per Page:** 10");
      expect(result).toContain("Discussion Settings:");
      expect(result).toContain("**Default Comment Status:** open");
    });

    it("should handle settings errors", async () => {
      mockClient.getSiteSettings.mockRejectedValue(new Error("Unauthorized"));
      mockClient.getSiteUrl = vi.fn().mockReturnValue("https://site.example.com");

      const tools = siteTools.getTools();
      const settingsTool = tools.find((t) => t.name === "wp_get_site_settings");

      await expect(settingsTool.handler(mockClient, {})).rejects.toThrow("Failed to get site settings");
    });
  });

  describe("wp_update_site_settings", () => {
    it("should update site settings", async () => {
      const updatedSettings = {
        title: "Updated Site Title",
        description: "Updated description",
      };

      mockClient.updateSiteSettings.mockResolvedValue(updatedSettings);

      const tools = siteTools.getTools();
      const updateTool = tools.find((t) => t.name === "wp_update_site_settings");
      const result = await updateTool.handler(mockClient, {
        title: "Updated Site Title",
        description: "Updated description",
      });

      expect(mockClient.updateSiteSettings).toHaveBeenCalledWith({
        title: "Updated Site Title",
        description: "Updated description",
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Site settings updated successfully");
      expect(result).toContain("Updated Site Title");
    });

    it("should handle update errors", async () => {
      mockClient.updateSiteSettings.mockRejectedValue(new Error("Permission denied"));

      const tools = siteTools.getTools();
      const updateTool = tools.find((t) => t.name === "wp_update_site_settings");

      await expect(updateTool.handler(mockClient, { title: "New Title" })).rejects.toThrow(
        "Failed to update site settings",
      );
    });

    it("should call updateSiteSettings even with empty params", async () => {
      const updatedSettings = { title: "Default Title" };
      mockClient.updateSiteSettings.mockResolvedValue(updatedSettings);

      const tools = siteTools.getTools();
      const updateTool = tools.find((t) => t.name === "wp_update_site_settings");
      const result = await updateTool.handler(mockClient, {});

      expect(mockClient.updateSiteSettings).toHaveBeenCalledWith({});
      expect(result).toContain("✅ Site settings updated successfully");
    });
  });

  describe("parameter validation", () => {
    it("should have proper parameter definitions", () => {
      const tools = siteTools.getTools();

      const updateTool = tools.find((t) => t.name === "wp_update_site_settings");
      expect(updateTool.parameters.length).toBeGreaterThan(2);
      const titleParam = updateTool.parameters.find((p) => p.name === "title");
      expect(titleParam.type).toBe("string");

      const searchTool = tools.find((t) => t.name === "wp_search_site");
      expect(searchTool.parameters.length).toBeGreaterThan(0);
      const termParam = searchTool.parameters.find((p) => p.name === "term");
      expect(termParam.type).toBe("string");
    });
  });
});
