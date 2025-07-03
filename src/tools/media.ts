import * as fs from "fs";
import { WordPressClient } from "../client/api.js";
import {
  MediaQueryParams,
  UpdateMediaRequest,
  UploadMediaRequest,
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
  public getTools(): any[] {
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
  ): Promise<any> {
    try {
      const media = await client.getMedia(params);
      if (media.length === 0) {
        return "No media items found matching the criteria.";
      }
      const content =
        `Found ${media.length} media items:\n\n` +
        media
          .map(
            (m) =>
              `- ID ${m.id}: **${m.title.rendered}** (${m.mime_type})\n  Link: ${m.source_url}`,
          )
          .join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to list media: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetMedia(
    client: WordPressClient,
    params: { id: number },
  ): Promise<any> {
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
      return content;
    } catch (error) {
      throw new Error(`Failed to get media item: ${getErrorMessage(error)}`);
    }
  }

  public async handleUploadMedia(
    client: WordPressClient,
    params: UploadMediaRequest & { file_path: string },
  ): Promise<any> {
    try {
      if (!fs.existsSync(params.file_path)) {
        throw new Error(`File not found at path: ${params.file_path}`);
      }

      const media = await client.uploadMedia(params);
      return `✅ Media uploaded successfully!\n- ID: ${media.id}\n- Title: ${media.title.rendered}\n- URL: ${media.source_url}`;
    } catch (error) {
      throw new Error(`Failed to upload media: ${getErrorMessage(error)}`);
    }
  }

  public async handleUpdateMedia(
    client: WordPressClient,
    params: UpdateMediaRequest & { id: number },
  ): Promise<any> {
    try {
      const media = await client.updateMedia(params);
      return `✅ Media ${media.id} updated successfully.`;
    } catch (error) {
      throw new Error(`Failed to update media: ${getErrorMessage(error)}`);
    }
  }

  public async handleDeleteMedia(
    client: WordPressClient,
    params: { id: number; force?: boolean },
  ): Promise<any> {
    try {
      await client.deleteMedia(params.id, params.force);
      const action = params.force ? "permanently deleted" : "moved to trash";
      return `✅ Media item ${params.id} has been ${action}.`;
    } catch (error) {
      throw new Error(`Failed to delete media: ${getErrorMessage(error)}`);
    }
  }
}

export default MediaTools;
