# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Recent Improvements (v1.2.4+)

### WordPress REST API Authentication Fix ✅ **CRITICAL**

- **POST/PUT/DELETE Authentication**: Fixed critical 401 Unauthorized errors for write operations
- **Header Preservation**: Authentication headers now properly included in all HTTP methods
- **Request Manager**: Resolved header override issue in fetchOptions object construction
- **Backward Compatibility**: All existing authentication methods continue to work
- **Comprehensive Testing**: Added full test suite for authentication header verification

### CI/CD Pipeline & Test Infrastructure Fixes ✅

- **ESLint Compliance**: Fixed 44+ linting errors in cache test files
- **Test Suite Optimization**: Main test suite now runs 181/181 tests (100% success rate)
- **CI Environment Detection**: Contract tests automatically skip in CI unless explicitly enabled
- **Pipeline Reliability**: Pre-push hooks and GitHub Actions now pass consistently
- **Repository URL Corrections**: Fixed all references from thomasdyhr/AiondaDotCom to docdyhr

### Publishing & Distribution Fixes ✅

- **NPM Package**: Successfully published v1.2.4 with authentication fixes
- **Docker Hub**: Published corrected images to docdyhr/mcp-wordpress (latest + 1.2.4)
- **Semantic Release**: Automated publishing pipeline now functional and unblocked
- **Docker Hub Description**: Will auto-update on next release via GitHub Actions
- **Multi-Architecture**: Docker images support linux/amd64 and linux/arm64

### Test Infrastructure Enhancements ✅

- **Test Organization**: Contract tests moved to dedicated npm run test:contracts command
- **Error Isolation**: Problematic tests disabled without breaking main functionality
- **Performance**: Main test suite runs faster without resource-intensive contract tests
- **Reliability**: 100% test pass rate in CI/CD environments
- **Developer Experience**: Quick test feedback with npm test command

## Development Commands

### Build System

```bash
npm run build              # Compile TypeScript to JavaScript
npm run build:watch        # Watch mode compilation
npm run typecheck          # Type checking without output
```

### Testing & Diagnostics (Comprehensive Coverage)

```bash
npm test                   # Run main test suite (144/144 tests passing)
npm run test:typescript    # Run TypeScript build tests
npm run test:tools         # Test all MCP tools functionality (14/14 tools working)
npm run test:mcp           # Test MCP protocol integration
npm run test:integration   # Integration tests with WordPress (100% success)
npm run test:multisite     # Multi-site configuration tests (100% success)
npm run test:auth          # Authentication system tests (100% success)
npm run test:security      # Security validation and penetration tests (40/40 passing)
npm run test:config        # Configuration validation tests (27/27 passing)
npm run test:property      # Property-based testing (12/12 passing)
npm run test:contracts     # Contract testing with Pact framework (mock)
npm run test:contracts:live # Contract tests with live WordPress (automated setup)
npm run test:performance   # Performance regression detection (8/8 passing)
npm run test:cache         # Advanced cache testing suite (37/37 passing)
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

# Pull from Docker Hub
docker pull docdyhr/mcp-wordpress:latest
docker run --rm -i docdyhr/mcp-wordpress:latest
```

### Claude Desktop Extension (DXT) Commands (v1.2.5+)

**One-Click Installation**: Claude Desktop Extension package for easy installation.

```bash
# Build DXT package
npm run dxt:package                     # Create mcp-wordpress.dxt file

# Development commands
npm run dxt:build                       # Build DXT package only
npm run dxt:clean                       # Clean build artifacts
npm run dxt:validate                    # Validate DXT package (requires dxt CLI)
```

**DXT Package Features**:

- **Manifest Configuration**: Complete DXT v0.1 specification compliance
- **User Configuration**: Secure credential storage via OS keychain integration
- **Tool Documentation**: 22 primary tools with descriptions and usage examples
- **Built-in Prompts**: 4 pre-configured workflow prompts for common tasks
- **Production Ready**: Optimized package with production dependencies only (4.8MB)

**Installation Process**:

1. Build DXT package: `npm run dxt:package`
2. Install in Claude Desktop through Extensions menu
3. Configure WordPress credentials via secure UI
4. Start using WordPress tools immediately

**User Configuration Fields**:

- WordPress Site URL (required)
- WordPress Username (required)
- Application Password (required, encrypted)
- Authentication Method (optional, defaults to app-password)
- Debug Mode (optional, defaults to false)

### Release & Publishing Commands (v1.2.3)

```bash
npm run release:dry                     # Test semantic release locally
npm run release                         # Manual release (if needed)

# Automated via CI/CD:
# - Push conventional commits to main branch
# - Semantic versioning determines version bump
# - Auto-publishes to NPM and Docker Hub
# - Creates GitHub releases with generated notes
```

**Test Status Summary (Updated v1.2.6+):**

- ✅ **Main Test Suite**: 207/207 passing (100%) - Complete test coverage including previously disabled tests
- ✅ **TypeScript Tests**: 21/21 passing (100%) - Build and module validation
- ✅ **Security Tests**: 40/40 passing (100%) - Comprehensive vulnerability testing
- ✅ **Configuration Tests**: 27/27 passing (100%) - Zod schema validation with multi-site support
- ✅ **Property-Based Tests**: 12/12 passing (100%) - Generative testing with fast-check
- ✅ **Performance Tests**: 8/8 passing (100%) - Regression detection system
- ✅ **Advanced Cache Tests**: 37/37 passing (100%) - Comprehensive cache testing suite
- ✅ **Environment Tests**: 7/7 passing (100%) - Path resolution and configuration loading
- ✅ **Upload Timeout Tests**: 12/12 passing (100%) - File upload and timeout handling
- ✅ **Unit Tests**: 17/17 passing (100%) - Security utilities and helper functions
- ✅ **Tool Tests**: 14/14 working (100%) - All MCP tools functional
- ✅ **Previously Disabled Tests**: 3/3 passing (100%) - Auth headers, config loading, and tool validation
- ✅ **Authentication**: App passwords & JWT working (100%)
- ✅ **Health Check**: All systems operational (100%)
- ✅ **CI/CD Pipeline**: Fully functional with automated NPM and Docker publishing
- ✅ **Contract Tests**: Available via dedicated npm run test:contracts command
- ✅ **Repository URLs**: All corrected to docdyhr organization

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

**Issue**: POST/PUT/DELETE requests return 401 Unauthorized even with valid application passwords, while GET
requests work fine.

**Root Cause**: Apache strips Authorization headers by default, particularly affecting write
operations.

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

### Code Quality & Linting

```bash
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix ESLint errors
npm run lint:md            # Markdown linting
npm run lint:md:fix        # Auto-fix markdown issues
npm run format             # Format all files with Prettier
npm run format:check       # Check formatting without changes
npm run security:check     # Quick security vulnerability scan
npm run security:scan      # Comprehensive security scanning
npm run security:test      # Security policy validation
npm run security:full      # Complete security testing suite
```

### Claude Code Hooks (v1.2.5+)

**Enhanced CI/CD Prevention**: Comprehensive hooks system to prevent CI/CD pipeline failures.

```bash
# Claude Code automatically runs configured hooks on:
# - Pre-commit: ESLint, TypeScript checks, quick tests, markdown linting, security scan
# - Pre-push: Full build, complete test suite, comprehensive security validation
# - File-specific: Targeted validation including security scanning for critical modules
```

**Hook Configuration** (`.claude-code.json`):

- **Pre-commit Hooks**: Prevent bad code from being committed
  - ESLint validation (60s timeout)
  - TypeScript type checking (120s timeout)
  - Quick test validation (180s timeout)
  - Markdown linting with auto-fix (30s timeout)
  - Prettier formatting for consistent styling (30s timeout)
  - Security vulnerability scan and credential detection (60s timeout)
- **Pre-push Hooks**: Ensure CI/CD pipeline success
  - Full build verification (180s timeout)
  - Complete test suite (600s timeout)
  - Security audit for dependency vulnerabilities (120s timeout)
  - Comprehensive security tests and penetration testing (300s timeout)
  - Security policy validation (120s timeout)
  - Performance regression tests (300s timeout, non-blocking)
- **File-specific Hooks**: Targeted validation
  - TypeScript files: Compile-time error checking
  - Test files: Automatic test execution for modified files
  - Cache modules: Extra linting for critical components
  - Package.json: Dependency validation
  - Markdown files: Lint and format specific files on change
  - Security modules: Enhanced security validation for critical security code
  - Client modules: Authentication and HTTP security scanning
  - Configuration files: Secret and credential detection

**Hook Benefits**:

- ✅ **Prevents CI failures**: Catches issues before they reach CI/CD
- ✅ **Faster feedback**: Immediate validation during development
- ✅ **Reduced pipeline costs**: Less CI/CD compute time
- ✅ **Better code quality**: Consistent validation across all changes
- ✅ **Enhanced security**: Proactive vulnerability detection and credential protection
- ✅ **Compliance ready**: Automated security policy validation

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

- **PerformanceMonitor** (`PerformanceMonitor.ts`): Core monitoring engine with metrics collection,
  historical data storage, and alert generation
- **MetricsCollector** (`MetricsCollector.ts`): Central hub for collecting metrics from clients
  and cache managers with real-time aggregation
- **PerformanceAnalytics** (`PerformanceAnalytics.ts`): Advanced analytics with trend analysis,
  anomaly detection, linear regression, and predictive insights
- **6 Performance Tools**: Complete performance management toolkit for monitoring, benchmarking, and optimization

**Documentation Generation System** (`src/docs/`): Auto-generated API documentation.

- **DocumentationGenerator** (`DocumentationGenerator.ts`): Automatic extraction of tool
  documentation from TypeScript classes and type definitions
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

````text

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
````

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

When using a multi-site configuration, all tools accept a `site` parameter to specify which site to
target.

**Example:**
`wp_list_posts --site="site1"`

If the `site` parameter is omitted and more than one site is configured, the tool will fail. If only
one site is configured, it will be used by default.

#### Single-Site Configuration (Environment Variables)

If `mcp-wordpress.config.json` is not found, the server will use the following environment variables
(loaded from `.env` or passed via MCP config):

- `WORDPRESS_SITE_URL` - WordPress site URL (required)
- `WORDPRESS_USERNAME` - WordPress username (required)
- `WORDPRESS_APP_PASSWORD` - Application password (recommended)
- `WORDPRESS_AUTH_METHOD` - Authentication method (optional, defaults to `app-password`)

### Authentication System

Supports 4 authentication methods with comprehensive testing:

1. **Application Passwords** (recommended) - WordPress 5.6+ built-in
2. **JWT Authentication** - requires plugin
3. **Basic Authentication** - development only
4. **API Key Authentication** - requires plugin

### Testing Architecture

- **Tool Tests**: Individual tool functionality with dynamic test data.
- **Integration Tests**: WordPress API connectivity for single and multi-site setups.
- **Authentication Tests**: All auth methods with timeout handling.
- **Configuration Tests**: Comprehensive Zod schema validation for all configuration scenarios.
- **Property-Based Tests**: Generative testing using fast-check for edge case discovery and data
  structure validation.
- **Security Tests**: Input validation, XSS protection, SQL injection prevention, and penetration testing.

### Development Guidelines

#### Code Quality

- **TypeScript**: Adhere to strict mode and maintain comprehensive type safety.
- **ESLint**: Follow established linting rules for consistent code style - all files now linted
  including previously disabled tests.
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
- **Test Maintenance**: All tests are now enabled and functional - no disabled tests remain
  in the codebase.

#### Documentation Standards

- **CLAUDE.md**: Update this file for architecture changes, new tools, or configuration updates.
- **Migration Guides**: Create migration documentation for breaking changes.
- **Tool Documentation**: Document new tools with usage examples and parameter descriptions.
- **Security Notes**: Document any security considerations or credential handling changes.
- **Dummy Data**: Always use placeholder data (like example.com, your_username) in documentation and
  examples to prevent accidental credential exposure.

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

## CI/CD Pipeline & Automation (v1.2.3)

### Automated Release Pipeline

**Semantic Release System:**

- **Trigger**: Conventional commits pushed to `main` branch
- **Versioning**: Automatic semantic versioning based on commit types
- **Publishing**: Simultaneous NPM and Docker Hub publishing
- **Documentation**: Auto-generated release notes and CHANGELOG updates

**Workflow Components:**

```bash
.github/workflows/
├── release.yml              # Main automated release pipeline
├── ci.yml                   # Comprehensive CI/CD with testing matrix
├── docker-publish.yml       # Legacy Docker publishing (manual)
├── npm-publish.yml          # Legacy NPM publishing (manual)
├── performance-gates.yml    # Performance regression detection
└── quality-assurance.yml    # Code quality and security scans
```

**Release Automation Features:**

- ✅ **Multi-Architecture Docker Builds**: linux/amd64, linux/arm64
- ✅ **NPM Provenance**: Cryptographic signatures for package integrity
- ✅ **Conventional Commits**: Automatic version bump detection
- ✅ **Release Notes Generation**: AI-powered changelog creation
- ✅ **Multi-Registry Publishing**: NPM, Docker Hub, GitHub Packages
- ✅ **Rollback Capabilities**: Automated rollback on failure detection

**Quality Gates:**

- **Pre-Release**: All tests must pass (82+ tests, 100% success rate)
- **Security**: Clean security audit and vulnerability scan
- **Performance**: Performance regression detection (< 20% degradation)
- **Documentation**: Automated validation and completeness checks
- **Build Verification**: Multi-platform build testing
