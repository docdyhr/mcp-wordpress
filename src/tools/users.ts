import { WordPressClient } from "../client/api.js";
import { CreateUserRequest, UpdateUserRequest, UserQueryParams } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Provides tools for managing users on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class UserTools {
  /**
   * Retrieves the list of user management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): any[] {
    return [
      {
        name: "wp_list_users",
        description: "Lists users from a WordPress site, with filters.",
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
        description: "Retrieves the currently authenticated user.",
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

  public async handleListUsers(client: WordPressClient, params: UserQueryParams): Promise<any> {
    try {
      const users = await client.getUsers(params);
      if (users.length === 0) {
        return "No users found matching the criteria.";
      }
      const content =
        `Found ${users.length} users:\n\n` +
        users
          .map((u) => `- ID ${u.id}: **${u.name}** (@${u.slug}) - ${u.email}\n  Roles: ${u.roles?.join(", ") || "N/A"}`)
          .join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to list users: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetUser(client: WordPressClient, params: { id: number }): Promise<any> {
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

  public async handleGetCurrentUser(client: WordPressClient, params: any): Promise<any> {
    try {
      const user = await client.getCurrentUser();
      const siteUrl = client.getSiteUrl();

      const content =
        `**Current User Details for ${siteUrl}**\n\n` +
        `- **ID:** ${user.id}\n` +
        `- **Name:** ${user.name || "Not set"}\n` +
        `- **Username:** ${user.slug || "Not set"}\n` +
        `- **Email:** ${user.email || "Not set"}\n` +
        `- **Roles:** ${user.roles?.join(", ") || "N/A"}\n` +
        `- **Capabilities:** ${user.capabilities ? Object.keys(user.capabilities).length + " capabilities" : "N/A"}\n` +
        `- **Registration Date:** ${user.registered_date ? new Date(user.registered_date).toLocaleDateString() : "N/A"}\n` +
        `- **URL:** ${user.url || "Not set"}`;
      return content;
    } catch (error) {
      throw new Error(`Failed to get current user: ${getErrorMessage(error)}`);
    }
  }

  public async handleCreateUser(client: WordPressClient, params: CreateUserRequest): Promise<any> {
    try {
      const user = await client.createUser(params);
      return `✅ User "${user.name}" created successfully with ID: ${user.id}.`;
    } catch (error) {
      throw new Error(`Failed to create user: ${getErrorMessage(error)}`);
    }
  }

  public async handleUpdateUser(client: WordPressClient, params: UpdateUserRequest & { id: number }): Promise<any> {
    try {
      const user = await client.updateUser(params);
      return `✅ User ${user.id} updated successfully.`;
    } catch (error) {
      throw new Error(`Failed to update user: ${getErrorMessage(error)}`);
    }
  }

  public async handleDeleteUser(client: WordPressClient, params: { id: number; reassign?: number }): Promise<any> {
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
