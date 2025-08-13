import { WordPressClient } from "../client/api.js";
import { CreateUserRequest, UpdateUserRequest, UserQueryParams } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";
import { WordPressDataStreamer, StreamingUtils, StreamingResult } from "../utils/streaming.js";

/**
 * Provides tools for managing users on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class UserTools {
  /**
   * Retrieves the list of user management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): Array<{
    name: string;
    description: string;
    parameters?: Array<{ name: string; type?: string; description?: string; required?: boolean; enum?: string[]; items?: any }>;
    handler: (client: WordPressClient, params: Record<string, unknown>) => Promise<unknown>;
  }> {
    return [
      {
        name: "wp_list_users",
        description:
          "Lists users from a WordPress site with comprehensive filtering and detailed user information including roles, registration dates, and activity status.\n\n" +
          "**Usage Examples:**\n" +
          "• List all users: `wp_list_users`\n" +
          '• Search users: `wp_list_users --search="john"`\n' +
          '• Filter by role: `wp_list_users --roles=["editor","author"]`\n' +
          '• Find admins: `wp_list_users --roles=["administrator"]`\n' +
          '• Combined search: `wp_list_users --search="smith" --roles=["subscriber"]`',
        parameters: [
          {
            name: "search",
            type: "string",
            description: "Limit results to those matching a search term.",
          },
          {
            name: "roles",
            type: "array",
            items: { type: "string" },
            description: "Limit results to users with specific roles.",
          },
        ],
        handler: this.handleListUsers.bind(this),
      },
      {
        name: "wp_get_user",
        description: "Retrieves a single user by their ID.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The unique identifier for the user.",
          },
        ],
        handler: this.handleGetUser.bind(this),
      },
      {
        name: "wp_get_current_user",
        description:
          "Retrieves the currently authenticated user with comprehensive profile information including roles, capabilities, and account details.\n\n" +
          "**Usage Examples:**\n" +
          "• Get current user: `wp_get_current_user`\n" +
          "• Check permissions: Use this to verify your current user's capabilities and roles\n" +
          "• Account verification: Confirm you're authenticated with the correct account\n" +
          "• Profile details: View registration date, email, and user metadata",
        parameters: [],
        handler: this.handleGetCurrentUser.bind(this),
      },
      {
        name: "wp_create_user",
        description: "Creates a new user.",
        parameters: [
          {
            name: "username",
            type: "string",
            required: true,
            description: "The username for the new user.",
          },
          {
            name: "email",
            type: "string",
            required: true,
            description: "The email address for the new user.",
          },
          {
            name: "password",
            type: "string",
            required: true,
            description: "The password for the new user.",
          },
          {
            name: "roles",
            type: "array",
            items: { type: "string" },
            description: "An array of roles to assign to the user.",
          },
        ],
        handler: this.handleCreateUser.bind(this),
      },
      {
        name: "wp_update_user",
        description: "Updates an existing user.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the user to update.",
          },
          {
            name: "email",
            type: "string",
            description: "The new email address for the user.",
          },
          {
            name: "name",
            type: "string",
            description: "The new display name for the user.",
          },
        ],
        handler: this.handleUpdateUser.bind(this),
      },
      {
        name: "wp_delete_user",
        description: "Deletes a user.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the user to delete.",
          },
          {
            name: "reassign",
            type: "number",
            description: "The ID of a user to reassign the deleted user's content to.",
          },
        ],
        handler: this.handleDeleteUser.bind(this),
      },
    ];
  }

  public async handleListUsers(client: WordPressClient, params: UserQueryParams): Promise<unknown> {
    try {
      const users = await client.getUsers(params);
      if (users.length === 0) {
        return "No users found matching the criteria.";
      }

      // Use streaming for large user result sets (>30 users)
      if (users.length > 30) {
        const streamResults: StreamingResult<unknown>[] = [];

        for await (const result of WordPressDataStreamer.streamUsers(users, {
          includeRoles: true,
          includeCapabilities: false, // Too verbose for large sets
          batchSize: 15,
        })) {
          streamResults.push(result);
        }

        return StreamingUtils.formatStreamingResponse(streamResults, "users");
      }

      // Enhanced user information with comprehensive details
      const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "Unknown site";
      const userCount = users.length;
      const rolesSummary = users.reduce(
        (acc, u) => {
          const roles = u.roles || [];
          roles.forEach((role) => {
            acc[role] = (acc[role] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>,
      );

      const metadata = [
        `👥 **Users Summary**: ${userCount} total users`,
        `🌐 **Source**: ${siteUrl}`,
        `📊 **Roles Distribution**: ${Object.entries(rolesSummary)
          .map(([role, count]) => `${role}: ${count}`)
          .join(", ")}`,
        `📅 **Retrieved**: ${new Date().toLocaleString()}`,
      ];

      const content =
        metadata.join("\n") +
        "\n\n" +
        users
          .map((u) => {
            const registrationDate = u.registered_date
              ? new Date(u.registered_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Unknown";

            const roles = u.roles?.join(", ") || "No roles";
            const description = u.description || "No description";
            const displayName = u.name || "No display name";
            const userUrl = u.url || "No URL";

            return (
              `- **ID ${u.id}**: ${displayName} (@${u.slug})\n` +
              `  📧 Email: ${u.email || "No email"}\n` +
              `  🎭 Roles: ${roles}\n` +
              `  📅 Registered: ${registrationDate}\n` +
              `  🔗 URL: ${userUrl}\n` +
              `  📝 Description: ${description}`
            );
          })
          .join("\n\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to list users: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetUser(client: WordPressClient, params: { id: number }): Promise<unknown> {
    try {
      const user = await client.getUser(params.id);
      const content =
        `**User Details (ID: ${user.id})**\n\n` +
        `- **Name:** ${user.name}\n` +
        `- **Username:** ${user.slug}\n` +
        `- **Email:** ${user.email}\n` +
        `- **Roles:** ${user.roles?.join(", ") || "N/A"}`;
      return content;
    } catch (error) {
      throw new Error(`Failed to get user: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetCurrentUser(
    client: WordPressClient,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const user = await client.getCurrentUser();
      const siteUrl = client.getSiteUrl();

      // Extract meaningful information from capabilities
      const capabilities = user.capabilities || {};
      const keyCapabilities = [
        "edit_posts",
        "edit_pages",
        "publish_posts",
        "publish_pages",
        "delete_posts",
        "delete_pages",
        "manage_categories",
        "manage_options",
        "moderate_comments",
        "upload_files",
        "edit_others_posts",
        "delete_others_posts",
      ];

      const userCapabilities = keyCapabilities.filter((cap) => capabilities[cap]).join(", ");
      const totalCapabilities = Object.keys(capabilities).length;

      // Format registration date more clearly
      const registrationDate = user.registered_date
        ? new Date(user.registered_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Not available";

      // Extract role information
      const roles = user.roles || [];
      const primaryRole = roles[0] || "No role assigned";
      const allRoles = roles.length > 1 ? roles.join(", ") : primaryRole;

      // Build comprehensive user information
      const content =
        `**Current User Details for ${siteUrl}**\n\n` +
        `- **ID:** ${user.id}\n` +
        `- **Display Name:** ${user.name || "Not set"}\n` +
        `- **Username:** ${user.slug || "Not set"}\n` +
        `- **Email:** ${user.email || "Not set"}\n` +
        `- **User URL:** ${user.url || "Not set"}\n` +
        `- **Nickname:** ${user.nickname || user.name || "Not set"}\n` +
        `- **Description:** ${user.description || "No description provided"}\n` +
        `- **Locale:** ${user.locale || "Default"}\n` +
        `- **Registration Date:** ${registrationDate}\n` +
        `- **Primary Role:** ${primaryRole}\n` +
        `- **All Roles:** ${allRoles}\n` +
        `- **Total Capabilities:** ${totalCapabilities} capabilities\n` +
        `- **Key Capabilities:** ${userCapabilities || "None"}\n` +
        `- **Profile Link:** ${user.link || `${siteUrl}/wp-admin/profile.php`}`;

      return content;
    } catch (error) {
      throw new Error(`Failed to get current user: ${getErrorMessage(error)}`);
    }
  }

  public async handleCreateUser(client: WordPressClient, params: CreateUserRequest): Promise<unknown> {
    try {
      const user = await client.createUser(params);
      return `✅ User "${user.name}" created successfully with ID: ${user.id}.`;
    } catch (error) {
      throw new Error(`Failed to create user: ${getErrorMessage(error)}`);
    }
  }

  public async handleUpdateUser(client: WordPressClient, params: UpdateUserRequest & { id: number }): Promise<unknown> {
    try {
      const user = await client.updateUser(params);
      return `✅ User ${user.id} updated successfully.`;
    } catch (error) {
      throw new Error(`Failed to update user: ${getErrorMessage(error)}`);
    }
  }

  public async handleDeleteUser(client: WordPressClient, params: { id: number; reassign?: number }): Promise<unknown> {
    try {
      await client.deleteUser(params.id, params.reassign);
      let content = `✅ User ${params.id} has been deleted.`;
      if (params.reassign) {
        content += ` Their content has been reassigned to user ID ${params.reassign}.`;
      }
      return content;
    } catch (error) {
      throw new Error(`Failed to delete user: ${getErrorMessage(error)}`);
    }
  }
}

export default UserTools;
