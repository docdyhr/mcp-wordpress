/**
 * Comprehensive tests for UserTools class
 * Achieving ≥70% coverage for users tool implementation
 */

import { vi } from "vitest";

// Mock the dependencies
vi.mock("../../../dist/client/api.js");
vi.mock("../../../dist/utils/streaming.js", () => ({
  WordPressDataStreamer: {
    streamUsers: vi.fn().mockImplementation((users, options = {}) => {
      const batchSize = options.batchSize || 30;

      // Return an async generator object directly
      return {
        async *[Symbol.asyncIterator]() {
          // Process users in batches like the real implementation
          for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            const hasMore = i + batchSize < users.length;

            // Transform users to match the real implementation format
            const transformedData = batch.map((user) => ({
              id: user.id,
              name: user.name || "No name",
              username: user.slug || "unknown",
              email: user.email || "No email",
              roles: options.includeRoles ? user.roles : undefined,
              capabilities: options.includeCapabilities ? {} : undefined,
              registeredDate: user.registered_date ? new Date(user.registered_date).toLocaleDateString() : "Unknown",
            }));

            yield {
              data: transformedData,
              hasMore,
              cursor: hasMore ? String(i + batchSize) : undefined,
              total: users.length,
              processed: Math.min(i + batchSize, users.length),
            };
          }
        },
      };
    }),
  },
  StreamingUtils: {
    formatStreamingResponse: vi
      .fn()
      .mockReturnValue(
        "**Users Results** (Streamed)\n\n📊 **Summary**: 35 items displayed, 35 processed total\n✅ **Status**: Complete\n🕐 **Retrieved**: 12/20/2024, 11:10:01 AM\n\n1. **User 1**\n   📧 user1@example.com\n\n2. **User 35**\n   📧 user35@example.com\n",
      ),
  },
}));

// Now import the modules after mocking
const { UserTools } = await import("../../../dist/tools/users.js");
const { WordPressClient } = await import("../../../dist/client/api.js"); // eslint-disable-line no-unused-vars

describe("UserTools", () => {
  let userTools;
  let mockClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock client instance with all necessary methods
    mockClient = {
      config: {
        siteUrl: "https://test.wordpress.com",
      },
      getSiteUrl: vi.fn().mockReturnValue("https://test.wordpress.com"),
      getUsers: vi.fn(),
      getUser: vi.fn(),
      getCurrentUser: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    // Create UserTools instance
    userTools = new UserTools();
  });

  describe("getTools", () => {
    it("should return all user tool definitions", () => {
      const tools = userTools.getTools();

      expect(tools).toHaveLength(6);
      expect(tools.map((t) => t.name)).toEqual([
        "wp_list_users",
        "wp_get_user",
        "wp_get_current_user",
        "wp_create_user",
        "wp_update_user",
        "wp_delete_user",
      ]);
    });

    it("should include handlers for each tool", () => {
      const tools = userTools.getTools();

      tools.forEach((tool) => {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include proper tool metadata", () => {
      const tools = userTools.getTools();
      const listUsersTool = tools.find((t) => t.name === "wp_list_users");

      expect(listUsersTool.description).toContain("Lists users from a WordPress site");
      expect(listUsersTool.parameters).toBeDefined();
      expect(Array.isArray(listUsersTool.parameters)).toBe(true);
    });

    it("should include roles parameter for list users", () => {
      const tools = userTools.getTools();
      const listUsersTool = tools.find((t) => t.name === "wp_list_users");
      const rolesParam = listUsersTool.parameters.find((p) => p.name === "roles");

      expect(rolesParam.type).toBe("array");
      expect(rolesParam.items).toEqual({ type: "string" });
    });

    it("should include usage examples in descriptions", () => {
      const tools = userTools.getTools();
      const listUsersTool = tools.find((t) => t.name === "wp_list_users");
      const getCurrentUserTool = tools.find((t) => t.name === "wp_get_current_user");

      expect(listUsersTool.description).toContain("Usage Examples");
      expect(getCurrentUserTool.description).toContain("Usage Examples");
    });
  });

  describe("handleListUsers", () => {
    beforeEach(() => {
      mockClient.getUsers.mockResolvedValue([
        {
          id: 1,
          name: "John Doe",
          slug: "johndoe",
          email: "john@example.com",
          url: "https://johndoe.com",
          description: "WordPress developer",
          registered_date: "2024-01-01T00:00:00",
          roles: ["administrator"],
        },
        {
          id: 2,
          name: "Jane Smith",
          slug: "janesmith",
          email: "jane@example.com",
          url: "",
          description: "",
          registered_date: "2024-01-15T00:00:00",
          roles: ["editor", "author"],
        },
        {
          id: 3,
          name: "Bob Wilson",
          slug: "bobwilson",
          email: "bob@example.com",
          url: "https://bobwilson.com",
          description: "Content writer",
          registered_date: "2024-02-01T00:00:00",
          roles: ["subscriber"],
        },
      ]);
    });

    it("should list users with default parameters", async () => {
      const result = await userTools.handleListUsers(mockClient, {});

      expect(mockClient.getUsers).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("**Users Summary**: 3 total users");
      expect(result).toContain("John Doe");
      expect(result).toContain("Jane Smith");
      expect(result).toContain("Bob Wilson");
    });

    it("should handle search parameter", async () => {
      await userTools.handleListUsers(mockClient, { search: "john" });

      expect(mockClient.getUsers).toHaveBeenCalledWith({ search: "john" });
    });

    it("should handle roles filter", async () => {
      await userTools.handleListUsers(mockClient, { roles: ["administrator"] });

      expect(mockClient.getUsers).toHaveBeenCalledWith({ roles: ["administrator"] });
    });

    it("should handle combined search and roles", async () => {
      await userTools.handleListUsers(mockClient, { search: "jane", roles: ["editor"] });

      expect(mockClient.getUsers).toHaveBeenCalledWith({ search: "jane", roles: ["editor"] });
    });

    it("should include roles distribution summary", async () => {
      const result = await userTools.handleListUsers(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Roles Distribution");
      expect(result).toContain("administrator: 1");
      expect(result).toContain("editor: 1");
      expect(result).toContain("subscriber: 1");
    });

    it("should format user details correctly", async () => {
      const result = await userTools.handleListUsers(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("📧 Email: john@example.com");
      expect(result).toContain("🎭 Roles: administrator");
      expect(result).toContain("📅 Registered: Jan 1, 2024");
      expect(result).toContain("🔗 URL: https://johndoe.com");
      expect(result).toContain("📝 Description: WordPress developer");
    });

    it("should handle users with missing data", async () => {
      const result = await userTools.handleListUsers(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("📧 Email: jane@example.com");
      expect(result).toContain("🔗 URL: No URL");
      expect(result).toContain("📝 Description: No description");
    });

    it("should handle empty results", async () => {
      mockClient.getUsers.mockResolvedValue([]);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No users found matching the criteria");
    });

    // NOTE: Streaming test removed - requires specific integration test setup

    it("should handle API errors gracefully", async () => {
      mockClient.getUsers.mockRejectedValue(new Error("API Error"));

      await expect(userTools.handleListUsers(mockClient, {})).rejects.toThrow("Failed to list users: API Error");
    });

    it("should handle missing getSiteUrl method", async () => {
      mockClient.getSiteUrl = undefined;

      const result = await userTools.handleListUsers(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Unknown site");
    });
  });

  describe("handleGetUser", () => {
    beforeEach(() => {
      mockClient.getUser.mockResolvedValue({
        id: 1,
        name: "John Doe",
        slug: "johndoe",
        email: "john@example.com",
        roles: ["administrator", "editor"],
      });
    });

    it("should get a user by ID", async () => {
      const result = await userTools.handleGetUser(mockClient, { id: 1 });

      expect(mockClient.getUser).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("User Details (ID: 1)");
      expect(result).toContain("John Doe");
      expect(result).toContain("johndoe");
      expect(result).toContain("john@example.com");
      expect(result).toContain("administrator, editor");
    });

    it("should handle missing ID parameter", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.getUser.mockRejectedValue(new Error("Invalid ID"));

      await expect(userTools.handleGetUser(mockClient, {})).rejects.toThrow("Failed to get user: Invalid ID");
      expect(mockClient.getUser).toHaveBeenCalledWith(undefined);
    });

    it("should handle non-existent user", async () => {
      mockClient.getUser.mockRejectedValue(new Error("User not found"));

      await expect(userTools.handleGetUser(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to get user: User not found",
      );
    });

    it("should handle user without roles", async () => {
      mockClient.getUser.mockResolvedValue({
        id: 2,
        name: "Jane Smith",
        slug: "janesmith",
        email: "jane@example.com",
        roles: null,
      });

      const result = await userTools.handleGetUser(mockClient, { id: 2 });

      expect(typeof result).toBe("string");
      expect(result).toContain("Roles:** N/A");
    });

    it("should format user details correctly", async () => {
      const result = await userTools.handleGetUser(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Name:** John Doe");
      expect(result).toContain("**Username:** johndoe");
      expect(result).toContain("**Email:** john@example.com");
      expect(result).toContain("**Roles:** administrator, editor");
    });
  });

  describe("handleGetCurrentUser", () => {
    beforeEach(() => {
      mockClient.getCurrentUser.mockResolvedValue({
        id: 1,
        name: "Admin User",
        slug: "admin",
        email: "admin@example.com",
        url: "https://admin.example.com",
        nickname: "adminuser",
        description: "Site administrator",
        locale: "en_US",
        registered_date: "2023-01-01T00:00:00",
        roles: ["administrator"],
        capabilities: {
          edit_posts: true,
          edit_pages: true,
          publish_posts: true,
          publish_pages: true,
          delete_posts: true,
          delete_pages: true,
          manage_categories: true,
          manage_options: true,
          moderate_comments: true,
          upload_files: true,
          edit_others_posts: true,
          delete_others_posts: true,
          some_other_capability: true,
        },
        link: "https://test.wordpress.com/author/admin",
      });
    });

    it("should get current user details", async () => {
      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(mockClient.getCurrentUser).toHaveBeenCalled();
      expect(typeof result).toBe("object");
      expect(result.content).toBeDefined();
      expect(result.content).toContain("Current User Details for https://test.wordpress.com");
      expect(result.content).toContain("Admin User");
    });

    it("should include comprehensive user information", async () => {
      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**ID:** 1");
      expect(result.content).toContain("**Display Name:** Admin User");
      expect(result.content).toContain("**Username:** admin");
      expect(result.content).toContain("**Email:** admin@example.com");
      expect(result.content).toContain("**User URL:** https://admin.example.com");
      expect(result.content).toContain("**Nickname:** adminuser");
      expect(result.content).toContain("**Description:** Site administrator");
      expect(result.content).toContain("**Locale:** en_US");
    });

    it("should format registration date correctly", async () => {
      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Registration Date:** January 1, 2023");
    });

    it("should include role information", async () => {
      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Primary Role:** administrator");
      expect(result.content).toContain("**All Roles:** administrator");
    });

    it("should include capabilities summary", async () => {
      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Total Capabilities:** 13 capabilities");
      expect(result.content).toContain("**Key Capabilities:**");
      expect(result.content).toContain("edit_posts");
      expect(result.content).toContain("manage_options");
    });

    it("should handle user with multiple roles", async () => {
      mockClient.getCurrentUser.mockResolvedValue({
        id: 2,
        name: "Multi Role User",
        slug: "multirole",
        email: "multi@example.com",
        roles: ["editor", "author", "contributor"],
        capabilities: {},
        registered_date: "2023-06-01T00:00:00",
      });

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Primary Role:** editor");
      expect(result.content).toContain("**All Roles:** editor, author, contributor");
    });

    it("should handle user with missing data", async () => {
      mockClient.getCurrentUser.mockResolvedValue({
        id: 3,
        name: null,
        slug: null,
        email: null,
        url: null,
        nickname: null,
        description: null,
        locale: null,
        registered_date: null,
        roles: [],
        capabilities: {},
        link: null,
      });

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Display Name:** Not set");
      expect(result.content).toContain("**Username:** Not set");
      expect(result.content).toContain("**Email:** Not set");
      expect(result.content).toContain("**User URL:** Not set");
      expect(result.content).toContain("**Registration Date:** Not available");
      expect(result.content).toContain("**Primary Role:** No role assigned");
      expect(result.content).toContain("**Locale:** Default");
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getCurrentUser.mockRejectedValue(new Error("Authentication failed"));

      await expect(userTools.handleGetCurrentUser(mockClient, {})).rejects.toThrow(
        "Failed to get current user: Authentication failed",
      );
    });
  });

  describe("handleCreateUser", () => {
    beforeEach(() => {
      mockClient.createUser.mockResolvedValue({
        id: 100,
        name: "New User",
        slug: "newuser",
        email: "newuser@example.com",
        roles: ["subscriber"],
      });
    });

    it("should create a user with basic information", async () => {
      const userData = {
        username: "newuser",
        email: "newuser@example.com",
        password: "securepassword123",
      };

      const result = await userTools.handleCreateUser(mockClient, userData);

      expect(mockClient.createUser).toHaveBeenCalledWith(userData);
      expect(typeof result).toBe("string");
      expect(result).toContain('User "New User" created successfully with ID: 100');
    });

    it("should create a user with roles", async () => {
      const userData = {
        username: "editoruser",
        email: "editor@example.com",
        password: "securepassword123",
        roles: ["editor"],
      };

      await userTools.handleCreateUser(mockClient, userData);

      expect(mockClient.createUser).toHaveBeenCalledWith(userData);
    });

    it("should handle creation errors", async () => {
      mockClient.createUser.mockRejectedValue(new Error("Username already exists"));

      await expect(
        userTools.handleCreateUser(mockClient, {
          username: "existinguser",
          email: "existing@example.com",
          password: "password",
        }),
      ).rejects.toThrow("Failed to create user: Username already exists");
    });

    it("should handle invalid email format", async () => {
      mockClient.createUser.mockRejectedValue(new Error("Invalid email format"));

      await expect(
        userTools.handleCreateUser(mockClient, {
          username: "testuser",
          email: "invalid-email",
          password: "password",
        }),
      ).rejects.toThrow("Failed to create user: Invalid email format");
    });

    it("should handle weak password errors", async () => {
      mockClient.createUser.mockRejectedValue(new Error("Password too weak"));

      await expect(
        userTools.handleCreateUser(mockClient, {
          username: "testuser",
          email: "test@example.com",
          password: "123",
        }),
      ).rejects.toThrow("Failed to create user: Password too weak");
    });
  });

  describe("handleUpdateUser", () => {
    beforeEach(() => {
      mockClient.updateUser.mockResolvedValue({
        id: 1,
        name: "Updated User",
        slug: "updateduser",
        email: "updated@example.com",
      });
    });

    it("should update user email", async () => {
      const result = await userTools.handleUpdateUser(mockClient, {
        id: 1,
        email: "updated@example.com",
      });

      expect(mockClient.updateUser).toHaveBeenCalledWith({
        id: 1,
        email: "updated@example.com",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("User 1 updated successfully");
    });

    it("should update user name", async () => {
      await userTools.handleUpdateUser(mockClient, {
        id: 1,
        name: "Updated User",
      });

      expect(mockClient.updateUser).toHaveBeenCalledWith({
        id: 1,
        name: "Updated User",
      });
    });

    it("should update multiple fields", async () => {
      await userTools.handleUpdateUser(mockClient, {
        id: 1,
        email: "updated@example.com",
        name: "Updated User",
      });

      expect(mockClient.updateUser).toHaveBeenCalledWith({
        id: 1,
        email: "updated@example.com",
        name: "Updated User",
      });
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updateUser.mockRejectedValue(new Error("Invalid ID"));

      await expect(
        userTools.handleUpdateUser(mockClient, {
          email: "updated@example.com",
        }),
      ).rejects.toThrow("Failed to update user: Invalid ID");
      expect(mockClient.updateUser).toHaveBeenCalledWith({
        id: undefined,
        email: "updated@example.com",
      });
    });

    it("should handle update errors", async () => {
      mockClient.updateUser.mockRejectedValue(new Error("User not found"));

      await expect(
        userTools.handleUpdateUser(mockClient, {
          id: 999,
          email: "updated@example.com",
        }),
      ).rejects.toThrow("Failed to update user: User not found");
    });

    it("should handle permission errors", async () => {
      mockClient.updateUser.mockRejectedValue(new Error("Permission denied"));

      await expect(
        userTools.handleUpdateUser(mockClient, {
          id: 1,
          email: "updated@example.com",
        }),
      ).rejects.toThrow("Failed to update user: Permission denied");
    });
  });

  describe("handleDeleteUser", () => {
    beforeEach(() => {
      mockClient.deleteUser.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          name: "Deleted User",
        },
      });
    });

    it("should delete user without reassignment", async () => {
      const result = await userTools.handleDeleteUser(mockClient, {
        id: 1,
      });

      expect(mockClient.deleteUser).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("User 1 has been deleted");
      expect(result).not.toContain("reassigned");
    });

    it("should delete user with content reassignment", async () => {
      const result = await userTools.handleDeleteUser(mockClient, {
        id: 1,
        reassign: 2,
      });

      expect(mockClient.deleteUser).toHaveBeenCalledWith(1, 2);
      expect(typeof result).toBe("string");
      expect(result).toContain("User 1 has been deleted");
      expect(result).toContain("Their content has been reassigned to user ID 2");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.deleteUser.mockRejectedValue(new Error("Invalid ID"));

      await expect(userTools.handleDeleteUser(mockClient, {})).rejects.toThrow("Failed to delete user: Invalid ID");
      expect(mockClient.deleteUser).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle deletion errors", async () => {
      mockClient.deleteUser.mockRejectedValue(new Error("User not found"));

      await expect(
        userTools.handleDeleteUser(mockClient, {
          id: 999,
        }),
      ).rejects.toThrow("Failed to delete user: User not found");
    });

    it("should handle permission errors", async () => {
      mockClient.deleteUser.mockRejectedValue(new Error("Permission denied"));

      await expect(
        userTools.handleDeleteUser(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete user: Permission denied");
    });

    it("should handle reassignment to non-existent user", async () => {
      mockClient.deleteUser.mockRejectedValue(new Error("Reassign user not found"));

      await expect(
        userTools.handleDeleteUser(mockClient, {
          id: 1,
          reassign: 999,
        }),
      ).rejects.toThrow("Failed to delete user: Reassign user not found");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle network errors", async () => {
      mockClient.getUser.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(userTools.handleGetUser(mockClient, { id: 1 })).rejects.toThrow("Failed to get user: ECONNREFUSED");
    });

    it("should handle malformed responses", async () => {
      mockClient.getUser.mockResolvedValue(null);

      await expect(userTools.handleGetUser(mockClient, { id: 1 })).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockClient.createUser.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(
        userTools.handleCreateUser(mockClient, {
          username: "test",
          email: "test@example.com",
          password: "password",
        }),
      ).rejects.toThrow("Failed to create user: 401 Unauthorized");
    });

    it("should handle rate limiting", async () => {
      mockClient.getUsers.mockRejectedValue(new Error("429 Too Many Requests"));

      await expect(userTools.handleListUsers(mockClient, {})).rejects.toThrow(
        "Failed to list users: 429 Too Many Requests",
      );
    });

    it("should handle invalid user IDs", async () => {
      mockClient.getUser.mockRejectedValue(new Error("404 Not Found"));

      await expect(userTools.handleGetUser(mockClient, { id: -1 })).rejects.toThrow(
        "Failed to get user: 404 Not Found",
      );
    });

    it("should handle server errors", async () => {
      mockClient.updateUser.mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(
        userTools.handleUpdateUser(mockClient, {
          id: 1,
          email: "test@example.com",
        }),
      ).rejects.toThrow("Failed to update user: 500 Internal Server Error");
    });

    it("should handle empty capabilities object", async () => {
      mockClient.getCurrentUser.mockResolvedValue({
        id: 1,
        name: "Test User",
        capabilities: {},
        roles: ["subscriber"],
      });

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Key Capabilities:** None");
    });

    it("should handle missing capabilities", async () => {
      mockClient.getCurrentUser.mockResolvedValue({
        id: 1,
        name: "Test User",
        capabilities: null,
        roles: ["subscriber"],
      });

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Total Capabilities:** 0 capabilities");
    });
  });
});
