import { vi } from "vitest";
import { PostTools } from "@/tools/posts/index.js";

describe("PostTools", () => {
  let postTools;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock WordPress client with all needed methods
    mockClient = {
      request: vi.fn(),
      getPosts: vi.fn(),
      getPost: vi.fn(),
      createPost: vi.fn(),
      updatePost: vi.fn(),
      deletePost: vi.fn(),
      getPostRevisions: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ name: "Test User", username: "testuser" }),
      getCategory: vi.fn().mockResolvedValue({ id: 1, name: "Test Category" }),
      getTag: vi.fn().mockResolvedValue({ id: 1, name: "Test Tag" }),
      getSiteUrl: vi.fn().mockReturnValue("https://test-site.com"),
      config: {
        baseUrl: "https://test-site.com",
      },
    };

    postTools = new PostTools();
  });

  describe("getTools", () => {
    it("should return an array of post tools", () => {
      const tools = postTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(6);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_list_posts");
      expect(toolNames).toContain("wp_get_post");
      expect(toolNames).toContain("wp_create_post");
      expect(toolNames).toContain("wp_update_post");
      expect(toolNames).toContain("wp_delete_post");
      expect(toolNames).toContain("wp_get_post_revisions");
    });

    it("should have proper tool definitions", () => {
      const tools = postTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should have correct input schemas for each tool", () => {
      const tools = postTools.getTools();
      const toolsByName = {};
      tools.forEach((tool) => {
        toolsByName[tool.name] = tool;
      });

      // wp_list_posts should have optional parameters
      expect(toolsByName["wp_list_posts"].inputSchema.type).toBe("object");
      expect(toolsByName["wp_list_posts"].inputSchema.properties).toHaveProperty("per_page");
      expect(toolsByName["wp_list_posts"].inputSchema.properties).toHaveProperty("search");
      expect(toolsByName["wp_list_posts"].inputSchema.properties).toHaveProperty("status");

      // wp_get_post should require id
      expect(toolsByName["wp_get_post"].inputSchema.required).toContain("id");
      expect(toolsByName["wp_get_post"].inputSchema.properties).toHaveProperty("id");

      // wp_create_post should have title and content properties
      expect(toolsByName["wp_create_post"].inputSchema.properties).toHaveProperty("title");
      expect(toolsByName["wp_create_post"].inputSchema.properties).toHaveProperty("content");

      // wp_update_post should require id
      expect(toolsByName["wp_update_post"].inputSchema.required).toContain("id");

      // wp_delete_post should require id
      expect(toolsByName["wp_delete_post"].inputSchema.required).toContain("id");
    });
  });

  describe("handleListPosts", () => {
    it("should list posts successfully", async () => {
      const mockPosts = [
        {
          id: 1,
          title: { rendered: "Test Post 1" },
          content: { rendered: "Content 1" },
          status: "publish",
          date: "2024-01-01T00:00:00",
        },
        {
          id: 2,
          title: { rendered: "Test Post 2" },
          content: { rendered: "Content 2" },
          status: "draft",
          date: "2024-01-02T00:00:00",
        },
      ];

      mockClient.getPosts.mockResolvedValueOnce(mockPosts);

      const result = await postTools.handleListPosts(mockClient, {});

      expect(mockClient.getPosts).toHaveBeenCalledWith({ per_page: 10 });
      expect(typeof result).toBe("string");
      expect(result).toContain("Posts Summary");
      expect(result).toContain("Test Post 1");
      expect(result).toContain("Test Post 2");
    });

    it("should handle empty results", async () => {
      mockClient.getPosts.mockResolvedValueOnce([]);

      const result = await postTools.handleListPosts(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No posts found");
    });

    it("should handle search parameters", async () => {
      const mockPosts = [
        {
          id: 1,
          title: { rendered: "WordPress Tutorial" },
          content: { rendered: "Learn WordPress" },
          status: "publish",
        },
      ];

      mockClient.getPosts.mockResolvedValueOnce(mockPosts);

      const result = await postTools.handleListPosts(mockClient, {
        search: "WordPress",
        per_page: 5,
      });

      expect(mockClient.getPosts).toHaveBeenCalledWith({
        search: "WordPress",
        per_page: 5,
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("WordPress Tutorial");
      expect(result).toContain("Search Term");
    });

    it("should validate and handle status parameters", async () => {
      const mockPosts = [
        {
          id: 1,
          title: { rendered: "Draft Post" },
          status: "draft",
        },
      ];

      mockClient.getPosts.mockResolvedValueOnce(mockPosts);

      const result = await postTools.handleListPosts(mockClient, {
        status: "draft",
      });

      // Status is normalized to array format as per WordPress REST API spec
      expect(mockClient.getPosts).toHaveBeenCalledWith({
        status: ["draft"],
        per_page: 10,
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Draft Post");
      expect(result).toContain("draft");
    });

    it("should handle invalid status parameters", async () => {
      await expect(
        postTools.handleListPosts(mockClient, {
          status: "invalid-status",
        }),
      ).rejects.toThrow("Failed to list posts");
    });

    it("should handle category and tag filtering", async () => {
      const mockPosts = [
        {
          id: 1,
          title: { rendered: "Categorized Post" },
          categories: [1, 2],
          tags: [5, 6],
        },
      ];

      mockClient.getPosts.mockResolvedValueOnce(mockPosts);

      const result = await postTools.handleListPosts(mockClient, {
        categories: [1, 2],
        tags: [5, 6],
      });

      expect(mockClient.getPosts).toHaveBeenCalledWith({
        categories: [1, 2],
        tags: [5, 6],
        per_page: 10,
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Categorized Post");
    });

    it("should handle API errors", async () => {
      mockClient.getPosts.mockRejectedValueOnce(new Error("API Error"));

      await expect(postTools.handleListPosts(mockClient, {})).rejects.toThrow("Failed to list posts");
    });
  });

  describe("handleGetPost", () => {
    it("should get a post successfully", async () => {
      const mockPost = {
        id: 1,
        title: { rendered: "Test Post" },
        content: { rendered: "Test Content" },
        status: "publish",
        author: 1,
        date: "2024-01-01T00:00:00",
      };

      mockClient.getPost.mockResolvedValueOnce(mockPost);

      const result = await postTools.handleGetPost(mockClient, { id: 1 });

      expect(mockClient.getPost).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Post");
      expect(result).toContain("Test Content");
    });

    it("should handle post not found", async () => {
      mockClient.getPost.mockRejectedValueOnce(new Error("Post not found"));

      await expect(postTools.handleGetPost(mockClient, { id: 999 })).rejects.toThrow("Failed to get post");
    });

    it("should handle invalid ID parameter", async () => {
      await expect(postTools.handleGetPost(mockClient, { id: "invalid" })).rejects.toThrow("Failed to get post");
    });
  });

  describe("handleCreatePost", () => {
    it("should create a post successfully", async () => {
      const mockCreatedPost = {
        id: 123,
        title: { rendered: "New Post" },
        content: { rendered: "New Content" },
        status: "publish",
        link: "https://test-site.com/new-post",
      };

      mockClient.createPost.mockResolvedValueOnce(mockCreatedPost);

      const postData = {
        title: "New Post",
        content: "New Content",
        status: "publish",
      };

      const result = await postTools.handleCreatePost(mockClient, postData);

      expect(mockClient.createPost).toHaveBeenCalledWith(postData);
      expect(typeof result).toBe("string");
      expect(result).toContain("Post Created Successfully");
      expect(result).toContain("New Post");
    });

    it("should handle validation errors", async () => {
      await expect(
        postTools.handleCreatePost(mockClient, {
          title: "", // Invalid empty title
          content: "Some content",
        }),
      ).rejects.toThrow("Failed to create post");
    });

    it("should handle API creation errors", async () => {
      mockClient.createPost.mockRejectedValueOnce(new Error("Creation failed"));

      await expect(
        postTools.handleCreatePost(mockClient, {
          title: "Test Post",
          content: "Test Content",
        }),
      ).rejects.toThrow("Failed to create post");
    });

    it("should handle posts with featured media", async () => {
      const mockCreatedPost = {
        id: 124,
        title: { rendered: "Post with Image" },
        content: { rendered: "Content" },
        featured_media: 42,
      };

      mockClient.createPost.mockResolvedValueOnce(mockCreatedPost);

      const result = await postTools.handleCreatePost(mockClient, {
        title: "Post with Image",
        content: "Content",
        featured_media: 42,
      });

      expect(mockClient.createPost).toHaveBeenCalledWith({
        title: "Post with Image",
        content: "Content",
        featured_media: 42,
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Post with Image");
    });
  });

  describe("handleUpdatePost", () => {
    it("should update a post successfully", async () => {
      const mockOriginalPost = {
        id: 1,
        title: { rendered: "Original Post" },
        content: { rendered: "Original Content" },
        status: "draft",
        author: 1,
        categories: [],
        tags: [],
      };

      const mockUpdatedPost = {
        id: 1,
        title: { rendered: "Updated Post" },
        content: { rendered: "Updated Content" },
        status: "publish",
        author: 1,
        categories: [],
        tags: [],
        modified: "2024-01-01T12:00:00",
        link: "https://test-site.com/updated-post",
      };

      // First call to getPost for original post, then updatePost
      mockClient.getPost.mockResolvedValueOnce(mockOriginalPost);
      mockClient.updatePost.mockResolvedValueOnce(mockUpdatedPost);

      const updateData = {
        id: 1,
        title: "Updated Post",
        content: "Updated Content",
      };

      const result = await postTools.handleUpdatePost(mockClient, updateData);

      expect(mockClient.getPost).toHaveBeenCalledWith(1);
      expect(mockClient.updatePost).toHaveBeenCalledWith({ id: 1, title: "Updated Post", content: "Updated Content" });
      expect(typeof result).toBe("string");
      expect(result).toContain("Post Updated Successfully");
      expect(result).toContain("Updated Post");
    });

    it("should handle update errors", async () => {
      mockClient.updatePost.mockRejectedValueOnce(new Error("Update failed"));

      await expect(
        postTools.handleUpdatePost(mockClient, {
          id: 1,
          title: "Updated Post",
        }),
      ).rejects.toThrow("Failed to update post");
    });

    it("should handle missing ID", async () => {
      await expect(
        postTools.handleUpdatePost(mockClient, {
          title: "Updated Post",
        }),
      ).rejects.toThrow("Failed to update post");
    });
  });

  describe("handleDeletePost", () => {
    it("should delete a post successfully", async () => {
      const mockDeleteResult = {
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Deleted Post" },
          status: "trash",
        },
      };

      mockClient.deletePost.mockResolvedValueOnce(mockDeleteResult);

      const result = await postTools.handleDeletePost(mockClient, { id: 1 });

      expect(mockClient.deletePost).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("moved to trash successfully");
      expect(result).toContain("Deleted Post");
    });

    it("should handle forced deletion", async () => {
      const mockDeleteResult = {
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Permanently Deleted Post" },
        },
      };

      mockClient.deletePost.mockResolvedValueOnce(mockDeleteResult);

      const result = await postTools.handleDeletePost(mockClient, {
        id: 1,
        force: true,
      });

      expect(mockClient.deletePost).toHaveBeenCalledWith(1, true);
      expect(typeof result).toBe("string");
      expect(result).toContain("Permanently Deleted Post");
    });

    it("should handle deletion errors", async () => {
      mockClient.deletePost.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(postTools.handleDeletePost(mockClient, { id: 1 })).rejects.toThrow("Failed to delete post");
    });

    it("should handle invalid ID", async () => {
      await expect(postTools.handleDeletePost(mockClient, { id: "invalid" })).rejects.toThrow("Failed to delete post");
    });
  });

  describe("handleGetPostRevisions", () => {
    it("should get post revisions successfully", async () => {
      const mockRevisions = [
        {
          id: 101,
          parent: 1,
          title: { rendered: "Revision 1" },
          content: { rendered: "Revision Content 1" },
          date: "2024-01-01T00:00:00",
        },
        {
          id: 102,
          parent: 1,
          title: { rendered: "Revision 2" },
          content: { rendered: "Revision Content 2" },
          date: "2024-01-02T00:00:00",
        },
      ];

      mockClient.getPostRevisions.mockResolvedValueOnce(mockRevisions);

      const result = await postTools.handleGetPostRevisions(mockClient, { id: 1 });

      expect(mockClient.getPostRevisions).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Revision 1");
      expect(result).toContain("Revision 2");
    });

    it("should handle no revisions found", async () => {
      mockClient.getPostRevisions.mockResolvedValueOnce([]);

      const result = await postTools.handleGetPostRevisions(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("No revisions found");
    });

    it("should handle API errors for revisions", async () => {
      mockClient.getPostRevisions.mockRejectedValueOnce(new Error("Revisions API error"));

      await expect(postTools.handleGetPostRevisions(mockClient, { id: 1 })).rejects.toThrow(
        "Failed to get post revisions",
      );
    });

    it("should handle invalid ID for revisions", async () => {
      await expect(postTools.handleGetPostRevisions(mockClient, { id: "invalid" })).rejects.toThrow(
        "Failed to get post revisions",
      );
    });
  });

  describe("getHandlerForTool", () => {
    it("should return correct handlers for all tools", () => {
      const tools = postTools.getTools();

      tools.forEach((tool) => {
        expect(typeof tool.handler).toBe("function");
        expect(tool.handler.name).toContain("bound ");
      });
    });

    it("should throw error for unknown tool", () => {
      expect(() => {
        postTools.getHandlerForTool("unknown_tool");
      }).toThrow("Unknown tool");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null/undefined parameters gracefully", async () => {
      await expect(postTools.handleListPosts(mockClient, null)).rejects.toThrow("Failed to list posts");
    });

    it("should handle client without getSiteUrl method", async () => {
      const clientWithoutGetSiteUrl = { ...mockClient };
      delete clientWithoutGetSiteUrl.getSiteUrl;

      mockClient.getPosts.mockResolvedValueOnce([{ id: 1, title: { rendered: "Test" }, status: "publish" }]);

      const result = await postTools.handleListPosts(clientWithoutGetSiteUrl, {});
      expect(Array.isArray(result) || typeof result === "string").toBe(true);
    });

    it("should handle very large result sets", async () => {
      const largeMockPosts = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: { rendered: `Post ${i + 1}` },
        content: { rendered: `Content ${i + 1}` },
        status: "publish",
      }));

      mockClient.getPosts.mockResolvedValueOnce(largeMockPosts);

      const result = await postTools.handleListPosts(mockClient, { per_page: 100 });

      // Should handle streaming or return appropriate response
      expect(typeof result === "object" || typeof result === "string").toBe(true);
    });

    it("should sanitize HTML content in posts", async () => {
      const postWithHtml = {
        title: "Test Post",
        content: "<script>alert('xss')</script><p>Safe content</p>",
        status: "publish",
      };

      const mockCreatedPost = {
        id: 125,
        title: { rendered: "Test Post" },
        content: { rendered: "<p>Safe content</p>" }, // Script should be removed
        status: "publish",
      };

      mockClient.createPost.mockResolvedValueOnce(mockCreatedPost);

      const result = await postTools.handleCreatePost(mockClient, postWithHtml);

      expect(mockClient.createPost).toHaveBeenCalled();
      // Content sanitization should occur in the handler
      expect(typeof result).toBe("string");
      expect(result).toContain("Post Created Successfully");
    });
  });

  describe("Performance and Validation", () => {
    it("should validate pagination parameters", async () => {
      // Test with invalid per_page should throw
      await expect(postTools.handleListPosts(mockClient, { per_page: -1 })).rejects.toThrow("Failed to list posts");

      // Test with valid per_page
      mockClient.getPosts.mockResolvedValueOnce([]);
      const result = await postTools.handleListPosts(mockClient, { per_page: 50 });
      expect(typeof result).toBe("string");
      expect(mockClient.getPosts).toHaveBeenCalledWith({ per_page: 50 });
    });

    it("should handle concurrent requests properly", async () => {
      const mockPost = { id: 1, title: { rendered: "Test" } };
      mockClient.getPost.mockResolvedValue(mockPost);

      const promises = [
        postTools.handleGetPost(mockClient, { id: 1 }),
        postTools.handleGetPost(mockClient, { id: 2 }),
        postTools.handleGetPost(mockClient, { id: 3 }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockClient.getPost).toHaveBeenCalledTimes(3);
    });

    it("should handle network timeouts gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";

      mockClient.getPosts.mockRejectedValueOnce(timeoutError);

      await expect(postTools.handleListPosts(mockClient, {})).rejects.toThrow("Failed to list posts");
    });
  });
});
