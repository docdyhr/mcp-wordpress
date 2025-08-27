/**
 * SEO WordPress Client
 *
 * Extended WordPress REST API client with enhanced SEO capabilities.
 * Provides specialized methods for SEO metadata management, schema markup,
 * and integration with popular WordPress SEO plugins like Yoast and RankMath.
 *
 * Features:
 * - SEO metadata retrieval and updates via REST API
 * - Integration with Yoast SEO and RankMath plugin APIs
 * - Schema markup management through WordPress custom fields
 * - Bulk SEO operations with progress tracking
 * - SEO-specific data normalization and validation
 * - Plugin-agnostic metadata handling
 *
 * @since 2.7.0
 */

import { WordPressClient } from "./api.js";
import { LoggerFactory } from "../utils/logger.js";
import { handleToolError } from "../utils/error.js";
import type { WordPressPost, WordPressPage } from "../types/wordpress.js";
import type { WordPressClientConfig } from "../types/client.js";
import type { SEOMetadata, SchemaMarkup } from "../types/seo.js";

/**
 * SEO plugin metadata field mappings
 */
interface SEOPluginFields {
  yoast: {
    title: string;
    description: string;
    focusKeyword: string;
    canonical: string;
    noindex: string;
    nofollow: string;
    schema: string;
  };
  rankmath: {
    title: string;
    description: string;
    focusKeyword: string;
    canonical: string;
    robots: string;
    schema: string;
  };
  seopress: {
    title: string;
    description: string;
    targetKeyword: string;
    canonical: string;
    robots: string;
  };
  none: {
    title: string;
    description: string;
    focusKeyword: string;
    canonical: string;
    noindex: string;
    nofollow: string;
    schema: string;
  };
}

/**
 * SEO data structure for API responses
 */
interface SEODataResponse {
  postId: number;
  metadata: SEOMetadata;
  schema?: SchemaMarkup | undefined;
  plugin: "yoast" | "rankmath" | "seopress" | "none";
  pluginVersion?: string | undefined;
  lastModified: string;
}

/**
 * Bulk SEO operation parameters
 */
interface BulkSEOParams {
  postIds: number[];
  operation: "get" | "update";
  metadata?: Partial<SEOMetadata>;
  batchSize?: number;
  progressCallback?: (processed: number, total: number) => void;
}

/**
 * Extended WordPress client with SEO capabilities
 */
export class SEOWordPressClient extends WordPressClient {
  private logger = LoggerFactory.tool("seo_client");
  private detectedPlugin: "yoast" | "rankmath" | "seopress" | "none" = "none";
  private pluginFields: SEOPluginFields;

  constructor(config?: Partial<WordPressClientConfig>) {
    super(config);

    // Define field mappings for different SEO plugins
    this.pluginFields = {
      yoast: {
        title: "_yoast_wpseo_title",
        description: "_yoast_wpseo_metadesc",
        focusKeyword: "_yoast_wpseo_focuskw",
        canonical: "_yoast_wpseo_canonical",
        noindex: "_yoast_wpseo_meta-robots-noindex",
        nofollow: "_yoast_wpseo_meta-robots-nofollow",
        schema: "_yoast_wpseo_schema_page_type",
      },
      rankmath: {
        title: "rank_math_title",
        description: "rank_math_description",
        focusKeyword: "rank_math_focus_keyword",
        canonical: "rank_math_canonical_url",
        robots: "rank_math_robots",
        schema: "rank_math_rich_snippet",
      },
      seopress: {
        title: "_seopress_titles_title",
        description: "_seopress_titles_desc",
        targetKeyword: "_seopress_analysis_target_kw",
        canonical: "_seopress_robots_canonical",
        robots: "_seopress_robots_index",
      },
      none: {
        title: "meta_title",
        description: "meta_description",
        focusKeyword: "focus_keyword",
        canonical: "canonical_url",
        noindex: "robots_noindex",
        nofollow: "robots_nofollow",
        schema: "schema_markup",
      },
    };
  }

  /**
   * Initialize and detect SEO plugins
   */
  async initializeSEO(): Promise<void> {
    this.logger.debug("Initializing SEO client and detecting plugins");

    try {
      // Detect active SEO plugins
      await this.detectSEOPlugins();

      this.logger.info("SEO client initialized", {
        detectedPlugin: this.detectedPlugin,
      });
    } catch (_error) {
      this.logger.warn("SEO plugin detection failed, using generic approach", {
        _error: _error instanceof Error ? _error.message : String(_error),
      });
    }
  }

  /**
   * Detect active SEO plugins on the WordPress site
   */
  private async detectSEOPlugins(): Promise<void> {
    try {
      // Try to detect Yoast SEO by checking for its REST API endpoints
      try {
        const yoastCheck = await this.get("yoast/v1/meta", { timeout: 5000 });
        if (yoastCheck) {
          this.detectedPlugin = "yoast";
          return;
        }
      } catch {
        // Yoast not detected, continue
      }

      // Try to detect RankMath by checking for common meta fields
      try {
        const posts = await this.getPosts({ per_page: 1, meta_key: "rank_math_title" });
        if (posts && posts.length > 0) {
          this.detectedPlugin = "rankmath";
          return;
        }
      } catch {
        // RankMath not detected, continue
      }

      // Try to detect SEOPress
      try {
        const posts = await this.getPosts({ per_page: 1, meta_key: "_seopress_titles_title" });
        if (posts && posts.length > 0) {
          this.detectedPlugin = "seopress";
          return;
        }
      } catch {
        // SEOPress not detected
      }

      this.logger.debug("No SEO plugins detected, using generic metadata approach");
    } catch (_error) {
      this.logger.error("Plugin detection failed", {
        _error: _error instanceof Error ? _error.message : String(_error),
      });
    }
  }

  /**
   * Get SEO metadata for a post or page
   */
  async getSEOMetadata(postId: number, type: "post" | "page" = "post"): Promise<SEODataResponse> {
    this.logger.debug("Fetching SEO metadata", { postId, type, plugin: this.detectedPlugin });

    try {
      // Get the post/page with meta fields
      const content =
        type === "post"
          ? await this.getPost(postId, "edit") // edit context includes meta
          : await this.getPage(postId, "edit");

      if (!content) {
        throw new Error(`${type} with ID ${postId} not found`);
      }

      // Extract SEO metadata based on detected plugin
      const metadata = this.extractSEOMetadata(content);

      // Extract schema markup if available
      const schema = this.extractSchemaMarkup(content);

      return {
        postId: postId,
        metadata,
        schema,
        plugin: this.detectedPlugin,
        lastModified: content.modified || content.date || new Date().toISOString(),
      };
    } catch (_error) {
      handleToolError(_error, "get SEO metadata", { postId, type });
      throw _error;
    }
  }

  /**
   * Update SEO metadata for a post or page
   */
  async updateSEOMetadata(
    postId: number,
    metadata: Partial<SEOMetadata>,
    type: "post" | "page" = "post",
  ): Promise<SEODataResponse> {
    this.logger.debug("Updating SEO metadata", { postId, type, plugin: this.detectedPlugin });

    try {
      // Prepare meta fields based on detected plugin
      const metaFields = this.prepareSEOMetaFields(metadata);

      // Update the post/page with new meta fields
      const updateData = {
        id: postId,
        meta: metaFields,
      };

      const _updatedContent = type === "post" ? await this.updatePost(updateData) : await this.updatePage(updateData);

      // Return updated SEO data
      return await this.getSEOMetadata(postId, type);
    } catch (_error) {
      handleToolError(_error, "update SEO metadata", { postId, type });
      throw _error;
    }
  }

  /**
   * Bulk get SEO metadata for multiple posts
   */
  async bulkGetSEOMetadata(params: BulkSEOParams): Promise<SEODataResponse[]> {
    this.logger.info("Starting bulk SEO metadata retrieval", {
      postCount: params.postIds.length,
      batchSize: params.batchSize || 10,
    });

    const results: SEODataResponse[] = [];
    const batchSize = params.batchSize || 10;
    const total = params.postIds.length;

    // Process in batches
    for (let i = 0; i < params.postIds.length; i += batchSize) {
      const batch = params.postIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (postId) => {
        try {
          return await this.getSEOMetadata(postId);
        } catch (_error) {
          this.logger.warn("Failed to get SEO metadata for post", {
            postId,
            _error: _error instanceof Error ? _error.message : String(_error),
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...(batchResults.filter((r) => r !== null) as SEODataResponse[]));

      // Report progress
      const processed = Math.min(i + batchSize, total);
      if (params.progressCallback) {
        params.progressCallback(processed, total);
      }

      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < params.postIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.logger.info("Bulk SEO metadata retrieval completed", {
      requested: total,
      successful: results.length,
      failed: total - results.length,
    });

    return results;
  }

  /**
   * Bulk update SEO metadata for multiple posts
   */
  async bulkUpdateSEOMetadata(params: BulkSEOParams & { metadata: Partial<SEOMetadata> }): Promise<SEODataResponse[]> {
    this.logger.info("Starting bulk SEO metadata update", {
      postCount: params.postIds.length,
      batchSize: params.batchSize || 5, // Smaller batches for updates
    });

    const results: SEODataResponse[] = [];
    const batchSize = params.batchSize || 5;
    const total = params.postIds.length;

    // Process in smaller batches for updates
    for (let i = 0; i < params.postIds.length; i += batchSize) {
      const batch = params.postIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (postId) => {
        try {
          return await this.updateSEOMetadata(postId, params.metadata);
        } catch (_error) {
          this.logger.warn("Failed to update SEO metadata for post", {
            postId,
            _error: _error instanceof Error ? _error.message : String(_error),
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...(batchResults.filter((r) => r !== null) as SEODataResponse[]));

      // Report progress
      const processed = Math.min(i + batchSize, total);
      if (params.progressCallback) {
        params.progressCallback(processed, total);
      }

      // Longer delay between update batches
      if (i + batchSize < params.postIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    this.logger.info("Bulk SEO metadata update completed", {
      requested: total,
      successful: results.length,
      failed: total - results.length,
    });

    return results;
  }

  /**
   * Get all posts with SEO metadata for site audit
   */
  async getAllPostsWithSEO(
    params: {
      postTypes?: string[];
      maxPosts?: number;
      includePages?: boolean;
    } = {},
  ): Promise<Array<(WordPressPost | WordPressPage) & { seoData?: SEODataResponse }>> {
    this.logger.debug("Fetching all posts with SEO data for audit", params);

    const maxPosts = params.maxPosts || 100;
    const results: Array<(WordPressPost | WordPressPage) & { seoData?: SEODataResponse }> = [];

    try {
      // Get posts
      const posts = await this.getPosts({
        per_page: maxPosts,
        status: ["publish"],
        context: "edit", // Include meta fields
      });

      // Get pages if requested
      let pages: WordPressPage[] = [];
      if (params.includePages) {
        pages = await this.getPages({
          per_page: Math.max(20, Math.floor(maxPosts / 5)), // 20% allocation for pages
          status: ["publish"],
          context: "edit",
        });
      }

      // Process posts
      for (const post of posts || []) {
        try {
          const seoData = await this.getSEOMetadata(post.id, "post");
          results.push({ ...post, seoData });
        } catch (_error) {
          // Include post without SEO data if metadata fetch fails
          results.push(post);
          this.logger.debug("Failed to get SEO data for post", { postId: post.id });
        }
      }

      // Process pages
      for (const page of pages) {
        try {
          const seoData = await this.getSEOMetadata(page.id, "page");
          results.push({ ...page, seoData });
        } catch (_error) {
          // Include page without SEO data if metadata fetch fails
          results.push(page);
          this.logger.debug("Failed to get SEO data for page", { pageId: page.id });
        }
      }

      this.logger.info("Retrieved posts with SEO data", {
        totalPosts: posts?.length || 0,
        totalPages: pages.length,
        withSEOData: results.filter((r) => r.seoData).length,
      });

      return results;
    } catch (_error) {
      handleToolError(_error, "get all posts with SEO data", params);
      throw _error;
    }
  }

  /**
   * Extract SEO metadata from WordPress post/page object
   */
  private extractSEOMetadata(content: WordPressPost | WordPressPage): SEOMetadata {
    const meta = (content as unknown).meta || {};
    const fields = this.pluginFields[this.detectedPlugin];

    // Extract basic metadata with plugin-specific field handling
    const focusKeyword = this.getPluginFocusKeyword(meta, fields);
    const canonical = this.extractMetaValue(meta, fields?.canonical);

    const metadata: SEOMetadata = {
      title: this.extractMetaValue(meta, fields?.title) || content.title?.rendered || "",
      description: this.extractMetaValue(meta, fields?.description) || content.excerpt?.rendered || "",
      ...(focusKeyword && { focusKeyword }),
      ...(canonical && { canonical }),
    };

    // Extract robots directives based on plugin
    if (this.detectedPlugin === "yoast" && "noindex" in fields && "nofollow" in fields) {
      metadata.robots = {
        index: this.extractMetaValue(meta, fields.noindex) !== "1",
        follow: this.extractMetaValue(meta, fields.nofollow) !== "1",
      };
    } else if (this.detectedPlugin === "rankmath" && "robots" in fields) {
      const robotsValue = this.extractMetaValue(meta, fields.robots) || "";
      metadata.robots = {
        index: !robotsValue.includes("noindex"),
        follow: !robotsValue.includes("nofollow"),
      };
    }

    // Extract OpenGraph data if available
    metadata.openGraph = {
      title: metadata.title,
      description: metadata.description,
      type: content.type === "page" ? "website" : "article",
      url: content.link,
    };

    return metadata;
  }

  /**
   * Extract schema markup from post meta
   */
  private extractSchemaMarkup(content: WordPressPost | WordPressPage): SchemaMarkup | undefined {
    const meta = (content as unknown).meta || {};
    const fields = this.pluginFields[this.detectedPlugin];

    const schemaData = this.getPluginSchemaData(meta, fields);
    if (!schemaData) {
      return undefined;
    }

    try {
      // Try to parse JSON-LD schema
      if (typeof schemaData === "string" && schemaData.startsWith("{")) {
        return JSON.parse(schemaData) as SchemaMarkup;
      }

      // Handle Yoast schema page types
      if (this.detectedPlugin === "yoast" && schemaData) {
        return {
          "@context": "https://schema.org",
          "@type": schemaData as unknown,
        };
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Prepare meta fields for SEO metadata update
   */
  private prepareSEOMetaFields(metadata: Partial<SEOMetadata>): Record<string, unknown> {
    const fields = this.pluginFields[this.detectedPlugin];
    const metaFields: Record<string, unknown> = {};

    // Map metadata to plugin-specific fields
    if (metadata.title && fields?.title) {
      metaFields[fields.title] = metadata.title;
    }

    if (metadata.description && fields?.description) {
      metaFields[fields.description] = metadata.description;
    }

    if (metadata.focusKeyword) {
      const focusKeywordField = this.getPluginFocusKeywordField(fields);
      if (focusKeywordField) {
        metaFields[focusKeywordField] = metadata.focusKeyword;
      }
    }

    if (metadata.canonical && fields?.canonical) {
      metaFields[fields.canonical] = metadata.canonical;
    }

    // Handle robots directives
    if (metadata.robots && this.detectedPlugin === "yoast" && "noindex" in fields && "nofollow" in fields) {
      if (fields.noindex) {
        metaFields[fields.noindex] = metadata.robots.index ? "0" : "1";
      }
      if (fields.nofollow) {
        metaFields[fields.nofollow] = metadata.robots.follow ? "0" : "1";
      }
    } else if (metadata.robots && this.detectedPlugin === "rankmath" && "robots" in fields) {
      const robotsArray: string[] = [];
      if (!metadata.robots.index) robotsArray.push("noindex");
      if (!metadata.robots.follow) robotsArray.push("nofollow");
      metaFields[fields.robots] = robotsArray.join(",");
    }

    return metaFields;
  }

  /**
   * Extract meta value with array handling
   */
  private extractMetaValue(meta: Record<string, unknown>, fieldName?: string): string | undefined {
    if (!fieldName || !meta[fieldName]) {
      return undefined;
    }

    const value = meta[fieldName];

    // WordPress meta values can be arrays
    if (Array.isArray(value)) {
      return value[0] || undefined;
    }

    return value || undefined;
  }

  /**
   * Get plugin-specific focus keyword field
   */
  private getPluginFocusKeyword(meta: Record<string, unknown>, fields: Record<string, string>): string | undefined {
    if (this.detectedPlugin === "seopress" && "targetKeyword" in fields) {
      return this.extractMetaValue(meta, fields.targetKeyword) || undefined;
    } else if ("focusKeyword" in fields) {
      return this.extractMetaValue(meta, fields.focusKeyword) || undefined;
    }
    return undefined;
  }

  /**
   * Get plugin-specific schema data field
   */
  private getPluginSchemaData(meta: Record<string, unknown>, fields: Record<string, string>): string | undefined {
    if ("schema" in fields) {
      return this.extractMetaValue(meta, fields.schema) || undefined;
    }
    return undefined;
  }

  /**
   * Get plugin-specific focus keyword field name
   */
  private getPluginFocusKeywordField(fields: Record<string, string>): string | undefined {
    if (this.detectedPlugin === "seopress" && "targetKeyword" in fields) {
      return fields.targetKeyword;
    } else if ("focusKeyword" in fields) {
      return fields.focusKeyword;
    }
    return undefined;
  }

  /**
   * Test SEO plugin integration
   */
  async testSEOIntegration(): Promise<{
    pluginDetected: string;
    canReadMetadata: boolean;
    canWriteMetadata: boolean;
    samplePostsWithSEO: number;
    errors?: string[];
  }> {
    this.logger.info("Testing SEO integration");

    const result = {
      pluginDetected: this.detectedPlugin,
      canReadMetadata: false,
      canWriteMetadata: false,
      samplePostsWithSEO: 0,
      errors: [] as string[],
    };

    try {
      // Test reading metadata from recent posts
      const testPosts = await this.getPosts({ per_page: 5, status: ["publish"] });

      if (testPosts && testPosts.length > 0) {
        let postsWithSEO = 0;

        for (const post of testPosts) {
          try {
            const seoData = await this.getSEOMetadata(post.id);
            if (seoData.metadata.title || seoData.metadata.description) {
              postsWithSEO++;
            }
          } catch (_error) {
            result.errors?.push(`Failed to read SEO data for post ${post.id}: ${(_error as Error).message}`);
          }
        }

        result.samplePostsWithSEO = postsWithSEO;
        result.canReadMetadata = true;
      }

      // Test writing metadata (if we have posts to test with)
      if (testPosts && testPosts.length > 0 && result.canReadMetadata) {
        try {
          const testPost = testPosts[0];
          const originalSEO = await this.getSEOMetadata(testPost.id);

          // Make a small test update
          const testMetadata: Partial<SEOMetadata> = {
            description: (originalSEO.metadata.description || "") + " [TEST]",
          };

          await this.updateSEOMetadata(testPost.id, testMetadata);

          // Restore original data
          await this.updateSEOMetadata(testPost.id, {
            description: originalSEO.metadata.description,
          });

          result.canWriteMetadata = true;
        } catch (_error) {
          result.errors?.push(`Failed to write SEO data: ${(_error as Error).message}`);
        }
      }

      this.logger.info("SEO integration test completed", result);
      return result;
    } catch (_error) {
      result.errors?.push(`SEO integration test failed: ${(_error as Error).message}`);
      return result;
    }
  }
}
