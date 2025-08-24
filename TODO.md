# TODO: MCP WordPress SEO Toolkit – Implementation Plan

Status: Tracking Updated: 2025-08-24

## Phase 1 – Foundation (Weeks 1–4)

- [ ] Create SEO tool module skeletons
  - [ ] Create `src/tools/seo/` folder with:
    - [ ] `AnalyzeContent.ts` (seo.analyze_content)
    - [ ] `GenerateMeta.ts` (seo.generate_meta)
    - [ ] `BulkUpdateMeta.ts` (seo.bulk_update_meta)
    - [ ] `SchemaGenerator.ts` (seo.generate_schema)
    - [ ] `SchemaValidator.ts` (seo.validate_schema)
    - [ ] `InternalLinking.ts` (seo.internal_linking)
    - [ ] `SiteAudit.ts` (seo.site_audit)
  - [ ] Register tools in `src/tools/index.ts`
  - [ ] Add Zod input/output schemas in `src/types/seo.ts`

- [ ] Caching & rate limiting
  - [ ] Add namespaced cache helpers in `src/cache/seoCache.ts` (memory first, optional Redis)
  - [ ] Enforce TTLs and cache key strategy (site + tool + input hash)
  - [ ] Sliding‑window rate limiter utility in `src/utils/rateLimit.ts`

- [ ] Auth & security
  - [ ] Verify existing auth headers/WordPress Application Passwords handling
  - [ ] RBAC check surface for destructive/bulk operations
  - [ ] Redact secrets from logs; add safe logging helpers

- [ ] Tests
  - [ ] Unit tests for analyzer metrics and bounds in `tests/tools/seo/`
  - [ ] Property tests for stability of metrics
  - [ ] Contract tests for REST auth variations in `tests/contracts/`

- [ ] Docs
  - [ ] Update `README.md` quickstart with SEO tools
  - [ ] Generate API docs entries via `scripts/generate-docs.js`

## Phase 2 – Advanced features (Weeks 5–8)

- [ ] Schema generation & validation
  - [ ] Implement supported types: Article, Product, FAQ, HowTo, Organization, Website
  - [ ] Snapshot tests for JSON‑LD
  - [ ] Local validator rules; optional remote validator interface

- [ ] Bulk operations
  - [ ] Chunking, retries, backoff, idempotency keys
  - [ ] Progress event streaming
  - [ ] Dry‑run and report output format

- [ ] Internal linking
  - [ ] Topic clustering from categories/tags + content
  - [ ] Suggestions with confidence and safety guards

- [ ] Optional companion plugin (separate repo/artifact)
  - [ ] Custom endpoints for heavy ops
  - [ ] Action Scheduler hooks for background jobs
  - [ ] Transients/Redis fallback support

## Phase 3 – AI integration (Weeks 9–12)

- [ ] LLM‑assisted metadata
  - [ ] Deterministic prompts with brand voice hints
  - [ ] Safety filters (length, profanity/PII)
  - [ ] Human‑in‑the‑loop apply flow

- [ ] AI Overview optimizer
  - [ ] Q&A formatting suggestions, FAQ schema alignment
  - [ ] Featured snippet formatting heuristics

- [ ] Keyword clustering
  - [ ] Extract semantic keywords; cluster by topic
  - [ ] Export suggestions for content roadmap

## Phase 4 – Enterprise (Weeks 13–16)

- [ ] Multisite support & tenancy guards
- [ ] White‑label reporting outputs (JSON/CSV)
- [ ] Scheduled audits with notifications
- [ ] Provider integrations behind flags
  - [ ] Search Console
  - [ ] DataForSEO
  - [ ] Ahrefs

## Tooling & CI

- [ ] Add coverage thresholds for new modules
- [ ] Performance benchmarks for analyze + bulk flows
- [ ] Lint and markdown checks for new docs
- [ ] Example scripts in `docs/examples/seo/`
