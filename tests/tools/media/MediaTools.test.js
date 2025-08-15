/**
 * Comprehensive tests for MediaTools class
 * Achieving ≥70% coverage for media tool implementation
 */

import { jest } from "@jest/globals";

// Mock fs module BEFORE any other imports
const mockExistsSync = jest.fn();
jest.unstable_mockModule("fs", () => ({
  existsSync: mockExistsSync,
}));

// Mock the dependencies
jest.mock("../../../dist/client/api.js");

// Now import the modules after mocking
const { MediaTools } = await import("../../../dist/tools/media.js");
const { WordPressClient } = await import("../../../dist/client/api.js"); // eslint-disable-line no-unused-vars

describe("MediaTools", () => {
  let mediaTools;
  let mockClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock client instance with all necessary methods
    mockClient = {
      config: {
        siteUrl: "https://test.wordpress.com",
      },
      getSiteUrl: jest.fn().mockReturnValue("https://test.wordpress.com"),
      getMedia: jest.fn(),
      getMediaItem: jest.fn(),
      uploadMedia: jest.fn(),
      updateMedia: jest.fn(),
      deleteMedia: jest.fn(),
    };

    // Create MediaTools instance
    mediaTools = new MediaTools();
  });

  describe("getTools", () => {
    it("should return all media tool definitions", () => {
      const tools = mediaTools.getTools();

      expect(tools).toHaveLength(5);
      expect(tools.map((t) => t.name)).toEqual([
        "wp_list_media",
        "wp_get_media",
        "wp_upload_media",
        "wp_update_media",
        "wp_delete_media",
      ]);
    });

    it("should include handlers for each tool", () => {
      const tools = mediaTools.getTools();

      tools.forEach((tool) => {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include proper tool metadata", () => {
      const tools = mediaTools.getTools();
      const listMediaTool = tools.find((t) => t.name === "wp_list_media");

      expect(listMediaTool.description).toContain("Lists media items from a WordPress site");
      expect(listMediaTool.parameters).toBeDefined();
      expect(Array.isArray(listMediaTool.parameters)).toBe(true);
    });

    it("should include media type enum in list tool", () => {
      const tools = mediaTools.getTools();
      const listMediaTool = tools.find((t) => t.name === "wp_list_media");
      const mediaTypeParam = listMediaTool.parameters.find((p) => p.name === "media_type");

      expect(mediaTypeParam.enum).toEqual(["image", "video", "audio", "application"]);
    });
  });

  describe("handleListMedia", () => {
    beforeEach(() => {
      mockClient.getMedia.mockResolvedValue([
        {
          id: 1,
          title: { rendered: "Test Image 1" },
          source_url: "https://test.wordpress.com/wp-content/uploads/2024/01/image1.jpg",
          mime_type: "image/jpeg",
          media_type: "image",
          date: "2024-01-01T00:00:00",
          alt_text: "Test image alt text",
          caption: { rendered: "Test image caption" },
        },
        {
          id: 2,
          title: { rendered: "Test Video 1" },
          source_url: "https://test.wordpress.com/wp-content/uploads/2024/01/video1.mp4",
          mime_type: "video/mp4",
          media_type: "video",
          date: "2024-01-02T00:00:00",
          alt_text: "",
          caption: { rendered: "" },
        },
      ]);
    });

    it("should list media with default parameters", async () => {
      const result = await mediaTools.handleListMedia(mockClient, {});

      expect(mockClient.getMedia).toHaveBeenCalledWith({});
      expect(typeof result).toBe("string");
      expect(result).toContain("Found 2 media items");
      expect(result).toContain("Test Image 1");
      expect(result).toContain("Test Video 1");
    });

    it("should handle search parameter", async () => {
      const result = await mediaTools.handleListMedia(mockClient, { search: "image" });

      expect(mockClient.getMedia).toHaveBeenCalledWith({ search: "image" });
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Image 1");
    });

    it("should handle media_type filter", async () => {
      await mediaTools.handleListMedia(mockClient, { media_type: "image" });

      expect(mockClient.getMedia).toHaveBeenCalledWith({ media_type: "image" });
    });

    it("should handle per_page parameter", async () => {
      await mediaTools.handleListMedia(mockClient, { per_page: 50 });

      expect(mockClient.getMedia).toHaveBeenCalledWith({ per_page: 50 });
    });

    it("should handle multiple parameters", async () => {
      await mediaTools.handleListMedia(mockClient, {
        search: "test",
        media_type: "video",
        per_page: 10,
      });

      expect(mockClient.getMedia).toHaveBeenCalledWith({
        search: "test",
        media_type: "video",
        per_page: 10,
      });
    });

    it("should handle empty results", async () => {
      mockClient.getMedia.mockResolvedValue([]);

      const result = await mediaTools.handleListMedia(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("No media items found matching the criteria");
    });

    it("should format media metadata correctly", async () => {
      const result = await mediaTools.handleListMedia(mockClient, {});

      expect(typeof result).toBe("string");
      expect(result).toContain("Test Image 1");
      expect(result).toContain("(image/jpeg)");
      expect(result).toContain("(video/mp4)");
      expect(result).toContain("Link:");
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getMedia.mockRejectedValue(new Error("API Error"));

      await expect(mediaTools.handleListMedia(mockClient, {})).rejects.toThrow("Failed to list media: API Error");
    });
  });

  describe("handleGetMedia", () => {
    beforeEach(() => {
      mockClient.getMediaItem.mockResolvedValue({
        id: 1,
        title: { rendered: "Test Image" },
        source_url: "https://test.wordpress.com/wp-content/uploads/2024/01/image.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        date: "2024-01-01T00:00:00",
        alt_text: "Alternative text for image",
        caption: { rendered: "Image caption here" },
        description: { rendered: "Detailed image description" },
      });
    });

    it("should get a media item by ID", async () => {
      const result = await mediaTools.handleGetMedia(mockClient, { id: 1 });

      expect(mockClient.getMediaItem).toHaveBeenCalledWith(1);
      expect(typeof result).toBe("string");
      expect(result).toContain("Test Image");
      expect(result).toContain("Media Details (ID: 1)");
    });

    it("should handle missing ID parameter", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.getMediaItem.mockRejectedValue(new Error("Invalid ID"));

      await expect(mediaTools.handleGetMedia(mockClient, {})).rejects.toThrow("Failed to get media item: Invalid ID");
      expect(mockClient.getMediaItem).toHaveBeenCalledWith(undefined);
    });

    it("should handle non-existent media item", async () => {
      mockClient.getMediaItem.mockRejectedValue(new Error("Media not found"));

      await expect(mediaTools.handleGetMedia(mockClient, { id: 999 })).rejects.toThrow(
        "Failed to get media item: Media not found",
      );
    });

    it("should format media details correctly", async () => {
      const result = await mediaTools.handleGetMedia(mockClient, { id: 1 });

      expect(typeof result).toBe("string");
      expect(result).toContain("**Title:** Test Image");
      expect(result).toContain("**URL:**");
      expect(result).toContain("**Type:** image (image/jpeg)");
      expect(result).toContain("**Date:**");
      expect(result).toContain("**Alt Text:** Alternative text for image");
      expect(result).toContain("**Caption:** Image caption here");
    });

    it("should handle media without alt text and caption", async () => {
      mockClient.getMediaItem.mockResolvedValue({
        id: 2,
        title: { rendered: "Video File" },
        source_url: "https://test.wordpress.com/video.mp4",
        mime_type: "video/mp4",
        media_type: "video",
        date: "2024-01-01T00:00:00",
        alt_text: "",
        caption: { rendered: "" },
      });

      const result = await mediaTools.handleGetMedia(mockClient, { id: 2 });

      expect(typeof result).toBe("string");
      expect(result).toContain("Video File");
      expect(result).not.toContain("**Alt Text:**");
      expect(result).not.toContain("**Caption:**");
    });
  });

  describe("handleUploadMedia", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockClient.uploadMedia.mockResolvedValue({
        id: 100,
        title: { rendered: "Uploaded Image" },
        source_url: "https://test.wordpress.com/wp-content/uploads/2024/01/uploaded.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
      });
    });

    it("should upload media with file path only", async () => {
      const result = await mediaTools.handleUploadMedia(mockClient, {
        file_path: "/path/to/image.jpg",
      });

      expect(mockExistsSync).toHaveBeenCalledWith("/path/to/image.jpg");
      expect(mockClient.uploadMedia).toHaveBeenCalledWith({
        file_path: "/path/to/image.jpg",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Media uploaded successfully");
      expect(result).toContain("ID: 100");
    });

    it("should upload media with full metadata", async () => {
      const uploadData = {
        file_path: "/path/to/image.jpg",
        title: "My Image",
        alt_text: "Image description",
        caption: "Image caption",
        description: "Detailed description",
        post: 5,
      };

      const result = await mediaTools.handleUploadMedia(mockClient, uploadData);

      expect(mockClient.uploadMedia).toHaveBeenCalledWith(uploadData);
      expect(typeof result).toBe("string");
      expect(result).toContain("Media uploaded successfully");
    });

    it("should handle file not found error", async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(
        mediaTools.handleUploadMedia(mockClient, {
          file_path: "/non/existent/file.jpg",
        }),
      ).rejects.toThrow("Failed to upload media: File not found at path: /non/existent/file.jpg");

      expect(mockExistsSync).toHaveBeenCalledWith("/non/existent/file.jpg");
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it("should handle upload errors", async () => {
      mockClient.uploadMedia.mockRejectedValue(new Error("Upload failed"));

      await expect(
        mediaTools.handleUploadMedia(mockClient, {
          file_path: "/path/to/image.jpg",
        }),
      ).rejects.toThrow("Failed to upload media: Upload failed");
    });

    it("should handle invalid file types", async () => {
      mockClient.uploadMedia.mockRejectedValue(new Error("Invalid file type"));

      await expect(
        mediaTools.handleUploadMedia(mockClient, {
          file_path: "/path/to/file.exe",
        }),
      ).rejects.toThrow("Failed to upload media: Invalid file type");
    });

    it("should handle file size limits", async () => {
      mockClient.uploadMedia.mockRejectedValue(new Error("File too large"));

      await expect(
        mediaTools.handleUploadMedia(mockClient, {
          file_path: "/path/to/huge-file.jpg",
        }),
      ).rejects.toThrow("Failed to upload media: File too large");
    });
  });

  describe("handleUpdateMedia", () => {
    beforeEach(() => {
      mockClient.updateMedia.mockResolvedValue({
        id: 1,
        title: { rendered: "Updated Media" },
        alt_text: "Updated alt text",
        caption: { rendered: "Updated caption" },
        description: { rendered: "Updated description" },
      });
    });

    it("should update media title", async () => {
      const result = await mediaTools.handleUpdateMedia(mockClient, {
        id: 1,
        title: "Updated Media",
      });

      expect(mockClient.updateMedia).toHaveBeenCalledWith({
        id: 1,
        title: "Updated Media",
      });
      expect(typeof result).toBe("string");
      expect(result).toContain("Media 1 updated successfully");
    });

    it("should update multiple fields", async () => {
      await mediaTools.handleUpdateMedia(mockClient, {
        id: 1,
        title: "Updated Title",
        alt_text: "Updated alt text",
        caption: "Updated caption",
        description: "Updated description",
      });

      expect(mockClient.updateMedia).toHaveBeenCalledWith({
        id: 1,
        title: "Updated Title",
        alt_text: "Updated alt text",
        caption: "Updated caption",
        description: "Updated description",
      });
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.updateMedia.mockRejectedValue(new Error("Invalid ID"));

      await expect(
        mediaTools.handleUpdateMedia(mockClient, {
          title: "Updated Media",
        }),
      ).rejects.toThrow("Failed to update media: Invalid ID");
      expect(mockClient.updateMedia).toHaveBeenCalledWith({
        id: undefined,
        title: "Updated Media",
      });
    });

    it("should handle update errors", async () => {
      mockClient.updateMedia.mockRejectedValue(new Error("Media not found"));

      await expect(
        mediaTools.handleUpdateMedia(mockClient, {
          id: 999,
          title: "Updated Media",
        }),
      ).rejects.toThrow("Failed to update media: Media not found");
    });

    it("should handle permission errors", async () => {
      mockClient.updateMedia.mockRejectedValue(new Error("Permission denied"));

      await expect(
        mediaTools.handleUpdateMedia(mockClient, {
          id: 1,
          title: "Updated Media",
        }),
      ).rejects.toThrow("Failed to update media: Permission denied");
    });
  });

  describe("handleDeleteMedia", () => {
    beforeEach(() => {
      mockClient.deleteMedia.mockResolvedValue({
        deleted: true,
        previous: {
          id: 1,
          title: { rendered: "Deleted Media" },
          status: "trash",
        },
      });
    });

    it("should delete media to trash by default", async () => {
      const result = await mediaTools.handleDeleteMedia(mockClient, {
        id: 1,
      });

      expect(mockClient.deleteMedia).toHaveBeenCalledWith(1, undefined);
      expect(typeof result).toBe("string");
      expect(result).toContain("moved to trash");
    });

    it("should permanently delete with force=true", async () => {
      const result = await mediaTools.handleDeleteMedia(mockClient, {
        id: 1,
        force: true,
      });

      expect(mockClient.deleteMedia).toHaveBeenCalledWith(1, true);
      expect(typeof result).toBe("string");
      expect(result).toContain("permanently deleted");
    });

    it("should handle missing ID", async () => {
      // When ID is missing, it gets passed as undefined to the client
      mockClient.deleteMedia.mockRejectedValue(new Error("Invalid ID"));

      await expect(mediaTools.handleDeleteMedia(mockClient, {})).rejects.toThrow("Failed to delete media: Invalid ID");
      expect(mockClient.deleteMedia).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle deletion errors", async () => {
      mockClient.deleteMedia.mockRejectedValue(new Error("Permission denied"));

      await expect(
        mediaTools.handleDeleteMedia(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete media: Permission denied");
    });

    it("should handle force parameter correctly", async () => {
      await mediaTools.handleDeleteMedia(mockClient, {
        id: 1,
        force: false,
      });

      expect(mockClient.deleteMedia).toHaveBeenCalledWith(1, false);
    });

    it("should handle attached media warnings", async () => {
      mockClient.deleteMedia.mockRejectedValue(new Error("Media is attached to posts"));

      await expect(
        mediaTools.handleDeleteMedia(mockClient, {
          id: 1,
        }),
      ).rejects.toThrow("Failed to delete media: Media is attached to posts");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle network errors", async () => {
      mockClient.getMediaItem.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(mediaTools.handleGetMedia(mockClient, { id: 1 })).rejects.toThrow(
        "Failed to get media item: ECONNREFUSED",
      );
    });

    it("should handle malformed responses", async () => {
      mockClient.getMediaItem.mockResolvedValue(null);

      await expect(mediaTools.handleGetMedia(mockClient, { id: 1 })).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockExistsSync.mockReturnValue(true);
      mockClient.uploadMedia.mockRejectedValue(new Error("401 Unauthorized"));

      await expect(mediaTools.handleUploadMedia(mockClient, { file_path: "/path/to/file.jpg" })).rejects.toThrow(
        "Failed to upload media: 401 Unauthorized",
      );
    });

    it("should handle rate limiting", async () => {
      mockClient.getMedia.mockRejectedValue(new Error("429 Too Many Requests"));

      await expect(mediaTools.handleListMedia(mockClient, {})).rejects.toThrow(
        "Failed to list media: 429 Too Many Requests",
      );
    });

    it("should handle invalid media IDs", async () => {
      mockClient.getMediaItem.mockRejectedValue(new Error("404 Not Found"));

      await expect(mediaTools.handleGetMedia(mockClient, { id: -1 })).rejects.toThrow(
        "Failed to get media item: 404 Not Found",
      );
    });

    it("should handle server errors", async () => {
      mockClient.updateMedia.mockRejectedValue(new Error("500 Internal Server Error"));

      await expect(
        mediaTools.handleUpdateMedia(mockClient, {
          id: 1,
          title: "Test",
        }),
      ).rejects.toThrow("Failed to update media: 500 Internal Server Error");
    });

    it("should handle file system permission errors", async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      await expect(mediaTools.handleUploadMedia(mockClient, { file_path: "/restricted/file.jpg" })).rejects.toThrow(
        "Failed to upload media: Permission denied",
      );
    });

    it("should handle large file uploads", async () => {
      mockExistsSync.mockReturnValue(true);
      mockClient.uploadMedia.mockRejectedValue(new Error("Request entity too large"));

      await expect(mediaTools.handleUploadMedia(mockClient, { file_path: "/path/to/large-file.jpg" })).rejects.toThrow(
        "Failed to upload media: Request entity too large",
      );
    });

    it("should handle unsupported file formats", async () => {
      mockExistsSync.mockReturnValue(true);
      mockClient.uploadMedia.mockRejectedValue(new Error("Unsupported file format"));

      await expect(mediaTools.handleUploadMedia(mockClient, { file_path: "/path/to/file.xyz" })).rejects.toThrow(
        "Failed to upload media: Unsupported file format",
      );
    });
  });
});
