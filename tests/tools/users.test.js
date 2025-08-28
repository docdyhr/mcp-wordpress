import { vi } from "vitest";
import { UserTools } from "@/tools/users.js";

describe("UserTools", () => {
  let userTools;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock WordPress client with all needed methods
    mockClient = {
      request: vi.fn(),
      getUsers: vi.fn(),
      getUser: vi.fn(),
      getCurrentUser: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      getSiteUrl: vi.fn().mockReturnValue("https://test-site.com"),
      config: {
        baseUrl: "https://test-site.com",
      },
    };

    userTools = new UserTools();
  });

  describe("getTools", () => {
    it("should return an array of user tools", () => {
      const tools = userTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(6);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_list_users");
      expect(toolNames).toContain("wp_get_user");
      expect(toolNames).toContain("wp_get_current_user");
      expect(toolNames).toContain("wp_create_user");
      expect(toolNames).toContain("wp_update_user");
      expect(toolNames).toContain("wp_delete_user");
    });

    it("should have proper tool definitions", () => {
      const tools = userTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should have correct parameter definitions for each tool", () => {
      const tools = userTools.getTools();
      const toolsByName = {};
      tools.forEach((tool) => {
        toolsByName[tool.name] = tool;
      });

      // wp_list_users should have optional search and roles parameters
      const listParams = toolsByName["wp_list_users"].parameters;
      expect(listParams.find((p) => p.name === "search")).toBeTruthy();
      expect(listParams.find((p) => p.name === "roles")).toBeTruthy();
      expect(listParams.find((p) => p.name === "roles").type).toBe("array");

      // wp_get_user should require id
      const getUserParams = toolsByName["wp_get_user"].parameters;
      const idParam = getUserParams.find((p) => p.name === "id");
      expect(idParam).toBeTruthy();
      expect(idParam.required).toBe(true);

      // wp_get_current_user should have no parameters
      const getCurrentUserParams = toolsByName["wp_get_current_user"].parameters;
      expect(getCurrentUserParams).toHaveLength(0);

      // wp_create_user should have required username, email, password
      const createParams = toolsByName["wp_create_user"].parameters;
      expect(createParams.find((p) => p.name === "username").required).toBe(true);
      expect(createParams.find((p) => p.name === "email").required).toBe(true);
      expect(createParams.find((p) => p.name === "password").required).toBe(true);
      expect(createParams.find((p) => p.name === "roles")).toBeTruthy();

      // wp_update_user should require id
      const updateParams = toolsByName["wp_update_user"].parameters;
      expect(updateParams.find((p) => p.name === "id").required).toBe(true);

      // wp_delete_user should require id
      const deleteParams = toolsByName["wp_delete_user"].parameters;
      expect(deleteParams.find((p) => p.name === "id").required).toBe(true);
      expect(deleteParams.find((p) => p.name === "reassign")).toBeTruthy();
    });
  });

  describe("handleListUsers", () => {
    it("should list users successfully", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "John Doe",
          slug: "johndoe",
          email: "john@example.com",
          roles: ["administrator"],
          registered_date: "2024-01-01T00:00:00",
          description: "Site administrator",
          url: "https://johndoe.com",
        },
        {
          id: 2,
          name: "Jane Smith",
          slug: "janesmith",
          email: "jane@example.com",
          roles: ["editor", "author"],
          registered_date: "2024-01-15T00:00:00",
          description: "Content editor",
          url: "",
        },
      ];

      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(mockClient.getUsers).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("👥 **Users Summary**: 2 total users");
      expect(result).toContain("John Doe");
      expect(result).toContain("Jane Smith");
      expect(result).toContain("administrator: 1, editor: 1, author: 1");
    });

    it("should handle empty results", async () => {
      mockClient.getUsers.mockResolvedValueOnce([]);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No users found matching the criteria");
    });

    it("should handle search parameters", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "John Administrator",
          slug: "john",
          email: "john@example.com",
          roles: ["administrator"],
          registered_date: "2024-01-01T00:00:00",
        },
      ];

      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {
        search: "John",
      });

      expect(mockClient.getUsers).toHaveBeenCalledWith({
        search: "John",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("John Administrator");
    });

    it("should handle roles parameter", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "Editor User",
          slug: "editor",
          email: "editor@example.com",
          roles: ["editor"],
          registered_date: "2024-01-01T00:00:00",
        },
      ];

      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {
        roles: ["editor"],
      });

      expect(mockClient.getUsers).toHaveBeenCalledWith({
        roles: ["editor"],
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Editor User");
    });

    it("should handle API errors", async () => {
      mockClient.getUsers.mockRejectedValueOnce(new Error("API Error"));

      await expect(userTools.handleListUsers(mockClient, {})).rejects.toThrow("Failed to list users");
    });

    it("should format users with missing optional fields", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "",
          slug: "testuser",
          email: "",
          roles: [],
          registered_date: null,
          description: "",
          url: "",
        },
      ];

      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(result).toContain("No display name");
      expect(result).toContain("No email");
      expect(result).toContain("No roles");
      expect(result).toContain("Unknown");
      expect(result).toContain("No description");
      expect(result).toContain("No URL");
    });

    it("should handle roles distribution correctly", async () => {
      const mockUsers = [
        { id: 1, roles: ["administrator"], slug: "admin1" },
        { id: 2, roles: ["administrator"], slug: "admin2" },
        { id: 3, roles: ["editor"], slug: "editor1" },
        { id: 4, roles: ["author"], slug: "author1" },
        { id: 5, roles: ["subscriber"], slug: "sub1" },
      ];

      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(result).toContain("administrator: 2");
      expect(result).toContain("editor: 1");
      expect(result).toContain("author: 1");
      expect(result).toContain("subscriber: 1");
    });

    it("should format registration dates correctly", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "Test User",
          slug: "testuser",
          registered_date: "2024-01-15T10:30:00",
          roles: ["subscriber"],
        },
      ];

      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(result).toMatch(/Jan 15, 2024/); // Should contain formatted date
    });
  });

  describe("handleGetUser", () => {
    it("should get a user successfully", async () => {
      const mockUser = {
        id: 1,
        name: "John Doe",
        slug: "johndoe",
        email: "john@example.com",
        roles: ["administrator", "editor"],
      };

      mockClient.getUser.mockResolvedValueOnce(mockUser);

      const result = await userTools.handleGetUser(mockClient, { id: 1 });

      expect(mockClient.getUser).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("User Details (ID: 1)");
      expect(result).toContain("John Doe");
      expect(result).toContain("johndoe");
      expect(result).toContain("john@example.com");
      expect(result).toContain("administrator, editor");
    });

    it("should handle user not found", async () => {
      mockClient.getUser.mockRejectedValueOnce(new Error("User not found"));

      await expect(userTools.handleGetUser(mockClient, { id: 999 })).rejects.toThrow("Failed to get user");
    });

    it("should handle invalid ID parameter", async () => {
      mockClient.getUser.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(userTools.handleGetUser(mockClient, { id: "invalid" })).rejects.toThrow("Failed to get user");
    });

    it("should handle user with missing roles", async () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        slug: "testuser",
        email: "test@example.com",
        roles: null,
      };

      mockClient.getUser.mockResolvedValueOnce(mockUser);

      const result = await userTools.handleGetUser(mockClient, { id: 1 });

      expect(result).toContain("N/A");
    });

    it("should handle user with empty roles array", async () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        slug: "testuser",
        email: "test@example.com",
        roles: [],
      };

      mockClient.getUser.mockResolvedValueOnce(mockUser);

      const result = await userTools.handleGetUser(mockClient, { id: 1 });

      expect(result).toContain("N/A");
    });
  });

  describe("handleGetCurrentUser", () => {
    it("should get current user successfully", async () => {
      const mockCurrentUser = {
        id: 1,
        name: "Current User",
        slug: "currentuser",
        email: "current@example.com",
        roles: ["administrator"],
        capabilities: {
          edit_posts: true,
          edit_pages: true,
          publish_posts: true,
          manage_options: true,
          upload_files: true,
          delete_posts: false,
        },
        registered_date: "2024-01-01T00:00:00",
        url: "https://currentuser.com",
        nickname: "Current",
        description: "Site administrator",
        locale: "en_US",
        link: "https://test-site.com/author/currentuser",
      };

      mockClient.getCurrentUser.mockResolvedValueOnce(mockCurrentUser);

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(mockClient.getCurrentUser).toHaveBeenCalledWith();
      expect(typeof result).toBe("object");
      expect(result.content).toContain("Current User Details for https://test-site.com");
      expect(result.content).toContain("Current User");
      expect(result.content).toContain("currentuser");
      expect(result.content).toContain("current@example.com");
      expect(result.content).toContain("administrator");
      expect(result.content).toContain("edit_posts, edit_pages, publish_posts, manage_options, upload_files");
      expect(result.content).toContain("January 1, 2024");
    });

    it("should handle current user with minimal data", async () => {
      const mockCurrentUser = {
        id: 1,
        name: "",
        slug: "",
        email: "",
        roles: [],
        capabilities: {},
        registered_date: null,
        url: "",
        nickname: "",
        description: "",
        locale: "",
        link: "",
      };

      mockClient.getCurrentUser.mockResolvedValueOnce(mockCurrentUser);

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("Not set");
      expect(result.content).toContain("No role assigned");
      expect(result.content).toContain("Not available");
      expect(result.content).toContain("No description provided");
      expect(result.content).toContain("None"); // Key capabilities
    });

    it("should handle API errors for current user", async () => {
      mockClient.getCurrentUser.mockRejectedValueOnce(new Error("Authentication failed"));

      await expect(userTools.handleGetCurrentUser(mockClient, {})).rejects.toThrow("Failed to get current user");
    });

    it("should format capabilities correctly", async () => {
      const mockCurrentUser = {
        id: 1,
        roles: ["editor"],
        capabilities: {
          edit_posts: true,
          edit_pages: true,
          publish_posts: true,
          delete_posts: false,
          manage_options: false,
          random_capability: true,
        },
      };

      mockClient.getCurrentUser.mockResolvedValueOnce(mockCurrentUser);

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("edit_posts, edit_pages, publish_posts");
      expect(result.content).not.toContain("delete_posts");
      expect(result.content).not.toContain("manage_options");
      expect(result.content).toContain("6 capabilities"); // Total count
    });

    it("should handle multiple roles", async () => {
      const mockCurrentUser = {
        id: 1,
        roles: ["administrator", "editor", "author"],
        capabilities: {},
      };

      mockClient.getCurrentUser.mockResolvedValueOnce(mockCurrentUser);

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("**Primary Role:** administrator");
      expect(result.content).toContain("**All Roles:** administrator, editor, author");
    });
  });

  describe("handleCreateUser", () => {
    it("should create a user successfully", async () => {
      const mockCreatedUser = {
        id: 123,
        name: "New User",
        username: "newuser",
        email: "new@example.com",
        roles: ["subscriber"],
      };

      mockClient.createUser.mockResolvedValueOnce(mockCreatedUser);

      const userData = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
        roles: ["subscriber"],
      };

      const result = await userTools.handleCreateUser(mockClient, userData);

      expect(mockClient.createUser).toHaveBeenCalledWith(userData);
      expect(typeof result).toBe("string");
      expect(result).toContain('✅ User "New User" created successfully with ID: 123');
    });

    it("should handle creation errors", async () => {
      mockClient.createUser.mockRejectedValueOnce(new Error("Username already exists"));

      await expect(
        userTools.handleCreateUser(mockClient, {
          username: "existing",
          email: "test@example.com",
          password: "password123",
        }),
      ).rejects.toThrow("Failed to create user");
    });

    it("should handle validation errors", async () => {
      mockClient.createUser.mockRejectedValueOnce(new Error("Email is required"));

      await expect(
        userTools.handleCreateUser(mockClient, {
          username: "testuser",
          password: "password123",
          // Missing email
        }),
      ).rejects.toThrow("Failed to create user");
    });

    it("should handle user creation with all parameters", async () => {
      const mockCreatedUser = {
        id: 124,
        name: "Complete User",
        username: "completeuser",
        email: "complete@example.com",
        roles: ["editor", "author"],
      };

      mockClient.createUser.mockResolvedValueOnce(mockCreatedUser);

      const completeUserData = {
        username: "completeuser",
        email: "complete@example.com",
        password: "securepassword123",
        roles: ["editor", "author"],
      };

      const result = await userTools.handleCreateUser(mockClient, completeUserData);

      expect(mockClient.createUser).toHaveBeenCalledWith(completeUserData);
      expect(result).toContain("Complete User");
      expect(result).toContain("ID: 124");
    });
  });

  describe("handleUpdateUser", () => {
    it("should update a user successfully", async () => {
      const mockUpdatedUser = {
        id: 1,
        name: "Updated User",
        email: "updated@example.com",
      };

      mockClient.updateUser.mockResolvedValueOnce(mockUpdatedUser);

      const updateData = {
        id: 1,
        name: "Updated User",
        email: "updated@example.com",
      };

      const result = await userTools.handleUpdateUser(mockClient, updateData);

      expect(mockClient.updateUser).toHaveBeenCalledWith(updateData);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ User 1 updated successfully");
    });

    it("should handle update errors", async () => {
      mockClient.updateUser.mockRejectedValueOnce(new Error("Update failed"));

      await expect(
        userTools.handleUpdateUser(mockClient, {
          id: 1,
          name: "Updated User",
        }),
      ).rejects.toThrow("Failed to update user");
    });

    it("should handle missing ID", async () => {
      mockClient.updateUser.mockRejectedValueOnce(new Error("ID is required"));

      await expect(
        userTools.handleUpdateUser(mockClient, {
          name: "Updated User",
          // Missing id
        }),
      ).rejects.toThrow("Failed to update user");
    });

    it("should handle partial updates", async () => {
      const mockUpdatedUser = {
        id: 2,
        name: "Partially Updated",
      };

      mockClient.updateUser.mockResolvedValueOnce(mockUpdatedUser);

      const result = await userTools.handleUpdateUser(mockClient, {
        id: 2,
        name: "Partially Updated",
      });

      expect(mockClient.updateUser).toHaveBeenCalledWith({
        id: 2,
        name: "Partially Updated",
      });
      expect(result).toContain("✅ User 2 updated successfully");
    });

    it("should handle email updates", async () => {
      const mockUpdatedUser = { id: 3 };
      mockClient.updateUser.mockResolvedValueOnce(mockUpdatedUser);

      const result = await userTools.handleUpdateUser(mockClient, {
        id: 3,
        email: "newemail@example.com",
      });

      expect(mockClient.updateUser).toHaveBeenCalledWith({
        id: 3,
        email: "newemail@example.com",
      });
      expect(result).toContain("✅ User 3 updated successfully");
    });
  });

  describe("handleDeleteUser", () => {
    it("should delete a user successfully", async () => {
      mockClient.deleteUser.mockResolvedValueOnce({ deleted: true });

      const result = await userTools.handleDeleteUser(mockClient, { id: 1 });

      expect(mockClient.deleteUser).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ User 1 has been deleted");
    });

    it("should handle deletion with reassignment", async () => {
      mockClient.deleteUser.mockResolvedValueOnce({ deleted: true });

      const result = await userTools.handleDeleteUser(mockClient, {
        id: 1,
        reassign: 2,
      });

      expect(mockClient.deleteUser).toHaveBeenCalledWith(1, 2);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ User 1 has been deleted");
      expect(result).toContain("Their content has been reassigned to user ID 2");
    });

    it("should handle deletion errors", async () => {
      mockClient.deleteUser.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(userTools.handleDeleteUser(mockClient, { id: 1 })).rejects.toThrow("Failed to delete user");
    });

    it("should handle invalid ID", async () => {
      mockClient.deleteUser.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(userTools.handleDeleteUser(mockClient, { id: "invalid" })).rejects.toThrow("Failed to delete user");
    });

    it("should handle reassignment parameter correctly", async () => {
      mockClient.deleteUser.mockResolvedValue({ deleted: true });

      // Test with reassign: undefined
      await userTools.handleDeleteUser(mockClient, { id: 1 });
      expect(mockClient.deleteUser).toHaveBeenCalledWith(1, undefined);

      // Test with specific reassign value
      await userTools.handleDeleteUser(mockClient, { id: 2, reassign: 5 });
      expect(mockClient.deleteUser).toHaveBeenCalledWith(2, 5);
    });

    it("should handle reassignment without explicit message", async () => {
      mockClient.deleteUser.mockResolvedValueOnce({ deleted: true });

      const result = await userTools.handleDeleteUser(mockClient, { id: 3 });

      expect(result).toContain("✅ User 3 has been deleted");
      expect(result).not.toContain("reassigned");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null/undefined parameters gracefully", async () => {
      await expect(userTools.handleListUsers(mockClient, null)).rejects.toThrow("Failed to list users");
    });

    it("should handle client without getSiteUrl method", async () => {
      const clientWithoutGetSiteUrl = { ...mockClient };
      delete clientWithoutGetSiteUrl.getSiteUrl;

      mockClient.getUsers.mockResolvedValueOnce([
        {
          id: 1,
          name: "Test",
          slug: "test",
          roles: ["subscriber"],
        },
      ]);

      const result = await userTools.handleListUsers(clientWithoutGetSiteUrl, {});
      expect(typeof result).toBe("string");
      expect(result).toContain("Unknown site");
    });

    it("should handle very large result sets", async () => {
      const largeMockUsers = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        slug: `user${i + 1}`,
        email: `user${i + 1}@example.com`,
        roles: ["subscriber"],
      }));

      mockClient.getUsers.mockResolvedValueOnce(largeMockUsers);

      const result = await userTools.handleListUsers(mockClient, {});

      // Large result sets use streaming, so expect streaming format
      expect(typeof result).toBe("string");
      expect(result).toContain("50 items displayed");
    });

    it("should handle network timeouts gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";

      mockClient.getUsers.mockRejectedValueOnce(timeoutError);

      await expect(userTools.handleListUsers(mockClient, {})).rejects.toThrow("Failed to list users");
    });

    it("should handle concurrent requests properly", async () => {
      const mockUser = {
        id: 1,
        name: "Test",
        slug: "test",
        email: "test@example.com",
        roles: ["subscriber"],
      };
      mockClient.getUser.mockResolvedValue(mockUser);

      const promises = [
        userTools.handleGetUser(mockClient, { id: 1 }),
        userTools.handleGetUser(mockClient, { id: 2 }),
        userTools.handleGetUser(mockClient, { id: 3 }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockClient.getUser).toHaveBeenCalledTimes(3);
    });

    it("should handle users with special characters in names", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "Special & Characters @ User",
          slug: "special-user",
          email: "special@example.com",
          roles: ["subscriber"],
        },
      ];

      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(result).toContain("Special & Characters @ User");
    });

    it("should handle mixed parameter types", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "Mixed Test",
          slug: "mixed",
          roles: ["editor"],
        },
      ];
      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {
        search: "test query",
        roles: ["editor", "author"],
      });

      expect(mockClient.getUsers).toHaveBeenCalledWith({
        search: "test query",
        roles: ["editor", "author"],
      });
      expect(result).toContain("Mixed Test");
    });
  });

  describe("Performance and Validation", () => {
    it("should validate role parameters", async () => {
      const validRoles = ["administrator", "editor", "author", "contributor", "subscriber"];

      for (const role of validRoles) {
        mockClient.getUsers.mockResolvedValueOnce([]);
        const result = await userTools.handleListUsers(mockClient, { roles: [role] });
        expect(typeof result).toBe("string");
        expect(mockClient.getUsers).toHaveBeenCalledWith({ roles: [role] });
      }
    });

    it("should maintain consistent response format", async () => {
      const mockUsers = [
        {
          id: 1,
          name: "Format Test",
          slug: "format",
          email: "format@example.com",
          roles: ["subscriber"],
        },
      ];
      mockClient.getUsers.mockResolvedValueOnce(mockUsers);

      const result = await userTools.handleListUsers(mockClient, {});

      expect(result).toMatch(/👥 \*\*Users Summary\*\*: \d+ total users/);
      expect(result).toContain("**ID 1**:");
      expect(result).toContain("Format Test");
      expect(result).toContain("📧 Email:");
      expect(result).toContain("🎭 Roles:");
      expect(result).toContain("📅 Registered:");
    });

    it("should handle search parameter edge cases", async () => {
      mockClient.getUsers.mockResolvedValue([]);

      // Empty search
      await userTools.handleListUsers(mockClient, { search: "" });
      expect(mockClient.getUsers).toHaveBeenCalledWith({ search: "" });

      // Very long search
      const longSearch = "a".repeat(100);
      await userTools.handleListUsers(mockClient, { search: longSearch });
      expect(mockClient.getUsers).toHaveBeenCalledWith({ search: longSearch });
    });

    it("should handle comprehensive user metadata", async () => {
      const comprehensiveUser = {
        id: 1,
        name: "Comprehensive User",
        slug: "comprehensive",
        email: "comp@example.com",
        roles: ["administrator"],
        registered_date: "2024-01-01T10:30:00",
        description: "A very detailed user description",
        url: "https://comprehensive-user.com",
        capabilities: {
          edit_posts: true,
          manage_options: true,
          upload_files: true,
        },
        nickname: "Comp",
        locale: "en_US",
        link: "https://site.com/author/comprehensive",
      };

      mockClient.getCurrentUser.mockResolvedValueOnce(comprehensiveUser);

      const result = await userTools.handleGetCurrentUser(mockClient, {});

      expect(result.content).toContain("Comprehensive User");
      expect(result.content).toContain("comprehensive");
      expect(result.content).toContain("comp@example.com");
      expect(result.content).toContain("A very detailed user description");
      expect(result.content).toContain("https://comprehensive-user.com");
      expect(result.content).toContain("Comp");
      expect(result.content).toContain("en_US");
    });
  });
});
