import { WordPressClient } from "@/client/api.js";
import { WordPressApplicationPassword } from "@/types/wordpress.js";
import { getErrorMessage } from "@/utils/error.js";

/**
 * Provides tools for managing general site settings and operations on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class SiteTools {
  /**
   * Retrieves the list of site management tools.
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
      {
        name: "wp_get_site_settings",
        description: "Retrieves the general settings for a WordPress site.",
        parameters: [],
        handler: this.handleGetSiteSettings.bind(this),
      },
      {
        name: "wp_update_site_settings",
        description: "Updates one or more general settings for a WordPress site.",
        parameters: [
          {
            name: "title",
            type: "string",
            description: "The title of the site.",
          },
          {
            name: "description",
            type: "string",
            description: "The tagline or description of the site.",
          },
          {
            name: "timezone",
            type: "string",
            description: "A city in the same timezone, e.g., 'America/New_York'.",
          },
        ],
        handler: this.handleUpdateSiteSettings.bind(this),
      },
      {
        name: "wp_search_site",
        description:
          "Performs a site-wide search for content across posts, pages, and media with comprehensive results and metadata.\n\n" +
          "**Usage Examples:**\n" +
          '• Search everything: `wp_search_site --term="WordPress"`\n' +
          '• Search posts only: `wp_search_site --term="tutorial" --type="posts"`\n' +
          '• Search pages: `wp_search_site --term="about" --type="pages"`\n' +
          '• Search media: `wp_search_site --term="logo" --type="media"`\n' +
          '• Find specific content: `wp_search_site --term="contact form"`',
        parameters: [
          {
            name: "term",
            type: "string",
            required: true,
            description: "The search term to look for.",
          },
          {
            name: "type",
            type: "string",
            description: "The type of content to search.",
            enum: ["posts", "pages", "media"],
          },
        ],
        handler: this.handleSearchSite.bind(this),
      },
      {
        name: "wp_get_application_passwords",
        description: "Lists application passwords for a specific user.",
        parameters: [
          {
            name: "user_id",
            type: "number",
            required: true,
            description: "The ID of the user to get application passwords for.",
          },
        ],
        handler: this.handleGetApplicationPasswords.bind(this),
      },
      {
        name: "wp_create_application_password",
        description: "Creates a new application password for a user.",
        parameters: [
          {
            name: "user_id",
            type: "number",
            required: true,
            description: "The ID of the user to create the password for.",
          },
          {
            name: "app_name",
            type: "string",
            required: true,
            description: "The name of the application this password is for.",
          },
        ],
        handler: this.handleCreateApplicationPassword.bind(this),
      },
      {
        name: "wp_delete_application_password",
        description: "Revokes an existing application password.",
        parameters: [
          {
            name: "user_id",
            type: "number",
            required: true,
            description: "The ID of the user who owns the password.",
          },
          {
            name: "uuid",
            type: "string",
            required: true,
            description: "The UUID of the application password to revoke.",
          },
        ],
        handler: this.handleDeleteApplicationPassword.bind(this),
      },
    ];
  }

  public async handleGetSiteSettings(client: WordPressClient, _params: Record<string, unknown>): Promise<unknown> {
    try {
      const settings = await client.getSiteSettings();
      const siteUrl = client.getSiteUrl();

      // Enhanced site settings with comprehensive details
      const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const startOfWeek = settings.start_of_week !== undefined ? weekDays[settings.start_of_week] : "Not set";

      // Get additional site information
      const currentTime = new Date().toLocaleString("en-US", {
        timeZone: settings.timezone || "UTC",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });

      let content = `**🌐 Site Settings for ${siteUrl}**\n\n`;

      content += `**📋 Basic Information:**\n`;
      content += `- **Title:** ${settings.title || "Not set"}\n`;
      content += `- **Description:** ${settings.description || "Not set"}\n`;
      content += `- **URL:** ${settings.url || siteUrl}\n`;
      content += `- **Admin Email:** ${settings.email || "Not set"}\n\n`;

      content += `**🌍 Localization:**\n`;
      content += `- **Language:** ${settings.language || "English (US)"}\n`;
      content += `- **Timezone:** ${settings.timezone || "UTC"}\n`;
      content += `- **Current Time:** ${currentTime}\n\n`;

      content += `**📅 Date & Time Format:**\n`;
      content += `- **Date Format:** ${settings.date_format || "Not set"}\n`;
      content += `- **Time Format:** ${settings.time_format || "Not set"}\n`;
      content += `- **Start of Week:** ${startOfWeek}\n\n`;

      content += `**📝 Content Settings:**\n`;
      content += `- **Posts per Page:** ${settings.posts_per_page || "Not set"}\n`;
      content += `- **Default Category:** ${settings.default_category || "Not set"}\n`;
      content += `- **Default Post Format:** ${settings.default_post_format || "Standard"}\n\n`;

      content += `**💬 Discussion Settings:**\n`;
      content += `- **Default Comment Status:** ${settings.default_comment_status || "Not set"}\n`;
      content += `- **Default Ping Status:** ${settings.default_ping_status || "Not set"}\n`;
      content += `- **Use Smilies:** ${settings.use_smilies ? "Yes" : "No"}\n\n`;

      content += `**📊 Retrieved:** ${new Date().toLocaleString()}`;

      return content;
    } catch (_error) {
      throw new Error(`Failed to get site settings: ${getErrorMessage(_error)}`);
    }
  }

  public async handleUpdateSiteSettings(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    try {
      const updatedSettings = await client.updateSiteSettings(params);
      return `✅ Site settings updated successfully. New title: ${updatedSettings.title}`;
    } catch (_error) {
      throw new Error(`Failed to update site settings: ${getErrorMessage(_error)}`);
    }
  }

  public async handleSearchSite(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    try {
      const { term, type } = params as { term: string; type?: "posts" | "pages" | "media" };
      const results = await client.search(term, type ? [type] : undefined);
      if (results.length === 0) {
        return `No results found for "${term}".`;
      }
      const content =
        `Found ${results.length} results for "${term}":\n\n` +
        results.map((r) => `- [${r.type}] **${r.title}**\n  Link: ${r.url}`).join("\n");
      return content;
    } catch (_error) {
      throw new Error(`Failed to perform search: ${getErrorMessage(_error)}`);
    }
  }

  public async handleGetApplicationPasswords(
    client: WordPressClient,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const { user_id } = params as { user_id: number };
      const passwords = await client.getApplicationPasswords(user_id);
      if (passwords.length === 0) {
        return `No application passwords found for user ID ${user_id}.`;
      }
      const content =
        `Found ${passwords.length} application passwords for user ID ${user_id}:\n\n` +
        passwords
          .map(
            (p: WordPressApplicationPassword) =>
              `- **${p.name}** (UUID: ${p.uuid})\n  Created: ${new Date(p.created).toLocaleDateString()}`,
          )
          .join("\n");
      return content;
    } catch (_error) {
      throw new Error(`Failed to get application passwords: ${getErrorMessage(_error)}`);
    }
  }

  public async handleCreateApplicationPassword(
    client: WordPressClient,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const { user_id, app_name } = params as { user_id: number; app_name: string };
      const result = await client.createApplicationPassword(user_id, app_name);
      const content =
        "✅ **Application password created successfully!**\n\n" +
        `**Name:** ${result.name}\n` +
        `**Password:** \`${result.password}\`\n\n` +
        "**IMPORTANT:** This password is shown only once. Please save it securely.";
      return content;
    } catch (_error) {
      throw new Error(`Failed to create application password: ${getErrorMessage(_error)}`);
    }
  }

  public async handleDeleteApplicationPassword(
    client: WordPressClient,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const { user_id, uuid } = params as { user_id: number; uuid: string };
      await client.deleteApplicationPassword(user_id, uuid);
      return `✅ Application password with UUID ${uuid} has been revoked.`;
    } catch (_error) {
      throw new Error(`Failed to delete application password: ${getErrorMessage(_error)}`);
    }
  }
}

export default SiteTools;
