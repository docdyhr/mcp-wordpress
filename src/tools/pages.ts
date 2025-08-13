import { WordPressClient } from "../client/api.js";
import { CreatePostRequest, PostQueryParams, UpdatePostRequest } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

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
    handler: (client: WordPressClient, params: Record<string, unknown>) => Promise<unknown>;
  }> {
    return [
      {
        name: "wp_list_pages",
        description: "Lists pages from a WordPress site, with filters.",
        parameters: [
          {
            name: "per_page",
            type: "number",
            description: "Number of items to return per page (max 100).",
          },
          {
            name: "search",
            type: "string",
            description: "Limit results to those matching a search term.",
          },
          {
            name: "status",
            type: "string",
            description: "Filter by page status.",
            enum: ["publish", "future", "draft", "pending", "private"],
          },
        ],
        handler: this.handleListPages.bind(this),
      },
      {
        name: "wp_get_page",
        description: "Retrieves a single page by its ID.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The unique identifier for the page.",
          },
        ],
        handler: this.handleGetPage.bind(this),
      },
      {
        name: "wp_create_page",
        description: "Creates a new page.",
        parameters: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "The title for the page.",
          },
          {
            name: "content",
            type: "string",
            description: "The content for the page, in HTML format.",
          },
          {
            name: "status",
            type: "string",
            description: "The publishing status for the page.",
            enum: ["publish", "draft", "pending", "private"],
          },
        ],
        handler: this.handleCreatePage.bind(this),
      },
      {
        name: "wp_update_page",
        description: "Updates an existing page.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the page to update.",
          },
          {
            name: "title",
            type: "string",
            description: "The new title for the page.",
          },
          {
            name: "content",
            type: "string",
            description: "The new content for the page, in HTML format.",
          },
          {
            name: "status",
            type: "string",
            description: "The new status for the page.",
            enum: ["publish", "draft", "pending", "private"],
          },
        ],
        handler: this.handleUpdatePage.bind(this),
      },
      {
        name: "wp_delete_page",
        description: "Deletes a page.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the page to delete.",
          },
          {
            name: "force",
            type: "boolean",
            description: "If true, permanently delete. If false, move to trash. Defaults to false.",
          },
        ],
        handler: this.handleDeletePage.bind(this),
      },
      {
        name: "wp_get_page_revisions",
        description: "Retrieves revisions for a specific page.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the page to get revisions for.",
          },
        ],
        handler: this.handleGetPageRevisions.bind(this),
      },
    ];
  }

  public async handleListPages(client: WordPressClient, params: PostQueryParams): Promise<unknown> {
    try {
      const pages = await client.getPages(params);
      if (pages.length === 0) {
        return "No pages found matching the criteria.";
      }
      const content =
        `Found ${pages.length} pages:\n\n` +
        pages.map((p) => `- ID ${p.id}: **${p.title.rendered}** (${p.status})\n  Link: ${p.link}`).join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to list pages: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetPage(client: WordPressClient, params: { id: number }): Promise<unknown> {
    try {
      const page = await client.getPage(params.id);
      const content =
        `**Page Details (ID: ${page.id})**\n\n` +
        `- **Title:** ${page.title.rendered}\n` +
        `- **Status:** ${page.status}\n` +
        `- **Link:** ${page.link}\n` +
        `- **Date:** ${new Date(page.date).toLocaleString()}`;
      return content;
    } catch (error) {
      throw new Error(`Failed to get page: ${getErrorMessage(error)}`);
    }
  }

  public async handleCreatePage(client: WordPressClient, params: CreatePostRequest): Promise<unknown> {
    try {
      const page = await client.createPage(params);
      return `✅ Page created successfully!\n- ID: ${page.id}\n- Title: ${page.title.rendered}\n- Link: ${page.link}`;
    } catch (error) {
      throw new Error(`Failed to create page: ${getErrorMessage(error)}`);
    }
  }

  public async handleUpdatePage(client: WordPressClient, params: UpdatePostRequest & { id: number }): Promise<unknown> {
    try {
      const page = await client.updatePage(params);
      return `✅ Page ${page.id} updated successfully.`;
    } catch (error) {
      throw new Error(`Failed to update page: ${getErrorMessage(error)}`);
    }
  }

  public async handleDeletePage(client: WordPressClient, params: { id: number; force?: boolean }): Promise<unknown> {
    try {
      await client.deletePage(params.id, params.force);
      const action = params.force ? "permanently deleted" : "moved to trash";
      return `✅ Page ${params.id} has been ${action}.`;
    } catch (error) {
      throw new Error(`Failed to delete page: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetPageRevisions(client: WordPressClient, params: { id: number }): Promise<unknown> {
    try {
      const revisions = await client.getPageRevisions(params.id);
      if (revisions.length === 0) {
        return `No revisions found for page ${params.id}.`;
      }
      const content =
        `Found ${revisions.length} revisions for page ${params.id}:\n\n` +
        revisions
          .map((r) => `- Revision by user ID ${r.author} at ${new Date(r.modified).toLocaleString()}`)
          .join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to get page revisions: ${getErrorMessage(error)}`);
    }
  }
}

export default PageTools;
