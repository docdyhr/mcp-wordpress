import { WordPressClient } from "@/client/api.js";
import type { MCPToolSchema } from "@/types/mcp.js";
import { CreatePageRequest, PostQueryParams as PageQueryParams, UpdatePageRequest } from "@/types/wordpress.js";
import { getErrorMessage } from "@/utils/error.js";
import { toolParams } from "./params.js";

/**
 * Provides tools for managing pages on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class PageTools {
  /**
   * Retrieves the list of page management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): Array<{
    name: string;
    description: string;
    inputSchema?: MCPToolSchema;
    handler: (client: WordPressClient, params: Record<string, unknown>) => Promise<unknown>;
  }> {
    return [
      {
        name: "wp_list_pages",
        description: "Lists pages from a WordPress site, with filters.",
        inputSchema: {
          type: "object",
          properties: {
            per_page: {
              type: "number",
              description: "Number of items to return per page (max 100).",
            },
            search: {
              type: "string",
              description: "Limit results to those matching a search term.",
            },
            status: {
              type: "string",
              description: "Filter by page status.",
              enum: ["publish", "future", "draft", "pending", "private"],
            },
          },
          required: [],
        },
        handler: this.handleListPages.bind(this),
      },
      {
        name: "wp_get_page",
        description: "Retrieves a single page by its ID, optionally including full content for editing.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The unique identifier for the page.",
            },
            include_content: {
              type: "boolean",
              description: "If true, includes the full HTML content of the page. Default: false",
            },
          },
          required: ["id"],
        },
        handler: this.handleGetPage.bind(this),
      },
      {
        name: "wp_create_page",
        description: "Creates a new page.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title for the page.",
            },
            content: {
              type: "string",
              description: "The content for the page, in HTML format.",
            },
            status: {
              type: "string",
              description: "The publishing status for the page.",
              enum: ["publish", "draft", "pending", "private"],
            },
          },
          required: ["title"],
        },
        handler: this.handleCreatePage.bind(this),
      },
      {
        name: "wp_update_page",
        description: "Updates an existing page.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the page to update.",
            },
            title: {
              type: "string",
              description: "The new title for the page.",
            },
            content: {
              type: "string",
              description: "The new content for the page, in HTML format.",
            },
            status: {
              type: "string",
              description: "The new status for the page.",
              enum: ["publish", "draft", "pending", "private"],
            },
          },
          required: ["id"],
        },
        handler: this.handleUpdatePage.bind(this),
      },
      {
        name: "wp_delete_page",
        description: "Deletes a page.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the page to delete.",
            },
            force: {
              type: "boolean",
              description: "If true, permanently delete. If false, move to trash. Defaults to false.",
            },
          },
          required: ["id"],
        },
        handler: this.handleDeletePage.bind(this),
      },
      {
        name: "wp_get_page_revisions",
        description: "Retrieves revisions for a specific page.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the page to get revisions for.",
            },
          },
          required: ["id"],
        },
        handler: this.handleGetPageRevisions.bind(this),
      },
    ];
  }

  public async handleListPages(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const queryParams = toolParams<PageQueryParams>(params);
    try {
      const pages = await client.getPages(queryParams);
      if (pages.length === 0) {
        return "No pages found matching the criteria.";
      }
      const content =
        `Found ${pages.length} pages:\n\n` +
        pages.map((p) => `- ID ${p.id}: **${p.title.rendered}** (${p.status})\n  Link: ${p.link}`).join("\n");
      return content;
    } catch (_error) {
      throw new Error(`Failed to list pages: ${getErrorMessage(_error)}`);
    }
  }

  public async handleGetPage(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id, include_content = false } = params as { id: number; include_content?: boolean };
    try {
      const page = await client.getPage(id);
      let content =
        `**Page Details (ID: ${page.id})**\n\n` +
        `- **Title:** ${page.title.rendered}\n` +
        `- **Status:** ${page.status}\n` +
        `- **Link:** ${page.link}\n` +
        `- **Date:** ${new Date(page.date).toLocaleString()}`;

      if (include_content) {
        content += `\n\n**Content:**\n\n` + `${page.content.rendered || "(empty)"}`;
      }

      return content;
    } catch (_error) {
      throw new Error(`Failed to get page: ${getErrorMessage(_error)}`);
    }
  }

  public async handleCreatePage(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const createParams = toolParams<CreatePageRequest>(params);
    try {
      const page = await client.createPage(createParams);
      return `✅ Page created successfully!\n- ID: ${page.id}\n- Title: ${page.title.rendered}\n- Link: ${page.link}`;
    } catch (_error) {
      throw new Error(`Failed to create page: ${getErrorMessage(_error)}`);
    }
  }

  public async handleUpdatePage(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const updateParams = toolParams<UpdatePageRequest & { id: number }>(params);
    try {
      const page = await client.updatePage(updateParams);
      return `✅ Page ${page.id} updated successfully.`;
    } catch (_error) {
      throw new Error(`Failed to update page: ${getErrorMessage(_error)}`);
    }
  }

  public async handleDeletePage(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id, force } = params as { id: number; force?: boolean };
    try {
      const result = await client.deletePage(id, force);
      const action = force ? "permanently deleted" : "moved to trash";

      if (result?.deleted === false) {
        throw new Error(
          `WordPress refused to delete page ${id}. The page may be protected or the operation was rejected.`,
        );
      }

      if (result?.deleted) {
        const title = result.previous?.title?.rendered;
        return title ? `✅ Page "${title}" has been ${action}.` : `✅ Page ${id} has been ${action}.`;
      }

      // Some WordPress installations return empty/null responses on successful deletion
      return `✅ Page ${id} has been ${action}.`;
    } catch (_error) {
      throw new Error(`Failed to delete page: ${getErrorMessage(_error)}`);
    }
  }

  public async handleGetPageRevisions(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id } = params as { id: number };
    try {
      const revisions = await client.getPageRevisions(id);
      if (revisions.length === 0) {
        return `No revisions found for page ${id}.`;
      }
      const content =
        `Found ${revisions.length} revisions for page ${id}:\n\n` +
        revisions
          .map((r) => `- Revision by user ID ${r.author} at ${new Date(r.modified).toLocaleString()}`)
          .join("\n");
      return content;
    } catch (_error) {
      throw new Error(`Failed to get page revisions: ${getErrorMessage(_error)}`);
    }
  }
}

export default PageTools;
