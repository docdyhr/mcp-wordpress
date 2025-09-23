<!-- markdownlint-disable MD013 -->

# PRD: MCP WordPress SEO Toolkit – Major Enhancement

Last updated: 2025-08-24 Status: Draft Owner: Thomas Dyhr

## 1. Objective

Deliver a first‑class SEO toolkit as MCP tools for WordPress that automates analysis, schema, internal linking, audits,
and LLM‑assisted metadata—while remaining safe, fast, and compatible with existing SEO plugins.

## 2. Problem & Opportunity

- SEO work is repetitive and slow across large WordPress sites.
- Popular plugins provide UI‑driven workflows but lack headless/automation interfaces for AI agents.
- MCP enables reliable, typed tools that automation and assistants can call safely.

Opportunity: Offer programmatic SEO superpowers through MCP, integrating existing WP data and external providers, with
strong guardrails and performance.

## 3. Users & Use Cases

- SEO specialists: bulk improve titles/meta, generate schema, validate issues, run audits.
- Content teams: optimize drafts, get internal link suggestions, ensure E‑E‑A‑T.
- Agencies: multisite management, white‑label reports, schedules.
- AI agents: call tools to optimize at scale with human‑in‑the‑loop apply steps.

## 4. Scope

In scope (phase 1–3):

- Core tools: analyze content, generate metadata, bulk update meta, generate/validate schema, internal linking, site
  audits.
- Optional provider integrations: Search Console, DataForSEO, Ahrefs (behind feature flags).
- Caching, rate‑limits, retries, background/batch operations, progress events.
- Safety: length bounds, profanity/PII filters, explicit apply for mutations.

Out of scope (initial):

- Full PHP plugin distribution in this repo (shipped separately as optional companion).
- Backlink crawling, custom JavaScript injection, advanced UI dashboards.

## 5. Success Metrics (KPIs)

- Reduce manual SEO edits by ≥40% on target sites.
- p95 tool latency < 200ms on cached inputs; bulk 100 posts < 30s p95.
- 0 critical data‑loss incidents; 0 security regressions.
- ≥90% schema validation pass rate on generated JSON‑LD.
- ≤1% unintended auto‑apply events (all writes require explicit apply).

## 6. Functional Requirements

FR‑1 Analyze Content

- Inputs: postId or HTML; analysisType (readability|keywords|structure|full)
- Outputs: score 0–100, metrics (wordCount, keywordDensity, readability), prioritized recommendations

FR‑2 Generate Metadata

- Inputs: postId or content, brand voice hints, target length
- Behavior: produce title (≤60 chars) and meta description (155–160 chars), respect constraints and safety filters

FR‑3 Bulk Update Meta

- Inputs: list of postIds or WP query, fields to update, dryRun flag
- Behavior: batch in chunks, rate‑limit, retries with backoff, report progress

FR‑4 Generate Schema

- Inputs: postId, schemaType (Article, Product, FAQ, HowTo, Organization, Website, etc.)
- Behavior: create JSON‑LD; link graph where relevant; cache; include E‑E‑A‑T fields when present

FR‑5 Validate Schema

- Inputs: JSON‑LD blob or postId
- Behavior: local rules + optional remote validator; produce errors/warnings with line pointers

FR‑6 Internal Linking Suggestions

- Inputs: postId, site taxonomy/topical clusters (inferred or provided)
- Behavior: suggest anchor text and target URLs; avoid over‑linking; output confidence and reasons

FR‑7 Site Audit

- Inputs: site root/API creds, depth, checks (sitemaps, robots, canonical, CWV hints, duplicates)
- Behavior: crawl via REST, compile issues, prioritize by impact; stream progress

FR‑8 Provider Integrations (optional)

- Abstraction layer with providers: Search Console, DataForSEO, Ahrefs
- Feature flags via env; typed results; strict rate‑limit and cost guards

## 7. Non‑Functional Requirements

- Performance: caches (memory/Redis), content‑hash keys; circuit breakers; DLQ for failed jobs (where applicable)
- Security: Zod validation, RBAC, secrets via env; never log secrets
- Reliability: retries with backoff; idempotent writes; audit logs for bulk ops
- Compatibility: work alongside Yoast/RankMath/The SEO Framework; detect and adapt
- Observability: structured logs, optional metrics; coverage and performance checks in CI

## 8. System Design Notes

### Implementation Architecture

```text
src/
├── tools/
│   ├── seo/
│   │   ├── index.ts              # SEO tools registration
│   │   ├── SEOTools.ts           # Main SEO tools class
│   │   ├── analyzers/
│   │   │   ├── ContentAnalyzer.ts
│   │   │   ├── ReadabilityAnalyzer.ts
│   │   │   └── KeywordAnalyzer.ts
│   │   ├── generators/
│   │   │   ├── MetaGenerator.ts
│   │   │   ├── SchemaGenerator.ts
│   │   │   └── SitemapGenerator.ts
│   │   ├── validators/
│   │   │   ├── SchemaValidator.ts
│   │   │   └── MetaValidator.ts
│   │   ├── optimizers/
│   │   │   ├── InternalLinkOptimizer.ts
│   │   │   └── CoreWebVitalsOptimizer.ts
│   │   └── providers/
│   │       ├── interfaces/
│   │       ├── GoogleSearchConsole.ts
│   │       ├── DataForSEO.ts
│   │       └── Ahrefs.ts
│   └── index.ts                  # Tool registration
├── types/
│   └── seo.ts                    # SEO-specific TypeScript types
├── cache/
│   └── SEOCacheManager.ts        # SEO cache strategies
└── utils/
    └── seo/
        ├── rateLimiter.ts         # SEO API rate limiting
        └── sanitizers.ts          # Meta content sanitization
```

### Tool Registration Pattern

```typescript
// src/tools/seo/index.ts
export const seoTools = [
  {
    name: "wp_seo_analyze_content",
    description: "Analyze content for SEO optimization",
    inputSchema: AnalyzeContentParamsSchema,
    handler: (params) => seoToolsInstance.analyzeContent(params),
  },
  // Additional tools...
];
```

### Configuration Integration

```typescript
// SEO feature flags in Config.ts
export interface SEOConfig {
  enabled: boolean;
  providers: {
    searchConsole: boolean;
    dataForSEO: boolean;
    ahrefs: boolean;
  };
  limits: {
    bulkOperationSize: number;
    rateLimitPerMinute: number;
  };
  cache: {
    analysisLTL: number;
    schemaLTL: number;
  };
}
```

## 9. Testing Strategy

- Unit tests for analyzers, schema builders, and guards.
- Property tests for metrics stability.
- Contract tests for REST auth and WordPress variations.
- Snapshot tests for JSON‑LD.
- Performance tests with fixtures; CI budgets enforced.

## 10. Rollout & Migration

- Feature flags per tool and provider.
- Safe default: read‑only suggestions; explicit apply required for mutations.
- Progressive delivery: Phase 1 → 4 with docs and examples.

## 11. Risks & Mitigations

- Provider quotas/costs → flags, sandbox mode, caching, batching.
- LLM variability → deterministic prompts, fixtures, guardrails.
- WP heterogeneity → capability checks, optional plugin path.
- Scale/perf regressions → budgets in CI, benchmarks, cache discipline.
