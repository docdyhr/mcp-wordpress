# CLAUDE.md

AI assistant instructions for MCP WordPress project (v2.7.0).

## Quick Start

**Status**: Production-ready | 1237/1248 tests passing (99.1%) | 96%+ coverage | 59 WordPress tools

```bash
# Essential Commands
npm test                   # Run tests
npm run dev               # Development mode
npm run health            # System check
npm run fix:rest-auth     # Fix WordPress auth
npm run build             # TypeScript compilation
```

## Architecture

**Core**: MCP Server (`src/index.ts`) managing 59 WordPress tools across 10 categories  
**Client**: Composition pattern with dependency injection, 4 auth methods  
**Tools**: Posts(6), Pages(6), Media(5), Users(6), Comments(7), Taxonomies(10), Site(6), Auth(3), Cache(4), Performance(6)  
**Key Files**: `src/client/WordPressClient.ts`, `src/tools/`, `src/config/Config.ts`, `src/utils/logger.ts`

## Configuration

**Multi-Site** (`mcp-wordpress.config.json`):
```json
{"sites": [{"id": "site1", "config": {"WORDPRESS_SITE_URL": "https://site.com", "WORDPRESS_USERNAME": "user", "WORDPRESS_APP_PASSWORD": "xxxx xxxx"}}]}
```

**Single-Site** (`.env`):
```bash
WORDPRESS_SITE_URL=https://site.com
WORDPRESS_USERNAME=user
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

## Authentication

**Methods**: App Passwords (recommended), JWT, Basic, API Key

**401 Fix**: `npm run fix:rest-auth` or add to `.htaccess`:
```apache
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
```

## Troubleshooting

```bash
npm run health             # System check
npm run fix:rest-auth      # Fix WordPress 401 errors
DEBUG=true npm run dev     # Debug logging
```

**Common Issues:**
- TypeScript: Use `| undefined` for optional properties
- ESLint: Use `_` prefix for unused variables
- WordPress 401: Run `npm run fix:rest-auth`
- Cache: Clear with `rm -rf cache/`

## CI/CD Pipeline

**Automated Release**: Conventional commits trigger versioning  
**Publishing**: NPM + Docker Hub  
**Quality Gates**: All tests must pass, security scans clean

## Development Workflow

### Branch Strategy
```bash
git checkout -b feature/specific-improvement
git checkout -b fix/specific-bug
git checkout -b chore/maintenance-task
```

### Commit Standards
```bash
git commit -m "feat: add new WordPress tool"
git commit -m "fix: resolve authentication issue"
git commit -m "chore: update dependencies"
```

### Quality Gates
```bash
npm test                 # All tests must pass
npm run lint            # ESLint validation
npm run security:scan   # Security audit
npm run build          # TypeScript compilation
```

## Key Project Info

**Project**: Model Context Protocol (MCP) Server for WordPress  
**Language**: TypeScript with strict type safety  
**Testing**: 1237/1248 tests passing (99.1%)  
**Auth**: 4 methods (App Passwords recommended)  
**Multi-Site**: Full support via configuration  
**Tools**: 59 across 10 categories  
**Status**: Production-ready with CI/CD

**Critical Files**:
- `src/index.ts` - MCP Server
- `src/client/WordPressClient.ts` - API client
- `src/tools/` - Tool implementations
- `mcp-wordpress.config.json` - Multi-site config
- `.env` - Single-site environment

## Security Notes

- Never commit credentials or config files
- Branch protection enforced on main
- Pull requests required for all changes
- CodeQL security scanning enabled
- Use `npm run security:scan` before commits