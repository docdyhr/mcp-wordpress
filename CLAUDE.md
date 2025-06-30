# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build System
```bash
npm run build              # Compile TypeScript to JavaScript
npm run build:watch        # Watch mode compilation
npm run typecheck          # Type checking without output
```

### Testing & Diagnostics (Comprehensive Coverage)
```bash
npm test                   # Run main test suite (121+ tests passing)
npm run test:typescript    # Run TypeScript build tests
npm run test:tools         # Test all MCP tools functionality (14/14 tools working)
npm run test:mcp           # Test MCP protocol integration
npm run test:integration   # Integration tests with WordPress
npm run test:auth          # Authentication system tests (100% success)
npm run test:security      # Security validation and penetration tests (40/40 passing)
npm run test:config        # Configuration validation tests (27/27 passing) 
npm run test:property      # Property-based testing (12/12 passing)
npm run test:contracts     # Contract testing with Pact framework (mock)
npm run test:contracts:live # Contract tests with live WordPress (automated setup)
npm run test:performance   # Performance regression detection
npm run test:watch         # Watch mode for tests
npm run test:coverage      # Generate coverage report (50% threshold)
npm run test:fast          # Quick test run
npm run health             # Comprehensive system health check (100% healthy)
npm run fix:rest-auth      # Fix WordPress REST API POST authentication issues
```

### Documentation Commands (v1.2.0)
```bash
npm run docs:generate      # Generate API documentation for all tools
npm run docs:validate      # Validate documentation completeness and quality
npm run docs:serve         # Start local documentation server
npm run docs:watch         # Watch mode for documentation development
npm run docs:check         # Quick documentation validation
```

### Docker Commands (v1.2.0)
```bash
# Build and run locally
docker build -t mcp-wordpress .
docker run -d --name mcp-wordpress mcp-wordpress

# Using Docker Compose
docker-compose up -d                    # Start all services
docker-compose up --profile dev         # Include WordPress and database for development
docker-compose logs -f mcp-wordpress    # View logs
docker-compose down                     # Stop all services
```

**Test Status Summary:**
- ✅ **TypeScript Tests**: 82/82 passing (100%)
- ✅ **Security Tests**: 40/40 passing (100%) - Comprehensive vulnerability testing
- ✅ **Configuration Tests**: 27/27 passing (100%) - Zod schema validation
- ✅ **Property-Based Tests**: 12/12 passing (100%) - Generative testing with fast-check
- ✅ **Contract Tests**: 11/14 passing (79%) - Pact framework integration
- ✅ **Performance Tests**: 7/8 passing (88%) - Regression detection system
- ✅ **Tool Tests**: 14/14 working (100%)
- ✅ **MCP Protocol Tests**: 11/11 passing (100%)
- ✅ **Authentication**: App passwords & JWT working (100%)
- ✅ **Health Check**: All systems operational (100%)
- ✅ **Integration**: Multi-site support verified
- ✅ **Performance Monitoring**: All 6 tools operational
- ✅ **Documentation**: 59/59 tools documented with examples
- ✅ **CI/CD Pipeline**: All GitHub Actions updated with performance gates
- ✅ **Rollback Automation**: Docker, Git, and Kubernetes strategies implemented

### Development & Debugging
```bash
npm run dev                # Development mode with debug output
npm run setup              # Interactive setup wizard
npm run status             # Check connection status
DEBUG=true npm run dev     # Enable debug logging
```

### WordPress REST API Authentication Issues

**Known Issue Resolution**: WordPress REST API POST authentication failures (v1.2.0+)

```bash
npm run fix:rest-auth      # Automated fix for REST API POST authentication
```

**Issue**: POST/PUT/DELETE requests return 401 Unauthorized even with valid application passwords, while GET requests work fine.

**Root Cause**: Apache strips Authorization headers by default, particularly affecting write operations.

**Automated Solution**: The `fix:rest-auth` script applies these fixes:
1. Updates `.htaccess` to preserve Authorization headers
2. Sets WordPress environment to 'local' for development
3. Fixes file permissions and restarts services
4. Tests authentication to verify the fix

**Manual Fix** (if needed):
```apache
# Add to WordPress .htaccess
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
```

```php
// Add to wp-config.php for Docker development
define('WP_ENVIRONMENT_TYPE', 'local');
```

### Code Quality
```bash
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix ESLint errors
```

### Authentication & Security Scripts
```bash
./scripts/wp-auth-check.sh      # WordPress authentication verification
node scripts/test-auth.js       # Comprehensive auth testing
node scripts/health-check.js    # Full system diagnostics
```

## Architecture Overview

### Core Components

**MCP Server** (`src/index.ts`): Main server class implementing Model Context Protocol.
- **Multi-Site Support**: Can manage multiple WordPress sites through a single configuration file.
- Handles 59 WordPress management tools across 10 categories.
- Manages tool registration and request routing for each configured site.
- Implements graceful error handling with authentication-aware responses.

**WordPress Client** (`src/client/`): Modular HTTP client for WordPress REST API v2.
- **Refactored Architecture** (v1.1.2): Migrated from monolithic 1043-line class to modular manager pattern
- **Manager Components**:
  - `WordPressClient.ts`: Main orchestrator using composition pattern (~400 lines)
  - `managers/BaseManager.ts`: Common functionality and error handling
  - `managers/AuthenticationManager.ts`: All authentication methods and token management
  - `managers/RequestManager.ts`: HTTP operations, rate limiting, and retry logic
- **Backward Compatibility**: `api.ts` maintains 100% API compatibility via re-exports
- A separate client instance is created for each configured site.
- Supports multiple authentication methods (App Passwords, JWT, Basic, API Key).
- Implements intelligent request management with comprehensive error handling.

**Tool System** (`src/tools/`): Modular, class-based tool implementations.
- **Architecture**: All tools are refactored from functions to classes for better organization and maintainability.
- **Registration**: An `index.ts` file exports all tool classes for centralized registration.
- **Multi-Site Support**: All tools accept a `site` parameter to target specific WordPress sites.
- **Error Handling**: Standardized error handling using `toolWrapper.ts` utilities (v1.1.2)
  - Reduced repetitive try-catch blocks from 49 to 3 standardized patterns
  - Consistent validation and error formatting across all tools

**Tool Categories (59 total tools):**
  - **Posts** (`posts.ts` - PostTools): Create, read, update, delete blog posts (6 tools)
  - **Pages** (`pages.ts` - PageTools): Static page management (6 tools)
  - **Media** (`media.ts` - MediaTools): File upload and media library management (5 tools)
  - **Users** (`users.ts` - UserTools): User account management (6 tools)
  - **Comments** (`comments.ts` - CommentTools): Comment moderation and management (7 tools)
  - **Taxonomies** (`taxonomies.ts` - TaxonomyTools): Categories and tags (10 tools)
  - **Site** (`site.ts` - SiteTools): Site settings and statistics (6 tools)
  - **Auth** (`auth.ts` - AuthTools): Authentication testing and management (3 tools)
  - **Cache** (`cache.ts` - CacheTools): Performance caching and optimization (4 tools)
  - **Performance** (`performance.ts` - PerformanceTools): Real-time monitoring and analytics (6 tools)

**Tool Class Structure:**
Each tool class follows a consistent pattern:
```typescript
export class ToolCategoryTools {
  constructor(private client: WordPressClient) {}
  
  async toolMethod(params: ToolParams): Promise<ToolResult> {
    // Parameter validation
    // Multi-site client resolution
    // API interaction
    // Error handling
    // Response formatting
  }
}
```

### New Architecture Components (v1.2.0)

**Performance Monitoring System** (`src/performance/`): Real-time performance tracking and analytics.
- **PerformanceMonitor** (`PerformanceMonitor.ts`): Core monitoring engine with metrics collection, historical data storage, and alert generation
- **MetricsCollector** (`MetricsCollector.ts`): Central hub for collecting metrics from clients and cache managers with real-time aggregation
- **PerformanceAnalytics** (`PerformanceAnalytics.ts`): Advanced analytics with trend analysis, anomaly detection, linear regression, and predictive insights
- **6 Performance Tools**: Complete performance management toolkit for monitoring, benchmarking, and optimization

**Documentation Generation System** (`src/docs/`): Auto-generated API documentation.
- **DocumentationGenerator** (`DocumentationGenerator.ts`): Automatic extraction of tool documentation from TypeScript classes and type definitions
- **MarkdownFormatter** (`MarkdownFormatter.ts`): Multi-format documentation output (Markdown, JSON, OpenAPI specification)
- **CI/CD Integration**: GitHub Actions workflow for automatic documentation updates on code changes
- **Quality Validation**: Comprehensive structure checks, cross-reference validation, and completeness verification

**Docker Containerization**: Production-ready container deployment.
- **Multi-Stage Dockerfile**: Optimized build process with security best practices and minimal attack surface
- **Docker Compose**: Complete development environment with optional WordPress and database services
- **Environment Configuration**: Flexible configuration via environment variables and volume mounts
- **Health Checks**: Built-in container health monitoring and status reporting

**Enhanced Cache System** (`src/cache/`): Intelligent multi-layer caching with performance monitoring integration.
- **Cache Metrics Integration**: Performance monitoring system tracks cache hit rates, memory usage, and efficiency
- **Site-Specific Isolation**: Complete cache separation for multi-site WordPress installations
- **Real-Time Monitoring**: Cache performance metrics integrated into the broader performance monitoring system
```

### Type System (`src/types/`)

**WordPress Types** (`wordpress.ts`): Complete TypeScript definitions for WordPress REST API v2.
- 400+ lines of precise type definitions.
- Covers all API endpoints and response formats.
- Includes query parameters and request/response interfaces.

**MCP Types** (`mcp.ts`): Model Context Protocol interfaces.
- Tool definitions and handler signatures.
- Server configuration and response types.

**Client Types** (`client.ts`): API client interfaces and error classes.
- Authentication configuration types.
- HTTP method definitions and request options.

### Configuration

The server can be configured in two ways:

1.  **Multi-Site (Recommended)**: Using a `mcp-wordpress.config.json` file in the project root.
2.  **Single-Site (Legacy)**: Using environment variables.

If `mcp-wordpress.config.json` is present, it will be used. Otherwise, the server will fall back to environment variables.

**Enhanced Validation (v1.2.1+)**:
- All configuration is validated using comprehensive Zod schemas
- Automatic validation of URLs, emails, usernames, and authentication methods
- Uniqueness checks for site IDs, names, and URLs in multi-site configurations
- Type-safe configuration interfaces with detailed error messages
- Support for all authentication methods: app-password, jwt, basic, api-key, cookie

#### Multi-Site Configuration (`mcp-wordpress.config.json`)

To manage multiple WordPress sites, create a `mcp-wordpress.config.json` file in the root of the project. This file allows you to define connection details for each site.

**Configuration Structure:**
- **sites**: Array of site configurations
- **id**: Unique identifier for the site (used in `--site` parameter)
- **name**: Human-readable name for the site (for documentation)
- **config**: Connection details (same format as environment variables)

**Example `mcp-wordpress.config.json`:**
```json
{
  "sites": [
    {
      "id": "site1",
      "name": "My First WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.example.com",
        "WORDPRESS_USERNAME": "user1",
        "WORDPRESS_APP_PASSWORD": "app_password_1"
      }
    },
    {
      "id": "site2",
      "name": "My Second WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site2.example.com",
        "WORDPRESS_USERNAME": "user2",
        "WORDPRESS_APP_PASSWORD": "app_password_2",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  ]
}
```

**Security Notes:**
- This file contains sensitive credentials and should **NEVER** be committed to version control
- The file is automatically excluded by `.gitignore`
- Use the provided `mcp-wordpress.config.json.example` as a template
- Each site can use different authentication methods within the same configuration

**⚠️ CRITICAL: Password Format & Secret Management**
- **Password Format**: Do NOT use quotes around passwords in `.env` or JSON files
  - ✅ Correct: `WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx`
  - ❌ Wrong: `WORDPRESS_APP_PASSWORD='xxxx xxxx xxxx xxxx xxxx xxxx'`
  - The libraries handle spaces correctly without quotes
- **Secret Management**:
  - Always check `.gitignore` includes sensitive files: `mcp-wordpress.config.json`, `.env`
  - Use `git status` before commits to verify no secrets are staged
  - Consider using pre-commit hooks to scan for credential patterns
  - Rotate any credentials that are accidentally committed

#### Using the `site` Parameter

When using a multi-site configuration, all tools accept a `site` parameter to specify which site to target.

**Example:**
`wp_list_posts --site="site1"`

If the `site` parameter is omitted and more than one site is configured, the tool will fail. If only one site is configured, it will be used by default.

#### Single-Site Configuration (Environment Variables)

If `mcp-wordpress.config.json` is not found, the server will use the following environment variables (loaded from `.env` or passed via MCP config):

-   `WORDPRESS_SITE_URL` - WordPress site URL (required)
-   `WORDPRESS_USERNAME` - WordPress username (required)
-   `WORDPRESS_APP_PASSWORD` - Application password (recommended)
-   `WORDPRESS_AUTH_METHOD` - Authentication method (optional, defaults to `app-password`)

### Authentication System

Supports 4 authentication methods with comprehensive testing:
1.  **Application Passwords** (recommended) - WordPress 5.6+ built-in
2.  **JWT Authentication** - requires plugin
3.  **Basic Authentication** - development only
4.  **API Key Authentication** - requires plugin

### Testing Architecture

- **Tool Tests**: Individual tool functionality with dynamic test data.
- **Integration Tests**: WordPress API connectivity for single and multi-site setups.
- **Authentication Tests**: All auth methods with timeout handling.
- **Configuration Tests**: Comprehensive Zod schema validation for all configuration scenarios.
- **Property-Based Tests**: Generative testing using fast-check for edge case discovery and data structure validation.
- **Security Tests**: Input validation, XSS protection, SQL injection prevention, and penetration testing.

### Development Guidelines

#### Code Quality
- **TypeScript**: Adhere to strict mode and maintain comprehensive type safety.
- **ESLint**: Follow established linting rules for consistent code style.
- **Class-Based Architecture**: All new tools must be implemented as classes following the established pattern.

#### Tool Development
- **Multi-Site Support**: All tools must accept and handle the `site` parameter.
- **Error Handling**: Implement comprehensive error handling with user-friendly messages.
- **Parameter Validation**: Validate all input parameters before API calls.
- **Response Formatting**: Return consistent, well-structured responses.

#### Testing Requirements
- **Unit Tests**: Add tests for all new tool methods and classes.
- **Integration Tests**: Test multi-site functionality with real WordPress connections.
- **Authentication Tests**: Verify all authentication methods work correctly.
- **Coverage**: Maintain minimum 50% code coverage threshold.

#### Documentation Standards
- **CLAUDE.md**: Update this file for architecture changes, new tools, or configuration updates.
- **Migration Guides**: Create migration documentation for breaking changes.
- **Tool Documentation**: Document new tools with usage examples and parameter descriptions.
- **Security Notes**: Document any security considerations or credential handling changes.
- **Dummy Data**: Always use placeholder data (like example.com, your_username) in documentation and examples to prevent accidental credential exposure.

#### Repository Maintenance Guidelines

**Keep Repository Clean and Concise**
- **Markdown Files**: Limit root-level markdown files to essential documents only (README.md, CHANGELOG.md, CLAUDE.md, TODO.md)
- **Documentation Organization**: Use `docs/` folder for detailed documentation, organized by category
- **Archive Management**: Remove outdated files rather than keeping archive folders - use git history for reference
- **TODO Management**: Keep TODO.md concise and actionable - remove completed items and consolidate verbose descriptions

**File Organization Best Practices**
- **Single Responsibility**: Each markdown file should serve a clear, specific purpose
- **No Duplication**: Remove duplicate content across files - maintain single source of truth
- **Consistent Structure**: Follow established patterns for file organization and naming
- **Regular Cleanup**: Periodically review and remove obsolete documentation

**Quality Standards**
- **Concise Communication**: Write clear, actionable content without unnecessary verbosity
- **Current Information**: Ensure all documentation reflects the current state of the project
- **User Focus**: Prioritize documentation that helps users and contributors
- **Professional Presentation**: Maintain clean, professional appearance following GitHub best practices

**Maintenance Schedule**
- **Monthly**: Review and clean up documentation files
- **Per Release**: Update version-specific documentation and remove outdated content
- **Continuous**: Remove completed TODO items and archive obsolete files