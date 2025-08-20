import { vi } from "vitest";
import { CommentTools } from "../../dist/tools/comments.js";

describe("CommentTools", () => {
  let commentTools;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock WordPress client with all needed methods
    mockClient = {
      request: vi.fn(),
      getComments: vi.fn(),
      getComment: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      getSiteUrl: vi.fn().mockReturnValue("https://test-site.com"),
      config: {
        baseUrl: "https://test-site.com",
      },
    };

    commentTools = new CommentTools();
  });

  describe("getTools", () => {
    it("should return an array of comment tools", () => {
      const tools = commentTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(7);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_list_comments");
      expect(toolNames).toContain("wp_get_comment");
      expect(toolNames).toContain("wp_create_comment");
      expect(toolNames).toContain("wp_update_comment");
      expect(toolNames).toContain("wp_delete_comment");
      expect(toolNames).toContain("wp_approve_comment");
      expect(toolNames).toContain("wp_spam_comment");
    });

    it("should have proper tool definitions", () => {
      const tools = commentTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should have correct parameter definitions for each tool", () => {
      const tools = commentTools.getTools();
      const toolsByName = {};
      tools.forEach((tool) => {
        toolsByName[tool.name] = tool;
      });

      // wp_list_comments should have optional post and status parameters
      const listParams = toolsByName["wp_list_comments"].parameters;
      expect(listParams.find((p) => p.name === "post")).toBeTruthy();
      expect(listParams.find((p) => p.name === "status")).toBeTruthy();
      const statusParam = listParams.find((p) => p.name === "status");
      expect(statusParam.enum).toEqual(["hold", "approve", "spam", "trash"]);

      // wp_get_comment should require id
      const getCommentParams = toolsByName["wp_get_comment"].parameters;
      const idParam = getCommentParams.find((p) => p.name === "id");
      expect(idParam).toBeTruthy();
      expect(idParam.required).toBe(true);

      // wp_create_comment should have required post and content parameters
      const createParams = toolsByName["wp_create_comment"].parameters;
      expect(createParams.find((p) => p.name === "post").required).toBe(true);
      expect(createParams.find((p) => p.name === "content").required).toBe(true);
      expect(createParams.find((p) => p.name === "author_name")).toBeTruthy();
      expect(createParams.find((p) => p.name === "author_email")).toBeTruthy();

      // wp_update_comment should require id
      const updateParams = toolsByName["wp_update_comment"].parameters;
      expect(updateParams.find((p) => p.name === "id").required).toBe(true);
      expect(updateParams.find((p) => p.name === "content")).toBeTruthy();
      expect(updateParams.find((p) => p.name === "status")).toBeTruthy();

      // wp_delete_comment should require id
      const deleteParams = toolsByName["wp_delete_comment"].parameters;
      expect(deleteParams.find((p) => p.name === "id").required).toBe(true);
      expect(deleteParams.find((p) => p.name === "force")).toBeTruthy();

      // wp_approve_comment should require id
      const approveParams = toolsByName["wp_approve_comment"].parameters;
      expect(approveParams.find((p) => p.name === "id").required).toBe(true);

      // wp_spam_comment should require id
      const spamParams = toolsByName["wp_spam_comment"].parameters;
      expect(spamParams.find((p) => p.name === "id").required).toBe(true);
    });
  });

  describe("handleListComments", () => {
    it("should list comments successfully", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "John Doe",
          post: 123,
          status: "approved",
          content: { rendered: "This is a great post! I really enjoyed reading it and learned a lot." },
          date: "2024-01-01T00:00:00",
        },
        {
          id: 2,
          author_name: "Jane Smith",
          post: 124,
          status: "hold",
          content: { rendered: "Thanks for sharing this information. Very helpful and well written." },
          date: "2024-01-02T00:00:00",
        },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(mockClient.getComments).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 2 comments:");
      expect(result).toContain("John Doe");
      expect(result).toContain("Jane Smith");
      expect(result).toContain("Post 123");
      expect(result).toContain("Post 124");
      expect(result).toContain("(approved)");
      expect(result).toContain("(hold)");
    });

    it("should handle empty results", async () => {
      mockClient.getComments.mockResolvedValueOnce([]);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No comments found matching the criteria");
    });

    it("should handle post parameter", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "Comment Author",
          post: 123,
          status: "approved",
          content: { rendered: "Comment on specific post" },
        },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {
        post: 123,
      });

      expect(mockClient.getComments).toHaveBeenCalledWith({
        post: 123,
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment Author");
    });

    it("should handle status parameter", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "Pending Comment",
          post: 123,
          status: "hold",
          content: { rendered: "This comment is pending approval" },
        },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {
        status: "hold",
      });

      expect(mockClient.getComments).toHaveBeenCalledWith({
        status: "hold",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Pending Comment");
      expect(result).toContain("(hold)");
    });

    it("should handle API errors", async () => {
      mockClient.getComments.mockRejectedValueOnce(new Error("API Error"));

      await expect(commentTools.handleListComments(mockClient, {})).rejects.toThrow("Failed to list comments");
    });

    it("should truncate long comment content", async () => {
      const longContent = "A".repeat(150);
      const mockComments = [
        {
          id: 1,
          author_name: "Long Comment",
          post: 123,
          status: "approved",
          content: { rendered: longContent },
        },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(result).toContain("A".repeat(100) + "...");
      expect(result).not.toContain("A".repeat(150));
    });

    it("should handle mixed parameters", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "Specific Comment",
          post: 123,
          status: "approved",
          content: { rendered: "Comment matching both post and status filters" },
        },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {
        post: 123,
        status: "approved",
      });

      expect(mockClient.getComments).toHaveBeenCalledWith({
        post: 123,
        status: "approved",
      });
      expect(result).toContain("Specific Comment");
    });

    it("should handle comments with different statuses", async () => {
      const mockComments = [
        { id: 1, author_name: "Approved", post: 1, status: "approved", content: { rendered: "Approved comment" } },
        { id: 2, author_name: "Pending", post: 1, status: "hold", content: { rendered: "Pending comment" } },
        { id: 3, author_name: "Spam", post: 1, status: "spam", content: { rendered: "Spam comment" } },
        { id: 4, author_name: "Trash", post: 1, status: "trash", content: { rendered: "Trash comment" } },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(result).toContain("(approved)");
      expect(result).toContain("(hold)");
      expect(result).toContain("(spam)");
      expect(result).toContain("(trash)");
    });
  });

  describe("handleGetComment", () => {
    it("should get a comment successfully", async () => {
      const mockComment = {
        id: 1,
        author_name: "Test Author",
        post: 123,
        date: "2024-01-01T00:00:00",
        status: "approved",
        content: { rendered: "This is a test comment content" },
      };

      mockClient.getComment.mockResolvedValueOnce(mockComment);

      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(mockClient.getComment).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Comment Details (ID: 1)");
      expect(result).toContain("Test Author");
      expect(result).toContain("**Post ID:** 123");
      expect(result).toContain("approved");
      expect(result).toContain("This is a test comment content");
    });

    it("should handle comment not found", async () => {
      mockClient.getComment.mockRejectedValueOnce(new Error("Comment not found"));

      await expect(commentTools.handleGetComment(mockClient, { id: 999 })).rejects.toThrow("Failed to get comment");
    });

    it("should handle invalid ID parameter", async () => {
      mockClient.getComment.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(commentTools.handleGetComment(mockClient, { id: "invalid" })).rejects.toThrow(
        "Failed to get comment",
      );
    });

    it("should format date correctly", async () => {
      const mockComment = {
        id: 1,
        author_name: "Date Test",
        post: 123,
        date: "2024-01-15T14:30:00",
        status: "approved",
        content: { rendered: "Date test comment" },
      };

      mockClient.getComment.mockResolvedValueOnce(mockComment);

      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(result).toMatch(/Date:.*2024/); // Should contain formatted date with year
    });

    it("should handle comments with HTML content", async () => {
      const mockComment = {
        id: 1,
        author_name: "HTML Test",
        post: 123,
        date: "2024-01-01T00:00:00",
        status: "approved",
        content: { rendered: "<p>This comment has <strong>HTML</strong> content</p>" },
      };

      mockClient.getComment.mockResolvedValueOnce(mockComment);

      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(result).toContain("<p>This comment has <strong>HTML</strong> content</p>");
    });
  });

  describe("handleCreateComment", () => {
    it("should create a comment successfully", async () => {
      const mockCreatedComment = {
        id: 123,
        author_name: "New Commenter",
        post: 456,
        content: { rendered: "New comment content" },
        status: "hold",
      };

      mockClient.createComment.mockResolvedValueOnce(mockCreatedComment);

      const commentData = {
        post: 456,
        content: "New comment content",
        author_name: "New Commenter",
        author_email: "commenter@example.com",
      };

      const result = await commentTools.handleCreateComment(mockClient, commentData);

      expect(mockClient.createComment).toHaveBeenCalledWith(commentData);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Comment created successfully with ID: 123");
    });

    it("should handle creation errors", async () => {
      mockClient.createComment.mockRejectedValueOnce(new Error("Creation failed"));

      await expect(
        commentTools.handleCreateComment(mockClient, {
          post: 456,
          content: "Test comment",
        }),
      ).rejects.toThrow("Failed to create comment");
    });

    it("should handle validation errors", async () => {
      mockClient.createComment.mockRejectedValueOnce(new Error("Post ID is required"));

      await expect(
        commentTools.handleCreateComment(mockClient, {
          content: "Test comment",
          // Missing post ID
        }),
      ).rejects.toThrow("Failed to create comment");
    });

    it("should handle comment creation with all parameters", async () => {
      const mockCreatedComment = {
        id: 124,
        author_name: "Complete Commenter",
        author_email: "complete@example.com",
        post: 789,
        content: { rendered: "Complete comment with all fields" },
        status: "hold",
      };

      mockClient.createComment.mockResolvedValueOnce(mockCreatedComment);

      const completeCommentData = {
        post: 789,
        content: "Complete comment with all fields",
        author_name: "Complete Commenter",
        author_email: "complete@example.com",
      };

      const result = await commentTools.handleCreateComment(mockClient, completeCommentData);

      expect(mockClient.createComment).toHaveBeenCalledWith(completeCommentData);
      expect(result).toContain("ID: 124");
    });

    it("should handle minimal comment creation", async () => {
      const mockCreatedComment = {
        id: 125,
        post: 100,
        content: { rendered: "Minimal comment" },
        status: "hold",
      };

      mockClient.createComment.mockResolvedValueOnce(mockCreatedComment);

      const result = await commentTools.handleCreateComment(mockClient, {
        post: 100,
        content: "Minimal comment",
      });

      expect(mockClient.createComment).toHaveBeenCalledWith({
        post: 100,
        content: "Minimal comment",
      });
      expect(result).toContain("ID: 125");
    });
  });

  describe("handleUpdateComment", () => {
    it("should update a comment successfully", async () => {
      const mockUpdatedComment = {
        id: 1,
        content: { rendered: "Updated comment content" },
        status: "approved",
        author_name: "Updated Author",
      };

      mockClient.updateComment.mockResolvedValueOnce(mockUpdatedComment);

      const updateData = {
        id: 1,
        content: "Updated comment content",
        status: "approved",
      };

      const result = await commentTools.handleUpdateComment(mockClient, updateData);

      expect(mockClient.updateComment).toHaveBeenCalledWith(updateData);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Comment 1 updated successfully. New status: approved");
    });

    it("should handle update errors", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("Update failed"));

      await expect(
        commentTools.handleUpdateComment(mockClient, {
          id: 1,
          content: "Updated content",
        }),
      ).rejects.toThrow("Failed to update comment");
    });

    it("should handle missing ID", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("ID is required"));

      await expect(
        commentTools.handleUpdateComment(mockClient, {
          content: "Updated content",
          // Missing id
        }),
      ).rejects.toThrow("Failed to update comment");
    });

    it("should handle content-only updates", async () => {
      const mockUpdatedComment = {
        id: 2,
        content: { rendered: "Only content updated" },
        status: "hold",
      };

      mockClient.updateComment.mockResolvedValueOnce(mockUpdatedComment);

      const result = await commentTools.handleUpdateComment(mockClient, {
        id: 2,
        content: "Only content updated",
      });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 2,
        content: "Only content updated",
      });
      expect(result).toContain("New status: hold");
    });

    it("should handle status-only updates", async () => {
      const mockUpdatedComment = {
        id: 3,
        status: "spam",
      };

      mockClient.updateComment.mockResolvedValueOnce(mockUpdatedComment);

      const result = await commentTools.handleUpdateComment(mockClient, {
        id: 3,
        status: "spam",
      });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 3,
        status: "spam",
      });
      expect(result).toContain("New status: spam");
    });

    it("should handle various status updates", async () => {
      const statuses = ["hold", "approved", "spam", "trash"];

      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const mockUpdatedComment = { id: i + 1, status };
        mockClient.updateComment.mockResolvedValueOnce(mockUpdatedComment);

        const result = await commentTools.handleUpdateComment(mockClient, {
          id: i + 1,
          status,
        });

        expect(result).toContain(`New status: ${status}`);
      }
    });
  });

  describe("handleDeleteComment", () => {
    it("should delete a comment successfully (move to trash)", async () => {
      mockClient.deleteComment.mockResolvedValueOnce({ deleted: true });

      const result = await commentTools.handleDeleteComment(mockClient, { id: 1 });

      expect(mockClient.deleteComment).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Comment 1 has been moved to trash");
    });

    it("should handle forced deletion", async () => {
      mockClient.deleteComment.mockResolvedValueOnce({ deleted: true });

      const result = await commentTools.handleDeleteComment(mockClient, {
        id: 1,
        force: true,
      });

      expect(mockClient.deleteComment).toHaveBeenCalledWith(1, true);
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Comment 1 has been permanently deleted");
    });

    it("should handle deletion errors", async () => {
      mockClient.deleteComment.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(commentTools.handleDeleteComment(mockClient, { id: 1 })).rejects.toThrow("Failed to delete comment");
    });

    it("should handle invalid ID", async () => {
      mockClient.deleteComment.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(commentTools.handleDeleteComment(mockClient, { id: "invalid" })).rejects.toThrow(
        "Failed to delete comment",
      );
    });

    it("should properly handle force parameter", async () => {
      mockClient.deleteComment.mockResolvedValue({ deleted: true });

      // Test with force: false
      await commentTools.handleDeleteComment(mockClient, { id: 1, force: false });
      expect(mockClient.deleteComment).toHaveBeenCalledWith(1, false);

      // Test with force: true
      await commentTools.handleDeleteComment(mockClient, { id: 2, force: true });
      expect(mockClient.deleteComment).toHaveBeenCalledWith(2, true);
    });

    it("should handle no force parameter (defaults to trash)", async () => {
      mockClient.deleteComment.mockResolvedValueOnce({ deleted: true });

      const result = await commentTools.handleDeleteComment(mockClient, { id: 3 });

      expect(mockClient.deleteComment).toHaveBeenCalledWith(3, undefined);
      expect(result).toContain("moved to trash");
    });
  });

  describe("handleApproveComment", () => {
    it("should approve a comment successfully", async () => {
      const mockApprovedComment = {
        id: 1,
        status: "approved",
        author_name: "Approved Author",
        content: { rendered: "Approved comment" },
      };

      mockClient.updateComment.mockResolvedValueOnce(mockApprovedComment);

      const result = await commentTools.handleApproveComment(mockClient, { id: 1 });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 1,
        status: "approved",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Comment 1 has been approved");
    });

    it("should handle approval errors", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("Approval failed"));

      await expect(commentTools.handleApproveComment(mockClient, { id: 1 })).rejects.toThrow(
        "Failed to approve comment",
      );
    });

    it("should handle invalid ID for approval", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(commentTools.handleApproveComment(mockClient, { id: "invalid" })).rejects.toThrow(
        "Failed to approve comment",
      );
    });

    it("should handle approval of non-existent comment", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("Comment not found"));

      await expect(commentTools.handleApproveComment(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to approve comment",
      );
    });
  });

  describe("handleSpamComment", () => {
    it("should mark a comment as spam successfully", async () => {
      const mockSpamComment = {
        id: 1,
        status: "spam",
        author_name: "Spam Author",
        content: { rendered: "Spam comment" },
      };

      mockClient.updateComment.mockResolvedValueOnce(mockSpamComment);

      const result = await commentTools.handleSpamComment(mockClient, { id: 1 });

      expect(mockClient.updateComment).toHaveBeenCalledWith({
        id: 1,
        status: "spam",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("✅ Comment 1 has been marked as spam");
    });

    it("should handle spam marking errors", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("Spam marking failed"));

      await expect(commentTools.handleSpamComment(mockClient, { id: 1 })).rejects.toThrow(
        "Failed to mark comment as spam",
      );
    });

    it("should handle invalid ID for spam marking", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("Invalid ID"));

      await expect(commentTools.handleSpamComment(mockClient, { id: "invalid" })).rejects.toThrow(
        "Failed to mark comment as spam",
      );
    });

    it("should handle spam marking of non-existent comment", async () => {
      mockClient.updateComment.mockRejectedValueOnce(new Error("Comment not found"));

      await expect(commentTools.handleSpamComment(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to mark comment as spam",
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null/undefined parameters gracefully", async () => {
      await expect(commentTools.handleListComments(mockClient, null)).rejects.toThrow("Failed to list comments");
    });

    it("should handle very large comment content", async () => {
      const largeContent = "Large comment content ".repeat(100);
      const mockComment = {
        id: 1,
        author_name: "Large Content",
        post: 123,
        status: "approved",
        content: { rendered: largeContent },
      };

      mockClient.getComment.mockResolvedValueOnce(mockComment);

      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("Large Content");
      expect(result).toContain(largeContent);
    });

    it("should handle comments with special characters", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "Special & Characters @ User",
          post: 123,
          status: "approved",
          content: { rendered: "Comment with special chars: !@#$%^&*()" },
        },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(result).toContain("Special & Characters @ User");
      expect(result).toContain("!@#$%^&*()");
    });

    it("should handle network timeouts gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";

      mockClient.getComments.mockRejectedValueOnce(timeoutError);

      await expect(commentTools.handleListComments(mockClient, {})).rejects.toThrow("Failed to list comments");
    });

    it("should handle concurrent requests properly", async () => {
      const mockComment = {
        id: 1,
        author_name: "Test",
        post: 123,
        status: "approved",
        content: { rendered: "Test comment" },
        date: "2024-01-01T00:00:00",
      };
      mockClient.getComment.mockResolvedValue(mockComment);

      const promises = [
        commentTools.handleGetComment(mockClient, { id: 1 }),
        commentTools.handleGetComment(mockClient, { id: 2 }),
        commentTools.handleGetComment(mockClient, { id: 3 }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockClient.getComment).toHaveBeenCalledTimes(3);
    });

    it("should handle empty comment content", async () => {
      const mockComment = {
        id: 1,
        author_name: "Empty Content",
        post: 123,
        status: "approved",
        content: { rendered: "" },
        date: "2024-01-01T00:00:00",
      };

      mockClient.getComment.mockResolvedValueOnce(mockComment);

      const result = await commentTools.handleGetComment(mockClient, { id: 1 });

      expect(result).toContain("Empty Content");
      expect(result).toContain("Content:");
    });

    it("should handle comments with missing author name", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "",
          post: 123,
          status: "approved",
          content: { rendered: "Comment with no author name" },
        },
      ];

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(result).toContain("ID 1: By **");
      expect(result).toContain("Comment with no author name");
    });
  });

  describe("Performance and Validation", () => {
    it("should validate status enum parameters", async () => {
      const validStatuses = ["hold", "approved", "spam", "trash"];

      for (const status of validStatuses) {
        mockClient.getComments.mockResolvedValueOnce([]);
        const result = await commentTools.handleListComments(mockClient, { status });
        expect(typeof result).toBe("string");
        expect(mockClient.getComments).toHaveBeenCalledWith({ status });
      }
    });

    it("should handle mixed parameter types", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "Mixed Test",
          post: 123,
          status: "approved",
          content: { rendered: "Mixed parameters test" },
        },
      ];
      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {
        post: 123,
        status: "approved",
      });

      expect(mockClient.getComments).toHaveBeenCalledWith({
        post: 123,
        status: "approved",
      });
      expect(result).toContain("Mixed Test");
    });

    it("should maintain consistent response format", async () => {
      const mockComments = [
        {
          id: 1,
          author_name: "Format Test",
          post: 123,
          status: "approved",
          content: { rendered: "Consistent format test comment" },
        },
      ];
      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(result).toMatch(/Found \d+ comments:/);
      expect(result).toContain("ID 1:");
      expect(result).toContain("By **Format Test**");
      expect(result).toContain("Post 123");
      expect(result).toContain("(approved)");
    });

    it("should handle rapid status changes", async () => {
      const mockComment = { id: 1, status: "approved" };
      mockClient.updateComment.mockResolvedValue(mockComment);

      // Simulate rapid status changes
      const statusChanges = ["hold", "approved", "spam", "approved"];

      for (const status of statusChanges) {
        mockComment.status = status;
        const result = await commentTools.handleUpdateComment(mockClient, {
          id: 1,
          status,
        });
        expect(result).toContain(`New status: ${status}`);
      }
    });

    it("should handle bulk operations simulation", async () => {
      const mockComments = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        author_name: `Author ${i + 1}`,
        post: Math.floor(Math.random() * 10) + 1,
        status: ["approved", "hold", "spam"][i % 3],
        content: { rendered: `Comment content ${i + 1}` },
      }));

      mockClient.getComments.mockResolvedValueOnce(mockComments);

      const result = await commentTools.handleListComments(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Found 50 comments:");
    });
  });
});
