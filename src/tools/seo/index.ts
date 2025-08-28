/**
 * SEO Tools - Main Index
 *
 * This module exports the complete SEO toolkit for MCP WordPress.
 * It provides a unified interface for all SEO-related functionality
 * including content analysis, metadata generation, schema markup,
 * and site optimization.
 *
 * @since 2.7.0
 */

import { SEOTools } from "./SEOTools.js";

export { SEOTools };
export default SEOTools;

// Export all SEO types for external use
export type {
  SEOAnalysisResult,
  SEOMetadata,
  SchemaMarkup,
  SEOToolParams,
  BulkOperationResult,
  SiteAuditResult,
  SEORecommendation,
  SEOMetrics,
  InternalLinkSuggestion,
  AuditIssue,
} from "@/types/seo.js";

// Export tool definitions
export { seoToolDefinitions } from "./SEOToolDefinitions.js";

// Export handlers
export {
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
