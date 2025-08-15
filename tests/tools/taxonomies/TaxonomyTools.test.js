/**
 * Comprehensive tests for TaxonomyTools class
 * Achieving ≥70% coverage for taxonomies tool implementation
 */

import { jest } from "@jest/globals";

// Mock the dependencies
jest.mock("../../../dist/client/api.js");

// Now import the modules after mocking
const { TaxonomyTools } = await import("../../../dist/tools/taxonomies.js");
const { WordPressClient } = await import("../../../dist/client/api.js"); // eslint-disable-line no-unused-vars

describe("TaxonomyTools", () => {
  let taxonomyTools;
  let mockClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock client instance with all necessary methods
    mockClient = {
      config: {
        siteUrl: "https://test.wordpress.com",
      },
      getSiteUrl: jest.fn().mockReturnValue("https://test.wordpress.com"),
      getCategories: jest.fn(),
      getCategory: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getTags: jest.fn(),
      getTag: jest.fn(),
      createTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
    };

    // Create TaxonomyTools instance
    taxonomyTools = new TaxonomyTools();
  });

  describe("getTools", () => {
    it("should return all taxonomy tool definitions", () => {
      const tools = taxonomyTools.getTools();

      expect(tools).toHaveLength(10);
      expect(tools.map((t) => t.name)).toEqual([
        "wp_list_categories",
        "wp_get_category",
        "wp_create_category",
        "wp_update_category",
        "wp_delete_category",
        "wp_list_tags",
        "wp_get_tag",
        "wp_create_tag",
        "wp_update_tag",
        "wp_delete_tag",
      ]);
    });

    it("should include handlers for each tool", () => {
      const tools = taxonomyTools.getTools();

      tools.forEach((tool) => {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include proper tool metadata", () => {
      const tools = taxonomyTools.getTools();
      const listCategoriesTool = tools.find((t) => t.name === "wp_list_categories");
      const listTagsTool = tools.find((t) => t.name === "wp_list_tags");

      expect(listCategoriesTool.description).toContain("Lists categories from a WordPress site");
      expect(listTagsTool.description).toContain("Lists tags from a WordPress site");
      expect(listCategoriesTool.parameters).toBeDefined();
      expect(listTagsTool.parameters).toBeDefined();
    });

    it("should include hide_empty parameter for categories only", () => {
      const tools = taxonomyTools.getTools();
      const listCategoriesTool = tools.find((t) => t.name === "wp_list_categories");
      const listTagsTool = tools.find((t) => t.name === "wp_list_tags");

      const categoriesHideEmptyParam = listCategoriesTool.parameters.find((p) => p.name === "hide_empty");
      const tagsHideEmptyParam = listTagsTool.parameters.find((p) => p.name === "hide_empty");

      expect(categoriesHideEmptyParam).toBeDefined();
      expect(categoriesHideEmptyParam.type).toBe("boolean");
      expect(tagsHideEmptyParam).toBeUndefined();
    });

    it("should include description parameter for categories only", () => {
      const tools = taxonomyTools.getTools();
      const createCategoryTool = tools.find((t) => t.name === "wp_create_category");
      const createTagTool = tools.find((t) => t.name === "wp_create_tag");

      const categoryDescParam = createCategoryTool.parameters.find((p) => p.name === "description");
      const tagDescParam = createTagTool.parameters.find((p) => p.name === "description");

      expect(categoryDescParam).toBeDefined();
      expect(tagDescParam).toBeUndefined();
    });
  });

  describe("handleListCategories", () => {
    beforeEach(() => {
      mockClient.getCategories.mockResolvedValue([
        {
          id: 1,
          name: "Technology",
          slug: "technology",
          description: "Tech-related posts",
          count: 15,
        },
        {
          id: 2,
          name: "Travel",
          slug: "travel",
          description: "Travel experiences and guides",
          count: 8,
        },
        {
          id: 3,
          name: "Food",
          slug: "food",
          description: "",
          count: 0,
        },
      ]);
    });

    it("should list categories with default parameters", async () => {
      const result = await taxonomyTools.handleListCategories(mockClient, {});

      expect(mockClient.getCategories).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 3 categories");
      expect(result).toContain("Technology");
      expect(result).toContain("Travel");
      expect(result).toContain("Food");
    });

    it("should handle search parameter", async () => {
      await taxonomyTools.handleListCategories(mockClient, { search: "tech" });

      expect(mockClient.getCategories).toHaveBeenCalledWith({ search: "tech" });
    });

    it("should handle hide_empty parameter", async () => {
      await taxonomyTools.handleListCategories(mockClient, { hide_empty: true });

      expect(mockClient.getCategories).toHaveBeenCalledWith({ hide_empty: true });
    });

    it("should handle combined search and hide_empty parameters", async () => {
      await taxonomyTools.handleListCategories(mockClient, { search: "tech", hide_empty: false });

      expect(mockClient.getCategories).toHaveBeenCalledWith({ search: "tech", hide_empty: false });
    });

    it("should format category details correctly", async () => {
      const result = await taxonomyTools.handleListCategories(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("ID 1: **Technology** (Posts: 15)");
      expect(result).toContain("ID 2: **Travel** (Posts: 8)");
      expect(result).toContain("ID 3: **Food** (Posts: 0)");
    });

    it("should handle empty results", async () => {
      mockClient.getCategories.mockResolvedValue([]);

      const result = await taxonomyTools.handleListCategories(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No categories found");
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getCategories.mockRejectedValue(new Error("API Error"));

      await expect(taxonomyTools.handleListCategories(mockClient, {})).rejects.toThrow(
        "Failed to list categories: API Error",
      );
    });
  });

  describe("handleGetCategory", () => {
    beforeEach(() => {
      mockClient.getCategory.mockResolvedValue({
        id: 1,
        name: "Technology",
        slug: "technology",
        description: "All about technology and innovation",
        count: 15,
      });
    });

    it("should get a category by ID", async () => {
      const result = await taxonomyTools.handleGetCategory(mockClient, { id: 1 });

      expect(mockClient.getCategory).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Category Details (ID: 1)");
      expect(result).toContain("Technology");
    });

    it("should format category details correctly", async () => {
      const result = await taxonomyTools.handleGetCategory(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Name:** Technology");
      expect(result).toContain("**Slug:** technology");
      expect(result).toContain("**Description:** All about technology and innovation");
      expect(result).toContain("**Post Count:** 15");
    });

    it("should handle category without description", async () => {
      mockClient.getCategory.mockResolvedValue({
        id: 2,
        name: "No Description",
        slug: "no-description",
        description: "",
        count: 5,
      });

      const result = await taxonomyTools.handleGetCategory(mockClient, { id: 2 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Description:** None");
    });

    it("should handle missing ID parameter", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.getCategory.mockRejectedValue(new Error("Invalid ID"));

      await expect(taxonomyTools.handleGetCategory(mockClient, {})).rejects.toThrow(
        "Failed to get category: Invalid ID",
      );
      expect(mockClient.getCategory).toHaveBeenCalledWith(undefined);
    });

    it("should handle non-existent category", async () => {
      mockClient.getCategory.mockRejectedValue(new Error("Category not found"));

      await expect(taxonomyTools.handleGetCategory(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to get category: Category not found",
      );
    });
  });

  describe("handleCreateCategory", () => {
    beforeEach(() => {
      mockClient.createCategory.mockResolvedValue({
        id: 100,
        name: "New Category",
        slug: "new-category",
        description: "A brand new category",
        count: 0,
      });
    });

    it("should create a category with name only", async () => {
      const result = await taxonomyTools.handleCreateCategory(mockClient, {
        name: "New Category",
      });

      expect(mockClient.createCategory).toHaveBeenCalledWith({
        name: "New Category",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain('Category "New Category" created successfully with ID: 100');
    });

    it("should create a category with name and description", async () => {
      const categoryData = {
        name: "New Category",
        description: "A brand new category",
      };

      const result = await taxonomyTools.handleCreateCategory(mockClient, categoryData);

      expect(mockClient.createCategory).toHaveBeenCalledWith(categoryData);
      expect(typeof result).toBe("string");
      expect(result).toContain('Category "New Category" created successfully with ID: 100');
    });

    it("should handle creation errors", async () => {
      mockClient.createCategory.mockRejectedValue(new Error("Category name already exists"));

      await expect(
        taxonomyTools.handleCreateCategory(mockClient, {
          name: "Existing Category",
        }),
      ).rejects.toThrow("Failed to create category: Category name already exists");
    });

    it("should handle invalid category names", async () => {
      mockClient.createCategory.mockRejectedValue(new Error("Invalid category name"));

      await expect(
        taxonomyTools.handleCreateCategory(mockClient, {
          name: "",
        }),
      ).rejects.toThrow("Failed to create category: Invalid category name");
    });

    it("should handle permission errors", async () => {
      mockClient.createCategory.mockRejectedValue(new Error("Permission denied"));

      await expect(
        taxonomyTools.handleCreateCategory(mockClient, {
          name: "New Category",
        }),
      ).rejects.toThrow("Failed to create category: Permission denied");
    });
  });

  describe("handleUpdateCategory", () => {
    beforeEach(() => {
      mockClient.updateCategory.mockResolvedValue({
        id: 1,
        name: "Updated Category",
        slug: "updated-category",
        description: "Updated description",
        count: 10,
      });
    });

    it("should update category name", async () => {
      const result = await taxonomyTools.handleUpdateCategory(mockClient, {
        id: 1,
        name: "Updated Category",
      });

      expect(mockClient.updateCategory).toHaveBeenCalledWith({
        id: 1,
        name: "Updated Category",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Category 1 updated successfully");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updateCategory.mockRejectedValue(new Error("Invalid ID"));

      await expect(
        taxonomyTools.handleUpdateCategory(mockClient, {
          name: "Updated Category",
        }),
      ).rejects.toThrow("Failed to update category: Invalid ID");
      expect(mockClient.updateCategory).toHaveBeenCalledWith({
        id: undefined,
        name: "Updated Category",
      });
    });

    it("should handle update errors", async () => {
      mockClient.updateCategory.mockRejectedValue(new Error("Category not found"));

      await expect(
        taxonomyTools.handleUpdateCategory(mockClient, {
          id: 999,
          name: "Updated Category",
        }),
      ).rejects.toThrow("Failed to update category: Category not found");
    });

    it("should handle permission errors", async () => {
      mockClient.updateCategory.mockRejectedValue(new Error("Permission denied"));

      await expect(
        taxonomyTools.handleUpdateCategory(mockClient, {
          id: 1,
          name: "Updated Category",
        }),
      ).rejects.toThrow("Failed to update category: Permission denied");
    });

    it("should handle duplicate category names", async () => {
      mockClient.updateCategory.mockRejectedValue(new Error("Category name already exists"));

      await expect(
        taxonomyTools.handleUpdateCategory(mockClient, {
          id: 1,
          name: "Existing Category",
        }),
      ).rejects.toThrow("Failed to update category: Category name already exists");
    });
  });

  describe("handleDeleteCategory", () => {
    beforeEach(() => {
      mockClient.deleteCategory.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          name: "Deleted Category",
        },
      });
    });

    it("should delete a category", async () => {
      const result = await taxonomyTools.handleDeleteCategory(mockClient, {
        id: 1,
      });

      expect(mockClient.deleteCategory).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Category 1 has been deleted");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.deleteCategory.mockRejectedValue(new Error("Invalid ID"));

      await expect(taxonomyTools.handleDeleteCategory(mockClient, {})).rejects.toThrow(
        "Failed to delete category: Invalid ID",
      );
      expect(mockClient.deleteCategory).toHaveBeenCalledWith(undefined);
    });

    it("should handle deletion errors", async () => {
      mockClient.deleteCategory.mockRejectedValue(new Error("Category not found"));

      await expect(
        taxonomyTools.handleDeleteCategory(mockClient, {
          id: 999,
        }),
      ).rejects.toThrow("Failed to delete category: Category not found");
    });

    it("should handle permission errors", async () => {
      mockClient.deleteCategory.mockRejectedValue(new Error("Permission denied"));

      await expect(
        taxonomyTools.handleDeleteCategory(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete category: Permission denied");
    });

    it("should handle categories with assigned posts", async () => {
      mockClient.deleteCategory.mockRejectedValue(new Error("Cannot delete category with assigned posts"));

      await expect(
        taxonomyTools.handleDeleteCategory(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete category: Cannot delete category with assigned posts");
    });
  });

  describe("handleListTags", () => {
    beforeEach(() => {
      mockClient.getTags.mockResolvedValue([
        {
          id: 1,
          name: "JavaScript",
          slug: "javascript",
          count: 12,
        },
        {
          id: 2,
          name: "React",
          slug: "react",
          count: 8,
        },
        {
          id: 3,
          name: "WordPress",
          slug: "wordpress",
          count: 25,
        },
      ]);
    });

    it("should list tags with default parameters", async () => {
      const result = await taxonomyTools.handleListTags(mockClient, {});

      expect(mockClient.getTags).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 3 tags");
      expect(result).toContain("JavaScript");
      expect(result).toContain("React");
      expect(result).toContain("WordPress");
    });

    it("should handle search parameter", async () => {
      await taxonomyTools.handleListTags(mockClient, { search: "react" });

      expect(mockClient.getTags).toHaveBeenCalledWith({ search: "react" });
    });

    it("should format tag details correctly", async () => {
      const result = await taxonomyTools.handleListTags(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("ID 1: **JavaScript** (Posts: 12)");
      expect(result).toContain("ID 2: **React** (Posts: 8)");
      expect(result).toContain("ID 3: **WordPress** (Posts: 25)");
    });

    it("should handle empty results", async () => {
      mockClient.getTags.mockResolvedValue([]);

      const result = await taxonomyTools.handleListTags(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No tags found");
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getTags.mockRejectedValue(new Error("API Error"));

      await expect(taxonomyTools.handleListTags(mockClient, {})).rejects.toThrow("Failed to list tags: API Error");
    });
  });

  describe("handleGetTag", () => {
    beforeEach(() => {
      mockClient.getTag.mockResolvedValue({
        id: 1,
        name: "JavaScript",
        slug: "javascript",
        count: 12,
      });
    });

    it("should get a tag by ID", async () => {
      const result = await taxonomyTools.handleGetTag(mockClient, { id: 1 });

      expect(mockClient.getTag).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Tag Details (ID: 1)");
      expect(result).toContain("JavaScript");
    });

    it("should format tag details correctly", async () => {
      const result = await taxonomyTools.handleGetTag(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Name:** JavaScript");
      expect(result).toContain("**Slug:** javascript");
      expect(result).toContain("**Post Count:** 12");
    });

    it("should handle missing ID parameter", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.getTag.mockRejectedValue(new Error("Invalid ID"));

      await expect(taxonomyTools.handleGetTag(mockClient, {})).rejects.toThrow("Failed to get tag: Invalid ID");
      expect(mockClient.getTag).toHaveBeenCalledWith(undefined);
    });

    it("should handle non-existent tag", async () => {
      mockClient.getTag.mockRejectedValue(new Error("Tag not found"));

      await expect(taxonomyTools.handleGetTag(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to get tag: Tag not found",
      );
    });

    it("should handle tags with zero posts", async () => {
      mockClient.getTag.mockResolvedValue({
        id: 2,
        name: "Unused Tag",
        slug: "unused-tag",
        count: 0,
      });

      const result = await taxonomyTools.handleGetTag(mockClient, { id: 2 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Post Count:** 0");
    });
  });

  describe("handleCreateTag", () => {
    beforeEach(() => {
      mockClient.createTag.mockResolvedValue({
        id: 100,
        name: "New Tag",
        slug: "new-tag",
        count: 0,
      });
    });

    it("should create a tag with name", async () => {
      const result = await taxonomyTools.handleCreateTag(mockClient, {
        name: "New Tag",
      });

      expect(mockClient.createTag).toHaveBeenCalledWith({
        name: "New Tag",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain('Tag "New Tag" created successfully with ID: 100');
    });

    it("should handle creation errors", async () => {
      mockClient.createTag.mockRejectedValue(new Error("Tag name already exists"));

      await expect(
        taxonomyTools.handleCreateTag(mockClient, {
          name: "Existing Tag",
        }),
      ).rejects.toThrow("Failed to create tag: Tag name already exists");
    });

    it("should handle invalid tag names", async () => {
      mockClient.createTag.mockRejectedValue(new Error("Invalid tag name"));

      await expect(
        taxonomyTools.handleCreateTag(mockClient, {
          name: "",
        }),
      ).rejects.toThrow("Failed to create tag: Invalid tag name");
    });

    it("should handle permission errors", async () => {
      mockClient.createTag.mockRejectedValue(new Error("Permission denied"));

      await expect(
        taxonomyTools.handleCreateTag(mockClient, {
          name: "New Tag",
        }),
      ).rejects.toThrow("Failed to create tag: Permission denied");
    });

    it("should handle special characters in tag names", async () => {
      mockClient.createTag.mockResolvedValue({
        id: 101,
        name: "C++",
        slug: "cpp",
        count: 0,
      });

      const result = await taxonomyTools.handleCreateTag(mockClient, {
        name: "C++",
      });

      expect(typeof result).toBe("string");
      expect(result).toContain('Tag "C++" created successfully with ID: 101');
    });
  });

  describe("handleUpdateTag", () => {
    beforeEach(() => {
      mockClient.updateTag.mockResolvedValue({
        id: 1,
        name: "Updated Tag",
        slug: "updated-tag",
        count: 5,
      });
    });

    it("should update tag name", async () => {
      const result = await taxonomyTools.handleUpdateTag(mockClient, {
        id: 1,
        name: "Updated Tag",
      });

      expect(mockClient.updateTag).toHaveBeenCalledWith({
        id: 1,
        name: "Updated Tag",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Tag 1 updated successfully");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updateTag.mockRejectedValue(new Error("Invalid ID"));

      await expect(
        taxonomyTools.handleUpdateTag(mockClient, {
          name: "Updated Tag",
        }),
      ).rejects.toThrow("Failed to update tag: Invalid ID");
      expect(mockClient.updateTag).toHaveBeenCalledWith({
        id: undefined,
        name: "Updated Tag",
      });
    });

    it("should handle update errors", async () => {
      mockClient.updateTag.mockRejectedValue(new Error("Tag not found"));

      await expect(
        taxonomyTools.handleUpdateTag(mockClient, {
          id: 999,
          name: "Updated Tag",
        }),
      ).rejects.toThrow("Failed to update tag: Tag not found");
    });

    it("should handle permission errors", async () => {
      mockClient.updateTag.mockRejectedValue(new Error("Permission denied"));

      await expect(
        taxonomyTools.handleUpdateTag(mockClient, {
          id: 1,
          name: "Updated Tag",
        }),
      ).rejects.toThrow("Failed to update tag: Permission denied");
    });

    it("should handle duplicate tag names", async () => {
      mockClient.updateTag.mockRejectedValue(new Error("Tag name already exists"));

      await expect(
        taxonomyTools.handleUpdateTag(mockClient, {
          id: 1,
          name: "Existing Tag",
        }),
      ).rejects.toThrow("Failed to update tag: Tag name already exists");
    });
  });

  describe("handleDeleteTag", () => {
    beforeEach(() => {
      mockClient.deleteTag.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          name: "Deleted Tag",
        },
      });
    });

    it("should delete a tag", async () => {
      const result = await taxonomyTools.handleDeleteTag(mockClient, {
        id: 1,
      });

      expect(mockClient.deleteTag).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Tag 1 has been deleted");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.deleteTag.mockRejectedValue(new Error("Invalid ID"));

      await expect(taxonomyTools.handleDeleteTag(mockClient, {})).rejects.toThrow("Failed to delete tag: Invalid ID");
      expect(mockClient.deleteTag).toHaveBeenCalledWith(undefined);
    });

    it("should handle deletion errors", async () => {
      mockClient.deleteTag.mockRejectedValue(new Error("Tag not found"));

      await expect(
        taxonomyTools.handleDeleteTag(mockClient, {
          id: 999,
        }),
      ).rejects.toThrow("Failed to delete tag: Tag not found");
    });

    it("should handle permission errors", async () => {
      mockClient.deleteTag.mockRejectedValue(new Error("Permission denied"));

      await expect(
        taxonomyTools.handleDeleteTag(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete tag: Permission denied");
    });

    it("should handle tags with assigned posts", async () => {
      mockClient.deleteTag.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          name: "Popular Tag",
          count: 50,
        },
      });

      const result = await taxonomyTools.handleDeleteTag(mockClient, {
        id: 1,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("Tag 1 has been deleted");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle network errors", async () => {
      mockClient.getCategory.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(taxonomyTools.handleGetCategory(mockClient, { id: 1 })).rejects.toThrow(
        "Failed to get category: ECONNREFUSED",
      );
    });

    it("should handle malformed responses", async () => {
      mockClient.getTag.mockResolvedValue(null);

      await expect(taxonomyTools.handleGetTag(mockClient, { id: 1 })).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockClient.createCategory.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(
        taxonomyTools.handleCreateCategory(mockClient, {
          name: "Test Category",
        }),
      ).rejects.toThrow("Failed to create category: 401 Unauthorized");
    });

    it("should handle rate limiting", async () => {
      mockClient.getCategories.mockRejectedValue(new Error("429 Too Many Requests"));

      await expect(taxonomyTools.handleListCategories(mockClient, {})).rejects.toThrow(
        "Failed to list categories: 429 Too Many Requests",
      );
    });

    it("should handle invalid taxonomy IDs", async () => {
      mockClient.getCategory.mockRejectedValue(new Error("404 Not Found"));

      await expect(taxonomyTools.handleGetCategory(mockClient, { id: -1 })).rejects.toThrow(
        "Failed to get category: 404 Not Found",
      );
    });

    it("should handle server errors", async () => {
      mockClient.updateTag.mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(
        taxonomyTools.handleUpdateTag(mockClient, {
          id: 1,
          name: "Test",
        }),
      ).rejects.toThrow("Failed to update tag: 500 Internal Server Error");
    });

    it("should handle categories with null descriptions", async () => {
      mockClient.getCategory.mockResolvedValue({
        id: 1,
        name: "No Description Category",
        slug: "no-desc",
        description: null,
        count: 5,
      });

      const result = await taxonomyTools.handleGetCategory(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Description:** None");
    });

    it("should handle tags with very long names", async () => {
      const longName = "A".repeat(200);
      mockClient.createTag.mockResolvedValue({
        id: 102,
        name: longName,
        slug: "a".repeat(50),
        count: 0,
      });

      const result = await taxonomyTools.handleCreateTag(mockClient, {
        name: longName,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain(`Tag "${longName}" created successfully`);
    });

    it("should handle tags with special Unicode characters", async () => {
      mockClient.createTag.mockResolvedValue({
        id: 103,
        name: "🚀 Rocket",
        slug: "rocket",
        count: 0,
      });

      const result = await taxonomyTools.handleCreateTag(mockClient, {
        name: "🚀 Rocket",
      });

      expect(typeof result).toBe("string");
      expect(result).toContain('Tag "🚀 Rocket" created successfully');
    });

    it("should handle categories with high post counts", async () => {
      mockClient.getCategory.mockResolvedValue({
        id: 1,
        name: "Popular Category",
        slug: "popular",
        description: "Very popular category",
        count: 9999,
      });

      const result = await taxonomyTools.handleGetCategory(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Post Count:** 9999");
    });
  });
});
