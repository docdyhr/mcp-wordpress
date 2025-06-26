import { MCPTool, MCPToolResponse } from "@mcp/server";
import WordPressClient from "../client/api.js";
import {
  CategoryQueryParams,
  CreateCategoryRequest,
  CreateTagRequest,
  TagQueryParams,
  UpdateCategoryRequest,
  UpdateTagRequest,
} from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Provides tools for managing taxonomies (categories and tags) on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class TaxonomyTools {
  /**
   * Retrieves the list of taxonomy management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): MCPTool[] {
    return [
      // Categories
      {
        name: "wp_list_categories",
        description: "Lists categories from a WordPress site.",
        parameters: [
          {
            name: "search",
            type: "string",
            description: "Limit results to those matching a search term.",
          },
          {
            name: "hide_empty",
            type: "boolean",
            description: "Whether to hide categories with no posts.",
          },
        ],
        handler: this.handleListCategories.bind(this),
      },
      {
        name: "wp_get_category",
        description: "Retrieves a single category by its ID.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The unique identifier for the category.",
          },
        ],
        handler: this.handleGetCategory.bind(this),
      },
      {
        name: "wp_create_category",
        description: "Creates a new category.",
        parameters: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "The name of the category.",
          },
          {
            name: "description",
            type: "string",
            description: "The description for the category.",
          },
        ],
        handler: this.handleCreateCategory.bind(this),
      },
      {
        name: "wp_update_category",
        description: "Updates an existing category.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the category to update.",
          },
          {
            name: "name",
            type: "string",
            description: "The new name for the category.",
          },
        ],
        handler: this.handleUpdateCategory.bind(this),
      },
      {
        name: "wp_delete_category",
        description: "Deletes a category.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the category to delete.",
          },
        ],
        handler: this.handleDeleteCategory.bind(this),
      },
      // Tags
      {
        name: "wp_list_tags",
        description: "Lists tags from a WordPress site.",
        parameters: [
          {
            name: "search",
            type: "string",
            description: "Limit results to those matching a search term.",
          },
        ],
        handler: this.handleListTags.bind(this),
      },
      {
        name: "wp_get_tag",
        description: "Retrieves a single tag by its ID.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The unique identifier for the tag.",
          },
        ],
        handler: this.handleGetTag.bind(this),
      },
      {
        name: "wp_create_tag",
        description: "Creates a new tag.",
        parameters: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "The name of the tag.",
          },
        ],
        handler: this.handleCreateTag.bind(this),
      },
      {
        name: "wp_update_tag",
        description: "Updates an existing tag.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the tag to update.",
          },
          {
            name: "name",
            type: "string",
            description: "The new name for the tag.",
          },
        ],
        handler: this.handleUpdateTag.bind(this),
      },
      {
        name: "wp_delete_tag",
        description: "Deletes a tag.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the tag to delete.",
          },
        ],
        handler: this.handleDeleteTag.bind(this),
      },
    ];
  }

  public async handleListCategories(
    client: WordPressClient,
    params: CategoryQueryParams,
  ): Promise<MCPToolResponse> {
    try {
      const categories = await client.getCategories(params);
      if (categories.length === 0) {
        return { content: "No categories found." };
      }
      const content =
        `Found ${categories.length} categories:\n\n` +
        categories
          .map((c) => `- ID ${c.id}: **${c.name}** (Posts: ${c.count})`)
          .join("\n");
      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to list categories: ${getErrorMessage(error)}`,
          code: "LIST_CATEGORIES_FAILED",
        },
      };
    }
  }

  public async handleGetCategory(
    client: WordPressClient,
    params: { id: number },
  ): Promise<MCPToolResponse> {
    try {
      const category = await client.getCategory(params.id);
      const content =
        `**Category Details (ID: ${category.id})**\n\n` +
        `- **Name:** ${category.name}\n` +
        `- **Slug:** ${category.slug}\n` +
        `- **Description:** ${category.description || "None"}\n` +
        `- **Post Count:** ${category.count}`;
      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to get category: ${getErrorMessage(error)}`,
          code: "GET_CATEGORY_FAILED",
        },
      };
    }
  }

  public async handleCreateCategory(
    client: WordPressClient,
    params: CreateCategoryRequest,
  ): Promise<MCPToolResponse> {
    try {
      const category = await client.createCategory(params);
      return {
        content: `✅ Category "${category.name}" created successfully with ID: ${category.id}.`,
      };
    } catch (error) {
      return {
        error: {
          message: `Failed to create category: ${getErrorMessage(error)}`,
          code: "CREATE_CATEGORY_FAILED",
        },
      };
    }
  }

  public async handleUpdateCategory(
    client: WordPressClient,
    params: UpdateCategoryRequest & { id: number },
  ): Promise<MCPToolResponse> {
    try {
      const { id, ...updateData } = params;
      const category = await client.updateCategory(id, updateData);
      return {
        content: `✅ Category ${category.id} updated successfully.`,
      };
    } catch (error) {
      return {
        error: {
          message: `Failed to update category: ${getErrorMessage(error)}`,
          code: "UPDATE_CATEGORY_FAILED",
        },
      };
    }
  }

  public async handleDeleteCategory(
    client: WordPressClient,
    params: { id: number },
  ): Promise<MCPToolResponse> {
    try {
      await client.deleteCategory(params.id);
      return { content: `✅ Category ${params.id} has been deleted.` };
    } catch (error) {
      return {
        error: {
          message: `Failed to delete category: ${getErrorMessage(error)}`,
          code: "DELETE_CATEGORY_FAILED",
        },
      };
    }
  }

  public async handleListTags(
    client: WordPressClient,
    params: TagQueryParams,
  ): Promise<MCPToolResponse> {
    try {
      const tags = await client.getTags(params);
      if (tags.length === 0) {
        return { content: "No tags found." };
      }
      const content =
        `Found ${tags.length} tags:\n\n` +
        tags
          .map((t) => `- ID ${t.id}: **${t.name}** (Posts: ${t.count})`)
          .join("\n");
      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to list tags: ${getErrorMessage(error)}`,
          code: "LIST_TAGS_FAILED",
        },
      };
    }
  }

  public async handleGetTag(
    client: WordPressClient,
    params: { id: number },
  ): Promise<MCPToolResponse> {
    try {
      const tag = await client.getTag(params.id);
      const content =
        `**Tag Details (ID: ${tag.id})**\n\n` +
        `- **Name:** ${tag.name}\n` +
        `- **Slug:** ${tag.slug}\n` +
        `- **Post Count:** ${tag.count}`;
      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to get tag: ${getErrorMessage(error)}`,
          code: "GET_TAG_FAILED",
        },
      };
    }
  }

  public async handleCreateTag(
    client: WordPressClient,
    params: CreateTagRequest,
  ): Promise<MCPToolResponse> {
    try {
      const tag = await client.createTag(params);
      return {
        content: `✅ Tag "${tag.name}" created successfully with ID: ${tag.id}.`,
      };
    } catch (error) {
      return {
        error: {
          message: `Failed to create tag: ${getErrorMessage(error)}`,
          code: "CREATE_TAG_FAILED",
        },
      };
    }
  }

  public async handleUpdateTag(
    client: WordPressClient,
    params: UpdateTagRequest & { id: number },
  ): Promise<MCPToolResponse> {
    try {
      const { id, ...updateData } = params;
      const tag = await client.updateTag(id, updateData);
      return {
        content: `✅ Tag ${tag.id} updated successfully.`,
      };
    } catch (error) {
      return {
        error: {
          message: `Failed to update tag: ${getErrorMessage(error)}`,
          code: "UPDATE_TAG_FAILED",
        },
      };
    }
  }

  public async handleDeleteTag(
    client: WordPressClient,
    params: { id: number },
  ): Promise<MCPToolResponse> {
    try {
      await client.deleteTag(params.id);
      return { content: `✅ Tag ${params.id} has been deleted.` };
    } catch (error) {
      return {
        error: {
          message: `Failed to delete tag: ${getErrorMessage(error)}`,
          code: "DELETE_TAG_FAILED",
        },
      };
    }
  }
}

export default TaxonomyTools;
