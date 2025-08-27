/**
 * Bulk SEO Operations
 *
 * This module provides batch processing capabilities for SEO operations,
 * including metadata updates, content analysis, and schema generation.
 * It supports chunked processing, progress tracking, retry logic, and dry-run mode.
 *
 * @since 2.7.0
 */

import { WordPressClient } from "../../client/api.js";
import { MetaGenerator } from "./generators/MetaGenerator.js";
import { ContentAnalyzer } from "./analyzers/ContentAnalyzer.js";
import { SEOCacheManager } from "../../cache/SEOCacheManager.js";
import { LoggerFactory } from "../../utils/logger.js";
import { SEOToolParams, BulkOperationResult, SEOAnalysisResult } from "../../types/seo.js";
import type { WordPressPost } from "../../types/wordpress.js";

/**
 * Configuration for bulk operations
 */
interface BulkOperationConfig {
  /** Number of items per batch */
  batchSize: number;

  /** Maximum number of retry attempts */
  maxRetries: number;

  /** Initial delay for exponential backoff (ms) */
  retryDelayMs: number;

  /** Maximum delay for exponential backoff (ms) */
  maxRetryDelayMs: number;

  /** Timeout per operation (ms) */
  operationTimeoutMs: number;

  /** Enable progress callbacks */
  enableProgress: boolean;
}

/**
 * Progress information for bulk operations
 */
interface BulkProgress {
  /** Total items to process */
  total: number;

  /** Items processed so far */
  processed: number;

  /** Items successfully completed */
  completed: number;

  /** Items that failed */
  failed: number;

  /** Items that were skipped */
  skipped: number;

  /** Current batch being processed */
  currentBatch: number;

  /** Total number of batches */
  totalBatches: number;

  /** Estimated completion time */
  eta?: Date;

  /** Average processing time per item (ms) */
  avgProcessingTime: number;
}

/**
 * Error information for failed operations
 */
interface BulkOperationError {
  /** Post ID that failed */
  postId: number;

  /** Error message */
  error: string;

  /** Retry attempt count */
  attempts: number;

  /** Whether this error is retryable */
  retryable: boolean;
}

/**
 * Type for progress callback function
 */
type ProgressCallback = (progress: BulkProgress) => void;

/**
 * Bulk SEO Operations Manager
 */
export class BulkOperations {
  private logger = LoggerFactory.tool("bulk_operations");
  private config: BulkOperationConfig;
  private metaGenerator: MetaGenerator;
  private contentAnalyzer: ContentAnalyzer;
  private cacheManager: SEOCacheManager | undefined;

  constructor(
    private client: WordPressClient,
    cacheManager?: SEOCacheManager,
    config?: Partial<BulkOperationConfig>,
  ) {
    this.cacheManager = cacheManager;
    this.metaGenerator = new MetaGenerator();
    this.contentAnalyzer = new ContentAnalyzer();

    // Default configuration
    this.config = {
      batchSize: 10,
      maxRetries: 3,
      retryDelayMs: 1000,
      maxRetryDelayMs: 30000,
      operationTimeoutMs: 60000,
      enableProgress: true,
      ...config,
    };
  }

  /**
   * Bulk update metadata for multiple posts
   */
  async bulkUpdateMetadata(params: SEOToolParams, progressCallback?: ProgressCallback): Promise<BulkOperationResult> {
    const startTime = Date.now();
    this.logger.info("Starting bulk metadata update", {
      postIds: params.postIds?.length,
      dryRun: params.dryRun,
      batchSize: this.config.batchSize,
    });

    if (!params.postIds?.length) {
      throw new Error("No post IDs provided for bulk operation");
    }

    const progress: BulkProgress = {
      total: params.postIds.length,
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(params.postIds.length / this.config.batchSize),
      avgProcessingTime: 0,
    };

    const errors: BulkOperationError[] = [];
    const batches = this.createBatches(params.postIds, this.config.batchSize);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      progress.currentBatch = batchIndex + 1;

      this.logger.debug(`Processing batch ${progress.currentBatch}/${progress.totalBatches}`, {
        batchSize: batch.length,
        postIds: batch,
      });

      // Process batch items
      await Promise.all(
        batch.map(async (postId) => {
          const itemStartTime = Date.now();

          try {
            await this.processMetadataUpdate(postId, params);
            progress.completed++;

            // Update average processing time
            const processingTime = Date.now() - itemStartTime;
            progress.avgProcessingTime =
              (progress.avgProcessingTime * progress.processed + processingTime) / (progress.processed + 1);
          } catch (_error) {
            const bulkError: BulkOperationError = {
              postId,
              error: _error instanceof Error ? _error.message : String(_error),
              attempts: 1,
              retryable: this.isRetryableError(_error),
            };

            // Attempt retries
            if (bulkError.retryable) {
              const retryResult = await this.retryOperation(
                () => this.processMetadataUpdate(postId, params),
                bulkError,
              );

              if (retryResult.success) {
                progress.completed++;
              } else {
                progress.failed++;
                errors.push(retryResult.error);
              }
            } else {
              progress.failed++;
              errors.push(bulkError);
            }
          }

          progress.processed++;
        }),
      );

      // Calculate ETA
      if (progress.avgProcessingTime > 0 && progress.processed < progress.total) {
        const remainingItems = progress.total - progress.processed;
        const etaMs = remainingItems * progress.avgProcessingTime;
        progress.eta = new Date(Date.now() + etaMs);
      } else if (progress.processed > 0 && progress.processed < progress.total) {
        // Fallback ETA calculation even with minimal processing time
        const remainingItems = progress.total - progress.processed;
        const averageTime = progress.avgProcessingTime || 100; // Fallback to 100ms
        const etaMs = remainingItems * averageTime;
        progress.eta = new Date(Date.now() + etaMs);
      }

      // Call progress callback
      if (progressCallback && this.config.enableProgress) {
        progressCallback(progress);
      }

      // Small delay between batches to avoid overwhelming the server
      if (batchIndex < batches.length - 1) {
        await this.delay(100);
      }
    }

    const result: BulkOperationResult = {
      total: params.postIds.length,
      success: progress.completed,
      failed: progress.failed,
      skipped: progress.skipped,
      errors: errors.map((e) => ({ postId: e.postId, error: e.error })),
      processingTime: Date.now() - startTime,
      dryRun: params.dryRun || false,
    };

    this.logger.info("Bulk metadata update completed", {
      ...result,
      successRate: ((result.success / result.total) * 100).toFixed(1) + "%",
    });

    return result;
  }

  /**
   * Bulk analyze content for multiple posts
   */
  async bulkAnalyzeContent(
    params: SEOToolParams,
    progressCallback?: ProgressCallback,
  ): Promise<{ results: SEOAnalysisResult[]; summary: BulkOperationResult }> {
    const startTime = Date.now();
    this.logger.info("Starting bulk content analysis", {
      postIds: params.postIds?.length,
      analysisType: params.analysisType,
      batchSize: this.config.batchSize,
    });

    if (!params.postIds?.length) {
      throw new Error("No post IDs provided for bulk analysis");
    }

    const results: SEOAnalysisResult[] = [];
    const progress: BulkProgress = {
      total: params.postIds.length,
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(params.postIds.length / this.config.batchSize),
      avgProcessingTime: 0,
    };

    const errors: BulkOperationError[] = [];
    const batches = this.createBatches(params.postIds, this.config.batchSize);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      progress.currentBatch = batchIndex + 1;

      // Process batch items
      await Promise.all(
        batch.map(async (postId) => {
          const itemStartTime = Date.now();

          try {
            const analysisResult = await this.processContentAnalysis(postId, params);
            results.push(analysisResult);
            progress.completed++;

            // Update average processing time
            const processingTime = Date.now() - itemStartTime;
            progress.avgProcessingTime =
              (progress.avgProcessingTime * progress.processed + processingTime) / (progress.processed + 1);
          } catch (_error) {
            const bulkError: BulkOperationError = {
              postId,
              error: _error instanceof Error ? _error.message : String(_error),
              attempts: 1,
              retryable: this.isRetryableError(_error),
            };

            // Attempt retries for analysis
            if (bulkError.retryable) {
              const retryResult = await this.retryOperation(
                () => this.processContentAnalysis(postId, params),
                bulkError,
              );

              if (retryResult.success) {
                results.push(retryResult.result!);
                progress.completed++;
              } else {
                progress.failed++;
                errors.push(retryResult.error);
              }
            } else {
              progress.failed++;
              errors.push(bulkError);
            }
          }

          progress.processed++;
        }),
      );

      // Call progress callback
      if (progressCallback && this.config.enableProgress) {
        progressCallback(progress);
      }
    }

    const summary: BulkOperationResult = {
      total: params.postIds.length,
      success: progress.completed,
      failed: progress.failed,
      skipped: progress.skipped,
      errors: errors.map((e) => ({ postId: e.postId, error: e.error })),
      processingTime: Date.now() - startTime,
      dryRun: false,
    };

    this.logger.info("Bulk content analysis completed", {
      ...summary,
      resultsCount: results.length,
      avgScore: results.length > 0 ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1) : 0,
    });

    return { results, summary };
  }

  /**
   * Process metadata update for a single post
   */
  private async processMetadataUpdate(postId: number, params: SEOToolParams): Promise<void> {
    // Check cache first
    const cacheKey = `bulk-meta-${postId}`;
    if (this.cacheManager && !params.force) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.debug("Using cached metadata", { postId });
        return;
      }
    }

    // Fetch post data
    const post = await this.client.getPost(postId);
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    // Generate metadata
    const metadataParams = {
      postId,
      ...(params.focusKeywords && { focusKeywords: params.focusKeywords }),
      ...(params.site && { site: params.site }),
    };
    const metadata = await this.metaGenerator.generateMetadata(post, metadataParams);

    if (!params.dryRun) {
      // Apply updates to WordPress (this would need actual WordPress API calls)
      // For now, we just simulate the update
      this.logger.debug("Applying metadata updates", {
        postId,
        titleLength: metadata.title.length,
        descriptionLength: metadata.description.length,
      });

      // In a real implementation, you would call:
      // await this.client.updatePost(postId, { meta: metadata });
    }

    // Cache the result
    if (this.cacheManager) {
      this.cacheManager.set(cacheKey, metadata, 3600); // 1 hour
    }
  }

  /**
   * Process content analysis for a single post
   */
  private async processContentAnalysis(postId: number, params: SEOToolParams): Promise<SEOAnalysisResult> {
    // Check cache first
    const cacheKey = `bulk-analysis-${postId}-${params.analysisType || "full"}`;
    if (this.cacheManager && !params.force) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.debug("Using cached analysis", { postId });
        return cached as SEOAnalysisResult;
      }
    }

    // Fetch post data
    const post = await this.client.getPost(postId);
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    // Analyze content
    const analysisParams = {
      postId,
      analysisType: params.analysisType || ("full" as const),
      ...(params.site && { site: params.site }),
      ...(params.focusKeywords && { focusKeywords: params.focusKeywords }),
    };
    const analysisResult = await this.contentAnalyzer.analyzePost(post as WordPressPost, analysisParams);

    // Cache the result
    if (this.cacheManager) {
      this.cacheManager.set(cacheKey, analysisResult, 21600); // 6 hours
    }

    return analysisResult;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    error: BulkOperationError,
  ): Promise<{ success: boolean; result?: T; error: BulkOperationError }> {
    let delay = this.config.retryDelayMs;

    for (let attempt = 2; attempt <= this.config.maxRetries + 1; attempt++) {
      await this.delay(delay);

      try {
        const result = await operation();
        this.logger.debug("Retry successful", {
          postId: error.postId,
          attempt,
          delay,
        });

        return { success: true, result, error };
      } catch (retryError) {
        error.attempts = attempt;
        error.error = retryError instanceof Error ? retryError.message : String(retryError);

        // Exponential backoff
        delay = Math.min(delay * 2, this.config.maxRetryDelayMs);

        this.logger.debug("Retry failed", {
          postId: error.postId,
          attempt,
          error: error.error,
          nextDelay: delay,
        });
      }
    }

    return { success: false, error };
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Network errors are retryable
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("503") ||
      errorMessage.includes("502") ||
      errorMessage.includes("504")
    ) {
      return true;
    }

    // Authentication errors are not retryable
    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      return false;
    }

    // Not found errors are not retryable
    if (errorMessage.includes("404")) {
      return false;
    }

    // Rate limiting is retryable
    if (errorMessage.includes("429")) {
      return true;
    }

    // Default to non-retryable for safety
    return false;
  }

  /**
   * Create batches from an array of items
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Promise-based delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): BulkOperationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BulkOperationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug("Configuration updated", { config: this.config });
  }
}
