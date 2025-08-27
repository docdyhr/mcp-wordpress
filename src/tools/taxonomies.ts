import { WordPressClient } from "../client/api.js";
import {
  CreateCategoryRequest,
  CreateTagRequest,
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
  public getTools(): Array<{
    name: string;
    description: string;
    parameters?: Array<{
      name: string;
      type?: string;
      description?: string;
      required?: boolean;
      enum?: string[];
      items?: unknown;
    }>;
    handler: (client: WordPressClient, params: Record<string, unknown>) => Promise<unknown>;
  }> {
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

  public async handleListCategories(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const queryParams = params as Record<string, string | number | boolean>;
    try {
      const categories = await client.getCategories(queryParams);
      if (categories.length === 0) {
        return "No categories found.";
      }
      const content =
        `Found ${categories.length} categories:\n\n` +
        categories.map((c) => `- ID ${c.id}: **${c.name}** (Posts: ${c.count})`).join("\n");
      return content;
    } catch (_error) {
      throw new Error(`Failed to list categories: ${getErrorMessage(_error)}`);
    }
  }

  public async handleGetCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id } = params as { id: number };
    try {
      const category = await client.getCategory(id);
      const content =
        `**Category Details (ID: ${category.id})**\n\n` +
        `- **Name:** ${category.name}\n` +
        `- **Slug:** ${category.slug}\n` +
        `- **Description:** ${category.description || "None"}\n` +
        `- **Post Count:** ${category.count}`;
      return content;
    } catch (_error) {
      throw new Error(`Failed to get category: ${getErrorMessage(_error)}`);
    }
  }

  public async handleCreateCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const createParams = params as unknown as CreateCategoryRequest;
    try {
      const category = await client.createCategory(createParams);
      return `✅ Category "${category.name}" created successfully with ID: ${category.id}.`;
    } catch (_error) {
      throw new Error(`Failed to create category: ${getErrorMessage(_error)}`);
    }
  }

  public async handleUpdateCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const updateParams = params as unknown as UpdateCategoryRequest;
    try {
      const category = await client.updateCategory(updateParams);
      return `✅ Category ${category.id} updated successfully.`;
    } catch (_error) {
      throw new Error(`Failed to update category: ${getErrorMessage(_error)}`);
    }
  }

  public async handleDeleteCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id } = params as { id: number };
    try {
      await client.deleteCategory(id);
      return `✅ Category ${id} has been deleted.`;
    } catch (_error) {
      throw new Error(`Failed to delete category: ${getErrorMessage(_error)}`);
    }
  }

  public async handleListTags(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const queryParams = params as Record<string, string | number | boolean>;
    try {
      const tags = await client.getTags(queryParams);
      if (tags.length === 0) {
        return "No tags found.";
      }
      const content =
        `Found ${tags.length} tags:\n\n` +
        tags.map((t) => `- ID ${t.id}: **${t.name}** (Posts: ${t.count})`).join("\n");
      return content;
    } catch (_error) {
      throw new Error(`Failed to list tags: ${getErrorMessage(_error)}`);
    }
  }

  public async handleGetTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id } = params as { id: number };
    try {
      const tag = await client.getTag(id);
      const content =
        `**Tag Details (ID: ${tag.id})**\n\n` +
        `- **Name:** ${tag.name}\n` +
        `- **Slug:** ${tag.slug}\n` +
        `- **Post Count:** ${tag.count}`;
      return content;
    } catch (_error) {
      throw new Error(`Failed to get tag: ${getErrorMessage(_error)}`);
    }
  }

  public async handleCreateTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const createParams = params as unknown as CreateTagRequest;
    try {
      const tag = await client.createTag(createParams);
      return `✅ Tag "${tag.name}" created successfully with ID: ${tag.id}.`;
    } catch (_error) {
      throw new Error(`Failed to create tag: ${getErrorMessage(_error)}`);
    }
  }

  public async handleUpdateTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const updateParams = params as unknown as UpdateTagRequest;
    try {
      const tag = await client.updateTag(updateParams);
      return `✅ Tag ${tag.id} updated successfully.`;
    } catch (_error) {
      throw new Error(`Failed to update tag: ${getErrorMessage(_error)}`);
    }
  }

  public async handleDeleteTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id } = params as { id: number };
    try {
      await client.deleteTag(id);
      return `✅ Tag ${id} has been deleted.`;
    } catch (_error) {
      throw new Error(`Failed to delete tag: ${getErrorMessage(_error)}`);
    }
  }
}

export default TaxonomyTools;
