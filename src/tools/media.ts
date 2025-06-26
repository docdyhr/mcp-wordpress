import { MCPTool, MCPToolResponse } from "@mcp/server";
import * as fs from "fs";
import * as path from "path";
import WordPressClient from "../client/api.js";
import {
  MediaQueryParams,
  UpdateMediaRequest,
  UploadMediaRequest,
  WordPressMedia,
} from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Provides tools for managing media on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class MediaTools {
  /**
   * Retrieves the list of media management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): MCPTool[] {
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
            description:
              "Alternative text for the media item (for accessibility).",
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
            description:
              "If true, permanently delete. If false, move to trash. Defaults to false.",
          },
        ],
        handler: this.handleDeleteMedia.bind(this),
      },
    ];
  }

  public async handleListMedia(
    client: WordPressClient,
    params: MediaQueryParams,
  ): Promise<MCPToolResponse> {
    try {
      const media = await client.getMedia(params);
      if (media.length === 0) {
        return { content: "No media items found matching the criteria." };
      }
      const content =
        `Found ${media.length} media items:\n\n` +
        media
          .map(
            (m) =>
              `- ID ${m.id}: **${m.title.rendered}** (${m.mime_type})\n  Link: ${m.source_url}`,
          )
          .join("\n");
      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to list media: ${getErrorMessage(error)}`,
          code: "LIST_MEDIA_FAILED",
        },
      };
    }
  }

  public async handleGetMedia(
    client: WordPressClient,
    params: { id: number },
  ): Promise<MCPToolResponse> {
    try {
      const media = await client.getMediaItem(params.id);
      const content =
        `**Media Details (ID: ${media.id})**\n\n` +
        `- **Title:** ${media.title.rendered}\n` +
        `- **URL:** ${media.source_url}\n` +
        `- **Type:** ${media.media_type} (${media.mime_type})\n` +
        `- **Date:** ${new Date(media.date).toLocaleString()}\n` +
        (media.alt_text ? `- **Alt Text:** ${media.alt_text}\n` : "") +
        (media.caption.rendered
          ? `- **Caption:** ${media.caption.rendered}\n`
          : "");
      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to get media item: ${getErrorMessage(error)}`,
          code: "GET_MEDIA_FAILED",
        },
      };
    }
  }

  public async handleUploadMedia(
    client: WordPressClient,
    params: UploadMediaRequest & { file_path: string },
  ): Promise<MCPToolResponse> {
    try {
      if (!fs.existsSync(params.file_path)) {
        return {
          error: {
            message: `File not found at path: ${params.file_path}`,
            code: "FILE_NOT_FOUND",
          },
        };
      }

      const fileBuffer = fs.readFileSync(params.file_path);
      const fileName = path.basename(params.file_path);

      const media = await client.uploadMedia(fileBuffer, fileName, params);
      return {
        content: `✅ Media uploaded successfully!\n- ID: ${media.id}\n- Title: ${media.title.rendered}\n- URL: ${media.source_url}`,
      };
    } catch (error) {
      return {
        error: {
          message: `Failed to upload media: ${getErrorMessage(error)}`,
          code: "UPLOAD_MEDIA_FAILED",
        },
      };
    }
  }

  public async handleUpdateMedia(
    client: WordPressClient,
    params: UpdateMediaRequest & { id: number },
  ): Promise<MCPToolResponse> {
    try {
      const { id, ...updateData } = params;
      const media = await client.updateMedia(id, updateData);
      return {
        content: `✅ Media ${media.id} updated successfully.`,
      };
    } catch (error) {
      return {
        error: {
          message: `Failed to update media: ${getErrorMessage(error)}`,
          code: "UPDATE_MEDIA_FAILED",
        },
      };
    }
  }

  public async handleDeleteMedia(
    client: WordPressClient,
    params: { id: number; force?: boolean },
  ): Promise<MCPToolResponse> {
    try {
      await client.deleteMedia(params.id, params.force);
      const action = params.force ? "permanently deleted" : "moved to trash";
      return { content: `✅ Media item ${params.id} has been ${action}.` };
    } catch (error) {
      return {
        error: {
          message: `Failed to delete media: ${getErrorMessage(error)}`,
          code: "DELETE_MEDIA_FAILED",
        },
      };
    }
  }
}

export default MediaTools;
