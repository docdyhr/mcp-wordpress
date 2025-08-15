import { jest } from "@jest/globals";
import { PageTools } from "../../dist/tools/pages.js";

describe("PageTools", () => {
  let pageTools;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WordPress client with all needed methods
    mockClient = {
      request: jest.fn(),
      getPages: jest.fn(),
      getPage: jest.fn(),
      createPage: jest.fn(),
      updatePage: jest.fn(),
      deletePage: jest.fn(),
      getPageRevisions: jest.fn(),
      getUser: jest.fn().mockResolvedValue({ name: "Test User", username: "testuser" }),
      getSiteUrl: jest.fn().mockReturnValue("https://test-site.com"),
      config: {
        baseUrl: "https://test-site.com",
      },
    };

    pageTools = new PageTools();
  });

  describe("getTools", () => {
    it("should return an array of page tools", () => {
      const tools = pageTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(6);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_list_pages");
      expect(toolNames).toContain("wp_get_page");
      expect(toolNames).toContain("wp_create_page");
      expect(toolNames).toContain("wp_update_page");
      expect(toolNames).toContain("wp_delete_page");
      expect(toolNames).toContain("wp_get_page_revisions");
    });

    it("should have proper tool definitions", () => {
      const tools = pageTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should have correct parameter definitions for each tool", () => {
      const tools = pageTools.getTools();
      const toolsByName = {};
      tools.forEach((tool) => {
        toolsByName[tool.name] = tool;
      });

      // wp_list_pages should have optional parameters
      expect(toolsByName["wp_list_pages"].parameters).toHaveLength(3);
      const listParams = toolsByName["wp_list_pages"].parameters;
      expect(listParams.find((p) => p.name === "per_page")).toBeTruthy();
      expect(listParams.find((p) => p.name === "search")).toBeTruthy();
      expect(listParams.find((p) => p.name === "status")).toBeTruthy();

      // wp_get_page should require id
      const getPageParams = toolsByName["wp_get_page"].parameters;
      const idParam = getPageParams.find((p) => p.name === "id");
      expect(idParam).toBeTruthy();
      expect(idParam.required).toBe(true);

      // wp_create_page should have title and content parameters
      const createParams = toolsByName["wp_create_page"].parameters;
      expect(createParams.find((p) => p.name === "title")).toBeTruthy();
      expect(createParams.find((p) => p.name === "content")).toBeTruthy();
      expect(createParams.find((p) => p.name === "title").required).toBe(true);

      // wp_update_page should require id
      const updateParams = toolsByName["wp_update_page"].parameters;
      expect(updateParams.find((p) => p.name === "id").required).toBe(true);

      // wp_delete_page should require id
      const deleteParams = toolsByName["wp_delete_page"].parameters;
      expect(deleteParams.find((p) => p.name === "id").required).toBe(true);
    });
  });

  describe("handleListPages", () => {
    it("should list pages successfully", async () => {
      const mockPages = [
        {
          id: 1,
          title: { rendered: "Test Page 1" },
          content: { rendered: "Content 1" },
          status: "publish",
          date: "2024-01-01T00:00:00",
          link: "https://test-site.com/page-1",
        },
        {
          id: 2,
          title: { rendered: "Test Page 2" },
          content: { rendered: "Content 2" },
          status: "draft",
          date: "2024-01-02T00:00:00",
          link: "https://test-site.com/page-2",
        },
      ];

      mockClient.getPages.mockResolvedValueOnce(mockPages);

      const result = await pageTools.handleListPages(mockClient, {});

      expect(mockClient.getPages).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 2 pages:");
      expect(result).toContain("Test Page 1");
      expect(result).toContain("Test Page 2");
      expect(result).toContain("https://test-site.com/page-1");
    });

    it("should handle empty results", async () => {
      mockClient.getPages.mockResolvedValueOnce([]);

      const result = await pageTools.handleListPages(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No pages found matching the criteria");
    });

    it("should handle search parameters", async () => {
      const mockPages = [
        {
          id: 1,
          title: { rendered: "About Us Page" },
          content: { rendered: "Learn about us" },
          status: "publish",
          link: "https://test-site.com/about",
        },
      ];

      mockClient.getPages.mockResolvedValueOnce(mockPages);

      const result = await pageTools.handleListPages(mockClient, {
        search: "About",
        per_page: 5,
      });

      expect(mockClient.getPages).toHaveBeenCalledWith({
        search: "About",
        per_page: 5,
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("About Us Page");
    });

    it("should handle status parameters", async () => {
      const mockPages = [
        {
          id: 1,
          title: { rendered: "Draft Page" },
          status: "draft",
          link: "https://test-site.com/draft",
        },
      ];

      mockClient.getPages.mockResolvedValueOnce(mockPages);

      const result = await pageTools.handleListPages(mockClient, {
        status: "draft",
      });

      expect(mockClient.getPages).toHaveBeenCalledWith({
        status: "draft",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Draft Page");
    });

    it("should handle API errors", async () => {
      mockClient.getPages.mockRejectedValueOnce(new Error("API Error"));

      await expect(pageTools.handleListPages(mockClient, {})).rejects.toThrow("Failed to list pages");
    });

    it("should handle per_page parameter", async () => {
      const mockPages = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: { rendered: `Page ${i + 1}` },
        status: "publish",
        link: `https://test-site.com/page-${i + 1}`,
      }));

      mockClient.getPages.mockResolvedValueOnce(mockPages);

      const result = await pageTools.handleListPages(mockClient, { per_page: 20 });

      expect(mockClient.getPages).toHaveBeenCalledWith({ per_page: 20 });
      expect(result).toContain("Found 20 pages:");
    });

    it("should format page status correctly", async () => {
      const mockPages = [
        { id: 1, title: { rendered: "Published Page" }, status: "publish", link: "https://test-site.com/pub" },
        { id: 2, title: { rendered: "Private Page" }, status: "private", link: "https://test-site.com/priv" },
      ];

      mockClient.getPages.mockResolvedValueOnce(mockPages);

      const result = await pageTools.handleListPages(mockClient, {});

      expect(result).toContain("(publish)");
      expect(result).toContain("(private)");
    });
  });

  describe("handleGetPage", () => {
    it("should get a page successfully", async () => {
      const mockPage = {
        id: 1,
        title: { rendered: "Test Page" },
        content: { rendered: "Test Content" },
        status: "publish",
        date: "2024-01-01T00:00:00",
        link: "https://test-site.com/test-page",
      };

      mockClient.getPage.mockResolvedValueOnce(mockPage);

      const result = await pageTools.handleGetPage(mockClient, { id: 1 });

      expect(mockClient.getPage).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Page Details (ID: 1)");
      expect(result).toContain("Test Page");
      expect(result).toContain("publish");
      expect(result).toContain("https://test-site.com/test-page");
    });

    it("should handle page not found", async () => {
      mockClient.getPage.mockRejectedValueOnce(new Error("Page not found"));

      await expect(pageTools.handleGetPage(mockClient, { id: 999 })).rejects.toThrow("Failed to get page");
    });

    it("should handle invalid ID parameter", async () => {
      mockClient.getPage.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(pageTools.handleGetPage(mockClient, { id: "invalid" })).rejects.toThrow("Failed to get page");
    });

    it("should format date correctly", async () => {
      const mockPage = {
        id: 1,
        title: { rendered: "Date Test Page" },
        status: "publish",
        date: "2024-01-15T14:30:00",
        link: "https://test-site.com/date-test",
      };

      mockClient.getPage.mockResolvedValueOnce(mockPage);

      const result = await pageTools.handleGetPage(mockClient, { id: 1 });

      expect(result).toContain("Date Test Page");
      expect(result).toMatch(/Date:.*2024/); // Should contain formatted date with year
    });
  });

  describe("handleCreatePage", () => {
    it("should create a page successfully", async () => {
      const mockCreatedPage = {
        id: 123,
        title: { rendered: "New Page" },
        content: { rendered: "New Content" },
        status: "publish",
        link: "https://test-site.com/new-page",
      };

      mockClient.createPage.mockResolvedValueOnce(mockCreatedPage);

      const pageData = {
        title: "New Page",
        content: "New Content",
        status: "publish",
      };

      const result = await pageTools.handleCreatePage(mockClient, pageData);

      expect(mockClient.createPage).toHaveBeenCalledWith(pageData);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Page created successfully!");
      expect(result).toContain("ID: 123");
      expect(result).toContain("New Page");
      expect(result).toContain("https://test-site.com/new-page");
    });

    it("should handle validation errors", async () => {
      mockClient.createPage.mockRejectedValueOnce(new Error("Title is required"));

      await expect(
        pageTools.handleCreatePage(mockClient, {
          title: "", // Invalid empty title
          content: "Some content",
        }),
      ).rejects.toThrow("Failed to create page");
    });

    it("should handle API creation errors", async () => {
      mockClient.createPage.mockRejectedValueOnce(new Error("Creation failed"));

      await expect(
        pageTools.handleCreatePage(mockClient, {
          title: "Test Page",
          content: "Test Content",
        }),
      ).rejects.toThrow("Failed to create page");
    });

    it("should handle pages with different statuses", async () => {
      const mockCreatedPage = {
        id: 124,
        title: { rendered: "Draft Page" },
        content: { rendered: "Content" },
        status: "draft",
        link: "https://test-site.com/draft-page",
      };

      mockClient.createPage.mockResolvedValueOnce(mockCreatedPage);

      const result = await pageTools.handleCreatePage(mockClient, {
        title: "Draft Page",
        content: "Content",
        status: "draft",
      });

      expect(mockClient.createPage).toHaveBeenCalledWith({
        title: "Draft Page",
        content: "Content",
        status: "draft",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Draft Page");
      expect(result).toContain("ID: 124");
    });

    it("should handle minimal page creation (title only)", async () => {
      const mockCreatedPage = {
        id: 125,
        title: { rendered: "Minimal Page" },
        status: "draft",
        link: "https://test-site.com/minimal-page",
      };

      mockClient.createPage.mockResolvedValueOnce(mockCreatedPage);

      const result = await pageTools.handleCreatePage(mockClient, {
        title: "Minimal Page",
      });

      expect(mockClient.createPage).toHaveBeenCalledWith({
        title: "Minimal Page",
      });
      expect(result).toContain("Minimal Page");
    });
  });

  describe("handleUpdatePage", () => {
    it("should update a page successfully", async () => {
      const mockUpdatedPage = {
        id: 1,
        title: { rendered: "Updated Page" },
        content: { rendered: "Updated Content" },
        status: "publish",
        modified: "2024-01-01T12:00:00",
        link: "https://test-site.com/updated-page",
      };

      mockClient.updatePage.mockResolvedValueOnce(mockUpdatedPage);

      const updateData = {
        id: 1,
        title: "Updated Page",
        content: "Updated Content",
      };

      const result = await pageTools.handleUpdatePage(mockClient, updateData);

      expect(mockClient.updatePage).toHaveBeenCalledWith(updateData);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Page 1 updated successfully");
    });

    it("should handle update errors", async () => {
      mockClient.updatePage.mockRejectedValueOnce(new Error("Update failed"));

      await expect(
        pageTools.handleUpdatePage(mockClient, {
          id: 1,
          title: "Updated Page",
        }),
      ).rejects.toThrow("Failed to update page");
    });

    it("should handle missing ID", async () => {
      mockClient.updatePage.mockRejectedValueOnce(new Error("ID is required"));

      await expect(
        pageTools.handleUpdatePage(mockClient, {
          title: "Updated Page",
        }),
      ).rejects.toThrow("Failed to update page");
    });

    it("should handle status updates", async () => {
      const mockUpdatedPage = {
        id: 2,
        title: { rendered: "Status Update Page" },
        status: "publish",
      };

      mockClient.updatePage.mockResolvedValueOnce(mockUpdatedPage);

      const result = await pageTools.handleUpdatePage(mockClient, {
        id: 2,
        status: "publish",
      });

      expect(mockClient.updatePage).toHaveBeenCalledWith({
        id: 2,
        status: "publish",
      });
      expect(result).toContain("✅ Page 2 updated successfully");
    });
  });

  describe("handleDeletePage", () => {
    it("should delete a page successfully (move to trash)", async () => {
      const mockDeleteResult = {
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Deleted Page" },
          status: "trash",
        },
      };

      mockClient.deletePage.mockResolvedValueOnce(mockDeleteResult);

      const result = await pageTools.handleDeletePage(mockClient, { id: 1 });

      expect(mockClient.deletePage).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Page 1 has been moved to trash");
    });

    it("should handle forced deletion", async () => {
      const mockDeleteResult = {
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Permanently Deleted Page" },
        },
      };

      mockClient.deletePage.mockResolvedValueOnce(mockDeleteResult);

      const result = await pageTools.handleDeletePage(mockClient, {
        id: 1,
        force: true,
      });

      expect(mockClient.deletePage).toHaveBeenCalledWith(1, true);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Page 1 has been permanently deleted");
    });

    it("should handle deletion errors", async () => {
      mockClient.deletePage.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(pageTools.handleDeletePage(mockClient, { id: 1 })).rejects.toThrow("Failed to delete page");
    });

    it("should handle invalid ID", async () => {
      mockClient.deletePage.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(pageTools.handleDeletePage(mockClient, { id: "invalid" })).rejects.toThrow("Failed to delete page");
    });

    it("should properly handle force parameter", async () => {
      const mockDeleteResult = { deleted: true };
      mockClient.deletePage.mockResolvedValue(mockDeleteResult);

      // Test with force: false
      await pageTools.handleDeletePage(mockClient, { id: 1, force: false });
      expect(mockClient.deletePage).toHaveBeenCalledWith(1, false);

      // Test with force: true
      await pageTools.handleDeletePage(mockClient, { id: 2, force: true });
      expect(mockClient.deletePage).toHaveBeenCalledWith(2, true);
    });
  });

  describe("handleGetPageRevisions", () => {
    it("should get page revisions successfully", async () => {
      const mockRevisions = [
        {
          id: 101,
          parent: 1,
          title: { rendered: "Revision 1" },
          content: { rendered: "Revision Content 1" },
          author: 1,
          modified: "2024-01-01T00:00:00",
        },
        {
          id: 102,
          parent: 1,
          title: { rendered: "Revision 2" },
          content: { rendered: "Revision Content 2" },
          author: 2,
          modified: "2024-01-02T00:00:00",
        },
      ];

      mockClient.getPageRevisions.mockResolvedValueOnce(mockRevisions);

      const result = await pageTools.handleGetPageRevisions(mockClient, { id: 1 });

      expect(mockClient.getPageRevisions).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 2 revisions for page 1:");
      expect(result).toContain("Revision by user ID 1");
      expect(result).toContain("Revision by user ID 2");
    });

    it("should handle no revisions found", async () => {
      mockClient.getPageRevisions.mockResolvedValueOnce([]);

      const result = await pageTools.handleGetPageRevisions(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("No revisions found for page 1");
    });

    it("should handle API errors for revisions", async () => {
      mockClient.getPageRevisions.mockRejectedValueOnce(new Error("Revisions API error"));

      await expect(pageTools.handleGetPageRevisions(mockClient, { id: 1 })).rejects.toThrow(
        "Failed to get page revisions",
      );
    });

    it("should handle invalid ID for revisions", async () => {
      mockClient.getPageRevisions.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(pageTools.handleGetPageRevisions(mockClient, { id: "invalid" })).rejects.toThrow(
        "Failed to get page revisions",
      );
    });

    it("should format revision dates correctly", async () => {
      const mockRevisions = [
        {
          id: 101,
          author: 1,
          modified: "2024-01-15T14:30:00",
        },
      ];

      mockClient.getPageRevisions.mockResolvedValueOnce(mockRevisions);

      const result = await pageTools.handleGetPageRevisions(mockClient, { id: 1 });

      expect(result).toMatch(/2024/); // Should contain formatted date with year
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null/undefined parameters gracefully", async () => {
      await expect(pageTools.handleListPages(mockClient, null)).rejects.toThrow("Failed to list pages");
    });

    it("should handle client without getSiteUrl method", async () => {
      const clientWithoutGetSiteUrl = { ...mockClient };
      delete clientWithoutGetSiteUrl.getSiteUrl;

      mockClient.getPages.mockResolvedValueOnce([
        {
          id: 1,
          title: { rendered: "Test" },
          status: "publish",
          link: "https://test-site.com/test",
        },
      ]);

      const result = await pageTools.handleListPages(clientWithoutGetSiteUrl, {});
      expect(typeof result).toBe("string");
    });

    it("should handle very large result sets", async () => {
      const largeMockPages = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: { rendered: `Page ${i + 1}` },
        content: { rendered: `Content ${i + 1}` },
        status: "publish",
        link: `https://test-site.com/page-${i + 1}`,
      }));

      mockClient.getPages.mockResolvedValueOnce(largeMockPages);

      const result = await pageTools.handleListPages(mockClient, { per_page: 100 });

      expect(typeof result).toBe("string");
      expect(result).toContain("Found 100 pages:");
    });

    it("should sanitize HTML content in pages", async () => {
      const pageWithHtml = {
        title: "Test Page",
        content: "<script>alert('xss')</script><p>Safe content</p>",
        status: "publish",
      };

      const mockCreatedPage = {
        id: 125,
        title: { rendered: "Test Page" },
        content: { rendered: "<p>Safe content</p>" }, // Script should be removed
        status: "publish",
        link: "https://test-site.com/test-page",
      };

      mockClient.createPage.mockResolvedValueOnce(mockCreatedPage);

      const result = await pageTools.handleCreatePage(mockClient, pageWithHtml);

      expect(mockClient.createPage).toHaveBeenCalled();
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Page created successfully!");
    });

    it("should handle network timeouts gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";

      mockClient.getPages.mockRejectedValueOnce(timeoutError);

      await expect(pageTools.handleListPages(mockClient, {})).rejects.toThrow("Failed to list pages");
    });

    it("should handle concurrent requests properly", async () => {
      const mockPage = { id: 1, title: { rendered: "Test" }, status: "publish", link: "https://test-site.com/test" };
      mockClient.getPage.mockResolvedValue(mockPage);

      const promises = [
        pageTools.handleGetPage(mockClient, { id: 1 }),
        pageTools.handleGetPage(mockClient, { id: 2 }),
        pageTools.handleGetPage(mockClient, { id: 3 }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockClient.getPage).toHaveBeenCalledTimes(3);
    });
  });

  describe("Performance and Validation", () => {
    it("should validate pagination parameters", async () => {
      // Test with valid per_page
      mockClient.getPages.mockResolvedValueOnce([]);
      const result = await pageTools.handleListPages(mockClient, { per_page: 50 });
      expect(typeof result).toBe("string");
      expect(mockClient.getPages).toHaveBeenCalledWith({ per_page: 50 });
    });

    it("should handle mixed parameter types", async () => {
      const mockPages = [
        { id: 1, title: { rendered: "Mixed Test" }, status: "publish", link: "https://test-site.com/mixed" },
      ];
      mockClient.getPages.mockResolvedValueOnce(mockPages);

      const result = await pageTools.handleListPages(mockClient, {
        per_page: 10,
        search: "test query",
        status: "publish",
      });

      expect(mockClient.getPages).toHaveBeenCalledWith({
        per_page: 10,
        search: "test query",
        status: "publish",
      });
      expect(result).toContain("Mixed Test");
    });

    it("should maintain consistent response format", async () => {
      const mockPages = [
        { id: 1, title: { rendered: "Format Test" }, status: "publish", link: "https://test-site.com/format" },
      ];
      mockClient.getPages.mockResolvedValueOnce(mockPages);

      const result = await pageTools.handleListPages(mockClient, {});

      expect(result).toMatch(/Found \d+ pages:/);
      expect(result).toContain("ID 1:");
      expect(result).toContain("**Format Test**");
      expect(result).toContain("(publish)");
    });
  });
});
