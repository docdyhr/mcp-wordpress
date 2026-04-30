/**
 * SEO Tool Handlers
 *
 * Implements the handler functions for all SEO-related MCP tools.
 * These handlers bridge the gap between MCP protocol requests and
 * the SEO toolkit implementation.
 *
 * @since 2.7.0
 */

import { WordPressClient } from "@/client/api.js";
import { SEOTools } from "./SEOTools.js";
import { LoggerFactory } from "@/utils/logger.js";
import type {
  SEOToolParams,
  SEOAnalysisType,
  SEOMetadata,
  SchemaType,
  SERPTrackingResult,
  KeywordResearchResult,
} from "@/types/seo.js";

let _seoTools: SEOTools | null = null;
function getSeoTools(): SEOTools {
  if (!_seoTools) _seoTools = new SEOTools();
  return _seoTools;
}

/**
 * Handle content analysis request
 */
export async function handleAnalyzeContent(client: WordPressClient, args: Record<string, unknown>): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_analyze_content");

  try {
    const params: SEOToolParams = {
      postId: args.postId as number,
      analysisType: args.analysisType as SEOAnalysisType,
      focusKeywords: args.focusKeywords as string[],
      site: args.site as string,
    };

    return await getSeoTools().analyzeContent(client, params);
  } catch (error) {
    logger.error("Failed to analyze content", { error, args });
    throw error;
  }
}

/**
 * Handle metadata generation request
 */
export async function handleGenerateMetadata(client: WordPressClient, args: Record<string, unknown>): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_generate_metadata");

  try {
    const params: SEOToolParams = {
      postId: args.postId as number,
      site: args.site as string,
    };

    // Add custom title/description if provided
    if (args.title) {
      params.title = args.title as string;
    }
    if (args.description) {
      params.description = args.description as string;
    }
    if (args.focusKeyword) {
      params.focusKeywords = [args.focusKeyword as string];
    }

    return await getSeoTools().generateMetadata(client, params);
  } catch (error) {
    logger.error("Failed to generate metadata", { error, args });
    throw error;
  }
}

/**
 * Handle bulk metadata update request
 */
export async function handleBulkUpdateMetadata(
  client: WordPressClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_bulk_update_metadata");

  try {
    const params: SEOToolParams = {
      postIds: args.postIds as number[],
      updates: args.updates as Partial<SEOMetadata>,
      dryRun: args.dryRun as boolean,
      site: args.site as string,
    };

    return await getSeoTools().bulkUpdateMetadata(client, params);
  } catch (error) {
    logger.error("Failed to bulk update metadata", { error, args });
    throw error;
  }
}

/**
 * Handle schema generation request
 */
export async function handleGenerateSchema(client: WordPressClient, args: Record<string, unknown>): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_generate_schema");

  try {
    const params: SEOToolParams = {
      postId: args.postId as number,
      schemaType: args.schemaType as SchemaType,
      site: args.site as string,
    };

    // Add custom data if provided
    if (args.customData) {
      params.customData = args.customData;
    }

    return await getSeoTools().generateSchema(client, params);
  } catch (error) {
    logger.error("Failed to generate schema", { error, args });
    throw error;
  }
}

/**
 * Handle schema validation request
 */
export async function handleValidateSchema(client: WordPressClient, args: Record<string, unknown>): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_validate_schema");

  try {
    const params: SEOToolParams = {
      schema: args.schema,
      schemaType: args.schemaType as SchemaType,
      site: args.site as string,
    };

    // Add Google validator flag if provided
    if (args.useGoogleValidator) {
      params.useGoogleValidator = args.useGoogleValidator as boolean;
    }

    return await getSeoTools().validateSchema(params);
  } catch (error) {
    logger.error("Failed to validate schema", { error, args });
    throw error;
  }
}

/**
 * Handle internal linking suggestions request
 */
export async function handleSuggestInternalLinks(
  client: WordPressClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_suggest_internal_links");

  try {
    const params: SEOToolParams = {
      postId: args.postId as number,
      site: args.site as string,
    };

    // Add optional parameters
    if (args.maxSuggestions) {
      params.maxSuggestions = args.maxSuggestions as number;
    }
    if (args.minimumRelevance) {
      params.minimumRelevance = args.minimumRelevance as number;
    }

    return await getSeoTools().suggestInternalLinks(client, params);
  } catch (error) {
    logger.error("Failed to suggest internal links", { error, args });
    throw error;
  }
}

/**
 * Handle site audit request
 */
export async function handlePerformSiteAudit(client: WordPressClient, args: Record<string, unknown>): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_site_audit");

  try {
    const params: SEOToolParams = {
      auditType: args.auditType as "content" | "performance" | "full" | "technical",
      force: args.force as boolean,
      site: args.site as string,
    };

    // Add optional parameters
    if (args.maxPages) {
      params.maxPages = args.maxPages as number;
    }
    if (args.includeExternalLinks) {
      params.includeExternalLinks = args.includeExternalLinks as boolean;
    }

    return await getSeoTools().performSiteAudit(client, params);
  } catch (error) {
    logger.error("Failed to perform site audit", { error, args });
    throw error;
  }
}

/**
 * Handle SERP tracking request
 */
export async function handleTrackSERPPositions(
  client: WordPressClient,
  args: Record<string, unknown>,
): Promise<SERPTrackingResult> {
  const logger = LoggerFactory.tool("wp_seo_track_serp");

  try {
    const params: SEOToolParams = {
      keywords: args.keywords as string[],
      site: args.site as string,
    };
    if (args.url) params.url = args.url as string;
    if (args.searchEngine) params.searchEngine = args.searchEngine as string;
    if (args.location) params.location = args.location as string;

    return await getSeoTools().trackSERPPositions(client, params);
  } catch (error) {
    logger.error("Failed to track SERP positions", { error, args });
    throw error;
  }
}

/**
 * Handle keyword research request
 */
export async function handleKeywordResearch(
  client: WordPressClient,
  args: Record<string, unknown>,
): Promise<KeywordResearchResult> {
  const logger = LoggerFactory.tool("wp_seo_keyword_research");

  try {
    const params: SEOToolParams = {
      seedKeyword: args.seedKeyword as string,
      site: args.site as string,
    };
    if (args.includeVariations !== undefined) params.includeVariations = args.includeVariations as boolean;
    if (args.includeQuestions !== undefined) params.includeQuestions = args.includeQuestions as boolean;
    if (args.maxResults !== undefined) params.maxResults = args.maxResults as number;

    return await getSeoTools().keywordResearch(client, params);
  } catch (error) {
    logger.error("Failed to perform keyword research", { error, args });
    throw error;
  }
}

/**
 * Handle SEO integration test request
 */
export async function handleTestSEOIntegration(
  client: WordPressClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_test_integration");

  try {
    const params: SEOToolParams = {
      checkPlugins: args.checkPlugins as boolean,
      testMetadataAccess: args.testMetadataAccess as boolean,
      site: args.site as string,
    };

    return await getSeoTools().testSEOIntegration(client, params);
  } catch (error) {
    logger.error("Failed to test SEO integration", { error, args });
    throw error;
  }
}

/**
 * Handle get live SEO data request
 */
export async function handleGetLiveSEOData(client: WordPressClient, args: Record<string, unknown>): Promise<unknown> {
  const logger = LoggerFactory.tool("wp_seo_get_live_data");

  try {
    const params: SEOToolParams = {
      postId: args.postId as number,
      includeAnalysis: args.includeAnalysis as boolean,
      includeRecommendations: args.includeRecommendations as boolean,
      site: args.site as string,
    };

    return await getSeoTools().getLiveSEOData(client, params);
  } catch (error) {
    logger.error("Failed to get live SEO data", { error, args });
    throw error;
  }
}
