/**
 * Comprehensive tests for CommentTools class
 * Achieving ≥70% coverage for comments tool implementation
 */

import { vi } from "vitest";

// Mock the dependencies
vi.mock("../../../dist/client/api.js");

// Now import the modules after mocking
const { CommentTools } = await import("../../../dist/tools/comments.js");
const { WordPressClient } = await import("../../../dist/client/api.js"); // eslint-disable-line no-unused-vars

describe("CommentTools", () => {
  let commentTools;
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
      getComments: vi.fn(),
      getComment: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
    };

    // Create CommentTools instance
    commentTools = new CommentTools();
  });

  describe("getTools", () => {
    it("should return all comment tool definitions", () => {
      const tools = commentTools.getTools();

      expect(tools).toHaveLength(7);
      expect(tools.map((t) => t.name)).toEqual([
        "wp_list_comments",
        "wp_get_comment",
        "wp_create_comment",
        "wp_update_comment",
        "wp_delete_comment",
        "wp_approve_comment",
        "wp_spam_comment",
      ]);
    });

    it("should include handlers for each tool", () => {
      const tools = commentTools.getTools();

      tools.forEach((tool) => {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include proper tool metadata", () => {
      const tools = commentTools.getTools();
      const listCommentsTool = tools.find((t) => t.name === "wp_list_comments");

      expect(listCommentsTool.description).toContain("Lists comments from a WordPress site");
      expect(listCommentsTool.parameters).toBeDefined();
      expect(Array.isArray(listCommentsTool.parameters)).toBe(true);
    });

    it("should include status enum for comment filters", () => {
      const tools = commentTools.getTools();
      const listCommentsTool = tools.find((t) => t.name === "wp_list_comments");
      const statusParam = listCommentsTool.parameters.find((p) => p.name === "status");

      expect(statusParam.enum).toEqual(["hold", "approve", "spam", "trash"]);
    });

    it("should include status enum for comment updates", () => {
      const tools = commentTools.getTools();
      const updateCommentTool = tools.find((t) => t.name === "wp_update_comment");
      const statusParam = updateCommentTool.parameters.find((p) => p.name === "status");

      expect(statusParam.enum).toEqual(["hold", "approve", "spam", "trash"]);
    });
  });

  describe("handleListComments", () => {
    beforeEach(() => {
      mockClient.getComments.mockResolvedValue([
        {
          id: 1,
          author_name: "John Doe",
          post: 10,
          status: "approved",
          date: "2024-01-01T00:00:00",
          content: {
            rendered:
              "This is a great post! I really enjoyed reading it and learned a lot from the insights shared. Thank you for taking the time to write this detailed explanation.",
          },
        },
        {
          id: 2,
          author_name: "Jane Smith",
          post: 15,
          status: "hold",
          date: "2024-01-02T00:00:00",
          content: {
            rendered: "Interesting perspective on this topic. I have some additional thoughts to share...",
          },
        },
        {
          id: 3,
          author_name: "Bob Wilson",
          post: 10,
          status: "spam",
          date: "2024-01-03T00:00:00",
          content: {
            rendered: "Check out this amazing offer! Buy now and save 50% on all products!",
          },
        },
      ]);
    });

    it("should list comments with default parameters", async () => {
      const result = await commentTools.handleListComments(mockClient, {});

      expect(mockClient.getComments).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 3 comments");
      expect(result).toContain("John Doe");
      expect(result).toContain("Jane Smith");
      expect(result).toContain("Bob Wilson");
    });

    it("should handle post filter parameter", async () => {
      await commentTools.handleListComments(mockClient, { post: 10 });

      expect(mockClient.getComments).toHaveBeenCalledWith({ post: 10 });
    });

    it("should handle status filter parameter", async () => {
      await commentTools.handleListComments(mockClient, { status: "approved" });

      expect(mockClient.getComments).toHaveBeenCalledWith({ status: "approved" });
    });

    it("should handle combined post and status filters", async () => {
      await commentTools.handleListComments(mockClient, { post: 10, status: "hold" });

      expect(mockClient.getComments).toHaveBeenCalledWith({ post: 10, status: "hold" });
    });

    it("should format comment details correctly", async () => {
      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("ID 1: By **John Doe** on Post 10 (approved)");
      expect(result).toContain(
        "This is a great post! I really enjoyed reading it and learned a lot from the insights shared. Thank ...",
      );
      expect(result).toContain("ID 2: By **Jane Smith** on Post 15 (hold)");
      expect(result).toContain("Interesting perspective on this topic. I have some additional thoughts to share......");
    });

    it("should truncate long comment content", async () => {
      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      // Should truncate at 100 characters and add "..."
      expect(result).toContain(
        "This is a great post! I really enjoyed reading it and learned a lot from the insights shared. Thank ...",
      );
      expect(result).not.toContain("Thank you for taking the time");
    });

    it("should handle empty results", async () => {
      mockClient.getComments.mockResolvedValue([]);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No comments found matching the criteria");
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getComments.mockRejectedValue(new Error("API Error"));

      await expect(commentTools.handleListComments(mockClient, {})).rejects.toThrow(
        "Failed to list comments: API Error",
      );
    });
  });

  describe("handleGetComment", () => {
    beforeEach(() => {
      mockClient.getComment.mockResolvedValue({
        id: 1,
        author_name: "John Doe",
        post: 10,
        date: "2024-01-01T12:30:00",
        status: "approved",
        content: {
          rendered: "This is a detailed comment with full content that should be displayed completely.",
        },
      });
    });

    it("should get a comment by ID", async () => {
      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(mockClient.getComment).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment Details (ID: 1)");
      expect(result).toContain("John Doe");
    });

    it("should format comment details correctly", async () => {
      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Author:** John Doe");
      expect(result).toContain("**Post ID:** 10");
      expect(result).toContain("**Date:**");
      expect(result).toContain("**Status:** approved");
      expect(result).toContain("**Content:** This is a detailed comment with full content");
    });

    it("should handle missing ID parameter", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.getComment.mockRejectedValue(new Error("Invalid ID"));

      await expect(commentTools.handleGetComment(mockClient, {})).rejects.toThrow("Failed to get comment: Invalid ID");
      expect(mockClient.getComment).toHaveBeenCalledWith(undefined);
    });

    it("should handle non-existent comment", async () => {
      mockClient.getComment.mockRejectedValue(new Error("Comment not found"));

      await expect(commentTools.handleGetComment(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to get comment: Comment not found",
      );
    });

    it("should format date correctly", async () => {
      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Date:**");
      // Should contain formatted date/time (flexible for different locales)
      expect(result).toMatch(/\d{1,2}[./-]\d{1,2}[./-]\d{4}/); // Date format pattern (flexible)
    });
  });

  describe("handleCreateComment", () => {
    beforeEach(() => {
      mockClient.createComment.mockResolvedValue({
        id: 100,
        author_name: "New Commenter",
        post: 5,
        status: "hold",
        content: {
          rendered: "This is a new comment",
        },
      });
    });

    it("should create a comment with required parameters", async () => {
      const commentData = {
        post: 5,
        content: "This is a new comment",
      };

      const result = await commentTools.handleCreateComment(mockClient, commentData);

      expect(mockClient.createComment).toHaveBeenCalledWith(commentData);
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment created successfully with ID: 100");
    });

    it("should create a comment with full parameters", async () => {
      const commentData = {
        post: 5,
        content: "This is a new comment",
        author_name: "Test Author",
        author_email: "test@example.com",
      };

      const result = await commentTools.handleCreateComment(mockClient, commentData);

      expect(mockClient.createComment).toHaveBeenCalledWith(commentData);
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment created successfully with ID: 100");
    });

    it("should handle creation errors", async () => {
      mockClient.createComment.mockRejectedValue(new Error("Post not found"));

      await expect(
        commentTools.handleCreateComment(mockClient, {
          post: 999,
          content: "Test comment",
        }),
      ).rejects.toThrow("Failed to create comment: Post not found");
    });

    it("should handle invalid post ID", async () => {
      mockClient.createComment.mockRejectedValue(new Error("Invalid post ID"));

      await expect(
        commentTools.handleCreateComment(mockClient, {
          post: -1,
          content: "Test comment",
        }),
      ).rejects.toThrow("Failed to create comment: Invalid post ID");
    });

    it("should handle spam protection errors", async () => {
      mockClient.createComment.mockRejectedValue(new Error("Comment appears to be spam"));

      await expect(
        commentTools.handleCreateComment(mockClient, {
          post: 5,
          content: "BUY NOW! AMAZING OFFER!",
        }),
      ).rejects.toThrow("Failed to create comment: Comment appears to be spam");
    });
  });

  describe("handleUpdateComment", () => {
    beforeEach(() => {
      mockClient.updateComment.mockResolvedValue({
        id: 1,
        author_name: "John Doe",
        status: "approved",
        content: {
          rendered: "Updated comment content",
        },
      });
    });

    it("should update comment content", async () => {
      const result = await commentTools.handleUpdateComment(mockClient, {
        id: 1,
        content: "Updated comment content",
      });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 1,
        content: "Updated comment content",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 updated successfully. New status: approved");
    });

    it("should update comment status", async () => {
      await commentTools.handleUpdateComment(mockClient, {
        id: 1,
        status: "approved",
      });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 1,
        status: "approved",
      });
    });

    it("should update multiple fields", async () => {
      await commentTools.handleUpdateComment(mockClient, {
        id: 1,
        content: "Updated content",
        status: "approved",
      });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 1,
        content: "Updated content",
        status: "approved",
      });
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updateComment.mockRejectedValue(new Error("Invalid ID"));

      await expect(
        commentTools.handleUpdateComment(mockClient, {
          content: "Updated content",
        }),
      ).rejects.toThrow("Failed to update comment: Invalid ID");
      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: undefined,
        content: "Updated content",
      });
    });

    it("should handle update errors", async () => {
      mockClient.updateComment.mockRejectedValue(new Error("Comment not found"));

      await expect(
        commentTools.handleUpdateComment(mockClient, {
          id: 999,
          content: "Updated content",
        }),
      ).rejects.toThrow("Failed to update comment: Comment not found");
    });

    it("should handle permission errors", async () => {
      mockClient.updateComment.mockRejectedValue(new Error("Permission denied"));

      await expect(
        commentTools.handleUpdateComment(mockClient, {
          id: 1,
          status: "approved",
        }),
      ).rejects.toThrow("Failed to update comment: Permission denied");
    });
  });

  describe("handleDeleteComment", () => {
    beforeEach(() => {
      mockClient.deleteComment.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          status: "trash",
        },
      });
    });

    it("should delete comment to trash by default", async () => {
      const result = await commentTools.handleDeleteComment(mockClient, {
        id: 1,
      });

      expect(mockClient.deleteComment).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 has been moved to trash");
    });

    it("should permanently delete with force=true", async () => {
      const result = await commentTools.handleDeleteComment(mockClient, {
        id: 1,
        force: true,
      });

      expect(mockClient.deleteComment).toHaveBeenCalledWith(1, true);
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 has been permanently deleted");
    });

    it("should handle force=false explicitly", async () => {
      const result = await commentTools.handleDeleteComment(mockClient, {
        id: 1,
        force: false,
      });

      expect(mockClient.deleteComment).toHaveBeenCalledWith(1, false);
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 has been moved to trash");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.deleteComment.mockRejectedValue(new Error("Invalid ID"));

      await expect(commentTools.handleDeleteComment(mockClient, {})).rejects.toThrow(
        "Failed to delete comment: Invalid ID",
      );
      expect(mockClient.deleteComment).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle deletion errors", async () => {
      mockClient.deleteComment.mockRejectedValue(new Error("Comment not found"));

      await expect(
        commentTools.handleDeleteComment(mockClient, {
          id: 999,
        }),
      ).rejects.toThrow("Failed to delete comment: Comment not found");
    });

    it("should handle permission errors", async () => {
      mockClient.deleteComment.mockRejectedValue(new Error("Permission denied"));

      await expect(
        commentTools.handleDeleteComment(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete comment: Permission denied");
    });
  });

  describe("handleApproveComment", () => {
    beforeEach(() => {
      mockClient.updateComment.mockResolvedValue({
        id: 1,
        author_name: "John Doe",
        status: "approved",
        content: {
          rendered: "Approved comment",
        },
      });
    });

    it("should approve a comment", async () => {
      const result = await commentTools.handleApproveComment(mockClient, {
        id: 1,
      });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 1,
        status: "approved",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 has been approved");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updateComment.mockRejectedValue(new Error("Invalid ID"));

      await expect(commentTools.handleApproveComment(mockClient, {})).rejects.toThrow(
        "Failed to approve comment: Invalid ID",
      );
      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: undefined,
        status: "approved",
      });
    });

    it("should handle approval errors", async () => {
      mockClient.updateComment.mockRejectedValue(new Error("Comment not found"));

      await expect(
        commentTools.handleApproveComment(mockClient, {
          id: 999,
        }),
      ).rejects.toThrow("Failed to approve comment: Comment not found");
    });

    it("should handle permission errors", async () => {
      mockClient.updateComment.mockRejectedValue(new Error("Permission denied"));

      await expect(
        commentTools.handleApproveComment(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to approve comment: Permission denied");
    });

    it("should handle already approved comments", async () => {
      mockClient.updateComment.mockResolvedValue({
        id: 1,
        status: "approved",
      });

      const result = await commentTools.handleApproveComment(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 has been approved");
    });
  });

  describe("handleSpamComment", () => {
    beforeEach(() => {
      mockClient.updateComment.mockResolvedValue({
        id: 1,
        author_name: "Spammer",
        status: "spam",
        content: {
          rendered: "Spam comment content",
        },
      });
    });

    it("should mark a comment as spam", async () => {
      const result = await commentTools.handleSpamComment(mockClient, {
        id: 1,
      });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 1,
        status: "spam",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 has been marked as spam");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updateComment.mockRejectedValue(new Error("Invalid ID"));

      await expect(commentTools.handleSpamComment(mockClient, {})).rejects.toThrow(
        "Failed to mark comment as spam: Invalid ID",
      );
      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: undefined,
        status: "spam",
      });
    });

    it("should handle spam marking errors", async () => {
      mockClient.updateComment.mockRejectedValue(new Error("Comment not found"));

      await expect(
        commentTools.handleSpamComment(mockClient, {
          id: 999,
        }),
      ).rejects.toThrow("Failed to mark comment as spam: Comment not found");
    });

    it("should handle permission errors", async () => {
      mockClient.updateComment.mockRejectedValue(new Error("Permission denied"));

      await expect(
        commentTools.handleSpamComment(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to mark comment as spam: Permission denied");
    });

    it("should handle already spam comments", async () => {
      mockClient.updateComment.mockResolvedValue({
        id: 1,
        status: "spam",
      });

      const result = await commentTools.handleSpamComment(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("Comment 1 has been marked as spam");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle network errors", async () => {
      mockClient.getComment.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(commentTools.handleGetComment(mockClient, { id: 1 })).rejects.toThrow(
        "Failed to get comment: ECONNREFUSED",
      );
    });

    it("should handle malformed responses", async () => {
      mockClient.getComment.mockResolvedValue(null);

      await expect(commentTools.handleGetComment(mockClient, { id: 1 })).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockClient.createComment.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(
        commentTools.handleCreateComment(mockClient, {
          post: 1,
          content: "Test comment",
        }),
      ).rejects.toThrow("Failed to create comment: 401 Unauthorized");
    });

    it("should handle rate limiting", async () => {
      mockClient.getComments.mockRejectedValue(new Error("429 Too Many Requests"));

      await expect(commentTools.handleListComments(mockClient, {})).rejects.toThrow(
        "Failed to list comments: 429 Too Many Requests",
      );
    });

    it("should handle invalid comment IDs", async () => {
      mockClient.getComment.mockRejectedValue(new Error("404 Not Found"));

      await expect(commentTools.handleGetComment(mockClient, { id: -1 })).rejects.toThrow(
        "Failed to get comment: 404 Not Found",
      );
    });

    it("should handle server errors", async () => {
      mockClient.updateComment.mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(
        commentTools.handleUpdateComment(mockClient, {
          id: 1,
          content: "Test",
        }),
      ).rejects.toThrow("Failed to update comment: 500 Internal Server Error");
    });

    it("should handle comments with short content", async () => {
      mockClient.getComments.mockResolvedValue([
        {
          id: 1,
          author_name: "Short Commenter",
          post: 1,
          status: "approved",
          content: {
            rendered: "Short",
          },
        },
      ]);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Short...");
    });

    it("should handle comments with exactly 100 characters", async () => {
      const exactContent = "A".repeat(100);
      mockClient.getComments.mockResolvedValue([
        {
          id: 1,
          author_name: "Exact Commenter",
          post: 1,
          status: "approved",
          content: {
            rendered: exactContent,
          },
        },
      ]);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain(exactContent + "...");
    });

    it("should handle empty comment content", async () => {
      mockClient.getComments.mockResolvedValue([
        {
          id: 1,
          author_name: "Empty Commenter",
          post: 1,
          status: "approved",
          content: {
            rendered: "",
          },
        },
      ]);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("...");
    });
  });
});
