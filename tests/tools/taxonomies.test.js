import { jest } from "@jest/globals";
import { TaxonomyTools } from "../../dist/tools/taxonomies.js";

describe("TaxonomyTools", () => {
  let taxonomyTools;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WordPress client with all needed methods
    mockClient = {
      request: jest.fn(),
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
      getSiteUrl: jest.fn().mockReturnValue("https://test-site.com"),
      config: {
        baseUrl: "https://test-site.com",
      },
    };

    taxonomyTools = new TaxonomyTools();
  });

  describe("getTools", () => {
    it("should return an array of taxonomy tools", () => {
      const tools = taxonomyTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(10);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_list_categories");
      expect(toolNames).toContain("wp_get_category");
      expect(toolNames).toContain("wp_create_category");
      expect(toolNames).toContain("wp_update_category");
      expect(toolNames).toContain("wp_delete_category");
      expect(toolNames).toContain("wp_list_tags");
      expect(toolNames).toContain("wp_get_tag");
      expect(toolNames).toContain("wp_create_tag");
      expect(toolNames).toContain("wp_update_tag");
      expect(toolNames).toContain("wp_delete_tag");
    });

    it("should have proper tool definitions", () => {
      const tools = taxonomyTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should have correct parameter definitions for each tool", () => {
      const tools = taxonomyTools.getTools();
      const toolsByName = {};
      tools.forEach((tool) => {
        toolsByName[tool.name] = tool;
      });

      // Category tools
      const listCatParams = toolsByName["wp_list_categories"].parameters;
      expect(listCatParams.find((p) => p.name === "search")).toBeTruthy();
      expect(listCatParams.find((p) => p.name === "hide_empty")).toBeTruthy();

      const getCatParams = toolsByName["wp_get_category"].parameters;
      expect(getCatParams.find((p) => p.name === "id").required).toBe(true);

      const createCatParams = toolsByName["wp_create_category"].parameters;
      expect(createCatParams.find((p) => p.name === "name").required).toBe(true);
      expect(createCatParams.find((p) => p.name === "description")).toBeTruthy();

      const updateCatParams = toolsByName["wp_update_category"].parameters;
      expect(updateCatParams.find((p) => p.name === "id").required).toBe(true);

      const deleteCatParams = toolsByName["wp_delete_category"].parameters;
      expect(deleteCatParams.find((p) => p.name === "id").required).toBe(true);

      // Tag tools
      const listTagParams = toolsByName["wp_list_tags"].parameters;
      expect(listTagParams.find((p) => p.name === "search")).toBeTruthy();

      const getTagParams = toolsByName["wp_get_tag"].parameters;
      expect(getTagParams.find((p) => p.name === "id").required).toBe(true);

      const createTagParams = toolsByName["wp_create_tag"].parameters;
      expect(createTagParams.find((p) => p.name === "name").required).toBe(true);

      const updateTagParams = toolsByName["wp_update_tag"].parameters;
      expect(updateTagParams.find((p) => p.name === "id").required).toBe(true);

      const deleteTagParams = toolsByName["wp_delete_tag"].parameters;
      expect(deleteTagParams.find((p) => p.name === "id").required).toBe(true);
    });
  });

  describe("Category Operations", () => {
    describe("handleListCategories", () => {
      it("should list categories successfully", async () => {
        const mockCategories = [
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
            description: "Travel experiences",
            count: 8,
          },
        ];

        mockClient.getCategories.mockResolvedValueOnce(mockCategories);

        const result = await taxonomyTools.handleListCategories(mockClient, {});

        expect(mockClient.getCategories).toHaveBeenCalledWith({});
        expect(typeof result).toBe("string");
        expect(result).toContain("Found 2 categories:");
        expect(result).toContain("Technology");
        expect(result).toContain("Travel");
        expect(result).toContain("Posts: 15");
        expect(result).toContain("Posts: 8");
      });

      it("should handle empty results", async () => {
        mockClient.getCategories.mockResolvedValueOnce([]);

        const result = await taxonomyTools.handleListCategories(mockClient, {});

        expect(typeof result).toBe("string");
        expect(result).toContain("No categories found");
      });

      it("should handle search parameters", async () => {
        const mockCategories = [
          {
            id: 1,
            name: "Technology News",
            slug: "tech-news",
            count: 5,
          },
        ];

        mockClient.getCategories.mockResolvedValueOnce(mockCategories);

        const result = await taxonomyTools.handleListCategories(mockClient, {
          search: "tech",
        });

        expect(mockClient.getCategories).toHaveBeenCalledWith({
          search: "tech",
        });
        expect(result).toContain("Technology News");
      });

      it("should handle hide_empty parameter", async () => {
        const mockCategories = [
          {
            id: 1,
            name: "Active Category",
            count: 10,
          },
        ];

        mockClient.getCategories.mockResolvedValueOnce(mockCategories);

        const result = await taxonomyTools.handleListCategories(mockClient, {
          hide_empty: true,
        });

        expect(mockClient.getCategories).toHaveBeenCalledWith({
          hide_empty: true,
        });
        expect(result).toContain("Active Category");
      });

      it("should handle API errors", async () => {
        mockClient.getCategories.mockRejectedValueOnce(new Error("API Error"));

        await expect(taxonomyTools.handleListCategories(mockClient, {})).rejects.toThrow("Failed to list categories");
      });

      it("should handle categories with zero post count", async () => {
        const mockCategories = [
          {
            id: 1,
            name: "Empty Category",
            count: 0,
          },
        ];

        mockClient.getCategories.mockResolvedValueOnce(mockCategories);

        const result = await taxonomyTools.handleListCategories(mockClient, {});

        expect(result).toContain("Posts: 0");
      });
    });

    describe("handleGetCategory", () => {
      it("should get a category successfully", async () => {
        const mockCategory = {
          id: 1,
          name: "Technology",
          slug: "technology",
          description: "All about technology",
          count: 25,
        };

        mockClient.getCategory.mockResolvedValueOnce(mockCategory);

        const result = await taxonomyTools.handleGetCategory(mockClient, { id: 1 });

        expect(mockClient.getCategory).toHaveBeenCalledWith(1);
        expect(typeof result).toBe("string");
        expect(result).toContain("Category Details (ID: 1)");
        expect(result).toContain("Technology");
        expect(result).toContain("technology");
        expect(result).toContain("All about technology");
        expect(result).toContain("25");
      });

      it("should handle category not found", async () => {
        mockClient.getCategory.mockRejectedValueOnce(new Error("Category not found"));

        await expect(taxonomyTools.handleGetCategory(mockClient, { id: 999 })).rejects.toThrow(
          "Failed to get category",
        );
      });

      it("should handle invalid ID parameter", async () => {
        mockClient.getCategory.mockRejectedValueOnce(new Error("Invalid ID"));

        await expect(taxonomyTools.handleGetCategory(mockClient, { id: "invalid" })).rejects.toThrow(
          "Failed to get category",
        );
      });

      it("should handle category with no description", async () => {
        const mockCategory = {
          id: 1,
          name: "No Description Category",
          slug: "no-desc",
          description: "",
          count: 5,
        };

        mockClient.getCategory.mockResolvedValueOnce(mockCategory);

        const result = await taxonomyTools.handleGetCategory(mockClient, { id: 1 });

        expect(result).toContain("**Description:** None");
      });

      it("should handle category with null description", async () => {
        const mockCategory = {
          id: 1,
          name: "Null Description Category",
          slug: "null-desc",
          description: null,
          count: 3,
        };

        mockClient.getCategory.mockResolvedValueOnce(mockCategory);

        const result = await taxonomyTools.handleGetCategory(mockClient, { id: 1 });

        expect(result).toContain("**Description:** None");
      });
    });

    describe("handleCreateCategory", () => {
      it("should create a category successfully", async () => {
        const mockCreatedCategory = {
          id: 123,
          name: "New Category",
          slug: "new-category",
          description: "A new category",
          count: 0,
        };

        mockClient.createCategory.mockResolvedValueOnce(mockCreatedCategory);

        const categoryData = {
          name: "New Category",
          description: "A new category",
        };

        const result = await taxonomyTools.handleCreateCategory(mockClient, categoryData);

        expect(mockClient.createCategory).toHaveBeenCalledWith(categoryData);
        expect(typeof result).toBe("string");
        expect(result).toContain('✅ Category "New Category" created successfully with ID: 123');
      });

      it("should handle creation errors", async () => {
        mockClient.createCategory.mockRejectedValueOnce(new Error("Creation failed"));

        await expect(
          taxonomyTools.handleCreateCategory(mockClient, {
            name: "Test Category",
          }),
        ).rejects.toThrow("Failed to create category");
      });

      it("should handle validation errors", async () => {
        mockClient.createCategory.mockRejectedValueOnce(new Error("Name is required"));

        await expect(
          taxonomyTools.handleCreateCategory(mockClient, {
            description: "Category without name",
          }),
        ).rejects.toThrow("Failed to create category");
      });

      it("should handle minimal category creation", async () => {
        const mockCreatedCategory = {
          id: 124,
          name: "Minimal Category",
          slug: "minimal-category",
          count: 0,
        };

        mockClient.createCategory.mockResolvedValueOnce(mockCreatedCategory);

        const result = await taxonomyTools.handleCreateCategory(mockClient, {
          name: "Minimal Category",
        });

        expect(mockClient.createCategory).toHaveBeenCalledWith({
          name: "Minimal Category",
        });
        expect(result).toContain("Minimal Category");
      });

      it("should handle duplicate category names", async () => {
        mockClient.createCategory.mockRejectedValueOnce(new Error("Category name already exists"));

        await expect(
          taxonomyTools.handleCreateCategory(mockClient, {
            name: "Existing Category",
          }),
        ).rejects.toThrow("Failed to create category");
      });
    });

    describe("handleUpdateCategory", () => {
      it("should update a category successfully", async () => {
        const mockUpdatedCategory = {
          id: 1,
          name: "Updated Category",
          slug: "updated-category",
          description: "Updated description",
          count: 10,
        };

        mockClient.updateCategory.mockResolvedValueOnce(mockUpdatedCategory);

        const updateData = {
          id: 1,
          name: "Updated Category",
        };

        const result = await taxonomyTools.handleUpdateCategory(mockClient, updateData);

        expect(mockClient.updateCategory).toHaveBeenCalledWith(updateData);
        expect(typeof result).toBe("string");
        expect(result).toContain("✅ Category 1 updated successfully");
      });

      it("should handle update errors", async () => {
        mockClient.updateCategory.mockRejectedValueOnce(new Error("Update failed"));

        await expect(
          taxonomyTools.handleUpdateCategory(mockClient, {
            id: 1,
            name: "Updated Name",
          }),
        ).rejects.toThrow("Failed to update category");
      });

      it("should handle missing ID", async () => {
        mockClient.updateCategory.mockRejectedValueOnce(new Error("ID is required"));

        await expect(
          taxonomyTools.handleUpdateCategory(mockClient, {
            name: "Updated Name",
          }),
        ).rejects.toThrow("Failed to update category");
      });

      it("should handle partial updates", async () => {
        const mockUpdatedCategory = {
          id: 2,
          name: "Partially Updated",
        };

        mockClient.updateCategory.mockResolvedValueOnce(mockUpdatedCategory);

        const result = await taxonomyTools.handleUpdateCategory(mockClient, {
          id: 2,
          name: "Partially Updated",
        });

        expect(result).toContain("✅ Category 2 updated successfully");
      });
    });

    describe("handleDeleteCategory", () => {
      it("should delete a category successfully", async () => {
        mockClient.deleteCategory.mockResolvedValueOnce({ deleted: true });

        const result = await taxonomyTools.handleDeleteCategory(mockClient, { id: 1 });

        expect(mockClient.deleteCategory).toHaveBeenCalledWith(1);
        expect(typeof result).toBe("string");
        expect(result).toContain("✅ Category 1 has been deleted");
      });

      it("should handle deletion errors", async () => {
        mockClient.deleteCategory.mockRejectedValueOnce(new Error("Delete failed"));

        await expect(taxonomyTools.handleDeleteCategory(mockClient, { id: 1 })).rejects.toThrow(
          "Failed to delete category",
        );
      });

      it("should handle invalid ID", async () => {
        mockClient.deleteCategory.mockRejectedValueOnce(new Error("Invalid ID"));

        await expect(taxonomyTools.handleDeleteCategory(mockClient, { id: "invalid" })).rejects.toThrow(
          "Failed to delete category",
        );
      });

      it("should handle non-existent category", async () => {
        mockClient.deleteCategory.mockRejectedValueOnce(new Error("Category not found"));

        await expect(taxonomyTools.handleDeleteCategory(mockClient, { id: 999 })).rejects.toThrow(
          "Failed to delete category",
        );
      });

      it("should handle category with associated posts", async () => {
        mockClient.deleteCategory.mockRejectedValueOnce(new Error("Cannot delete category with posts"));

        await expect(taxonomyTools.handleDeleteCategory(mockClient, { id: 1 })).rejects.toThrow(
          "Failed to delete category",
        );
      });
    });
  });

  describe("Tag Operations", () => {
    describe("handleListTags", () => {
      it("should list tags successfully", async () => {
        const mockTags = [
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
        ];

        mockClient.getTags.mockResolvedValueOnce(mockTags);

        const result = await taxonomyTools.handleListTags(mockClient, {});

        expect(mockClient.getTags).toHaveBeenCalledWith({});
        expect(typeof result).toBe("string");
        expect(result).toContain("Found 2 tags:");
        expect(result).toContain("JavaScript");
        expect(result).toContain("React");
        expect(result).toContain("Posts: 12");
        expect(result).toContain("Posts: 8");
      });

      it("should handle empty results", async () => {
        mockClient.getTags.mockResolvedValueOnce([]);

        const result = await taxonomyTools.handleListTags(mockClient, {});

        expect(typeof result).toBe("string");
        expect(result).toContain("No tags found");
      });

      it("should handle search parameters", async () => {
        const mockTags = [
          {
            id: 1,
            name: "JavaScript Framework",
            slug: "js-framework",
            count: 5,
          },
        ];

        mockClient.getTags.mockResolvedValueOnce(mockTags);

        const result = await taxonomyTools.handleListTags(mockClient, {
          search: "javascript",
        });

        expect(mockClient.getTags).toHaveBeenCalledWith({
          search: "javascript",
        });
        expect(result).toContain("JavaScript Framework");
      });

      it("should handle API errors", async () => {
        mockClient.getTags.mockRejectedValueOnce(new Error("API Error"));

        await expect(taxonomyTools.handleListTags(mockClient, {})).rejects.toThrow("Failed to list tags");
      });

      it("should handle tags with zero post count", async () => {
        const mockTags = [
          {
            id: 1,
            name: "Unused Tag",
            count: 0,
          },
        ];

        mockClient.getTags.mockResolvedValueOnce(mockTags);

        const result = await taxonomyTools.handleListTags(mockClient, {});

        expect(result).toContain("Posts: 0");
      });
    });

    describe("handleGetTag", () => {
      it("should get a tag successfully", async () => {
        const mockTag = {
          id: 1,
          name: "JavaScript",
          slug: "javascript",
          count: 15,
        };

        mockClient.getTag.mockResolvedValueOnce(mockTag);

        const result = await taxonomyTools.handleGetTag(mockClient, { id: 1 });

        expect(mockClient.getTag).toHaveBeenCalledWith(1);
        expect(typeof result).toBe("string");
        expect(result).toContain("Tag Details (ID: 1)");
        expect(result).toContain("JavaScript");
        expect(result).toContain("javascript");
        expect(result).toContain("15");
      });

      it("should handle tag not found", async () => {
        mockClient.getTag.mockRejectedValueOnce(new Error("Tag not found"));

        await expect(taxonomyTools.handleGetTag(mockClient, { id: 999 })).rejects.toThrow("Failed to get tag");
      });

      it("should handle invalid ID parameter", async () => {
        mockClient.getTag.mockRejectedValueOnce(new Error("Invalid ID"));

        await expect(taxonomyTools.handleGetTag(mockClient, { id: "invalid" })).rejects.toThrow("Failed to get tag");
      });

      it("should handle tag with zero count", async () => {
        const mockTag = {
          id: 1,
          name: "Unused Tag",
          slug: "unused-tag",
          count: 0,
        };

        mockClient.getTag.mockResolvedValueOnce(mockTag);

        const result = await taxonomyTools.handleGetTag(mockClient, { id: 1 });

        expect(result).toContain("**Post Count:** 0");
      });
    });

    describe("handleCreateTag", () => {
      it("should create a tag successfully", async () => {
        const mockCreatedTag = {
          id: 123,
          name: "New Tag",
          slug: "new-tag",
          count: 0,
        };

        mockClient.createTag.mockResolvedValueOnce(mockCreatedTag);

        const tagData = {
          name: "New Tag",
        };

        const result = await taxonomyTools.handleCreateTag(mockClient, tagData);

        expect(mockClient.createTag).toHaveBeenCalledWith(tagData);
        expect(typeof result).toBe("string");
        expect(result).toContain('✅ Tag "New Tag" created successfully with ID: 123');
      });

      it("should handle creation errors", async () => {
        mockClient.createTag.mockRejectedValueOnce(new Error("Creation failed"));

        await expect(
          taxonomyTools.handleCreateTag(mockClient, {
            name: "Test Tag",
          }),
        ).rejects.toThrow("Failed to create tag");
      });

      it("should handle validation errors", async () => {
        mockClient.createTag.mockRejectedValueOnce(new Error("Name is required"));

        await expect(
          taxonomyTools.handleCreateTag(mockClient, {
            // Missing name
          }),
        ).rejects.toThrow("Failed to create tag");
      });

      it("should handle duplicate tag names", async () => {
        mockClient.createTag.mockRejectedValueOnce(new Error("Tag name already exists"));

        await expect(
          taxonomyTools.handleCreateTag(mockClient, {
            name: "Existing Tag",
          }),
        ).rejects.toThrow("Failed to create tag");
      });

      it("should handle tags with special characters", async () => {
        const mockCreatedTag = {
          id: 124,
          name: "C++",
          slug: "c-plus-plus",
          count: 0,
        };

        mockClient.createTag.mockResolvedValueOnce(mockCreatedTag);

        const result = await taxonomyTools.handleCreateTag(mockClient, {
          name: "C++",
        });

        expect(result).toContain("C++");
      });
    });

    describe("handleUpdateTag", () => {
      it("should update a tag successfully", async () => {
        const mockUpdatedTag = {
          id: 1,
          name: "Updated Tag",
          slug: "updated-tag",
          count: 5,
        };

        mockClient.updateTag.mockResolvedValueOnce(mockUpdatedTag);

        const updateData = {
          id: 1,
          name: "Updated Tag",
        };

        const result = await taxonomyTools.handleUpdateTag(mockClient, updateData);

        expect(mockClient.updateTag).toHaveBeenCalledWith(updateData);
        expect(typeof result).toBe("string");
        expect(result).toContain("✅ Tag 1 updated successfully");
      });

      it("should handle update errors", async () => {
        mockClient.updateTag.mockRejectedValueOnce(new Error("Update failed"));

        await expect(
          taxonomyTools.handleUpdateTag(mockClient, {
            id: 1,
            name: "Updated Name",
          }),
        ).rejects.toThrow("Failed to update tag");
      });

      it("should handle missing ID", async () => {
        mockClient.updateTag.mockRejectedValueOnce(new Error("ID is required"));

        await expect(
          taxonomyTools.handleUpdateTag(mockClient, {
            name: "Updated Name",
          }),
        ).rejects.toThrow("Failed to update tag");
      });

      it("should handle partial updates", async () => {
        const mockUpdatedTag = {
          id: 2,
          name: "Partially Updated",
        };

        mockClient.updateTag.mockResolvedValueOnce(mockUpdatedTag);

        const result = await taxonomyTools.handleUpdateTag(mockClient, {
          id: 2,
          name: "Partially Updated",
        });

        expect(result).toContain("✅ Tag 2 updated successfully");
      });
    });

    describe("handleDeleteTag", () => {
      it("should delete a tag successfully", async () => {
        mockClient.deleteTag.mockResolvedValueOnce({ deleted: true });

        const result = await taxonomyTools.handleDeleteTag(mockClient, { id: 1 });

        expect(mockClient.deleteTag).toHaveBeenCalledWith(1);
        expect(typeof result).toBe("string");
        expect(result).toContain("✅ Tag 1 has been deleted");
      });

      it("should handle deletion errors", async () => {
        mockClient.deleteTag.mockRejectedValueOnce(new Error("Delete failed"));

        await expect(taxonomyTools.handleDeleteTag(mockClient, { id: 1 })).rejects.toThrow("Failed to delete tag");
      });

      it("should handle invalid ID", async () => {
        mockClient.deleteTag.mockRejectedValueOnce(new Error("Invalid ID"));

        await expect(taxonomyTools.handleDeleteTag(mockClient, { id: "invalid" })).rejects.toThrow(
          "Failed to delete tag",
        );
      });

      it("should handle non-existent tag", async () => {
        mockClient.deleteTag.mockRejectedValueOnce(new Error("Tag not found"));

        await expect(taxonomyTools.handleDeleteTag(mockClient, { id: 999 })).rejects.toThrow("Failed to delete tag");
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null/undefined parameters gracefully", async () => {
      await expect(taxonomyTools.handleListCategories(mockClient, null)).rejects.toThrow("Failed to list categories");
      await expect(taxonomyTools.handleListTags(mockClient, null)).rejects.toThrow("Failed to list tags");
    });

    it("should handle very large result sets", async () => {
      const largeCategories = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Category ${i + 1}`,
        count: Math.floor(Math.random() * 20),
      }));

      mockClient.getCategories.mockResolvedValueOnce(largeCategories);

      const result = await taxonomyTools.handleListCategories(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Found 100 categories:");
    });

    it("should handle taxonomies with special characters", async () => {
      const mockCategories = [
        {
          id: 1,
          name: "Technology & Science",
          slug: "tech-science",
          count: 5,
        },
        {
          id: 2,
          name: "Health/Wellness",
          slug: "health-wellness",
          count: 3,
        },
      ];

      mockClient.getCategories.mockResolvedValueOnce(mockCategories);

      const result = await taxonomyTools.handleListCategories(mockClient, {});

      expect(result).toContain("Technology & Science");
      expect(result).toContain("Health/Wellness");
    });

    it("should handle network timeouts gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";

      mockClient.getCategories.mockRejectedValueOnce(timeoutError);

      await expect(taxonomyTools.handleListCategories(mockClient, {})).rejects.toThrow("Failed to list categories");
    });

    it("should handle concurrent requests properly", async () => {
      const mockCategory = {
        id: 1,
        name: "Test Category",
        slug: "test-category",
        count: 5,
      };
      mockClient.getCategory.mockResolvedValue(mockCategory);

      const promises = [
        taxonomyTools.handleGetCategory(mockClient, { id: 1 }),
        taxonomyTools.handleGetCategory(mockClient, { id: 2 }),
        taxonomyTools.handleGetCategory(mockClient, { id: 3 }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockClient.getCategory).toHaveBeenCalledTimes(3);
    });

    it("should handle empty taxonomy names", async () => {
      mockClient.createCategory.mockRejectedValueOnce(new Error("Category name cannot be empty"));

      await expect(
        taxonomyTools.handleCreateCategory(mockClient, {
          name: "",
        }),
      ).rejects.toThrow("Failed to create category");
    });

    it("should handle very long taxonomy names", async () => {
      const longName = "A".repeat(200);
      const mockCategory = {
        id: 1,
        name: longName,
        slug: "long-category-name",
        count: 0,
      };

      mockClient.createCategory.mockResolvedValueOnce(mockCategory);

      const result = await taxonomyTools.handleCreateCategory(mockClient, {
        name: longName,
      });

      expect(result).toContain(longName);
    });
  });

  describe("Performance and Validation", () => {
    it("should handle mixed parameter types", async () => {
      const mockCategories = [
        {
          id: 1,
          name: "Mixed Test",
          count: 10,
        },
      ];
      mockClient.getCategories.mockResolvedValueOnce(mockCategories);

      const result = await taxonomyTools.handleListCategories(mockClient, {
        search: "test query",
        hide_empty: true,
      });

      expect(mockClient.getCategories).toHaveBeenCalledWith({
        search: "test query",
        hide_empty: true,
      });
      expect(result).toContain("Mixed Test");
    });

    it("should maintain consistent response format for categories", async () => {
      const mockCategories = [
        {
          id: 1,
          name: "Format Test",
          count: 5,
        },
      ];
      mockClient.getCategories.mockResolvedValueOnce(mockCategories);

      const result = await taxonomyTools.handleListCategories(mockClient, {});

      expect(result).toMatch(/Found \d+ categories:/);
      expect(result).toContain("ID 1:");
      expect(result).toContain("**Format Test**");
      expect(result).toContain("Posts: 5");
    });

    it("should maintain consistent response format for tags", async () => {
      const mockTags = [
        {
          id: 1,
          name: "Format Test",
          count: 3,
        },
      ];
      mockClient.getTags.mockResolvedValueOnce(mockTags);

      const result = await taxonomyTools.handleListTags(mockClient, {});

      expect(result).toMatch(/Found \d+ tags:/);
      expect(result).toContain("ID 1:");
      expect(result).toContain("**Format Test**");
      expect(result).toContain("Posts: 3");
    });

    it("should handle bulk operations simulation", async () => {
      // Simulate creating multiple categories
      const categoryPromises = [];
      for (let i = 1; i <= 10; i++) {
        const mockCategory = { id: i, name: `Category ${i}` };
        mockClient.createCategory.mockResolvedValueOnce(mockCategory);
        categoryPromises.push(
          taxonomyTools.handleCreateCategory(mockClient, {
            name: `Category ${i}`,
          }),
        );
      }

      const results = await Promise.all(categoryPromises);
      expect(results).toHaveLength(10);
      expect(mockClient.createCategory).toHaveBeenCalledTimes(10);
    });

    it("should handle search parameter edge cases", async () => {
      mockClient.getCategories.mockResolvedValue([]);
      mockClient.getTags.mockResolvedValue([]);

      // Empty search
      await taxonomyTools.handleListCategories(mockClient, { search: "" });
      expect(mockClient.getCategories).toHaveBeenCalledWith({ search: "" });

      // Very long search
      const longSearch = "a".repeat(100);
      await taxonomyTools.handleListTags(mockClient, { search: longSearch });
      expect(mockClient.getTags).toHaveBeenCalledWith({ search: longSearch });
    });

    it("should validate hide_empty parameter type", async () => {
      mockClient.getCategories.mockResolvedValue([]);

      // Boolean true
      await taxonomyTools.handleListCategories(mockClient, { hide_empty: true });
      expect(mockClient.getCategories).toHaveBeenCalledWith({ hide_empty: true });

      // Boolean false
      await taxonomyTools.handleListCategories(mockClient, { hide_empty: false });
      expect(mockClient.getCategories).toHaveBeenCalledWith({ hide_empty: false });
    });
  });
});
