import { WordPressClient } from "../client/api.js";
import { WordPressApplicationPassword } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Provides tools for managing general site settings and operations on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class SiteTools {
  /**
   * Retrieves the list of site management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): any[] {
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
        description: "Performs a site-wide search for content.",
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

  public async handleGetSiteSettings(client: WordPressClient, params: any): Promise<any> {
    try {
      const settings = await client.getSiteSettings();
      const siteUrl = client.getSiteUrl();

      const content =
        `**Site Settings for ${siteUrl}**\n\n` +
        `- **Title:** ${settings.title || "Not set"}\n` +
        `- **Description:** ${settings.description || "Not set"}\n` +
        `- **URL:** ${settings.url || siteUrl}\n` +
        `- **Timezone:** ${settings.timezone || "Not set"}\n` +
        `- **Language:** ${settings.language || "Not set"}\n` +
        `- **Date Format:** ${settings.date_format || "Not set"}\n` +
        `- **Time Format:** ${settings.time_format || "Not set"}\n` +
        `- **Start of Week:** ${settings.start_of_week !== undefined ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][settings.start_of_week] : "Not set"}`;
      return content;
    } catch (error) {
      throw new Error(`Failed to get site settings: ${getErrorMessage(error)}`);
    }
  }

  public async handleUpdateSiteSettings(client: WordPressClient, params: any): Promise<any> {
    try {
      const updatedSettings = await client.updateSiteSettings(params);
      return `✅ Site settings updated successfully. New title: ${updatedSettings.title}`;
    } catch (error) {
      throw new Error(`Failed to update site settings: ${getErrorMessage(error)}`);
    }
  }

  public async handleSearchSite(
    client: WordPressClient,
    params: { term: string; type?: "posts" | "pages" | "media" },
  ): Promise<any> {
    try {
      const results = await client.search(params.term, params.type ? [params.type] : undefined);
      if (results.length === 0) {
        return `No results found for "${params.term}".`;
      }
      const content =
        `Found ${results.length} results for "${params.term}":\n\n` +
        results.map((r) => `- [${r.type}] **${r.title}**\n  Link: ${r.url}`).join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to perform search: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetApplicationPasswords(client: WordPressClient, params: { user_id: number }): Promise<any> {
    try {
      const passwords = await client.getApplicationPasswords(params.user_id);
      if (passwords.length === 0) {
        return `No application passwords found for user ID ${params.user_id}.`;
      }
      const content =
        `Found ${passwords.length} application passwords for user ID ${params.user_id}:\n\n` +
        passwords
          .map(
            (p: WordPressApplicationPassword) =>
              `- **${p.name}** (UUID: ${p.uuid})\n  Created: ${new Date(p.created).toLocaleDateString()}`,
          )
          .join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to get application passwords: ${getErrorMessage(error)}`);
    }
  }

  public async handleCreateApplicationPassword(
    client: WordPressClient,
    params: { user_id: number; app_name: string },
  ): Promise<any> {
    try {
      const result = await client.createApplicationPassword(params.user_id, params.app_name);
      const content =
        "✅ **Application password created successfully!**\n\n" +
        `**Name:** ${result.name}\n` +
        `**Password:** \`${result.password}\`\n\n` +
        "**IMPORTANT:** This password is shown only once. Please save it securely.";
      return content;
    } catch (error) {
      throw new Error(`Failed to create application password: ${getErrorMessage(error)}`);
    }
  }

  public async handleDeleteApplicationPassword(
    client: WordPressClient,
    params: { user_id: number; uuid: string },
  ): Promise<any> {
    try {
      await client.deleteApplicationPassword(params.user_id, params.uuid);
      return `✅ Application password with UUID ${params.uuid} has been revoked.`;
    } catch (error) {
      throw new Error(`Failed to delete application password: ${getErrorMessage(error)}`);
    }
  }
}

export default SiteTools;
