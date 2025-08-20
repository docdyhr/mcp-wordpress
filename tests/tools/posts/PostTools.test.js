/**
 * Comprehensive tests for PostTools class
 * Achieving ≥70% coverage for posts tool implementation
 */

import { vi } from "vitest";
import { PostTools } from "../../../dist/tools/posts/index.js";
import { WordPressClient } from "../../../dist/client/api.js"; // eslint-disable-line no-unused-vars

// Mock dependencies
vi.mock("../../../dist/client/api.js");
vi.mock("../../../dist/utils/streaming.js", () => ({
  WordPressDataStreamer: {
    streamPosts: vi.fn().mockImplementation(async function* (posts) {
      for (const post of posts) {
        yield { type: "post", data: post };
      }
    }),
  },
  StreamingUtils: {
    formatStreamingResponse: vi.fn().mockReturnValue("Streamed response"),
  },
}));

describe("PostTools", () => {
  let postTools;
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
      getPosts: vi.fn(),
      getPost: vi.fn(),
      createPost: vi.fn(),
      updatePost: vi.fn(),
      deletePost: vi.fn(),
      getPostRevisions: vi.fn(),
      getUser: vi.fn(),
      getCategory: vi.fn(),
      getTag: vi.fn(),
    };

    // Create PostTools instance
    postTools = new PostTools();
  });

  describe("getTools", () => {
    it("should return all post tool definitions", () => {
      const tools = postTools.getTools();

      expect(tools).toHaveLength(6);
      expect(tools.map((t) => t.name)).toEqual([
        "wp_list_posts",
        "wp_get_post",
        "wp_create_post",
        "wp_update_post",
        "wp_delete_post",
        "wp_get_post_revisions",
      ]);
    });

    it("should include handlers for each tool", () => {
      const tools = postTools.getTools();

      tools.forEach((tool) => {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include proper tool metadata", () => {
      const tools = postTools.getTools();
      const listPostsTool = tools.find((t) => t.name === "wp_list_posts");

      expect(listPostsTool.description).toContain("Lists posts from a WordPress site");
      expect(listPostsTool.inputSchema).toBeDefined();
      expect(listPostsTool.inputSchema.type).toBe("object");
      expect(listPostsTool.inputSchema.properties).toBeDefined();
    });
  });

  describe("handleListPosts", () => {
    beforeEach(() => {
      mockClient.getPosts.mockResolvedValue([
        {
          id: 1,
          title: { rendered: "Test Post 1" },
          content: { rendered: "<p>Content 1</p>" },
          excerpt: { rendered: "Excerpt 1" },
          date: "2024-01-01T00:00:00",
          modified: "2024-01-02T00:00:00",
          status: "publish",
          link: "https://test.wordpress.com/test-post-1",
          author: 1,
          featured_media: 10,
          categories: [1, 2],
          tags: [3, 4],
          _links: {
            self: [{ href: "https://test.wordpress.com/wp-json/wp/v2/posts/1" }],
            edit: [{ href: "https://test.wordpress.com/wp-admin/post.php?post=1&action=edit" }],
          },
        },
        {
          id: 2,
          title: { rendered: "Test Post 2" },
          content: { rendered: "<p>Content 2</p>" },
          excerpt: { rendered: "Excerpt 2" },
          date: "2024-01-03T00:00:00",
          modified: "2024-01-04T00:00:00",
          status: "draft",
          link: "https://test.wordpress.com/?p=2",
          author: 1,
          featured_media: 0,
          categories: [1],
          tags: [],
          _links: {
            self: [{ href: "https://test.wordpress.com/wp-json/wp/v2/posts/2" }],
            edit: [{ href: "https://test.wordpress.com/wp-admin/post.php?post=2&action=edit" }],
          },
        },
      ]);

      // Mock additional data fetching
      mockClient.getUser.mockResolvedValue({ name: "Test User" });
      mockClient.getCategory.mockResolvedValue({ name: "Test Category" });
      mockClient.getTag.mockResolvedValue({ name: "Test Tag" });
    });

    it("should list posts with default parameters", async () => {
      const result = await postTools.handleListPosts(mockClient, {});

      expect(mockClient.getPosts).toHaveBeenCalledWith({ per_page: 10 });
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Post 1");
      expect(result).toContain("Test Post 2");
    });

    it("should handle search parameter", async () => {
      const result = await postTools.handleListPosts(mockClient, { search: "WordPress" });

      expect(mockClient.getPosts).toHaveBeenCalledWith(expect.objectContaining({ search: "WordPress", per_page: 10 }));
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Post 1");
    });

    it("should handle status filter", async () => {
      await postTools.handleListPosts(mockClient, { status: "draft" });

      expect(mockClient.getPosts).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", per_page: 10 }));
    });

    it("should handle categories filter", async () => {
      await postTools.handleListPosts(mockClient, { categories: [1, 2] });

      expect(mockClient.getPosts).toHaveBeenCalledWith(expect.objectContaining({ categories: [1, 2], per_page: 10 }));
    });

    it("should handle tags filter", async () => {
      await postTools.handleListPosts(mockClient, { tags: [3, 4] });

      expect(mockClient.getPosts).toHaveBeenCalledWith(expect.objectContaining({ tags: [3, 4], per_page: 10 }));
    });

    it("should handle pagination parameters", async () => {
      await postTools.handleListPosts(mockClient, { per_page: 20, page: 2 });

      expect(mockClient.getPosts).toHaveBeenCalledWith(
        expect.objectContaining({
          per_page: 20,
          page: 2,
        }),
      );
    });

    it("should handle empty results", async () => {
      mockClient.getPosts.mockResolvedValue([]);

      const result = await postTools.handleListPosts(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No posts found");
    });

    it("should format post metadata correctly", async () => {
      // Mock additional data fetching
      mockClient.getUser.mockResolvedValue({ name: "Test User" });
      mockClient.getCategory.mockResolvedValue({ name: "Test Category" });
      mockClient.getTag.mockResolvedValue({ name: "Test Tag" });

      const result = await postTools.handleListPosts(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Test Post 1");
      expect(result).toContain("publish");
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getPosts.mockRejectedValue(new Error("API Error"));

      await expect(postTools.handleListPosts(mockClient, {})).rejects.toThrow("Failed to list posts: API Error");
    });
  });

  describe("handleGetPost", () => {
    beforeEach(() => {
      mockClient.getPost.mockResolvedValue({
        id: 1,
        title: { rendered: "Test Post" },
        content: { rendered: "<p>Full post content here</p>" },
        excerpt: { rendered: "Post excerpt" },
        date: "2024-01-01T00:00:00",
        modified: "2024-01-02T00:00:00",
        status: "publish",
        link: "https://test.wordpress.com/test-post",
        author: 1,
        featured_media: 10,
        categories: [1, 2],
        tags: [3, 4],
        format: "standard",
        meta: { custom_field: "value" },
        _links: {
          self: [{ href: "https://test.wordpress.com/wp-json/wp/v2/posts/1" }],
          edit: [{ href: "https://test.wordpress.com/wp-admin/post.php?post=1&action=edit" }],
        },
      });

      // Mock additional data fetching
      mockClient.getUser.mockResolvedValue({ name: "Test User", username: "testuser" });
      mockClient.getCategory.mockResolvedValue({ name: "Test Category" });
      mockClient.getTag.mockResolvedValue({ name: "Test Tag" });
    });

    it("should get a post by ID", async () => {
      const result = await postTools.handleGetPost(mockClient, { id: 1 });

      expect(mockClient.getPost).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Post");
      expect(result).toContain("Full post content here");
    });

    it("should handle missing ID parameter", async () => {
      await expect(postTools.handleGetPost(mockClient, {})).rejects.toThrow();
    });

    it("should handle non-existent post", async () => {
      mockClient.getPost.mockRejectedValue(new Error("404 Post not found"));

      const result = await postTools.handleGetPost(mockClient, { id: 999 });
      expect(typeof result).toBe("string");
      expect(result).toContain("Post with ID 999 not found");
    });

    it("should format post details correctly", async () => {
      const result = await postTools.handleGetPost(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Status**: publish");
      expect(result).toContain("Test User");
      expect(result).toContain("Test Category");
      expect(result).toContain("Test Tag");
    });
  });

  describe("handleCreatePost", () => {
    beforeEach(() => {
      mockClient.createPost.mockResolvedValue({
        id: 100,
        title: { rendered: "New Post" },
        content: { rendered: "<p>New content</p>" },
        status: "publish",
        link: "https://test.wordpress.com/new-post",
        _links: {
          self: [{ href: "https://test.wordpress.com/wp-json/wp/v2/posts/100" }],
          edit: [{ href: "https://test.wordpress.com/wp-admin/post.php?post=100&action=edit" }],
        },
      });
    });

    it("should create a post with title only", async () => {
      const result = await postTools.handleCreatePost(mockClient, {
        title: "New Post",
      });

      expect(mockClient.createPost).toHaveBeenCalledWith({
        title: "New Post",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Post Created Successfully");
      expect(result).toContain("**ID**: 100");
    });

    it("should create a post with full parameters", async () => {
      const postData = {
        title: "New Post",
        content: "<p>New content</p>",
        status: "publish",
        excerpt: "Post excerpt",
        categories: [1, 2],
        tags: [3, 4],
        featured_media: 10,
      };

      const result = await postTools.handleCreatePost(mockClient, postData);

      expect(mockClient.createPost).toHaveBeenCalledWith(postData);
      expect(typeof result).toBe("string");
      expect(result).toContain("Post Created Successfully");
    });

    it("should handle missing title", async () => {
      await expect(
        postTools.handleCreatePost(mockClient, {
          content: "Content without title",
        }),
      ).rejects.toThrow();
    });

    it("should handle creation errors", async () => {
      mockClient.createPost.mockRejectedValue(new Error("Permission denied"));

      await expect(
        postTools.handleCreatePost(mockClient, {
          title: "New Post",
        }),
      ).rejects.toThrow("Failed to create post: Permission denied");
    });

    it("should set featured media to 0 to remove it", async () => {
      await postTools.handleCreatePost(mockClient, {
        title: "Post without featured image",
        featured_media: 0,
      });

      expect(mockClient.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          featured_media: 0,
        }),
      );
    });
  });

  describe("handleUpdatePost", () => {
    beforeEach(() => {
      mockClient.getPost.mockResolvedValue({
        id: 1,
        title: { rendered: "Original Post" },
        content: { rendered: "<p>Original content</p>" },
        status: "draft",
        excerpt: { rendered: "Original excerpt" },
      });

      mockClient.updatePost.mockResolvedValue({
        id: 1,
        title: { rendered: "Updated Post" },
        content: { rendered: "<p>Updated content</p>" },
        status: "publish",
        link: "https://test.wordpress.com/updated-post",
        modified: "2024-01-10T00:00:00",
        _links: {
          self: [{ href: "https://test.wordpress.com/wp-json/wp/v2/posts/1" }],
          edit: [{ href: "https://test.wordpress.com/wp-admin/post.php?post=1&action=edit" }],
        },
      });
    });

    it("should update post title", async () => {
      const result = await postTools.handleUpdatePost(mockClient, {
        id: 1,
        title: "Updated Post",
      });

      expect(mockClient.getPost).toHaveBeenCalledWith(1);
      expect(mockClient.updatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: "Updated Post",
        }),
      );
      expect(typeof result).toBe("string");
      expect(result).toContain("Post Updated Successfully");
    });

    it("should update multiple fields", async () => {
      await postTools.handleUpdatePost(mockClient, {
        id: 1,
        title: "Updated Post",
        content: "<p>Updated content</p>",
        status: "publish",
        categories: [5, 6],
      });

      expect(mockClient.updatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: "Updated Post",
          content: "<p>Updated content</p>",
          status: "publish",
          categories: [5, 6],
        }),
      );
    });

    it("should handle missing ID", async () => {
      await expect(
        postTools.handleUpdatePost(mockClient, {
          title: "Updated Post",
        }),
      ).rejects.toThrow();
    });

    it("should handle update errors", async () => {
      mockClient.getPost.mockRejectedValue(new Error("404 Post not found"));

      const result = await postTools.handleUpdatePost(mockClient, {
        id: 999,
        title: "Updated Post",
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("Post with ID 999 not found");
    });

    it("should remove featured media with 0", async () => {
      await postTools.handleUpdatePost(mockClient, {
        id: 1,
        title: "Updated Post", // Include title to avoid validation error
        featured_media: 0,
      });

      expect(mockClient.updatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: "Updated Post",
          featured_media: 0,
        }),
      );
    });
  });

  describe("handleDeletePost", () => {
    beforeEach(() => {
      mockClient.deletePost.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Deleted Post" },
          status: "trash",
        },
      });
    });

    it("should delete post to trash by default", async () => {
      const result = await postTools.handleDeletePost(mockClient, {
        id: 1,
      });

      expect(mockClient.deletePost).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("moved to trash successfully");
    });

    it("should permanently delete with force=true", async () => {
      mockClient.deletePost.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Deleted Post" },
        },
      });

      const result = await postTools.handleDeletePost(mockClient, {
        id: 1,
        force: true,
      });

      expect(mockClient.deletePost).toHaveBeenCalledWith(1, true);
      expect(typeof result).toBe("string");
      expect(result).toContain("permanently deleted successfully");
    });

    it("should handle missing ID", async () => {
      await expect(postTools.handleDeletePost(mockClient, {})).rejects.toThrow();
    });

    it("should handle deletion errors", async () => {
      mockClient.deletePost.mockRejectedValue(new Error("404 Permission denied"));

      const result = await postTools.handleDeletePost(mockClient, {
        id: 999,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("Post with ID 999 not found");
    });
  });

  describe("handleGetPostRevisions", () => {
    beforeEach(() => {
      mockClient.getPostRevisions.mockResolvedValue([
        {
          id: 101,
          author: 1,
          date: "2024-01-05T00:00:00",
          modified: "2024-01-05T00:00:00",
          parent: 1,
          title: { rendered: "Revision 2" },
          content: { rendered: "<p>Revision 2 content</p>" },
          excerpt: { rendered: "Revision 2 excerpt" },
        },
        {
          id: 100,
          author: 1,
          date: "2024-01-03T00:00:00",
          modified: "2024-01-03T00:00:00",
          parent: 1,
          title: { rendered: "Revision 1" },
          content: { rendered: "<p>Revision 1 content</p>" },
          excerpt: { rendered: "Revision 1 excerpt" },
        },
      ]);
    });

    it("should get post revisions", async () => {
      const result = await postTools.handleGetPostRevisions(mockClient, {
        id: 1,
      });

      expect(mockClient.getPostRevisions).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Post Revisions");
      expect(result).toContain("2 total");
      expect(result).toContain("Revision 2");
      expect(result).toContain("Revision 1");
    });

    it("should handle missing ID", async () => {
      await expect(postTools.handleGetPostRevisions(mockClient, {})).rejects.toThrow();
    });

    it("should handle no revisions", async () => {
      mockClient.getPostRevisions.mockResolvedValue([]);

      const result = await postTools.handleGetPostRevisions(mockClient, {
        id: 1,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("No revisions found");
    });

    it("should handle revision retrieval errors", async () => {
      mockClient.getPostRevisions.mockRejectedValue(new Error("404 Post not found"));

      const result = await postTools.handleGetPostRevisions(mockClient, {
        id: 999,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("Post with ID 999 not found");
    });

    it("should format revision details correctly", async () => {
      const result = await postTools.handleGetPostRevisions(mockClient, {
        id: 1,
      });

      expect(typeof result).toBe("string");
      expect(result).toContain("ID: 101");
      expect(result).toContain("Date: ");
      expect(result).toContain("Title: Revision 2");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle network errors", async () => {
      mockClient.getPost.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(postTools.handleGetPost(mockClient, { id: 1 })).rejects.toThrow("Failed to get post: ECONNREFUSED");
    });

    it("should handle malformed responses", async () => {
      mockClient.getPost.mockResolvedValue(null);

      await expect(postTools.handleGetPost(mockClient, { id: 1 })).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockClient.createPost.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(postTools.handleCreatePost(mockClient, { title: "Test" })).rejects.toThrow(
        "Failed to create post: 401 Unauthorized",
      );
    });

    it("should handle rate limiting", async () => {
      mockClient.getPosts.mockRejectedValue(new Error("429 Too Many Requests"));

      await expect(postTools.handleListPosts(mockClient, {})).rejects.toThrow(
        "Failed to list posts: 429 Too Many Requests",
      );
    });
  });
});
