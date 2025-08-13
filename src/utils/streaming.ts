/**
 * Streaming utilities for handling large result sets
 * Implements streaming responses for better performance and memory usage
 */

// Node.js streaming imports removed - not currently used but available for future enhancement

export interface StreamingOptions {
  batchSize?: number;
  delay?: number;
  transformItem?: (item: unknown) => unknown;
  filterItem?: (item: unknown) => boolean;
}

export interface StreamingResult<T> {
  data: T[];
  hasMore: boolean;
  cursor?: string | undefined;
  total?: number | undefined;
  processed: number;
}

/**
 * Creates a streaming response for large datasets
 */
export class DataStreamer<T> {
  private batchSize: number;
  private delay: number;
  private transformItem: ((item: T) => unknown) | undefined;
  private filterItem: ((item: T) => boolean) | undefined;

  constructor(options: StreamingOptions = {}) {
    this.batchSize = options.batchSize || 50;
    this.delay = options.delay || 0;
    this.transformItem = options.transformItem || undefined;
    this.filterItem = options.filterItem || undefined;
  }

  /**
   * Processes data in batches with streaming
   */
  async *streamBatches<U>(
    data: T[],
    processor: (batch: T[]) => Promise<U[]>,
  ): AsyncGenerator<StreamingResult<U>, void, unknown> {
    const total = data.length;
    let processed = 0;

    for (let i = 0; i < data.length; i += this.batchSize) {
      const batch = data.slice(i, i + this.batchSize);

      // Apply filtering if provided
      const filteredBatch = this.filterItem ? batch.filter(this.filterItem) : batch;

      // Process the batch
      const processedBatch = await processor(filteredBatch);

      // Apply transformation if provided
      const transformedBatch = this.transformItem
        ? processedBatch.map((item: unknown) => this.transformItem!(item as T))
        : processedBatch;

      processed += batch.length;
      const hasMore = processed < total;

      yield {
        data: transformedBatch as U[],
        hasMore,
        cursor: hasMore ? String(i + this.batchSize) : undefined,
        total,
        processed,
      };

      // Add delay between batches if specified
      if (this.delay > 0 && hasMore) {
        await new Promise((resolve) => setTimeout(resolve, this.delay));
      }
    }
  }

  /**
   * Processes large datasets with pagination
   */
  async *streamPages<U>(
    fetcher: (page: number, perPage: number) => Promise<{ data: T[]; hasMore: boolean }>,
    processor: (items: T[]) => Promise<U[]>,
  ): AsyncGenerator<StreamingResult<U>, void, unknown> {
    let page = 1;
    let totalProcessed = 0;

    while (true) {
      const result = await fetcher(page, this.batchSize);

      if (result.data.length === 0) {
        break;
      }

      // Apply filtering if provided
      const filteredData = this.filterItem ? result.data.filter(this.filterItem) : result.data;

      // Process the data
      const processedData = await processor(filteredData);

      // Apply transformation if provided
      const transformedData = this.transformItem
        ? processedData.map((item: unknown) => this.transformItem!(item as T))
        : processedData;

      totalProcessed += result.data.length;

      yield {
        data: transformedData as U[],
        hasMore: result.hasMore,
        cursor: result.hasMore ? String(page + 1) : undefined,
        total: undefined, // Unknown for paginated results
        processed: totalProcessed,
      };

      if (!result.hasMore) {
        break;
      }

      page++;

      // Add delay between pages if specified
      if (this.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delay));
      }
    }
  }
}

/**
 * Streaming formatter for WordPress data
 */
export class WordPressDataStreamer {
  /**
   * Streams WordPress posts with author and taxonomy information
   */
  static async *streamPosts(
    posts: unknown[],
    options: {
      includeAuthor?: boolean;
      includeCategories?: boolean;
      includeTags?: boolean;
      batchSize?: number;
    } = {},
  ): AsyncGenerator<StreamingResult<unknown>, void, unknown> {
    const streamer = new DataStreamer<unknown>({
      batchSize: options.batchSize || 20,
      transformItem: (post) => {
        const p = post as Record<string, unknown>;
        const title = p.title as Record<string, unknown> | undefined;
        const excerpt = p.excerpt as Record<string, unknown> | undefined;
        return {
          id: p.id,
          title: title?.rendered || "Untitled",
          excerpt: excerpt?.rendered
            ? String(excerpt.rendered)
                .replace(/<[^>]*>/g, "")
                .substring(0, 150) + "..."
            : "No excerpt",
          status: p.status,
          date: new Date(String(p.date)).toLocaleDateString(),
          link: p.link,
          author: options.includeAuthor ? p.author : undefined,
          categories: options.includeCategories ? p.categories : undefined,
          tags: options.includeTags ? p.tags : undefined,
        };
      },
      filterItem: (post) => {
        const p = post as Record<string, unknown>;
        return p.status !== "trash";
      }, // Filter out trashed posts
    });

    const processor = async (batch: unknown[]) => {
      // Simulate processing time for large datasets
      await new Promise((resolve) => setTimeout(resolve, 10));
      return batch;
    };

    for await (const result of streamer.streamBatches(posts, processor)) {
      yield result;
    }
  }

  /**
   * Streams WordPress users with role information
   */
  static async *streamUsers(
    users: unknown[],
    options: {
      includeRoles?: boolean;
      includeCapabilities?: boolean;
      batchSize?: number;
    } = {},
  ): AsyncGenerator<StreamingResult<unknown>, void, unknown> {
    const streamer = new DataStreamer<unknown>({
      batchSize: options.batchSize || 30,
      transformItem: (user) => {
        const u = user as Record<string, unknown>;
        return {
          id: u.id,
          name: u.name || "No name",
          username: u.slug || "unknown",
          email: u.email || "No email",
          roles: options.includeRoles ? u.roles : undefined,
          capabilities: options.includeCapabilities
            ? Object.keys((u.capabilities as Record<string, unknown>) || {})
            : undefined,
          registeredDate: u.registered_date ? new Date(String(u.registered_date)).toLocaleDateString() : "Unknown",
        };
      },
    });

    const processor = async (batch: unknown[]) => {
      // Add user processing logic here if needed
      return batch;
    };

    for await (const result of streamer.streamBatches(users, processor)) {
      yield result;
    }
  }

  /**
   * Streams WordPress comments with moderation status
   */
  static async *streamComments(
    comments: unknown[],
    options: {
      includeAuthor?: boolean;
      includePost?: boolean;
      batchSize?: number;
    } = {},
  ): AsyncGenerator<StreamingResult<unknown>, void, unknown> {
    const streamer = new DataStreamer<unknown>({
      batchSize: options.batchSize || 40,
      transformItem: (comment) => {
        const c = comment as Record<string, unknown>;
        const content = c.content as Record<string, unknown> | undefined;
        return {
          id: c.id,
          content: content?.rendered
            ? String(content.rendered)
                .replace(/<[^>]*>/g, "")
                .substring(0, 200) + "..."
            : "No content",
          status: c.status,
          date: new Date(String(c.date)).toLocaleDateString(),
          author: options.includeAuthor
            ? {
                name: c.author_name,
                email: c.author_email,
                url: c.author_url,
              }
            : undefined,
          post: options.includePost ? c.post : undefined,
        };
      },
      filterItem: (comment) => {
        const c = comment as Record<string, unknown>;
        return c.status !== "spam";
      }, // Filter out spam comments
    });

    const processor = async (batch: unknown[]) => {
      // Add comment processing logic here if needed
      return batch;
    };

    for await (const result of streamer.streamBatches(comments, processor)) {
      yield result;
    }
  }
}

/**
 * Utility functions for streaming responses
 */
export class StreamingUtils {
  /**
   * Formats streaming results for display
   */
  static formatStreamingResponse(
    results: StreamingResult<unknown>[],
    type: "posts" | "users" | "comments" | "media" = "posts",
  ): string {
    const allData = results.flatMap((result) => result.data);
    const totalProcessed = results[results.length - 1]?.processed || 0;
    const hasMore = results[results.length - 1]?.hasMore || false;

    const typeEmojis = {
      posts: "📄",
      users: "👥",
      comments: "💬",
      media: "📎",
    };

    const emoji = typeEmojis[type];
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);

    let response = `${emoji} **${typeName} Results** (Streamed)\n\n`;
    response += `📊 **Summary**: ${allData.length} items displayed, ${totalProcessed} processed total\n`;

    if (hasMore) {
      response += `⏳ **Status**: More data available (streaming in progress)\n`;
    } else {
      response += `✅ **Status**: Complete\n`;
    }

    response += `🕐 **Retrieved**: ${new Date().toLocaleString()}\n\n`;

    // Format individual items
    allData.forEach((item, index) => {
      // Type-safe property access
      const itemObj = item as Record<string, unknown>;
      const title = itemObj.title || itemObj.name || (itemObj.content as string)?.substring(0, 50) || "Item";
      response += `${index + 1}. **${title}**\n`;

      if (itemObj.excerpt) response += `   📝 ${itemObj.excerpt}\n`;
      if (itemObj.email) response += `   📧 ${itemObj.email}\n`;
      if (itemObj.status) response += `   🏷️ Status: ${itemObj.status}\n`;
      if (itemObj.date) response += `   📅 Date: ${itemObj.date}\n`;

      response += "\n";
    });

    return response;
  }

  /**
   * Implements progressive loading for large datasets
   */
  static async loadProgressively<T>(
    fetcher: (offset: number, limit: number) => Promise<T[]>,
    options: {
      initialLoad?: number;
      batchSize?: number;
      maxItems?: number;
      onProgress?: (loaded: number, total?: number) => void;
    } = {},
  ): Promise<T[]> {
    const initialLoad = options.initialLoad || 50;
    const batchSize = options.batchSize || 25;
    const maxItems = options.maxItems || 1000;

    const results: T[] = [];
    let offset = 0;

    // Initial load
    const initialBatch = await fetcher(offset, initialLoad);
    results.push(...initialBatch);
    offset += initialLoad;

    if (options.onProgress) {
      options.onProgress(results.length);
    }

    // Progressive loading
    while (results.length < maxItems) {
      const batch = await fetcher(offset, batchSize);

      if (batch.length === 0) {
        break;
      }

      results.push(...batch);
      offset += batchSize;

      if (options.onProgress) {
        options.onProgress(results.length, maxItems);
      }

      // Small delay to prevent overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results.slice(0, maxItems);
  }
}

/**
 * Memory-efficient data processor
 */
export class MemoryEfficientProcessor {
  /**
   * Processes large datasets with memory monitoring
   */
  static async processLargeDataset<T, U>(
    dataProvider: () => AsyncGenerator<T[], void, unknown>,
    processor: (items: T[]) => Promise<U[]>,
    options: {
      maxMemoryUsage?: number; // in MB
      batchSize?: number;
      onProgress?: (processed: number) => void;
    } = {},
  ): Promise<U[]> {
    const maxMemory = options.maxMemoryUsage || 100; // 100MB default
    const batchSize = options.batchSize || 50;
    const results: U[] = [];
    let processed = 0;

    for await (const batch of dataProvider()) {
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

      if (memoryUsageMB > maxMemory) {
        // If memory usage is too high, process in smaller batches
        const smallerBatches = this.chunkArray(batch, Math.floor(batchSize / 2));

        for (const smallBatch of smallerBatches) {
          const processed_batch = await processor(smallBatch);
          results.push(...processed_batch);
          processed += smallBatch.length;

          if (options.onProgress) {
            options.onProgress(processed);
          }

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      } else {
        // Normal processing
        const processed_batch = await processor(batch);
        results.push(...processed_batch);
        processed += batch.length;

        if (options.onProgress) {
          options.onProgress(processed);
        }
      }
    }

    return results;
  }

  /**
   * Helper method to split arrays into chunks
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
