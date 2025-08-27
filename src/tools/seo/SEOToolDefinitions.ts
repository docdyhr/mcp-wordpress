/**
 * SEO Tool Definitions for MCP Registration
 *
 * Defines all SEO-related tools with their schemas, descriptions,
 * and handler functions for the Model Context Protocol.
 *
 * @since 2.7.0
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Analyze content for SEO optimization opportunities
 */
export const analyzeContentTool: Tool = {
  name: "wp_seo_analyze_content",
  description:
    "Analyze WordPress post content for SEO optimization opportunities including readability, keyword density, structure, and technical factors",
  inputSchema: {
    type: "object",
    properties: {
      postId: {
        type: "number",
        description: "WordPress post ID to analyze",
      },
      analysisType: {
        type: "string",
        enum: ["readability", "keywords", "structure", "full"],
        description: "Type of SEO analysis to perform (default: full)",
      },
      focusKeywords: {
        type: "array",
        items: { type: "string" },
        description: "Primary keywords to analyze for optimization",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["postId"],
  },
};

/**
 * Generate optimized metadata for posts
 */
export const generateMetadataTool: Tool = {
  name: "wp_seo_generate_metadata",
  description:
    "Generate SEO-optimized metadata including title tags, meta descriptions, OpenGraph, and Twitter Card data",
  inputSchema: {
    type: "object",
    properties: {
      postId: {
        type: "number",
        description: "WordPress post ID",
      },
      title: {
        type: "string",
        description: "Custom title to optimize (optional, uses post title if not provided)",
      },
      description: {
        type: "string",
        description: "Custom description to optimize (optional, uses excerpt if not provided)",
      },
      focusKeyword: {
        type: "string",
        description: "Primary keyword to include in metadata",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["postId"],
  },
};

/**
 * Bulk update metadata for multiple posts
 */
export const bulkUpdateMetadataTool: Tool = {
  name: "wp_seo_bulk_update_metadata",
  description: "Update SEO metadata for multiple posts with progress tracking and error handling",
  inputSchema: {
    type: "object",
    properties: {
      postIds: {
        type: "array",
        items: { type: "number" },
        description: "Array of WordPress post IDs to update",
      },
      updates: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          focusKeyword: { type: "string" },
          canonical: { type: "string" },
        },
        description: "Metadata fields to update for all posts",
      },
      dryRun: {
        type: "boolean",
        description: "Perform a dry run without making actual changes",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["postIds", "updates"],
  },
};

/**
 * Generate structured data schema markup
 */
export const generateSchemaTool: Tool = {
  name: "wp_seo_generate_schema",
  description: "Generate JSON-LD structured data schema for enhanced search results",
  inputSchema: {
    type: "object",
    properties: {
      postId: {
        type: "number",
        description: "WordPress post ID",
      },
      schemaType: {
        type: "string",
        enum: [
          "Article",
          "Product",
          "FAQ",
          "HowTo",
          "Organization",
          "Website",
          "BreadcrumbList",
          "Event",
          "Recipe",
          "Course",
          "LocalBusiness",
          "Person",
          "Review",
          "VideoObject",
        ],
        description: "Type of schema.org structured data to generate",
      },
      customData: {
        type: "object",
        description: "Additional custom data for the schema",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["postId", "schemaType"],
  },
};

/**
 * Validate schema markup
 */
export const validateSchemaTool: Tool = {
  name: "wp_seo_validate_schema",
  description: "Validate JSON-LD schema markup for correctness and compliance",
  inputSchema: {
    type: "object",
    properties: {
      schema: {
        type: "object",
        description: "JSON-LD schema object to validate",
      },
      schemaType: {
        type: "string",
        description: "Expected schema type for validation",
      },
      useGoogleValidator: {
        type: "boolean",
        description: "Use Google's Rich Results Test API for validation",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["schema"],
  },
};

/**
 * Suggest internal linking opportunities
 */
export const suggestInternalLinksTool: Tool = {
  name: "wp_seo_suggest_internal_links",
  description: "Analyze content and suggest relevant internal linking opportunities for better SEO",
  inputSchema: {
    type: "object",
    properties: {
      postId: {
        type: "number",
        description: "WordPress post ID to analyze for linking opportunities",
      },
      maxSuggestions: {
        type: "number",
        description: "Maximum number of link suggestions (default: 5)",
      },
      minimumRelevance: {
        type: "number",
        description: "Minimum relevance score (0-100) for suggestions",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["postId"],
  },
};

/**
 * Perform comprehensive site audit
 */
export const performSiteAuditTool: Tool = {
  name: "wp_seo_site_audit",
  description:
    "Perform comprehensive SEO audit of the WordPress site including technical, content, and performance analysis",
  inputSchema: {
    type: "object",
    properties: {
      auditType: {
        type: "string",
        enum: ["technical", "content", "performance", "full"],
        description: "Type of audit to perform (default: full)",
      },
      maxPages: {
        type: "number",
        description: "Maximum number of pages to audit (default: 100)",
      },
      includeExternalLinks: {
        type: "boolean",
        description: "Include external link validation in audit",
      },
      force: {
        type: "boolean",
        description: "Force refresh, bypassing cached audit results",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: [],
  },
};

/**
 * Track SERP positions
 */
export const trackSERPPositionsTool: Tool = {
  name: "wp_seo_track_serp",
  description: "Track search engine result page positions for target keywords",
  inputSchema: {
    type: "object",
    properties: {
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "Keywords to track positions for",
      },
      url: {
        type: "string",
        description: "Specific URL to track (optional, uses site home if not provided)",
      },
      searchEngine: {
        type: "string",
        enum: ["google", "bing", "yahoo"],
        description: "Search engine to track positions on",
      },
      location: {
        type: "string",
        description: "Geographic location for localized results",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["keywords"],
  },
};

/**
 * Keyword research and suggestions
 */
export const keywordResearchTool: Tool = {
  name: "wp_seo_keyword_research",
  description: "Research keywords and get suggestions based on topic and competition analysis",
  inputSchema: {
    type: "object",
    properties: {
      seedKeyword: {
        type: "string",
        description: "Seed keyword or topic to research",
      },
      includeVariations: {
        type: "boolean",
        description: "Include keyword variations and long-tail keywords",
      },
      includeQuestions: {
        type: "boolean",
        description: "Include question-based keywords",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of keyword suggestions",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["seedKeyword"],
  },
};

/**
 * Test SEO integration with WordPress
 */
export const testSEOIntegrationTool: Tool = {
  name: "wp_seo_test_integration",
  description: "Test SEO plugin integration and detect available SEO plugins on the WordPress site",
  inputSchema: {
    type: "object",
    properties: {
      checkPlugins: {
        type: "boolean",
        description: "Check which SEO plugins are installed and active",
      },
      testMetadataAccess: {
        type: "boolean",
        description: "Test ability to read/write SEO metadata",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: [],
  },
};

/**
 * Get live SEO data from WordPress
 */
export const getLiveSEODataTool: Tool = {
  name: "wp_seo_get_live_data",
  description: "Retrieve live SEO data from WordPress including plugin-specific metadata and configurations",
  inputSchema: {
    type: "object",
    properties: {
      postId: {
        type: "number",
        description: "WordPress post ID to get SEO data for",
      },
      includeAnalysis: {
        type: "boolean",
        description: "Include SEO analysis of the live data",
      },
      includeRecommendations: {
        type: "boolean",
        description: "Include optimization recommendations",
      },
      site: {
        type: "string",
        description: "Site identifier for multi-site setups",
      },
    },
    required: ["postId"],
  },
};

/**
 * Export all SEO tool definitions
 */
export const seoToolDefinitions: Tool[] = [
  analyzeContentTool,
  generateMetadataTool,
  bulkUpdateMetadataTool,
  generateSchemaTool,
  validateSchemaTool,
  suggestInternalLinksTool,
  performSiteAuditTool,
  trackSERPPositionsTool,
  keywordResearchTool,
  testSEOIntegrationTool,
  getLiveSEODataTool,
];

export default seoToolDefinitions;
