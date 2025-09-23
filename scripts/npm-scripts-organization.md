# NPM Scripts Organization Plan

## Current State: 95 scripts (excessive)

## Target: ~40-50 scripts organized by function

## Proposed Organization:

### Core Development (5-7 scripts)

```json
{
  "dev": "npm run build && DEBUG=true node dist/index.js",
  "start": "npm run build && node dist/index.js",
  "build": "tsc",
  "build:watch": "tsc --watch",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write *.md docs/**/*.md src/**/*.ts tests/**/*.ts",
  "format:check": "prettier --check *.md docs/**/*.md src/**/*.ts tests/**/*.ts"
}
```

### Testing (8-10 scripts)

```json
{
  "test": "npm run build && vitest run",
  "test:watch": "vitest",
  "test:ui": "npm run build && vitest --ui",
  "test:coverage": "npm run build && vitest run --coverage",
  "test:coverage:report": "npm run test:coverage && node scripts/coverage-guardrail.js",
  "test:ci": "npm run build && CI=true vitest run",
  "test:auth": "node scripts/test-auth.js",
  "test:tools": "node scripts/test-all-tools-fixed.js",
  "test:security": "npm run build && vitest run tests/security/",
  "test:performance": "npm run build && vitest run tests/performance/"
}
```

### Code Quality & Linting (4-5 scripts)

```json
{
  "lint": "eslint src/ tests/",
  "lint:fix": "eslint src/ tests/ --fix",
  "lint:md": "markdownlint *.md docs/**/*.md",
  "lint:md:fix": "markdownlint *.md docs/**/*.md --fix",
  "check:ci": "npm run typecheck && npm run lint && npm run test:coverage"
}
```

### Security (3-4 scripts)

```json
{
  "security:scan": "npm run build && node scripts/security-demo.js || npm audit --audit-level=low",
  "security:audit": "npm audit --production",
  "security:fix": "npm audit fix",
  "security:full": "npm run security:scan && npm run security:review && npm run security:monitor && npm run test:security"
}
```

### Documentation (3-4 scripts)

```json
{
  "docs:generate": "npm run build && node scripts/generate-docs.js",
  "docs:serve": "npm run docs:generate && node scripts/serve-docs.js",
  "docs:validate": "npm run docs:generate && node scripts/validate-docs.js",
  "docs:watch": "npm run docs:generate && echo 'Watching for changes...' && npm run docs:serve"
}
```

### Deployment & Release (4-5 scripts)

```json
{
  "prepublishOnly": "npm run build && npm run check:ignore",
  "release": "semantic-release",
  "release:dry": "semantic-release --dry-run",
  "docker:build": "docker build -t docdyhr/mcp-wordpress:latest .",
  "docker:publish": "./scripts/manual-docker-publish.sh"
}
```

### DXT Development (2-3 scripts)

```json
{
  "dxt:package": "npm run dxt:clean && npm run dxt:build",
  "dxt:package:official": "npm run build && node scripts/build-dxt-clean.cjs",
  "dxt:clean": "rm -rf dxt-build mcp-wordpress.dxt minimal-dxt-build mcp-wordpress-minimal.dxt mcp-wordpress-official.dxt"
}
```

### Utility & Maintenance (3-5 scripts)

```json
{
  "setup": "node bin/setup.js",
  "status": "node bin/status.js",
  "health": "node scripts/health-check.js",
  "fix:rest-auth": "bash scripts/fix-rest-api-auth.sh",
  "verify-claude": "node scripts/verify-claude-integration.js"
}
```

## Scripts to Remove/Consolidate:

### Redundant Coverage Scripts (consolidate 8 → 2):

- Remove: coverage:baseline, coverage:c8, coverage:full, coverage:guard, coverage:strict, coverage:check
- Keep: test:coverage, test:coverage:report

### Redundant Test Scripts (consolidate 15 → 5):

- Remove: test:typescript, test:legacy, test:fast, test:cache, test:config, test:property, test:integration,
  test:multisite, test:mcp, test:contracts, test:compatibility, test:with-env, test:weekly, test:coverage:baseline,
  test:coverage:ci, test:security:penetration, test:security:validation, test:performance:ci
- Keep: test, test:coverage, test:auth, test:tools, test:security, test:performance

### Redundant Security Scripts (consolidate 8 → 4):

- Remove: security:config, security:monitor, security:pipeline, security:remediate, security:review, security:test,
  security:check
- Keep: security:scan, security:audit, security:fix, security:full

### Redundant Evaluation Scripts (consolidate 8 → 2):

- Remove: eval:ci, eval:critical, eval:existing, eval:focused, eval:quick, eval:report, eval:watch
- Keep: eval (primary), eval:report (for CI)

### Redundant Build/Check Scripts (consolidate 6 → 2):

- Remove: check:ignore, check:npm, check:workflows, dxt:validate, performance:benchmark, performance:sla
- Keep: check:ci, health

## Result: 95 → ~45 scripts (53% reduction)

This maintains all essential functionality while dramatically improving developer experience and reducing cognitive
overhead.
