/**
 * Media Operations Module
 * Handles all media-related WordPress REST API operations
 */

import FormData from "form-data";
import { promises as fsPromises } from "fs";
import * as path from "path";
import type { WordPressMedia, MediaQueryParams, UploadMediaRequest, UpdateMediaRequest } from "@/types/wordpress.js";
import type { RequestOptions } from "@/types/client.js";
import { debug } from "@/utils/debug.js";

/**
 * Interface for the base client methods needed by media operations
 */
export interface MediaClientBase {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

/**
 * Media operations mixin
 * Provides CRUD operations for WordPress media
 */
export class MediaOperations {
  constructor(private client: MediaClientBase) {}

  /**
   * Get a list of media items with optional filtering
   */
  async getMedia(params?: MediaQueryParams): Promise<WordPressMedia[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.client.get<WordPressMedia[]>(`media${queryString}`);
  }

  /**
   * Get a single media item by ID
   */
  async getMediaItem(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressMedia> {
    return this.client.get<WordPressMedia>(`media/${id}?context=${context}`);
  }

  /**
   * Upload media from a file path
   */
  async uploadMedia(data: UploadMediaRequest): Promise<WordPressMedia> {
    // Use file handle to avoid TOCTOU race condition
    let fileHandle;
    try {
      fileHandle = await fsPromises.open(data.file_path, "r");
    } catch {
      throw new Error(`File not found: ${data.file_path}`);
    }

    try {
      const stats = await fileHandle.stat();
      const filename = data.title || path.basename(data.file_path);

      // Check if file is too large (WordPress default is 2MB for most installs)
      const maxSize = 10 * 1024 * 1024; // 10MB reasonable limit
      if (stats.size > maxSize) {
        throw new Error(
          `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${maxSize / 1024 / 1024}MB`,
        );
      }

      const fileBuffer = await fileHandle.readFile();

      debug.log(`Uploading file: ${filename} (${(stats.size / 1024).toFixed(2)}KB)`);

      return this.uploadFile(fileBuffer, filename, this.getMimeType(data.file_path), data);
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Upload a file buffer as media
   */
  async uploadFile(
    fileData: Buffer,
    filename: string,
    mimeType: string,
    meta: Partial<UploadMediaRequest> = {},
    options?: RequestOptions,
  ): Promise<WordPressMedia> {
    debug.log(`Uploading file: ${filename} (${fileData.length} bytes)`);

    // Use FormData but with correct configuration for node-fetch
    const formData = new FormData();
    formData.setMaxListeners(20);

    // Add file with correct options
    formData.append("file", fileData, {
      filename,
      contentType: mimeType,
    });

    // Add metadata
    if (meta.title) formData.append("title", meta.title);
    if (meta.alt_text) formData.append("alt_text", meta.alt_text);
    if (meta.caption) formData.append("caption", meta.caption);
    if (meta.description) formData.append("description", meta.description);
    if (meta.post) formData.append("post", meta.post.toString());

    // Use longer timeout for file uploads
    const uploadTimeout = options?.timeout !== undefined ? options.timeout : 600000; // 10 minutes default
    const uploadOptions: RequestOptions = {
      ...options,
      timeout: uploadTimeout,
    };

    debug.log(`Upload prepared with FormData, timeout: ${uploadTimeout}ms`);

    // Use the regular post method which handles FormData correctly
    return this.client.post<WordPressMedia>("media", formData, uploadOptions);
  }

  /**
   * Update media metadata
   */
  async updateMedia(data: UpdateMediaRequest): Promise<WordPressMedia> {
    const { id, ...updateData } = data;
    return this.client.put<WordPressMedia>(`media/${id}`, updateData);
  }

  /**
   * Delete a media item
   */
  async deleteMedia(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressMedia }> {
    return this.client.delete(`media/${id}?force=${force}`);
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}
