/**
 * WordPress SEO Tools - Main Module
 *
 * This module provides comprehensive SEO management functionality for WordPress
 * through the MCP protocol. It combines content analysis, metadata generation,
 * schema markup, and optimization capabilities in a modular architecture.
 *
 * Features:
 * - Content analysis for readability and keyword optimization
 * - Metadata generation with AI assistance and safety filters
 * - Schema markup generation and validation
 * - Internal linking optimization
 * - Site audits and Core Web Vitals monitoring
 * - Bulk operations with progress tracking
 *
 * @since 2.7.0
 */

import { WordPressClient } from "@/client/api.js";
import { SEOWordPressClient } from "@/client/SEOWordPressClient.js";
import { LoggerFactory } from "@/utils/logger.js";
import { validateRequired, handleToolError } from "@/utils/error.js";
import { ContentAnalyzer } from "./analyzers/ContentAnalyzer.js";
import { MetaGenerator } from "./generators/MetaGenerator.js";
import { SchemaGenerator } from "./generators/SchemaGenerator.js";
import { InternalLinkingSuggester } from "./optimizers/InternalLinkingSuggester.js";
import { SiteAuditor } from "./auditors/SiteAuditor.js";
import { BulkOperations } from "./BulkOperations.js";
import { SEOCacheManager } from "@/cache/SEOCacheManager.js";
import { seoToolDefinitions } from "./SEOToolDefinitions.js";
import {
  handleAnalyzeContent,
  handleGenerateMetadata,
  handleBulkUpdateMetadata,
  handleGenerateSchema,
  handleValidateSchema,
  handleSuggestInternalLinks,
  handlePerformSiteAudit,
  handleTrackSERPPositions,
  handleKeywordResearch,
  handleTestSEOIntegration,
  handleGetLiveSEOData,
} from "./SEOHandlers.js";
import type {
  SEOAnalysisResult,
  SEOMetadata,
  SchemaMarkup,
  SEOToolParams,
  BulkOperationResult,
  SiteAuditResult,
} from "@/types/seo.js";
import type { WordPressPost } from "@/types/wordpress.js";

/**
 * Main SEOTools class that provides WordPress SEO management functionality.
 *
 * This class serves as the interface between the MCP framework and WordPress
 * SEO operations. It follows the established pattern of other tool classes
 * while providing SEO-specific capabilities.
 *
 * The class is designed with a modular architecture:
 * - Analyzers for content evaluation
 * - Generators for metadata and schema creation
 * - Validators for ensuring compliance
 * - Optimizers for performance improvements
 *
 * @since 2.7.0
 */
export class SEOTools {
  private logger = LoggerFactory.tool("seo");
  private clients: Map<string, WordPressClient> = new Map();
  private seoClients: Map<string, SEOWordPressClient> = new Map();
  private contentAnalyzer: ContentAnalyzer;
  private metaGenerator: MetaGenerator;
  private schemaGenerator: SchemaGenerator;
  private cacheManager: SEOCacheManager;
  // Client-dependent components created per request
  // private internalLinkingSuggester: InternalLinkingSuggester;
  // private siteAuditor: SiteAuditor;
  // private bulkOperations: BulkOperations;

  constructor() {
    this.contentAnalyzer = new ContentAnalyzer();
    this.metaGenerator = new MetaGenerator();
    this.schemaGenerator = new SchemaGenerator();
    this.cacheManager = new SEOCacheManager();
    // Note: Client-dependent components will be initialized when needed in handlers
    // this.internalLinkingSuggester - initialized per request
    // this.siteAuditor - initialized per request
    // this.bulkOperations - initialized per request
  }

  /**
   * Analyzes content for SEO optimization opportunities.
   *
   * Performs comprehensive analysis including:
   * - Readability scoring (Flesch-Kincaid)
   * - Keyword density and distribution
   * - Content structure evaluation
   * - Meta tag optimization suggestions
   *
   * @param params - Analysis parameters including post ID and analysis type
   * @returns Detailed SEO analysis with scores and recommendations
   */
  async analyzeContent(params: SEOToolParams): Promise<SEOAnalysisResult> {
    const siteLogger = LoggerFactory.tool("wp_seo_analyze_content", params.site);

    return await siteLogger.time("SEO content analysis", async () => {
      try {
        validateRequired(params, ["postId", "analysisType"]);
        const client = this.getSiteClient(params.site);

        // Check cache first
        const cacheKey = `seo:analyze:${params.site}:${params.postId as number}:${params.analysisType}`;
        const cached = await this.getCachedResult(cacheKey);
        if (cached) {
          siteLogger.debug("Cache hit for content analysis", { cacheKey });
          return cached as SEOAnalysisResult;
        }

        // Perform analysis (implementation will be added in analyzers)
        const result = await this.performAnalysis(client, params);

        // Cache the result
        await this.cacheResult(cacheKey, result, 21600); // 6 hours

        return result;
      } catch (_error) {
        handleToolError(_error, "analyze content", {
          site: params.site,
          postId: params.postId as number,
        });
        throw _error; // handleToolError will format it properly
      }
    });
  }

  /**
   * Generates optimized metadata for posts.
   *
   * Creates SEO-friendly metadata including:
   * - Title tags (60 character limit)
   * - Meta descriptions (155-160 characters)
   * - OpenGraph tags
   * - Twitter Card metadata
   *
   * @param params - Generation parameters including content and constraints
   * @returns Generated metadata with safety filters applied
   */
  async generateMetadata(params: SEOToolParams): Promise<SEOMetadata> {
    const siteLogger = LoggerFactory.tool("wp_seo_generate_meta", params.site);

    return await siteLogger.time("Generate SEO metadata", async () => {
      try {
        validateRequired(params, ["postId"]);
        const client = this.getSiteClient(params.site);

        // Implementation will be added in generators
        const metadata = await this.createMetadata(client, params);

        return metadata;
      } catch (_error) {
        handleToolError(_error, "generate metadata", {
          site: params.site,
          postId: params.postId as number,
        });
        throw _error;
      }
    });
  }

  /**
   * Performs bulk metadata updates with progress tracking.
   *
   * Handles large-scale metadata updates with:
   * - Batch processing (10 posts per batch)
   * - Progress event streaming
   * - Retry logic with exponential backoff
   * - Dry-run mode for validation
   *
   * @param params - Bulk operation parameters
   * @returns Operation results with success/failure counts
   */
  async bulkUpdateMetadata(params: SEOToolParams): Promise<BulkOperationResult> {
    const siteLogger = LoggerFactory.tool("wp_seo_bulk_update", params.site);

    return await siteLogger.time("Bulk metadata update", async () => {
      try {
        validateRequired(params, ["postIds", "updates"]);
        const client = this.getSiteClient(params.site);

        // Implementation will be added
        const result = await this.processBulkUpdate(client, params);

        return result;
      } catch (_error) {
        handleToolError(_error, "bulk update metadata", {
          site: params.site,
          count: (params.postIds as number[])?.length,
        });
        throw _error;
      }
    });
  }

  /**
   * Generates structured data schema markup.
   *
   * Creates JSON-LD schema for:
   * - Article, Product, FAQ, HowTo
   * - Organization, Website, BreadcrumbList
   * - Event, Recipe, Course, and more
   *
   * @param params - Schema generation parameters
   * @returns Valid JSON-LD schema markup
   */
  async generateSchema(params: SEOToolParams): Promise<SchemaMarkup> {
    const siteLogger = LoggerFactory.tool("wp_seo_generate_schema", params.site);

    return await siteLogger.time("Generate schema markup", async () => {
      try {
        validateRequired(params, ["postId", "schemaType"]);
        const client = this.getSiteClient(params.site);

        // Check cache
        const cacheKey = `seo:schema:${params.site}:${params.postId as number}:${params.schemaType}`;
        const cached = await this.getCachedResult(cacheKey);
        if (cached) {
          return cached as SchemaMarkup;
        }

        // Generate schema (implementation in generators)
        const schema = await this.createSchema(client, params);

        // Cache for 24 hours
        await this.cacheResult(cacheKey, schema, 86400);

        return schema;
      } catch (_error) {
        handleToolError(_error, "generate schema", {
          site: params.site,
          postId: params.postId as number,
          schemaType: params.schemaType,
        });
        throw _error;
      }
    });
  }

  /**
   * Validates schema markup for correctness.
   *
   * Performs validation using:
   * - Local validation rules
   * - Google Rich Results Test API (optional)
   * - Schema.org specifications
   *
   * @param params - Validation parameters including schema JSON
   * @returns Validation results with errors and warnings
   */
  async validateSchema(params: SEOToolParams): Promise<unknown> {
    const siteLogger = LoggerFactory.tool("wp_seo_validate_schema", params.site);

    return await siteLogger.time("Validate schema markup", async () => {
      try {
        validateRequired(params, ["schema"]);

        // Implementation will be added in validators
        const validation = await this.performSchemaValidation(params);

        return validation;
      } catch (_error) {
        handleToolError(_error, "validate schema", {
          site: params.site,
        });
        throw _error;
      }
    });
  }

  /**
   * Suggests internal linking opportunities.
   *
   * Analyzes content to suggest:
   * - Related posts for contextual linking
   * - Anchor text recommendations
   * - Hub-and-spoke content architectures
   * - Topical cluster connections
   *
   * @param params - Linking parameters including post ID
   * @returns Internal linking suggestions with confidence scores
   */
  async suggestInternalLinks(params: SEOToolParams): Promise<unknown> {
    const siteLogger = LoggerFactory.tool("wp_seo_internal_linking", params.site);

    return await siteLogger.time("Suggest internal links", async () => {
      try {
        validateRequired(params, ["postId"]);
        const client = this.getSiteClient(params.site);

        // Implementation will be added in optimizers
        const suggestions = await this.findLinkingOpportunities(client, params);

        return suggestions;
      } catch (_error) {
        handleToolError(_error, "suggest internal links", {
          site: params.site,
          postId: params.postId as number,
        });
        throw _error;
      }
    });
  }

  /**
   * Performs comprehensive site SEO audit.
   *
   * Audits include:
   * - Technical SEO issues
   * - Content quality analysis
   * - Core Web Vitals assessment
   * - Mobile usability checks
   * - Structured data validation
   *
   * @param params - Audit parameters including scope and depth
   * @returns Detailed audit results with prioritized recommendations
   */
  async performSiteAudit(params: SEOToolParams): Promise<SiteAuditResult> {
    const siteLogger = LoggerFactory.tool("wp_seo_site_audit", params.site);

    return await siteLogger.time("Perform site audit", async () => {
      try {
        const client = this.getSiteClient(params.site);

        // Cache key for audit results (1 hour TTL)
        const cacheKey = `seo:audit:${params.site}:${params.auditType || "full"}`;
        const cached = await this.getCachedResult(cacheKey);
        if (cached && (!params.force as boolean)) {
          return cached as SiteAuditResult;
        }

        // Perform audit (implementation will be added)
        const audit = await this.executeSiteAudit(client, params);

        // Cache for 1 hour
        await this.cacheResult(cacheKey, audit, 3600);

        return audit;
      } catch (_error) {
        handleToolError(_error, "perform site audit", {
          site: params.site,
          auditType: params.auditType,
        });
        throw _error;
      }
    });
  }

  /**
   * Retrieves all SEO tool definitions for MCP registration.
   *
   * @returns Array of SEO tool definitions with handlers
   */
  public getTools(): unknown[] {
    return seoToolDefinitions.map((toolDef) => ({
      ...toolDef,
      handler: this.getHandlerForTool(toolDef.name),
    }));
  }

  /**
   * Maps tool names to their corresponding handler methods.
   *
   * @param toolName - Name of the tool
   * @returns Handler function for the tool
   * @private
   */
  private getHandlerForTool(toolName: string): unknown {
    const handlers: Record<string, unknown> = {
      wp_seo_analyze_content: handleAnalyzeContent,
      wp_seo_generate_metadata: handleGenerateMetadata,
      wp_seo_bulk_update_metadata: handleBulkUpdateMetadata,
      wp_seo_generate_schema: handleGenerateSchema,
      wp_seo_validate_schema: handleValidateSchema,
      wp_seo_suggest_internal_links: handleSuggestInternalLinks,
      wp_seo_site_audit: handlePerformSiteAudit,
      wp_seo_track_serp: handleTrackSERPPositions,
      wp_seo_keyword_research: handleKeywordResearch,
      wp_seo_test_integration: handleTestSEOIntegration,
      wp_seo_get_live_data: handleGetLiveSEOData,
    };

    return (
      handlers[toolName] ||
      (() => {
        throw new Error(`Unknown SEO tool: ${toolName}`);
      })
    );
  }

  /**
   * Gets or creates a WordPress client for the specified site.
   *
   * @param site - Site identifier
   * @returns WordPress client instance
   * @private
   */
  private getSiteClient(site?: string): WordPressClient {
    const siteId = site || "default";

    if (!this.clients.has(siteId)) {
      // Create new client for site (implementation depends on multi-site config)
      const client = new WordPressClient();
      this.clients.set(siteId, client);
    }

    return this.clients.get(siteId)!;
  }

  /**
   * Get SEO-enhanced WordPress client for a specific site
   */
  private async getSEOClient(site?: string): Promise<SEOWordPressClient> {
    const siteId = site || "default";

    if (!this.seoClients.has(siteId)) {
      // Get base client config and create SEO client
      const baseClient = this.getSiteClient(site);
      const seoClient = new SEOWordPressClient(baseClient.config);

      // Initialize SEO capabilities
      await seoClient.initializeSEO();

      this.seoClients.set(siteId, seoClient);
    }

    return this.seoClients.get(siteId)!;
  }

  /**
   * Retrieves cached result if available.
   *
   * @param key - Cache key
   * @returns Cached result or null
   * @private
   */
  private async getCachedResult(key: string): Promise<unknown | null> {
    return this.cacheManager.get(key);
  }

  /**
   * Caches a result with specified TTL.
   *
   * @param key - Cache key
   * @param result - Result to cache
   * @param ttl - Time to live in seconds
   * @private
   */
  private async cacheResult(key: string, result: unknown, ttl: number): Promise<void> {
    await this.cacheManager.set(key, result, ttl);
  }

  // Implementation methods
  private async performAnalysis(client: WordPressClient, params: SEOToolParams): Promise<SEOAnalysisResult> {
    // Fetch the post data
    const post = await client.getPost(params.postId as number);

    // Perform content analysis
    return await this.contentAnalyzer.analyzePost(post as WordPressPost, params);
  }

  private async createMetadata(client: WordPressClient, params: SEOToolParams): Promise<SEOMetadata> {
    // Fetch the post data
    const post = await client.getPost(params.postId as number);

    // Check cache first
    const cacheKey = `seo:metadata:${params.site}:${params.postId as number}`;
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.debug("Cache hit for metadata generation", { cacheKey });
      return cached as SEOMetadata;
    }

    // Generate metadata
    const metadata = await this.metaGenerator.generateMetadata(post as WordPressPost, params, {
      includeKeywords: Boolean(params.focusKeywords?.length),
      brandVoice: "professional", // Could be configurable
      includeCallToAction: true,
      preserveExisting: false,
    });

    // Cache for 2 hours
    await this.cacheResult(cacheKey, metadata, 7200);

    return metadata;
  }

  private async processBulkUpdate(client: WordPressClient, params: SEOToolParams): Promise<BulkOperationResult> {
    // Initialize BulkOperations for the specific client if needed
    const bulkOps = new BulkOperations(client, this.cacheManager, {
      batchSize: 10,
      maxRetries: 3,
      enableProgress: true,
    });

    // Set up progress callback for logging
    const progressCallback = (progress: {
      processed: number;
      total: number;
      completed: number;
      failed: number;
      currentBatch: number;
      totalBatches: number;
      eta?: Date;
    }) => {
      this.logger.info("Bulk operation progress", {
        progress: `${progress.processed}/${progress.total}`,
        success: progress.completed,
        failed: progress.failed,
        currentBatch: `${progress.currentBatch}/${progress.totalBatches}`,
        eta: progress.eta,
      });
    };

    // Execute bulk metadata update
    return await bulkOps.bulkUpdateMetadata(params, progressCallback);
  }

  private async createSchema(client: WordPressClient, params: SEOToolParams): Promise<SchemaMarkup> {
    // Fetch the post data
    const post = await client.getPost(params.postId as number);

    if (!post) {
      throw new Error(`Post ${params.postId as number} not found`);
    }

    // Generate schema markup
    const options = {
      includeAuthor: true,
      includeOrganization: true,
      includeBreadcrumbs: params.schemaType === "BreadcrumbList",
      includeImages: true,
      siteConfig: {
        name: "WordPress Site", // This could be configurable
        url: "https://example.com", // This could come from site settings
        description: "WordPress site with SEO optimization",
      },
      customProperties: {
        ...(params.focusKeywords && { keywords: params.focusKeywords }),
      },
    };

    return await this.schemaGenerator.generateSchema(post as WordPressPost, params, options);
  }

  private async performSchemaValidation(params: SEOToolParams): Promise<unknown> {
    if (!params.schema) {
      throw new Error("Schema markup is required for validation");
    }

    // Basic validation using the SchemaGenerator's validation method
    const validation = this.schemaGenerator.validateSchema(params.schema as SchemaMarkup);

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings: [], // Could add warnings for best practices
      schemaType: (params.schema as SchemaMarkup)["@type"],
      validatedAt: new Date().toISOString(),
    };
  }

  private async findLinkingOpportunities(client: WordPressClient, params: SEOToolParams): Promise<unknown> {
    // Fetch the source post
    const post = await client.getPost(params.postId as number);

    if (!post) {
      throw new Error(`Post ${params.postId as number} not found`);
    }

    // Initialize internal linking suggester for the specific client
    const linkingSuggester = new InternalLinkingSuggester(client, {
      maxSuggestions: params.maxSuggestions || 10,
      minRelevanceScore: params.minimumRelevance || 30,
      maxLinksPerPost: 5,
      useSemanticAnalysis: true,
      enableContextualPlacement: true,
    });

    // Generate internal linking suggestions
    const suggestions = await linkingSuggester.generateSuggestions(post as WordPressPost, params);

    return {
      postId: params.postId as number,
      postTitle: post.title?.rendered || "Untitled",
      suggestions,
      totalSuggestions: suggestions.length,
      averageRelevance:
        suggestions.length > 0
          ? (suggestions.reduce((sum, s) => sum + s.relevance, 0) / suggestions.length).toFixed(1)
          : 0,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Test SEO plugin integration and WordPress API connectivity
   */
  async testSEOIntegration(params: SEOToolParams): Promise<unknown> {
    const siteLogger = LoggerFactory.tool("wp_seo_test_integration", params.site);

    return await siteLogger.time("Test SEO integration", async () => {
      try {
        const seoClient = await this.getSEOClient(params.site);

        // Test the integration
        const integrationTest = await seoClient.testSEOIntegration();

        // Get some sample SEO data
        let sampleSEOData = null;
        if (integrationTest.canReadMetadata && integrationTest.samplePostsWithSEO > 0) {
          try {
            const posts = await seoClient.getPosts({ per_page: 1, status: ["publish"] });
            if (posts && posts.length > 0) {
              sampleSEOData = await seoClient.getSEOMetadata(posts[0].id);
            }
          } catch (_error) {
            // Sample data fetch failed, but that's okay
            this.logger.debug("Failed to fetch sample SEO data", { _error: _error });
          }
        }

        const result = {
          integrationTest,
          sampleSEOData,
          recommendations: this.generateIntegrationRecommendations(integrationTest),
          testedAt: new Date().toISOString(),
        };

        siteLogger.info("SEO integration test completed", {
          plugin: integrationTest.pluginDetected,
          canRead: integrationTest.canReadMetadata,
          canWrite: integrationTest.canWriteMetadata,
          postsWithSEO: integrationTest.samplePostsWithSEO,
        });

        return result;
      } catch (_error) {
        handleToolError(_error, "test SEO integration", {
          site: params.site,
        });
        throw _error;
      }
    });
  }

  /**
   * Get live SEO data for multiple posts
   */
  async getLiveSEOData(params: SEOToolParams & { maxPosts?: number }): Promise<unknown> {
    const siteLogger = LoggerFactory.tool("wp_seo_get_live_data", params.site);

    return await siteLogger.time("Get live SEO data", async () => {
      try {
        const seoClient = await this.getSEOClient(params.site);

        // Get all posts with SEO data
        const postsWithSEO = await seoClient.getAllPostsWithSEO({
          maxPosts: params.maxPosts || 20,
          includePages: true,
        });

        // Analyze the SEO data
        const analysis = this.analyzeLiveSEOData(postsWithSEO);

        const result = {
          totalContent: postsWithSEO.length,
          contentWithSEO: postsWithSEO.filter((p) => p.seoData).length,
          analysis,
          posts: postsWithSEO.map((post) => ({
            id: post.id,
            title: post.title?.rendered,
            type: post.type,
            url: post.link,
            seoData: post.seoData
              ? {
                  hasTitle: !!post.seoData.title,
                  hasDescription: !!post.seoData.description,
                  hasFocusKeyword: !!post.seoData.focusKeyword,
                  plugin: post.seoData.plugin,
                  lastModified: post.seoData.lastModified,
                }
              : null,
          })),
          retrievedAt: new Date().toISOString(),
        };

        siteLogger.info("Live SEO data retrieved", {
          totalContent: result.totalContent,
          withSEO: result.contentWithSEO,
          plugin: analysis.detectedPlugin,
        });

        return result;
      } catch (_error) {
        handleToolError(_error, "get live SEO data", {
          site: params.site,
          maxPosts: params.maxPosts,
        });
        throw _error;
      }
    });
  }

  private async executeSiteAudit(client: WordPressClient, params: SEOToolParams): Promise<SiteAuditResult> {
    // Initialize site auditor for the specific client
    const siteAuditor = new SiteAuditor(client, {
      includeTechnical: params.includeTechnical !== false,
      includeContent: params.includeContent !== false,
      includeArchitecture: params.includeArchitecture !== false,
      includePerformance: params.includePerformance !== false,
      includeAccessibility: params.includeAccessibility || false,
      maxPagesForContentAudit: params.maxPages || 50,
      minSeverityLevel: params.minSeverity || "medium",
      includeRecommendations: params.includeRecommendations !== false,
    });

    // Perform comprehensive site audit
    return await siteAuditor.performSiteAudit(params);
  }

  /**
   * Generate integration recommendations based on test results
   */
  private generateIntegrationRecommendations(testResult: {
    pluginDetected: string;
    canReadMetadata: boolean;
    canWriteMetadata: boolean;
    samplePostsWithSEO: number;
    errors?: string[];
  }): string[] {
    const recommendations: string[] = [];

    if (testResult.pluginDetected === "none") {
      recommendations.push(
        "Consider installing a WordPress SEO plugin like Yoast SEO or RankMath for better SEO metadata management",
      );
    }

    if (!testResult.canReadMetadata) {
      recommendations.push(
        "SEO metadata reading failed. Check WordPress REST API permissions and ensure the detected SEO plugin exposes metadata via REST API",
      );
    }

    if (!testResult.canWriteMetadata) {
      recommendations.push(
        "SEO metadata writing failed. Verify user permissions for editing posts and pages via WordPress REST API",
      );
    }

    if (testResult.samplePostsWithSEO === 0) {
      recommendations.push(
        "No SEO metadata found on sample posts. Consider adding SEO titles and descriptions to your content",
      );
    } else if (testResult.samplePostsWithSEO < 3) {
      recommendations.push(
        "Limited SEO metadata detected. Consider optimizing more posts with SEO titles, descriptions, and focus keywords",
      );
    }

    if (testResult.errors && testResult.errors.length > 0) {
      recommendations.push(
        "Integration errors detected. Review error details and check WordPress configuration, plugin settings, and REST API accessibility",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("SEO integration is working well! All tests passed successfully.");
    }

    return recommendations;
  }

  /**
   * Analyze live SEO data for insights
   */
  private analyzeLiveSEOData(
    posts: Array<{
      seoData?: { plugin: string; title?: string | null; description?: string | null; focusKeyword?: string | null };
    }>,
  ): Record<string, unknown> {
    const analysis = {
      detectedPlugin: "none",
      totalPosts: posts.length,
      postsWithSEO: 0,
      postsWithTitles: 0,
      postsWithDescriptions: 0,
      postsWithFocusKeywords: 0,
      averageMetadataCompleteness: 0,
      recommendations: [] as string[],
    };

    const pluginCounts = { yoast: 0, rankmath: 0, seopress: 0, none: 0 };

    for (const post of posts) {
      if (post.seoData) {
        analysis.postsWithSEO++;

        // Count plugin usage
        pluginCounts[post.seoData.plugin as keyof typeof pluginCounts]++;

        // Count metadata presence
        if (post.seoData.title) analysis.postsWithTitles++;
        if (post.seoData.description) analysis.postsWithDescriptions++;
        if (post.seoData.focusKeyword) analysis.postsWithFocusKeywords++;
      }
    }

    // Determine most common plugin
    const mostUsedPlugin = Object.entries(pluginCounts).reduce((a, b) =>
      pluginCounts[a[0] as keyof typeof pluginCounts] > pluginCounts[b[0] as keyof typeof pluginCounts] ? a : b,
    );
    analysis.detectedPlugin = mostUsedPlugin[0];

    // Calculate metadata completeness
    if (analysis.postsWithSEO > 0) {
      const titleCompleteness = (analysis.postsWithTitles / analysis.postsWithSEO) * 100;
      const descriptionCompleteness = (analysis.postsWithDescriptions / analysis.postsWithSEO) * 100;
      const keywordCompleteness = (analysis.postsWithFocusKeywords / analysis.postsWithSEO) * 100;

      analysis.averageMetadataCompleteness = Math.round(
        (titleCompleteness + descriptionCompleteness + keywordCompleteness) / 3,
      );
    }

    // Generate recommendations
    const seoPercentage = (analysis.postsWithSEO / analysis.totalPosts) * 100;

    if (seoPercentage < 50) {
      analysis.recommendations.push(
        `Only ${Math.round(seoPercentage)}% of content has SEO metadata. Consider optimizing more posts.`,
      );
    }

    if (analysis.averageMetadataCompleteness < 70) {
      analysis.recommendations.push(
        `Metadata completeness is ${analysis.averageMetadataCompleteness}%. Focus on adding missing titles, descriptions, and focus keywords.`,
      );
    }

    const titlePercentage = analysis.postsWithSEO > 0 ? (analysis.postsWithTitles / analysis.postsWithSEO) * 100 : 0;
    if (titlePercentage < 80) {
      analysis.recommendations.push(
        `${Math.round(100 - titlePercentage)}% of SEO-enabled posts lack custom titles. Add SEO titles for better search visibility.`,
      );
    }

    const descPercentage =
      analysis.postsWithSEO > 0 ? (analysis.postsWithDescriptions / analysis.postsWithSEO) * 100 : 0;
    if (descPercentage < 80) {
      analysis.recommendations.push(
        `${Math.round(100 - descPercentage)}% of SEO-enabled posts lack meta descriptions. Add descriptions to improve click-through rates.`,
      );
    }

    return analysis;
  }
}

export default SEOTools;
