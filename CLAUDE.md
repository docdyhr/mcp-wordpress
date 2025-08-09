# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the MCP WordPress project.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Commands](#development-commands)
- [Architecture Overview](#architecture-overview)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Tool Development](#tool-development)
- [Troubleshooting](#troubleshooting)
- [CI/CD Pipeline](#cicd-pipeline)
- [Claude Memory Integration](#claude-memory-integration)
- [Next Steps for Development](#next-steps-for-development)

## Quick Start

**Current Status (v1.2.4+)**: All critical issues resolved ✅

- 394/394 tests passing (100%)
- WordPress REST API authentication fixed  
- CI/CD pipeline fully functional
- Multi-site support with 59 tools across 10 categories
- **Comprehensive testing strategy** with Phase 1 coverage targets (40% lines)

**Essential Commands**:

```bash
npm test                   # Run main test suite
npm run test:coverage      # Run tests with coverage analysis
npm run coverage:check     # Validate coverage thresholds
npm run health             # System health check
npm run dev                # Development mode
npm run fix:rest-auth      # Fix WordPress authentication issues
```

**📚 Testing Resources**:
- [Testing Guidelines & Best Practices](TESTING_GUIDELINES.md) - Comprehensive testing standards
- [Coverage Strategy](COVERAGE_STRATEGY.md) - 3-phase coverage improvement plan
- [Quick Reference](tests/QUICK_REFERENCE.md) - Essential commands and patterns

## Development Commands

### Core Operations

```bash
# Build & Development
npm run build              # Compile TypeScript
npm run dev                # Development mode with debug output
npm run setup              # Interactive setup wizard
npm run status             # Check connection status

# Testing (394/394 passing ✅)
npm test                   # Main test suite
npm run test:coverage      # Tests with coverage analysis
npm run test:coverage:report # Coverage + detailed analysis
npm run coverage:check     # Validate coverage thresholds
npm run coverage:strict    # Enforce component-specific thresholds
npm run test:tools         # Test all 59 MCP tools (14/14 working)
npm run test:auth          # Authentication tests
npm run test:security      # Security validation (40/40 passing)
npm run test:performance   # Performance monitoring (8/8 passing)
npm run test:watch         # Watch mode for tests

# Code Quality
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix ESLint errors
npm run format             # Format with Prettier
npm run security:scan      # AI-powered security scanning
```

### Docker & DXT

```bash
# Docker
docker-compose up -d       # Start all services
docker pull docdyhr/mcp-wordpress:latest

# Claude Desktop Extension (DXT)
npm run dxt:package:official   # Build DXT package (use official CLI)
```

### Diagnostics & Fixes

```bash
npm run health             # Comprehensive system health check
npm run fix:rest-auth      # Fix WordPress authentication issues
DEBUG=true npm run dev     # Enable debug logging
```

## Architecture Overview

### Core Components

**MCP Server** (`src/index.ts`): Main server implementing Model Context Protocol

- Manages 59 WordPress tools across 10 categories
- Multi-site support via single configuration file
- Graceful error handling with authentication-aware responses

**WordPress Client** (`src/client/`): Modular HTTP client for WordPress REST API v2

- **Refactored Architecture**: Migrated from 1043-line monolithic class to manager pattern
- **Key Managers**: `WordPressClient.ts`, `AuthenticationManager.ts`, `RequestManager.ts`
- Supports 4 authentication methods: App Passwords, JWT, Basic, API Key
- Separate client instance per configured site

**Tool System** (`src/tools/`): Class-based tool implementations

- **59 Total Tools** across 10 categories (Posts, Pages, Media, Users, Comments, etc.)
- All tools refactored from functions to classes for better organization
- Multi-site support: all tools accept `site` parameter
- Standardized error handling via `toolWrapper.ts`

### Tool Categories

- **Posts** (6 tools): Create, read, update, delete blog posts
- **Pages** (6 tools): Static page management
- **Media** (5 tools): File upload and media library
- **Users** (6 tools): User account management
- **Comments** (7 tools): Comment moderation
- **Taxonomies** (10 tools): Categories and tags
- **Site** (6 tools): Site settings and statistics
- **Auth** (3 tools): Authentication testing
- **Cache** (4 tools): Performance optimization
- **Performance** (6 tools): Real-time monitoring

### Advanced Systems

**Performance Monitoring** (`src/performance/`): Real-time analytics and metrics  
**Documentation Generation** (`src/docs/`): Auto-generated API documentation  
**AI Security Suite** (`src/security/`): ML-powered vulnerability detection  
**Enhanced Cache System** (`src/cache/`): Multi-layer caching with monitoring

## Configuration

### Multi-Site Setup (Recommended)

Create `mcp-wordpress.config.json` in project root:

```json
{
  "sites": [
    {
      "id": "site1",
      "name": "My WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.example.com",
        "WORDPRESS_USERNAME": "username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  ]
}
```

**Usage**: All tools accept `--site="site1"` parameter to target specific sites.

### Single-Site Setup (Environment Variables)

Create `.env` file:

```bash
WORDPRESS_SITE_URL=https://your-site.com
WORDPRESS_USERNAME=your_username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password
```

### Security Notes ⚠️

- **Password Format**: NO quotes around passwords: `WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx`
- **Secret Management**: Never commit config files - they're in `.gitignore`
- **Validation**: All config validated with Zod schemas for type safety

## Authentication

### Supported Methods

1. **Application Passwords** (recommended) - WordPress 5.6+ built-in
2. **JWT Authentication** - requires plugin
3. **Basic Authentication** - development only
4. **API Key Authentication** - requires plugin

### Common Issue: 401 Unauthorized for POST/PUT/DELETE

**Problem**: Write operations fail with 401, but GET requests work fine.

**Root Cause**: Apache strips Authorization headers for write operations.

**Quick Fix**:

```bash
npm run fix:rest-auth      # Automated solution
```

**Manual Fix** - Add to WordPress `.htaccess`:

```apache
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
```

## Tool Development

### Class-Based Architecture

All tools follow consistent class pattern:

```typescript
export class ToolCategoryTools {
  constructor(private client: WordPressClient) {}

  async toolMethod(params: ToolParams): Promise<ToolResult> {
    // 1. Parameter validation
    // 2. Multi-site client resolution
    // 3. API interaction
    // 4. Error handling
    // 5. Response formatting
  }
}
```

### Development Guidelines

- **Multi-Site Support**: All tools must accept `site` parameter
- **Error Handling**: Use `toolWrapper.ts` utilities for consistent error formatting
- **TypeScript**: Strict mode compliance required
- **Testing**: Add unit tests for all new tool methods
- **Documentation**: Update tool descriptions and usage examples

## Troubleshooting

### Quick Diagnostics

```bash
npm run health             # Comprehensive system check
npm run status             # Connection status
npm run test:auth          # Authentication validation
DEBUG=true npm run dev     # Debug logging
```

### Common Issues

**TypeScript Compilation Errors**:

- Use `| undefined` for optional properties with `exactOptionalPropertyTypes`
- Add explicit exports for interfaces: `export interface MyInterface {}`

**ESLint Failures**:

- Use underscore prefix for unused variables: `catch (_error)`
- Import/export conflicts: use aliased imports for re-exports

**WordPress Integration**:

- 401 errors: Run `npm run fix:rest-auth`
- Multi-site config: Verify `mcp-wordpress.config.json` format
- Cache issues: Clear cache with `rm -rf cache/`

**Performance Problems**:

- Low cache hit rates: Adjust cache config in `src/cache/CacheManager.ts`
- High memory usage: Reduce `maxItems` and set `maxMemoryMB` limits

### Emergency Recovery

```bash
git stash                  # Save uncommitted changes
git pull origin main       # Get latest code
npm ci                     # Clean install
npm run build              # Rebuild
npm run health             # Verify system
```

### GitHub CLI Usage

**Important**: GitHub CLI commands can hang due to interactive pagers. Use proper `PAGER` configuration:

#### ✅ Recommended Setup (Enhanced)

Add to your `~/.zshrc` for optimal GitHub CLI experience:

```bash
# Enhanced bat function for GitHub CLI and general use
function safe-bat() {
  bat --paging=never --plain "$@"
}

# Set PAGER environment variable with enhanced bat options
export PAGER="bat --plain --paging=never"

# Fallback if bat is not installed
if ! command -v bat &> /dev/null; then
  export PAGER=cat
fi
```

#### Usage Examples

```bash
# ✅ Best - Enhanced syntax highlighting, no paging, clean output
gh pr view 34              # Uses enhanced PAGER automatically
gh pr list                 # Clean, highlighted output
gh pr comment 34 --body "Comment text"

# ✅ Manual override with enhanced options
PAGER="bat --plain --paging=never" gh pr view 34

# ✅ One-off with safe-bat function
gh pr view 34 | safe-bat

# ✅ JSON output for scripting
gh pr view 34 --json state,title,url
```

#### Benefits of Enhanced Configuration

- `--plain`: Removes line numbers and git decorations for cleaner output
- `--paging=never`: Prevents interactive pager from hanging CLI commands
- Auto-detection: `bat` automatically detects syntax highlighting based on content type
- Fallback to `cat` if `bat` is not available

#### ❌ Avoid These Patterns

```bash
gh pr view 34              # Without proper PAGER setup - will hang
bat --paging=auto          # Interactive paging breaks automation
export PAGER=less          # Interactive pager causes hanging
```

### Security Notes

**Vulnerability Fixes**:

- **form-data vulnerability (SNYK-JS-FORMDATA-10841150)**: Fixed by using npm overrides in package.json to force all
  dependencies to use form-data@^4.0.3 instead of vulnerable versions

## CI/CD Pipeline

### Automated Release Pipeline

- **Trigger**: Conventional commits to `main` branch
- **Versioning**: Automatic semantic versioning
- **Publishing**: NPM + Docker Hub simultaneously
- **Quality Gates**: All 394 tests must pass, security scans clean

### Workflow Files

- `.github/workflows/release.yml` - Main automated release
- `.github/workflows/ci.yml` - CI/CD with testing matrix
- Performance gates and security scans integrated

### Manual Release (if needed)

```bash
npm run release:dry        # Test release locally
npm run release            # Manual release
```

## Claude Memory Integration

### Memory Usage Guidelines

**When working with this codebase, Claude should use memory tools to:**

- **Track Multi-Site Configurations**: Store site-specific settings, authentication methods, and patterns
- **Remember WordPress Integration Patterns**: Cache REST API quirks, auth fixes, and troubleshooting solutions
- **Document Tool Usage**: Remember successful tool combinations and workflow patterns
- **Store Performance Insights**: Track optimization results, cache configurations, and monitoring data
- **Maintain Security Context**: Remember vulnerability patterns, credential handling, and mitigation strategies
- **Track Development Context**: Store recent changes, active development areas, and improvement initiatives

### Recommended Memory Entities

- **WordPress Sites**: Configuration details, specific quirks, and authentication patterns
- **Authentication Methods**: Success patterns, common failure modes, and resolution strategies
- **Tool Categories**: Usage patterns, interdependencies, and best practices
- **Performance Metrics**: Optimization strategies, benchmark results, and monitoring insights
- **Security Configurations**: Best practices, vulnerability patterns, and remediation approaches

### Memory Best Practices

- Create entities for major architecture components (MCP Server, WordPress Client, Tool System)
- Store observations about successful configuration patterns and troubleshooting solutions
- Maintain relationships between tools, configurations, and their specific use cases
- Track evolution of codebase architecture and key design decisions
- Remember patterns that lead to successful problem resolution

---

## Key Project Information for Claude Code

**Project Type**: Model Context Protocol (MCP) Server for WordPress management  
**Language**: TypeScript with strict type safety  
**Architecture**: Class-based modular design with manager pattern  
**Testing**: 394/394 tests passing (100% success rate)  
**Authentication**: 4 methods supported (App Passwords recommended)  
**Multi-Site**: Complete support via configuration file  
**Tools**: 59 WordPress management tools across 10 categories  
**Status**: Production-ready with automated CI/CD pipeline

**Critical Files**:

- `src/index.ts` - MCP Server
- `src/client/WordPressClient.ts` - API client
- `src/tools/` - Tool implementations
- `mcp-wordpress.config.json` - Multi-site configuration
- `.env` - Single-site environment variables

## Next Steps for Development

**Repository Clean Slate Achieved** ✅ (August 7, 2025)

### 🔐 **Security-First Development Workflow**

The repository maintains **excellent security posture** with proper branch protection rules:

- ✅ **No direct pushes to main** (branch protection enforced)
- ✅ **Pull requests required** for all changes  
- ✅ **Status checks must pass** (CI/CD validation)
- ✅ **No merge commits allowed** (clean history)
- ✅ **CodeQL security scanning** enabled

### 🎯 **Development Best Practices**

#### **Branch Strategy**

```bash
# Create focused feature branches
git checkout -b feature/specific-improvement
git checkout -b fix/specific-bug  
git checkout -b chore/maintenance-task

# Never work directly on main branch
```

#### **Commit Standards**

```bash
# Use conventional commits with single responsibility
git commit -m "feat: add new WordPress tool for custom fields"
git commit -m "fix: resolve authentication header issue"
git commit -m "chore: update dependencies to latest versions"
git commit -m "docs: improve multi-site configuration examples"
```

#### **Pull Request Workflow**

1. **Create focused feature branch** from latest main
2. **Make atomic commits** with clear, descriptive messages
3. **Run full test suite** locally before pushing
4. **Create PR** with clear description and context
5. **Wait for CI/CD validation** (all 394 tests must pass)
6. **Address any review feedback**
7. **Merge via GitHub interface** (respects branch protection)

#### **Quality Gates**

```bash
# Before creating PR, ensure:
npm test                 # All 394 tests pass (100%)
npm run lint            # ESLint validation clean
npm run security:scan   # Security audit clean  
npm run build          # TypeScript compilation successful
```

### 🚀 **Development Commands Reference**

#### **Starting New Work**

```bash
git checkout main && git pull origin main    # Sync with latest
git checkout -b feature/my-new-feature      # Create feature branch
npm test                                    # Verify starting state
```

#### **During Development**

```bash
npm run dev                    # Development mode with hot reload
npm run test:watch            # Run tests in watch mode
DEBUG=true npm run dev        # Enable debug logging
```

#### **Before Committing**

```bash
npm run lint:fix              # Auto-fix linting issues
npm test                      # Verify all tests pass
npm run build                 # Ensure clean build
```

#### **Creating Pull Request**

```bash
git push -u origin feature/my-new-feature   # Push feature branch  
gh pr create --title "feat: descriptive title" --body "Clear description"
```

### ⚠️ **Important Reminders**

- **Never bypass branch protection** - it's there for security
- **One concern per PR** - avoid mixing features/fixes/chores
- **Test locally first** - don't rely on CI to catch basic issues
- **Follow semantic versioning** in commit messages
- **Update CLAUDE.md** if adding significant features or changing workflows

### 🔄 **Emergency Procedures**

If you encounter issues with branch protection or need to make urgent fixes:

1. **Never use force push** to main branch
2. **Create hotfix branch** for urgent fixes: `git checkout -b hotfix/critical-issue`
3. **Follow normal PR process** even for urgent changes
4. **Contact repository maintainer** if branch protection needs temporary adjustment

**Repository Status**: Clean slate maintained with robust development workflow ✨
