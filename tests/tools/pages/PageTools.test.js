/**
 * Comprehensive tests for PageTools class
 * Achieving ≥70% coverage for pages tool implementation
 */

import { vi } from "vitest";
import { PageTools } from "../../../dist/tools/pages.js";
import { WordPressClient } from "../../../dist/client/api.js"; // eslint-disable-line no-unused-vars

// Mock the WordPressClient
vi.mock("../../../dist/client/api.js");

describe("PageTools", () => {
  let pageTools;
  let mockClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock client instance with all necessary methods
    mockClient = {
      config: {
        siteUrl: "https://test.wordpress.com",
      },
      getSiteUrl: vi.fn().mockReturnValue("https://test.wordpress.com"),
      getPages: vi.fn(),
      getPage: vi.fn(),
      createPage: vi.fn(),
      updatePage: vi.fn(),
      deletePage: vi.fn(),
      getPageRevisions: vi.fn(),
    };

    // Create PageTools instance
    pageTools = new PageTools();
  });

  describe("getTools", () => {
    it("should return all page tool definitions", () => {
      const tools = pageTools.getTools();

      expect(tools).toHaveLength(6);
      expect(tools.map((t) => t.name)).toEqual([
        "wp_list_pages",
        "wp_get_page",
        "wp_create_page",
        "wp_update_page",
        "wp_delete_page",
        "wp_get_page_revisions",
      ]);
    });

    it("should include handlers for each tool", () => {
      const tools = pageTools.getTools();

      tools.forEach((tool) => {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include proper tool metadata", () => {
      const tools = pageTools.getTools();
      const listPagesTool = tools.find((t) => t.name === "wp_list_pages");

      expect(listPagesTool.description).toContain("Lists pages from a WordPress site");
      expect(listPagesTool.parameters).toBeDefined();
      expect(Array.isArray(listPagesTool.parameters)).toBe(true);
    });
  });

  describe("handleListPages", () => {
    beforeEach(() => {
      mockClient.getPages.mockResolvedValue([
        {
          id: 1,
          title: { rendered: "Test Page 1" },
          content: { rendered: "<p>Page content 1</p>" },
          excerpt: { rendered: "Page excerpt 1" },
          date: "2024-01-01T00:00:00",
          modified: "2024-01-02T00:00:00",
          status: "publish",
          link: "https://test.wordpress.com/test-page-1",
          author: 1,
        },
        {
          id: 2,
          title: { rendered: "Test Page 2" },
          content: { rendered: "<p>Page content 2</p>" },
          excerpt: { rendered: "Page excerpt 2" },
          date: "2024-01-03T00:00:00",
          modified: "2024-01-04T00:00:00",
          status: "draft",
          link: "https://test.wordpress.com/test-page-2",
          author: 1,
        },
      ]);
    });

    it("should list pages with default parameters", async () => {
      const result = await pageTools.handleListPages(mockClient, {});

      expect(mockClient.getPages).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 2 pages");
      expect(result).toContain("Test Page 1");
      expect(result).toContain("Test Page 2");
    });

    it("should handle search parameter", async () => {
      const result = await pageTools.handleListPages(mockClient, { search: "WordPress" });

      expect(mockClient.getPages).toHaveBeenCalledWith({ search: "WordPress" });
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Page 1");
    });

    it("should handle status filter", async () => {
      await pageTools.handleListPages(mockClient, { status: "draft" });

      expect(mockClient.getPages).toHaveBeenCalledWith({ status: "draft" });
    });

    it("should handle per_page parameter", async () => {
      await pageTools.handleListPages(mockClient, { per_page: 20 });

      expect(mockClient.getPages).toHaveBeenCalledWith({ per_page: 20 });
    });

    it("should handle empty results", async () => {
      mockClient.getPages.mockResolvedValue([]);

      const result = await pageTools.handleListPages(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No pages found matching the criteria");
    });

    it("should format page metadata correctly", async () => {
      const result = await pageTools.handleListPages(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Test Page 1");
      expect(result).toContain("(publish)");
      expect(result).toContain("(draft)");
      expect(result).toContain("Link:");
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getPages.mockRejectedValue(new Error("API Error"));

      await expect(pageTools.handleListPages(mockClient, {})).rejects.toThrow("Failed to list pages: API Error");
    });
  });

  describe("handleGetPage", () => {
    beforeEach(() => {
      mockClient.getPage.mockResolvedValue({
        id: 1,
        title: { rendered: "Test Page" },
        content: { rendered: "<p>Full page content here</p>" },
        excerpt: { rendered: "Page excerpt" },
        date: "2024-01-01T00:00:00",
        modified: "2024-01-02T00:00:00",
        status: "publish",
        link: "https://test.wordpress.com/test-page",
        author: 1,
      });
    });

    it("should get a page by ID", async () => {
      const result = await pageTools.handleGetPage(mockClient, { id: 1 });

      expect(mockClient.getPage).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Page");
      expect(result).toContain("Page Details (ID: 1)");
    });

    it("should handle missing ID parameter", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.getPage.mockRejectedValue(new Error("Invalid ID"));

      await expect(pageTools.handleGetPage(mockClient, {})).rejects.toThrow("Failed to get page: Invalid ID");
      expect(mockClient.getPage).toHaveBeenCalledWith(undefined);
    });

    it("should handle non-existent page", async () => {
      mockClient.getPage.mockRejectedValue(new Error("Page not found"));

      await expect(pageTools.handleGetPage(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to get page: Page not found",
      );
    });

    it("should format page details correctly", async () => {
      const result = await pageTools.handleGetPage(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Title:** Test Page");
      expect(result).toContain("**Status:** publish");
      expect(result).toContain("**Link:**");
      expect(result).toContain("**Date:**");
    });
  });

  describe("handleCreatePage", () => {
    beforeEach(() => {
      mockClient.createPage.mockResolvedValue({
        id: 100,
        title: { rendered: "New Page" },
        content: { rendered: "<p>New content</p>" },
        status: "publish",
        link: "https://test.wordpress.com/new-page",
      });
    });

    it("should create a page with title only", async () => {
      const result = await pageTools.handleCreatePage(mockClient, {
        title: "New Page",
      });

      expect(mockClient.createPage).toHaveBeenCalledWith({
        title: "New Page",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Page created successfully");
      expect(result).toContain("ID: 100");
    });

    it("should create a page with full parameters", async () => {
      const pageData = {
        title: "New Page",
        content: "<p>New content</p>",
        status: "publish",
      };

      const result = await pageTools.handleCreatePage(mockClient, pageData);

      expect(mockClient.createPage).toHaveBeenCalledWith(pageData);
      expect(typeof result).toBe("string");
      expect(result).toContain("Page created successfully");
    });

    it("should handle creation errors", async () => {
      mockClient.createPage.mockRejectedValue(new Error("Permission denied"));

      await expect(
        pageTools.handleCreatePage(mockClient, {
          title: "New Page",
        }),
      ).rejects.toThrow("Failed to create page: Permission denied");
    });

    it("should create draft pages", async () => {
      mockClient.createPage.mockResolvedValue({
        id: 101,
        title: { rendered: "Draft Page" },
        status: "draft",
        link: "https://test.wordpress.com/draft-page",
      });

      await pageTools.handleCreatePage(mockClient, {
        title: "Draft Page",
        status: "draft",
      });

      expect(mockClient.createPage).toHaveBeenCalledWith({
        title: "Draft Page",
        status: "draft",
      });
    });
  });

  describe("handleUpdatePage", () => {
    beforeEach(() => {
      mockClient.updatePage.mockResolvedValue({
        id: 1,
        title: { rendered: "Updated Page" },
        content: { rendered: "<p>Updated content</p>" },
        status: "publish",
        link: "https://test.wordpress.com/updated-page",
        modified: "2024-01-10T00:00:00",
      });
    });

    it("should update page title", async () => {
      const result = await pageTools.handleUpdatePage(mockClient, {
        id: 1,
        title: "Updated Page",
      });

      expect(mockClient.updatePage).toHaveBeenCalledWith({
        id: 1,
        title: "Updated Page",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Page 1 updated successfully");
    });

    it("should update multiple fields", async () => {
      await pageTools.handleUpdatePage(mockClient, {
        id: 1,
        title: "Updated Page",
        content: "<p>Updated content</p>",
        status: "publish",
      });

      expect(mockClient.updatePage).toHaveBeenCalledWith({
        id: 1,
        title: "Updated Page",
        content: "<p>Updated content</p>",
        status: "publish",
      });
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updatePage.mockRejectedValue(new Error("Invalid ID"));

      await expect(
        pageTools.handleUpdatePage(mockClient, {
          title: "Updated Page",
        }),
      ).rejects.toThrow("Failed to update page: Invalid ID");
      expect(mockClient.updatePage).toHaveBeenCalledWith({
        id: undefined,
        title: "Updated Page",
      });
    });

    it("should handle update errors", async () => {
      mockClient.updatePage.mockRejectedValue(new Error("Page not found"));

      await expect(
        pageTools.handleUpdatePage(mockClient, {
          id: 999,
          title: "Updated Page",
        }),
      ).rejects.toThrow("Failed to update page: Page not found");
    });

    it("should handle status changes", async () => {
      await pageTools.handleUpdatePage(mockClient, {
        id: 1,
        status: "draft",
      });

      expect(mockClient.updatePage).toHaveBeenCalledWith({
        id: 1,
        status: "draft",
      });
    });
  });

  describe("handleDeletePage", () => {
    beforeEach(() => {
      mockClient.deletePage.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Deleted Page" },
          status: "trash",
        },
      });
    });

    it("should delete page to trash by default", async () => {
      const result = await pageTools.handleDeletePage(mockClient, {
        id: 1,
      });

      expect(mockClient.deletePage).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("moved to trash");
    });

    it("should permanently delete with force=true", async () => {
      const result = await pageTools.handleDeletePage(mockClient, {
        id: 1,
        force: true,
      });

      expect(mockClient.deletePage).toHaveBeenCalledWith(1, true);
      expect(typeof result).toBe("string");
      expect(result).toContain("permanently deleted");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.deletePage.mockRejectedValue(new Error("Invalid ID"));

      await expect(pageTools.handleDeletePage(mockClient, {})).rejects.toThrow("Failed to delete page: Invalid ID");
      expect(mockClient.deletePage).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle deletion errors", async () => {
      mockClient.deletePage.mockRejectedValue(new Error("Permission denied"));

      await expect(
        pageTools.handleDeletePage(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete page: Permission denied");
    });

    it("should handle force parameter correctly", async () => {
      await pageTools.handleDeletePage(mockClient, {
        id: 1,
        force: false,
      });

      expect(mockClient.deletePage).toHaveBeenCalledWith(1, false);
    });
  });

  describe("handleGetPageRevisions", () => {
    beforeEach(() => {
      mockClient.getPageRevisions.mockResolvedValue([
        {
          id: 101,
          author: 1,
          date: "2024-01-05T00:00:00",
          modified: "2024-01-05T00:00:00",
          parent: 1,
          title: { rendered: "Revision 2" },
          content: { rendered: "<p>Revision 2 content</p>" },
        },
        {
          id: 100,
          author: 1,
          date: "2024-01-03T00:00:00",
          modified: "2024-01-03T00:00:00",
          parent: 1,
          title: { rendered: "Revision 1" },
          content: { rendered: "<p>Revision 1 content</p>" },
        },
      ]);
    });

    it("should get page revisions", async () => {
      const result = await pageTools.handleGetPageRevisions(mockClient, {
        id: 1,
      });

      expect(mockClient.getPageRevisions).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 2 revisions");
      expect(result).toContain("user ID 1");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.getPageRevisions.mockRejectedValue(new Error("Invalid ID"));

      await expect(pageTools.handleGetPageRevisions(mockClient, {})).rejects.toThrow(
        "Failed to get page revisions: Invalid ID",
      );
      expect(mockClient.getPageRevisions).toHaveBeenCalledWith(undefined);
    });

    it("should handle no revisions", async () => {
      mockClient.getPageRevisions.mockResolvedValue([]);

      const result = await pageTools.handleGetPageRevisions(mockClient, {
        id: 1,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("No revisions found for page 1");
    });

    it("should handle revision retrieval errors", async () => {
      mockClient.getPageRevisions.mockRejectedValue(new Error("Page not found"));

      await expect(
        pageTools.handleGetPageRevisions(mockClient, {
          id: 999,
        }),
      ).rejects.toThrow("Failed to get page revisions: Page not found");
    });

    it("should format revision details correctly", async () => {
      const result = await pageTools.handleGetPageRevisions(mockClient, {
        id: 1,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("Revision by user ID");
      expect(result).toContain("at ");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle network errors", async () => {
      mockClient.getPage.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(pageTools.handleGetPage(mockClient, { id: 1 })).rejects.toThrow("Failed to get page: ECONNREFUSED");
    });

    it("should handle malformed responses", async () => {
      mockClient.getPage.mockResolvedValue(null);

      await expect(pageTools.handleGetPage(mockClient, { id: 1 })).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockClient.createPage.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(pageTools.handleCreatePage(mockClient, { title: "Test" })).rejects.toThrow(
        "Failed to create page: 401 Unauthorized",
      );
    });

    it("should handle rate limiting", async () => {
      mockClient.getPages.mockRejectedValue(new Error("429 Too Many Requests"));

      await expect(pageTools.handleListPages(mockClient, {})).rejects.toThrow(
        "Failed to list pages: 429 Too Many Requests",
      );
    });

    it("should handle invalid page IDs", async () => {
      mockClient.getPage.mockRejectedValue(new Error("404 Not Found"));

      await expect(pageTools.handleGetPage(mockClient, { id: -1 })).rejects.toThrow(
        "Failed to get page: 404 Not Found",
      );
    });

    it("should handle server errors", async () => {
      mockClient.updatePage.mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(
        pageTools.handleUpdatePage(mockClient, {
          id: 1,
          title: "Test",
        }),
      ).rejects.toThrow("Failed to update page: 500 Internal Server Error");
    });
  });
});
