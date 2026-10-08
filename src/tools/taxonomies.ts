import { WordPressClient } from "@/client/api.js";
import type { MCPToolSchema } from "@/types/mcp.js";
import { CreateCategoryRequest, CreateTagRequest, UpdateCategoryRequest, UpdateTagRequest } from "@/types/wordpress.js";
import { preserveToolError } from "@/utils/error.js";
import { htmlToPlainText } from "@/utils/htmlText.js";
import { pageHint, parseId, toolParams } from "./params.js";

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
    inputSchema?: MCPToolSchema;
    handler: (client: WordPressClient, params: Record<string, unknown>) => Promise<unknown>;
  }> {
    return [
      // Categories
      {
        name: "wp_list_categories",
        description: "Lists categories from a WordPress site.",
        inputSchema: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Limit results to those matching a search term.",
            },
            hide_empty: {
              type: "boolean",
              description: "Whether to hide categories with no posts.",
            },
            per_page: {
              type: "number",
              description: "Number of categories to return per page (max 100). WordPress defaults to 10.",
            },
            page: {
              type: "number",
              description: "Page of results to return (1-based).",
            },
          },
        },
        handler: this.handleListCategories.bind(this),
      },
      {
        name: "wp_get_category",
        description: "Retrieves a single category by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The unique identifier for the category.",
            },
          },
          required: ["id"],
        },
        handler: this.handleGetCategory.bind(this),
      },
      {
        name: "wp_create_category",
        description: "Creates a new category.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the category.",
            },
            description: {
              type: "string",
              description: "The description for the category.",
            },
          },
          required: ["name"],
        },
        handler: this.handleCreateCategory.bind(this),
      },
      {
        name: "wp_update_category",
        description: "Updates an existing category.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the category to update.",
            },
            name: {
              type: "string",
              description: "The new name for the category.",
            },
          },
          required: ["id"],
        },
        handler: this.handleUpdateCategory.bind(this),
      },
      {
        name: "wp_delete_category",
        description: "Permanently deletes a category (WordPress terms have no trash).",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the category to delete.",
            },
          },
          required: ["id"],
        },
        handler: this.handleDeleteCategory.bind(this),
      },
      // Tags
      {
        name: "wp_list_tags",
        description: "Lists tags from a WordPress site.",
        inputSchema: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Limit results to those matching a search term.",
            },
            per_page: {
              type: "number",
              description: "Number of tags to return per page (max 100). WordPress defaults to 10.",
            },
            page: {
              type: "number",
              description: "Page of results to return (1-based).",
            },
          },
        },
        handler: this.handleListTags.bind(this),
      },
      {
        name: "wp_get_tag",
        description: "Retrieves a single tag by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The unique identifier for the tag.",
            },
          },
          required: ["id"],
        },
        handler: this.handleGetTag.bind(this),
      },
      {
        name: "wp_create_tag",
        description: "Creates a new tag.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the tag.",
            },
          },
          required: ["name"],
        },
        handler: this.handleCreateTag.bind(this),
      },
      {
        name: "wp_update_tag",
        description: "Updates an existing tag.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the tag to update.",
            },
            name: {
              type: "string",
              description: "The new name for the tag.",
            },
          },
          required: ["id"],
        },
        handler: this.handleUpdateTag.bind(this),
      },
      {
        name: "wp_delete_tag",
        description: "Permanently deletes a tag (WordPress terms have no trash).",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the tag to delete.",
            },
          },
          required: ["id"],
        },
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
        categories.map((c) => `- ID ${c.id}: **${htmlToPlainText(c.name)}** (Posts: ${c.count})`).join("\n") +
        pageHint(categories.length, params);
      return content;
    } catch (_error) {
      preserveToolError("Failed to list categories", _error);
    }
  }

  public async handleGetCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const id = parseId(params);
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
      preserveToolError("Failed to get category", _error);
    }
  }

  public async handleCreateCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const createParams = toolParams<CreateCategoryRequest>(params);
    try {
      const category = await client.createCategory(createParams);
      return `✅ Category "${category.name}" created successfully with ID: ${category.id}.`;
    } catch (_error) {
      preserveToolError("Failed to create category", _error);
    }
  }

  public async handleUpdateCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const updateParams = toolParams<UpdateCategoryRequest>(params);
    try {
      const category = await client.updateCategory(updateParams);
      return `✅ Category ${category.id} updated successfully.`;
    } catch (_error) {
      preserveToolError("Failed to update category", _error);
    }
  }

  public async handleDeleteCategory(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const id = parseId(params);
    try {
      // WordPress terms have no trash — the REST API rejects DELETE without force=true.
      await client.deleteCategory(id, true);
      return `✅ Category ${id} has been deleted.`;
    } catch (_error) {
      preserveToolError("Failed to delete category", _error);
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
        tags.map((t) => `- ID ${t.id}: **${htmlToPlainText(t.name)}** (Posts: ${t.count})`).join("\n") +
        pageHint(tags.length, params);
      return content;
    } catch (_error) {
      preserveToolError("Failed to list tags", _error);
    }
  }

  public async handleGetTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const id = parseId(params);
    try {
      const tag = await client.getTag(id);
      const content =
        `**Tag Details (ID: ${tag.id})**\n\n` +
        `- **Name:** ${tag.name}\n` +
        `- **Slug:** ${tag.slug}\n` +
        `- **Post Count:** ${tag.count}`;
      return content;
    } catch (_error) {
      preserveToolError("Failed to get tag", _error);
    }
  }

  public async handleCreateTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const createParams = toolParams<CreateTagRequest>(params);
    try {
      const tag = await client.createTag(createParams);
      return `✅ Tag "${tag.name}" created successfully with ID: ${tag.id}.`;
    } catch (_error) {
      preserveToolError("Failed to create tag", _error);
    }
  }

  public async handleUpdateTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const updateParams = toolParams<UpdateTagRequest>(params);
    try {
      const tag = await client.updateTag(updateParams);
      return `✅ Tag ${tag.id} updated successfully.`;
    } catch (_error) {
      preserveToolError("Failed to update tag", _error);
    }
  }

  public async handleDeleteTag(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const id = parseId(params);
    try {
      // WordPress terms have no trash — the REST API rejects DELETE without force=true.
      await client.deleteTag(id, true);
      return `✅ Tag ${id} has been deleted.`;
    } catch (_error) {
      preserveToolError("Failed to delete tag", _error);
    }
  }
}

export default TaxonomyTools;
