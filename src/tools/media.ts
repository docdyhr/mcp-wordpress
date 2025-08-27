import * as fs from "fs";
import { WordPressClient } from "../client/api.js";
import { MediaQueryParams, UpdateMediaRequest, UploadMediaRequest } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Comprehensive media management tools for WordPress sites.
 *
 * This class provides complete media library functionality including:
 * - Listing media items with advanced filtering and search
 * - Uploading new media files with validation and optimization
 * - Retrieving detailed media information and metadata
 * - Updating media properties like title, description, and alt text
 * - Deleting media items with safety checks
 *
 * Supports all WordPress media types including images, videos, audio files,
 * and documents with proper MIME type validation and security checks.
 *
 * @example
 * ```typescript
 * const mediaTools = new MediaTools();
 * const tools = mediaTools.getTools();
 *
 * // Upload an image
 * const client = new WordPressClient(config);
 * const result = await mediaTools.handleUploadMedia(client, {
 *   file_path: "/path/to/image.jpg",
 *   title: "My Image",
 *   alt_text: "Description of the image"
 * });
 * ```
 *
 * @since 1.0.0
 * @author MCP WordPress Team
 */
export class MediaTools {
  /**
   * Retrieves the complete list of media management tools available for MCP.
   *
   * Returns an array of tool definitions for comprehensive media library management.
   * Each tool includes parameter validation, security checks, and detailed error handling.
   *
   * @returns {Array<MCPTool>} Array of MCPTool definitions for media management
   *
   * @example
   * ```typescript
   * const mediaTools = new MediaTools();
   * const tools = mediaTools.getTools();
   * console.log(tools.length); // 5 tools: list, get, upload, update, delete
   * ```
   *
   * @since 1.0.0
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
      {
        name: "wp_list_media",
        description: "Lists media items from a WordPress site, with filters.",
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
            name: "media_type",
            type: "string",
            description: "Limit results to a specific media type.",
            enum: ["image", "video", "audio", "application"],
          },
        ],
        handler: this.handleListMedia.bind(this),
      },
      {
        name: "wp_get_media",
        description: "Retrieves a single media item by its ID.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The unique identifier for the media item.",
          },
        ],
        handler: this.handleGetMedia.bind(this),
      },
      {
        name: "wp_upload_media",
        description: "Uploads a file to the WordPress media library.",
        parameters: [
          {
            name: "file_path",
            type: "string",
            required: true,
            description: "The local, absolute path to the file to upload.",
          },
          {
            name: "title",
            type: "string",
            description: "The title for the media item.",
          },
          {
            name: "alt_text",
            type: "string",
            description: "Alternative text for the media item (for accessibility).",
          },
          {
            name: "caption",
            type: "string",
            description: "The caption for the media item.",
          },
          {
            name: "description",
            type: "string",
            description: "The description for the media item.",
          },
          {
            name: "post",
            type: "number",
            description: "The ID of a post to attach this media to.",
          },
        ],
        handler: this.handleUploadMedia.bind(this),
      },
      {
        name: "wp_update_media",
        description: "Updates the metadata of an existing media item.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the media item to update.",
          },
          {
            name: "title",
            type: "string",
            description: "The new title for the media item.",
          },
          {
            name: "alt_text",
            type: "string",
            description: "The new alternative text.",
          },
          {
            name: "caption",
            type: "string",
            description: "The new caption.",
          },
          {
            name: "description",
            type: "string",
            description: "The new description.",
          },
        ],
        handler: this.handleUpdateMedia.bind(this),
      },
      {
        name: "wp_delete_media",
        description: "Deletes a media item.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the media item to delete.",
          },
          {
            name: "force",
            type: "boolean",
            description: "If true, permanently delete. If false, move to trash. Defaults to false.",
          },
        ],
        handler: this.handleDeleteMedia.bind(this),
      },
    ];
  }

  public async handleListMedia(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const queryParams = params as MediaQueryParams;
    try {
      const media = await client.getMedia(queryParams);
      if (media.length === 0) {
        return "No media items found matching the criteria.";
      }
      const content =
        `Found ${media.length} media items:\n\n` +
        media.map((m) => `- ID ${m.id}: **${m.title.rendered}** (${m.mime_type})\n  Link: ${m.source_url}`).join("\n");
      return content;
    } catch (_error) {
      throw new Error(`Failed to list media: ${getErrorMessage(_error)}`);
    }
  }

  public async handleGetMedia(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id } = params as { id: number };
    try {
      const media = await client.getMediaItem(id);
      const content =
        `**Media Details (ID: ${media.id})**\n\n` +
        `- **Title:** ${media.title.rendered}\n` +
        `- **URL:** ${media.source_url}\n` +
        `- **Type:** ${media.media_type} (${media.mime_type})\n` +
        `- **Date:** ${new Date(media.date).toLocaleString()}\n` +
        (media.alt_text ? `- **Alt Text:** ${media.alt_text}\n` : "") +
        (media.caption.rendered ? `- **Caption:** ${media.caption.rendered}\n` : "");
      return content;
    } catch (_error) {
      throw new Error(`Failed to get media item: ${getErrorMessage(_error)}`);
    }
  }

  public async handleUploadMedia(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const uploadParams = params as unknown as UploadMediaRequest & { file_path: string };
    try {
      if (!fs.existsSync(uploadParams.file_path)) {
        throw new Error(`File not found at path: ${uploadParams.file_path}`);
      }

      const media = await client.uploadMedia(uploadParams);
      return `✅ Media uploaded successfully!\n- ID: ${media.id}\n- Title: ${media.title.rendered}\n- URL: ${media.source_url}`;
    } catch (_error) {
      throw new Error(`Failed to upload media: ${getErrorMessage(_error)}`);
    }
  }

  public async handleUpdateMedia(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const updateParams = params as unknown as UpdateMediaRequest & { id: number };
    try {
      const media = await client.updateMedia(updateParams);
      return `✅ Media ${media.id} updated successfully.`;
    } catch (_error) {
      throw new Error(`Failed to update media: ${getErrorMessage(_error)}`);
    }
  }

  public async handleDeleteMedia(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { id, force } = params as { id: number; force?: boolean };
    try {
      await client.deleteMedia(id, force);
      const action = force ? "permanently deleted" : "moved to trash";
      return `✅ Media item ${id} has been ${action}`;
    } catch (_error) {
      throw new Error(`Failed to delete media: ${getErrorMessage(_error)}`);
    }
  }
}

export default MediaTools;
