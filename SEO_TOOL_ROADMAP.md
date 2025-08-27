<!-- markdownlint-disable MD013 -->

# MCP WordPress SEO toolkit roadmap

## Executive Summary

This plan outlines a major enhancement to the Model Context Protocol (MCP) tools for WordPress to enable AI-driven SEO
optimization at scale. It builds on modern SEO requirements, leading WordPress plugins, and programmatic SEO strategies
to deliver enterprise-grade SEO via standardized MCP tools, combining automated optimization with intelligent content
analysis.

Scope alignment with this repository

- This project is a Node.js/TypeScript MCP server that talks to WordPress via the REST API. Code lives under `src/` with
  tools in `src/tools/**` and the server in `src/server/**`.
- Any PHP examples in this document represent an optional WordPress companion plugin for advanced features (custom
  endpoints, Action Scheduler hooks, schema injection). They are not implemented in this repo by default and will be
  delivered as an optional artifact.
- New SEO tools will be implemented as MCP tools (zod-validated) and registered via `src/tools/index.ts`, following
  existing patterns in `src/tools/posts/**`, `src/tools/performance.ts`, etc.

## Core architecture requirements revealed

The research identifies **three critical architectural pillars** for successful MCP WordPress SEO implementation. First,
the system must leverage WordPress REST API v2 endpoints while maintaining compatibility with existing SEO plugins like
Yoast and RankMath. Second, it requires a multi-level caching strategy with Redis support to handle the **5–10%
performance improvement** demonstrated by Yoast's indexables system. Third, the architecture needs background job
processing capabilities to manage resource‑intensive operations like comprehensive site audits without impacting
frontend performance.

The MCP protocol foundation builds on JSON-RPC 2.0 messaging with stateful session management, supporting STDIO,
HTTP+SSE, and streamable HTTP transports. Authentication leverages OAuth 2.1 with JWT tokens and WordPress application
passwords, ensuring secure access while maintaining the flexibility needed for headless implementations.

### Technical Architecture Alignment

The SEO toolkit integrates seamlessly with the existing MCP WordPress architecture:

- **Tool System**: Follows the class-based pattern established in `src/tools/` with manager architecture
- **Client Integration**: Extends `WordPressClient` with SEO-specific REST API interactions
- **Configuration**: Leverages `Config.ts` singleton for SEO settings and feature flags
- **Logging**: Uses `LoggerFactory` for SEO operations with component-specific contexts
- **Error Handling**: Implements structured error types with WordPress-specific SEO error messages
- **Caching**: Extends `CachedWordPressClient` with SEO-specific cache strategies
- **Testing**: Follows the established testing patterns with unit, integration, and property tests

## Essential MCP tool functions and implementation

### Primary SEO management tools

The toolkit targets a first wave of SEO tools implemented as MCP tools, grouped into functional categories. The
post‑meta management suite handles title tags (60 character limit), meta descriptions (155–160 characters), and focus
keywords with bulk update capabilities processing up to 100 posts simultaneously. Real‑time content analysis tools
provide readability scoring, keyword density calculations, and E‑E‑A‑T signal evaluation, returning structured
recommendations with priority levels.

Planned MCP tool surfaces (initial set)

- seo.analyze_content: Readability, keyword density, structure, and full analysis
- seo.generate_meta: Generate/refresh title and meta descriptions (LLM‑assisted, guardrailed)
- seo.bulk_update_meta: Batch update SEO meta for posts/pages by ID or query
- seo.generate_schema: JSON‑LD generator for core schema types with validation
- seo.validate_schema: Validate schema via local rules or external validator
- seo.internal_linking: Suggest or apply internal links based on topical clusters
- seo.site_audit: Crawl via REST, gather signals, produce prioritized fixes
- seo.serp_track: Integrate with external providers for position tracking (optional)
- seo.keyword_research: Retrieve and cluster keywords (optional integrations)

```typescript
// Core tool definition structure following existing patterns
export class SEOTools {
  constructor(private client: WordPressClient) {}

  async analyzeContent(params: AnalyzeContentParams): Promise<AnalyzeContentResult> {
    const logger = LoggerFactory.tool("wp_seo_analyze_content", params.site);
    
    return await logger.time("SEO content analysis", async () => {
      validateRequired(params, ['postId', 'analysisType']);
      const siteClient = this.getSiteClient(params.site);
      
      // Implement analysis logic with caching
      const cacheKey = `seo:analyze:${params.postId}:${params.analysisType}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
      
      const result = await this.performAnalysis(siteClient, params);
      await this.cache.set(cacheKey, result, { ttl: 21600 }); // 6 hour cache
      return result;
    });
  }
}

// Zod schemas for type safety
const AnalyzeContentParamsSchema = z.object({
  postId: z.number(),
  analysisType: z.enum(["readability", "keywords", "structure", "full"]),
  site: z.string().optional(),
  focusKeywords: z.array(z.string()).optional(),
  locale: z.string().default("en-US")
});

const SEORecommendationSchema = z.object({
  type: z.enum(["title", "meta", "content", "structure", "keyword", "technical"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  message: z.string(),
  impact: z.number().min(0).max(100),
  autoFixAvailable: z.boolean().default(false)
});
```

### Schema markup and structured data automation

The system implements **20+ schema types** following Google's preferred JSON‑LD format, with automatic generation based
on post types and content patterns. Article schema includes author credentials for E‑E‑A‑T signals, while product schema
incorporates pricing, availability, and aggregate ratings. The schema generator validates output using Google's Rich
Results Test API (or compatible validators) and maintains bidirectional relationships for interconnected graph
implementation.

### Programmatic SEO capabilities

Drawing from successful implementations like Zapier's 2.6M monthly organic visits, the toolkit enables template‑based
page generation with dynamic data population. The system supports location‑based landing pages, product comparison
matrices, and FAQ generation from support tickets. Internal linking automation creates hub‑and‑spoke content
architectures with topical clusters, implementing pattern‑based linking that targets 2–5 internal links per 1000 words
of content (configurable and guarded to avoid spam).

## API integration specifications

### WordPress REST API endpoints

The primary integration uses standard WordPress REST endpoints. Where custom behavior is required, an optional companion
plugin can add SEO‑specific endpoints:

```php
// Custom endpoint registration
register_rest_route('mcp-seo/v1', '/analyze', [
    'methods' => 'POST',
    'callback' => 'mcp_analyze_content',
    'permission_callback' => 'check_seo_permissions',
    'args' => [
        'postId' => ['type' => 'integer', 'required' => true],
        'depth' => ['type' => 'string', 'default' => 'full']
    ]
]);
```

### External SEO service integrations

The toolkit integrates with DataForSEO's comprehensive API suite for real‑time SERP tracking across 50,000+ locations,
keyword research with a multi‑billion keyword corpus, and backlink analysis. Ahrefs API v3 provides competitor gap
analysis and site audit capabilities, while Google Search Console API enables performance tracking with click‑through
rate and average position metrics. These integrations are optional and abstracted behind a provider interface with
intelligent rate limiting and exponential backoff for transient failures. All secrets are managed via environment
variables and never logged.

## Performance optimization and caching strategy

### Multi-level caching architecture

The implementation employs a three‑tier caching system: memory cache for frequently accessed data, Redis for distributed
caching across multiple servers, and WordPress transients for fallback storage (via companion plugin). SEO analysis
results cache for 6 hours with automatic invalidation on content updates, while schema markup caches until post
modification triggers regeneration. Cache keys are namespaced by site + tool + input hash to avoid collisions.

```typescript
// SEO-specific cache configuration
export class SEOCacheManager extends CacheManager {
  private readonly SEO_CACHE_PREFIX = "seo:";
  private readonly DEFAULT_TTL = {
    analysis: 21600,     // 6 hours for content analysis
    schema: 86400,       // 24 hours for schema markup
    audit: 3600,         // 1 hour for site audits
    keywords: 604800,    // 7 days for keyword research
    serp: 43200         // 12 hours for SERP data
  };

  async invalidatePostSEO(postId: number, siteId?: string): Promise<void> {
    const pattern = `${this.SEO_CACHE_PREFIX}*:${postId}:*`;
    await this.invalidatePattern(pattern, siteId);
  }
}
```

Performance benchmarks target sub-200ms response times for content analysis, with bulk operations processing 100 posts
in under 30 seconds. The system implements circuit breaker patterns for external API failures and maintains dead letter
queues for critical SEO operations that require retry.

### Background processing for heavy operations

Resource‑intensive tasks utilize WordPress Action Scheduler (via companion plugin) or server‑side batching in the MCP
server. This enables comprehensive site audits and bulk meta updates without blocking user interactions, with progress
tracking and completion notifications via MCP event streams.

## Core Web Vitals and technical SEO automation

### Automated optimization workflows

The toolkit monitors Interaction to Next Paint (INP) metrics, replacing First Input Delay as Google's interactivity
measure since March 2024. Automated optimizations include lazy loading for non-critical resources, image format
conversion to WebP/AVIF, and JavaScript execution optimization to prevent long tasks exceeding 50ms.

The system automatically generates and maintains XML sitemaps limited to 50,000 URLs per file, with dynamic priority
calculation based on page performance metrics. Robots.txt management includes automatic sitemap references and crawl
directives optimization, while canonical URL standardization prevents duplicate content issues across HTTP/HTTPS and
www/non-www variations.

## AI-powered content optimization features

### Integration with modern AI capabilities

The toolkit leverages MCP's sampling primitive for LLM‑powered content analysis, generating optimized meta descriptions
that address search intent while maintaining brand voice. Content optimization suggestions analyze top‑ranking
competitor content to identify gaps and opportunities, with semantic keyword recommendations based on topic clustering
algorithms. All generation is guardrailed (length checks, profanity/PII filters) and requires explicit user action to
apply changes.

For AI Overview optimization (appearing in 50%+ of searches), the system structures content with clear question-answer
formats, implements FAQ schema markup, and optimizes for featured snippet capture through precise content formatting.
The implementation recognizes that only 57% of AI Overview citations come from first-page results, expanding
optimization strategies beyond traditional ranking factors.

## Security and compliance implementation

### Authentication and authorization layers

The security architecture implements OAuth 2.1 for remote HTTP servers with JWT token refresh mechanisms and 24-hour
token expiration. WordPress application passwords provide backward compatibility while maintaining security standards.
Role-based access control restricts bulk operations to editor-level permissions and above.

Input validation uses Zod schemas for type checking and sanitization in the MCP server, preventing injection and XSS
vectors. Rate limiting implements sliding window algorithms with 30 requests per minute for analysis operations and 5
requests per 5 minutes for bulk updates.

## Development roadmap and priorities

### Phased delivery with artifacts and acceptance checks

Phase 1: Foundation (Weeks 1–4)

- Deliverables: seo.analyze_content, seo.generate_meta (draft), caching layer, auth hardening
- Tests: unit + property tests for analysis metrics; contract tests for REST auth
- Docs: API reference for tools, quickstart
- SLAs: analysis < 200ms p95 on cached content

Phase 2: Advanced features (Weeks 5–8)

- Deliverables: schema generator + validator, bulk update flows, internal linking suggestions
- Optional: companion plugin MVP (custom endpoints, Action Scheduler hooks)
- Tests: schema snapshots + validator harness; bulk ops retries + rate‑limit tests
- SLAs: bulk 100 posts < 30s p95; zero data loss on retries

Phase 3: AI integration (Weeks 9–12)

- Deliverables: LLM‑assisted meta generation, AI Overview optimizer, topic clustering
- Tests: deterministic prompts with fixtures; safety filters & length guards
- SLAs: no more than 1% application of suggestions without explicit user action

Phase 4: Enterprise features (Weeks 13–16)

- Deliverables: multisite support, white‑label outputs, dashboards, scheduled audits
- Tests: multisite isolation; reporting correctness; resilience and back‑pressure
- SLAs: 99.9% uptime for critical SEO operations; safe degradation on provider outages

## Expected outcomes and success metrics

Implementation of this MCP WordPress SEO toolkit will enable processing of **10,000+ pages per hour** for bulk
optimizations, achieving **sub‑2.5 second page load times** through performance optimization, and maintaining **99.9%
uptime** for critical SEO operations. The system targets a 40% reduction in manual SEO tasks through automation, 25%
improvement in organic traffic through optimized content, and 15% increase in featured snippet capture rates.

The architecture supports horizontal scaling to handle enterprise WordPress installations with millions of pages, while
maintaining compatibility with existing SEO plugins and workflows. By combining the intelligent automation of The SEO
Framework, the feature richness of RankMath, and the performance optimization of Yoast's indexables system, this MCP
toolkit represents a comprehensive evolution in WordPress SEO capabilities.

Risks and mitigations

- External API cost/limits: Use provider abstraction, mockable layer, and exponential backoff; ship with integrations
  disabled by default.
- WordPress heterogeneity: Detect plugins/themes and adapt behavior; companion plugin as escape hatch for custom
  endpoints.
- LLM variability: Use deterministic prompts, fixtures, and guardrails; require explicit apply to persist changes.
- Performance regressions: Cache keys with content hash; add regression tests and performance budget checks in CI.
