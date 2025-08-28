/**
 * SEO Type Definitions
 *
 * This module defines all TypeScript interfaces and types used by the SEO toolkit.
 * It provides comprehensive type safety for SEO operations including analysis,
 * metadata generation, schema markup, and site audits.
 *
 * @since 2.7.0
 */

import { z } from "zod";

/**
 * SEO analysis types for different evaluation modes
 */
export type SEOAnalysisType = "readability" | "keywords" | "structure" | "full";

/**
 * Priority levels for SEO recommendations
 */
export type SEOPriority = "low" | "medium" | "high" | "critical";

/**
 * Supported schema.org types for structured data
 */
export type SchemaType =
  | "Article"
  | "Product"
  | "FAQ"
  | "HowTo"
  | "Organization"
  | "Website"
  | "BreadcrumbList"
  | "Event"
  | "Recipe"
  | "Course"
  | "LocalBusiness"
  | "Person"
  | "Review"
  | "VideoObject";

/**
 * Base parameters for all SEO tool operations
 */
export interface SEOToolParams {
  /** Target site identifier for multi-site setups */
  site?: string;

  /** WordPress post ID */
  postId?: number;

  /** Multiple post IDs for bulk operations */
  postIds?: number[];

  /** Type of SEO analysis to perform */
  analysisType?: SEOAnalysisType;

  /** Schema type for structured data generation */
  schemaType?: SchemaType;

  /** Focus keywords for optimization */
  focusKeywords?: string[];

  /** Target locale for content optimization */
  locale?: string;

  /** Updates to apply in bulk operations */
  updates?: Partial<SEOMetadata>;

  /** Dry run mode for testing without changes */
  dryRun?: boolean;

  /** Force refresh, bypassing cache */
  force?: boolean;

  /** Type of audit to perform */
  auditType?: "technical" | "content" | "performance" | "full";

  /** Raw schema JSON for validation */
  schema?: unknown;

  /** Check plugins flag for integration testing */
  checkPlugins?: boolean;

  /** Test metadata access flag for integration testing */
  testMetadataAccess?: boolean;

  /** Include analysis flag for live data retrieval */
  includeAnalysis?: boolean;

  /** Include recommendations flag for live data retrieval */
  includeRecommendations?: boolean;

  /** Use Google validator for schema validation */
  useGoogleValidator?: boolean;

  /** Custom data for schema generation or other operations */
  customData?: unknown;

  /** Title for metadata generation */
  title?: string;

  /** Description for metadata generation */
  description?: string;

  /** Maximum number of suggestions for internal linking */
  maxSuggestions?: number;

  /** Minimum relevance score for suggestions */
  minimumRelevance?: number;

  /** Maximum pages to audit */
  maxPages?: number;

  /** Include external links in audit */
  includeExternalLinks?: boolean;

  /** Include technical audit */
  includeTechnical?: boolean;

  /** Include content audit */
  includeContent?: boolean;

  /** Include architecture audit */
  includeArchitecture?: boolean;

  /** Include performance audit */
  includePerformance?: boolean;

  /** Include accessibility audit */
  includeAccessibility?: boolean;

  /** Minimum severity level for audit */
  minSeverity?: "low" | "medium" | "high" | "critical";
}

/**
 * SEO recommendation with actionable insights
 */
export interface SEORecommendation {
  /** Category of the recommendation */
  type: "title" | "meta" | "content" | "structure" | "keyword" | "technical" | "performance";

  /** Priority level of the issue */
  priority: SEOPriority;

  /** Human-readable recommendation message */
  message: string;

  /** Estimated impact on SEO (0-100) */
  impact: number;

  /** Whether an automatic fix is available */
  autoFixAvailable: boolean;

  /** Suggested fix if available */
  suggestedFix?: string;

  /** Additional context or documentation link */
  helpUrl?: string;
}

/**
 * SEO metrics for content evaluation
 */
export interface SEOMetrics {
  /** Total word count */
  wordCount: number;

  /** Average words per sentence */
  avgWordsPerSentence: number;

  /** Average syllables per word */
  avgSyllablesPerWord: number;

  /** Flesch Reading Ease score (0-100) */
  fleschReadingEase: number;

  /** Flesch-Kincaid Grade Level */
  fleschKincaidGrade: number;

  /** Keyword density percentage */
  keywordDensity: number;

  /** Number of headings (H1-H6) */
  headingCount: number;

  /** Number of internal links */
  internalLinkCount: number;

  /** Number of external links */
  externalLinkCount: number;

  /** Number of images */
  imageCount: number;

  /** Number of images with alt text */
  imagesWithAltText: number;

  /** Estimated reading time in minutes */
  readingTime: number;
}

/**
 * Comprehensive SEO analysis result
 */
export interface SEOAnalysisResult {
  /** Overall SEO score (0-100) */
  score: number;

  /** Pass/fail status */
  status: "poor" | "needs-improvement" | "good" | "excellent";

  /** Detailed metrics */
  metrics: SEOMetrics;

  /** List of recommendations */
  recommendations: SEORecommendation[];

  /** Keyword analysis if applicable */
  keywordAnalysis?: {
    primaryKeyword: string;
    keywordFound: boolean;
    occurrences: number;
    density: number;
    semanticKeywords: string[];
    competitorGap?: string[];
  };

  /** Content structure analysis */
  structure?: {
    hasH1: boolean;
    h1Text: string;
    headingHierarchy: boolean;
    paragraphCount: number;
    avgParagraphLength: number;
  };

  /** Timestamp of analysis */
  analyzedAt: string;
}

/**
 * SEO metadata for posts and pages
 */
export interface SEOMetadata {
  /** SEO title tag (max 60 chars) */
  title: string;

  /** Meta description (155-160 chars) */
  description: string;

  /** Focus keyword/keyphrase */
  focusKeyword?: string;

  /** Canonical URL */
  canonical?: string;

  /** Robots meta directives */
  robots?: {
    index: boolean;
    follow: boolean;
    archive?: boolean;
    snippet?: boolean;
    imageindex?: boolean;
  };

  /** OpenGraph metadata */
  openGraph?: {
    title: string;
    description: string;
    type: string;
    image?: string;
    url?: string;
    siteName?: string;
    locale?: string;
  };

  /** Twitter Card metadata */
  twitterCard?: {
    card: "summary" | "summary_large_image" | "app" | "player";
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
  };
}

/**
 * Schema.org structured data markup
 */
export interface SchemaMarkup {
  /** JSON-LD context */
  "@context": "https://schema.org";

  /** Schema type */
  "@type": SchemaType | SchemaType[];

  /** Schema properties (varies by type) */
  [key: string]: unknown;
}

/**
 * Result of bulk SEO operations
 */
export interface BulkOperationResult {
  /** Total number of items processed */
  total: number;

  /** Number of successful operations */
  success: number;

  /** Number of failed operations */
  failed: number;

  /** Number of skipped items */
  skipped: number;

  /** Details of failed operations */
  errors?: Array<{
    postId: number;
    error: string;
  }>;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Whether operation was dry run */
  dryRun: boolean;
}

/**
 * Internal linking suggestion
 */
export interface InternalLinkSuggestion {
  /** Source post ID */
  sourcePostId: number;

  /** Target post ID */
  targetPostId: number;

  /** Target post title */
  targetTitle: string;

  /** Target post URL */
  targetUrl: string;

  /** Suggested anchor text */
  anchorText: string;

  /** Relevance score (0-100) */
  relevance: number;

  /** Reason for suggestion */
  reason: string;

  /** Context around the suggested link location */
  context?: string;
}

/**
 * Site audit issue
 */
export interface AuditIssue {
  /** Unique issue identifier */
  id: string;

  /** Issue category */
  category: "technical" | "content" | "architecture" | "performance" | "accessibility" | "security";

  /** Severity level */
  severity: SEOPriority;

  /** Issue title */
  title: string;

  /** Detailed description */
  description: string;

  /** Affected items/pages */
  affectedItems: string[];

  /** Impact description */
  impact: string;
}

/**
 * Audit section result
 */
export interface AuditSection {
  /** Section name */
  name: string;

  /** Section score (0-100) */
  score: number;

  /** Number of issues found */
  issues: number;

  /** Whether section passed all checks */
  passed: boolean;
}

/**
 * Audit configuration interface
 */
export interface AuditConfiguration {
  /** Technical SEO audit enabled */
  technical: boolean;

  /** Content quality audit enabled */
  content: boolean;

  /** Site architecture audit enabled */
  architecture: boolean;

  /** Performance audit enabled */
  performance: boolean;

  /** Accessibility audit enabled */
  accessibility: boolean;

  /** Maximum pages to audit */
  maxPages: number;

  /** Minimum severity to include */
  minSeverity: SEOPriority;
}

/**
 * Comprehensive site audit result
 */
export interface SiteAuditResult {
  /** Audit timestamp */
  timestamp: string;

  /** Site URL that was audited */
  siteUrl: string;

  /** Overall site health score (0-100) */
  overallScore: number;

  /** Audit sections with individual scores */
  sections: AuditSection[];

  /** List of identified issues */
  issues: AuditIssue[];

  /** Actionable recommendations */
  recommendations: string[];

  /** Audit summary text */
  summary: string;

  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Zod schemas for validation
 */

export const SEOToolParamsSchema = z.object({
  site: z.string().optional(),
  postId: z.number().optional(),
  postIds: z.array(z.number()).optional(),
  analysisType: z.enum(["readability", "keywords", "structure", "full"]).optional(),
  schemaType: z
    .enum([
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
    ])
    .optional(),
  focusKeywords: z.array(z.string()).optional(),
  locale: z.string().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
  auditType: z.enum(["technical", "content", "performance", "full"]).optional(),
  schema: z.unknown().optional(),
});

export const SEORecommendationSchema = z.object({
  type: z.enum(["title", "meta", "content", "structure", "keyword", "technical", "performance"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  message: z.string(),
  impact: z.number().min(0).max(100),
  autoFixAvailable: z.boolean(),
  suggestedFix: z.string().optional(),
  helpUrl: z.string().url().optional(),
});

export const SEOMetricsSchema = z.object({
  wordCount: z.number(),
  avgWordsPerSentence: z.number(),
  avgSyllablesPerWord: z.number(),
  fleschReadingEase: z.number(),
  fleschKincaidGrade: z.number(),
  keywordDensity: z.number(),
  headingCount: z.number(),
  internalLinkCount: z.number(),
  externalLinkCount: z.number(),
  imageCount: z.number(),
  imagesWithAltText: z.number(),
  readingTime: z.number(),
});

export const SEOAnalysisResultSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["poor", "needs-improvement", "good", "excellent"]),
  metrics: SEOMetricsSchema,
  recommendations: z.array(SEORecommendationSchema),
  keywordAnalysis: z
    .object({
      primaryKeyword: z.string(),
      keywordFound: z.boolean(),
      occurrences: z.number(),
      density: z.number(),
      semanticKeywords: z.array(z.string()),
      competitorGap: z.array(z.string()).optional(),
    })
    .optional(),
  structure: z
    .object({
      hasH1: z.boolean(),
      h1Text: z.string(),
      headingHierarchy: z.boolean(),
      paragraphCount: z.number(),
      avgParagraphLength: z.number(),
    })
    .optional(),
  analyzedAt: z.string(),
});
