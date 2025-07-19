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

### Claude Desktop Extension (DXT) Commands (v1.5.3+)

**One-Click Installation**: Claude Desktop Extension package for easy installation.

```bash
# Build DXT package (Official Method - REQUIRED)
npm run dxt:package:official            # Create mcp-wordpress.dxt file using official DXT CLI

# Alternative build commands (for development)
npm run dxt:package                     # Create using custom build script (may have compatibility issues)
npm run dxt:build                       # Build DXT package only
npm run dxt:clean                       # Clean build artifacts
npm run dxt:validate                    # Validate DXT package (built-in validation)
```

**DXT Package Features**:

- **Manifest Configuration**: Complete DXT v0.1 specification compliance
- **User Configuration**: Secure credential storage via OS keychain integration
- **Tool Documentation**: 22 primary tools with descriptions and usage examples
- **Built-in Prompts**: 4 pre-configured workflow prompts for common tasks
- **Production Ready**: Optimized package with production dependencies only (2.6MB)
- **Official DXT CLI Compatibility**: Built using Anthropic's official DXT tool for guaranteed compatibility
- **Fast Startup**: DXT mode bypasses connection testing for immediate server startup
- **Complete AJV Schema Support**: All required JSON schema files included for dependency validation

**Installation Process**:

1. **Build DXT package**: `npm run dxt:package:official` (IMPORTANT: Use official DXT CLI)
2. **Install in Claude Desktop**: Extensions menu → Install Extension → Select `mcp-wordpress.dxt`
3. **Configure WordPress credentials**: Secure UI prompts for site URL, username, and application password
4. **Start using WordPress tools**: Immediate access to 59 WordPress management tools

**Critical Requirements for DXT Installation**:

- ✅ **Use Official DXT CLI**: The `dxt pack` command ensures proper package structure that Claude Desktop can install
- ✅ **Include Production Dependencies**: node_modules with runtime dependencies must be included
- ✅ **Proper File Structure**: manifest.json at root, compiled code in dist/, proper .dxtignore
- ✅ **AJV Schema Files**: All JSON schema dependencies included in dist/ajv-refs/
- ✅ **DXT Mode Support**: Configuration schema accepts NODE_ENV=dxt for proper DXT operation
- ❌ **Custom Archiving**: Custom zip creation may cause installation failures due to incompatible structure

**DXT Installation Issues Fixed (v1.5.3)**:

- ✅ **Missing AJV Schema Files**: Added all required JSON schema files to dist/ajv-refs/
- ✅ **Invalid NODE_ENV**: Configuration now accepts "dxt" as valid NODE_ENV value  
- ✅ **Timeout Issues**: DXT mode skips connection testing for fast startup
- ✅ **Server Initialization**: Enhanced error handling and timeout protection

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

**Issue**: POST/PUT/DELETE requests return 401 Unauthorized even with valid application passwords, while GET requests
work fine.

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

### AI-Powered Security Suite (v2.0+)

**Comprehensive Security Analysis**: Advanced AI-powered security scanning and automated remediation.

```bash
npm run security:scan           # AI-powered vulnerability scanning with ML-based detection
npm run security:review         # Intelligent code review with security analysis
npm run security:remediate      # Automated vulnerability remediation with backup
npm run security:monitor        # Real-time security monitoring and threat detection
npm run security:config         # Security configuration management and compliance
npm run security:pipeline       # CI/CD security gate integration
npm run security:full           # Complete security suite execution
```

**AI Security Features**:

- **Vulnerability Detection**: 50+ security patterns with ML-based confidence scoring
- **Automated Remediation**: Smart fixes for SQL injection, XSS, authentication issues, and more
- **Real-time Monitoring**: Threat detection with anomaly analysis and automated response
- **Security Gates**: CI/CD integration with blocking/non-blocking security checks
- **Compliance Management**: OWASP, CWE, and GDPR compliance validation
- **Code Review**: AI-powered security code review with recommendations

**Security Components** (`src/security/`):

- **AISecurityScanner**: Machine learning-based vulnerability detection
- **AutomatedRemediation**: Intelligent automated fixes with rollback capability
- **SecurityReviewer**: AI-powered code security analysis
- **SecurityConfigManager**: Centralized security policy management
- **SecurityMonitoring**: Real-time threat detection and alerting
- **SecurityCIPipeline**: CI/CD security gates and pipeline integration

### Memory Management & Knowledge Persistence

**Claude Memory Integration**: This project supports Claude's memory tools for persistent knowledge management.

When working with this codebase, Claude should use memory tools to:

- **Track Complex Multi-Site Configurations**: Store site-specific settings, authentication methods,
  and configuration patterns for easy reference across sessions
- **Remember WordPress Integration Patterns**: Cache knowledge about WordPress REST API quirks,
  authentication fixes, and common troubleshooting solutions
- **Document Tool Usage Patterns**: Remember which tools are commonly used together and
  successful workflow combinations
- **Store Performance Insights**: Keep track of performance optimization results, cache
  configuration successes, and monitoring patterns
- **Maintain Security Context**: Remember security considerations, credential handling patterns,
  and vulnerability mitigation strategies
- **Track Development Context**: Store information about recent changes, active development areas,
  and ongoing improvement initiatives

**Memory Usage Guidelines**:

- Create entities for major architecture components (MCP Server, WordPress Client, Tool System)
- Store observations about configuration patterns, authentication solutions, and performance optimizations
- Maintain relationships between tools, configurations, and their use cases
- Remember successful troubleshooting patterns and their solutions
- Track evolution of the codebase architecture and design decisions

**Example Memory Entities**:

- WordPress Sites (with their specific configurations and quirks)
- Authentication Methods (with success patterns and common issues)
- Tool Categories (with usage patterns and interdependencies)
- Performance Metrics (with optimization strategies and results)
- Security Configurations (with best practices and implementation details)

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

**Tool Class Structure:** Each tool class follows a consistent pattern:

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

- **PerformanceMonitor** (`PerformanceMonitor.ts`): Core monitoring engine with metrics collection, historical data
  storage, and alert generation
- **MetricsCollector** (`MetricsCollector.ts`): Central hub for collecting metrics from clients and cache managers with
  real-time aggregation
- **PerformanceAnalytics** (`PerformanceAnalytics.ts`): Advanced analytics with trend analysis, anomaly detection,
  linear regression, and predictive insights
- **6 Performance Tools**: Complete performance management toolkit for monitoring, benchmarking, and optimization

**Documentation Generation System** (`src/docs/`): Auto-generated API documentation.

- **DocumentationGenerator** (`DocumentationGenerator.ts`): Automatic extraction of tool documentation from TypeScript
  classes and type definitions
- **MarkdownFormatter** (`MarkdownFormatter.ts`): Multi-format documentation output (Markdown, JSON, OpenAPI
  specification)
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

When using a multi-site configuration, all tools accept a `site` parameter to specify which site to target.

**Example:** `wp_list_posts --site="site1"`

If the `site` parameter is omitted and more than one site is configured, the tool will fail. If only one site is
configured, it will be used by default.

#### Single-Site Configuration (Environment Variables)

If `mcp-wordpress.config.json` is not found, the server will use the following environment variables (loaded from `.env`
or passed via MCP config):

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
- **Property-Based Tests**: Generative testing using fast-check for edge case discovery and data structure validation.
- **Security Tests**: Input validation, XSS protection, SQL injection prevention, and penetration testing.

### Development Guidelines

#### Code Quality

- **TypeScript**: Adhere to strict mode and maintain comprehensive type safety.
- **ESLint**: Follow established linting rules for consistent code style - all files now linted including previously
  disabled tests.
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
- **Test Maintenance**: All tests are now enabled and functional - no disabled tests remain in the codebase.

#### Documentation Standards

- **CLAUDE.md**: Update this file for architecture changes, new tools, or configuration updates.
- **Migration Guides**: Create migration documentation for breaking changes.
- **Tool Documentation**: Document new tools with usage examples and parameter descriptions.
- **Security Notes**: Document any security considerations or credential handling changes.
- **Dummy Data**: Always use placeholder data (like example.com, your_username) in documentation and examples to prevent
  accidental credential exposure.

## Troubleshooting Guide for Developers

### Common Development Issues

#### TypeScript Compilation Errors

**Issue**: `exactOptionalPropertyTypes` compliance errors

```bash
error TS2375: Duplicate property 'X'.
error TS2717: Subsequent property declarations must have the same type.
```

**Solution**: Use explicit `| undefined` for optional properties:

```typescript
// ❌ Incorrect
interface Config {
  file?: string;
}

// ✅ Correct
interface Config {
  file?: string | undefined;
}
```

**Issue**: Missing exports for interfaces

```bash
error TS2749: 'SecurityVulnerability' refers to a value, but is being used as a type.
```

**Solution**: Add explicit exports:

```typescript
// Add to your module
export interface SecurityVulnerability {
  // interface definition
}
```

#### ESLint and Pre-commit Hook Failures

**Issue**: Unused variable errors

```bash
'variable' is assigned a value but never used
```

**Solution**: Use underscore prefix for intentionally unused variables:

```typescript
// ❌ Incorrect
try {
  // code
} catch (error) {
  // error not used
}

// ✅ Correct
try {
  // code
} catch (_error) {
  // clearly marked as intentionally unused
}
```

**Issue**: Import/export conflicts

```bash
'Type' is imported but never used
```

**Solution**: Use aliased imports when types are needed for re-export:

```typescript
// Re-export pattern for index files
import { Type as _Type } from './module';
export type { Type } from './module';
```

#### Git and CI/CD Issues

**Issue**: Merge conflicts in workflow files

```bash
Auto-merging .github/workflows/dependency-review.yml
CONFLICT (content): Merge conflict in .github/workflows/dependency-review.yml
```

**Solution**: Manual conflict resolution preserving both feature sets:

```bash
# Examine conflicts
git status
git diff HEAD

# Resolve by manually merging best features from both versions
# Then stage resolved files
git add .github/workflows/
git commit -m "resolve: merge workflow enhancements"
```

**Issue**: Failed CI tests due to environment configuration

```bash
npm ERR! ECONNREFUSED Connection refused
```

**Solution**: Ensure test environment variables are properly set:

```bash
# Check CI environment detection
if [ "$CI" = "true" ]; then
  echo "Running in CI environment"
  # Skip integration tests that require live WordPress
fi

# Use mock services for CI testing
export WORDPRESS_SITE_URL="http://mock-wordpress.local"
export SKIP_INTEGRATION_TESTS="true"
```

### WordPress Integration Debugging

#### Authentication Debugging

**Issue**: 401 Unauthorized for POST requests (working GET requests)

```bash
curl -X POST -u username:password https://site.com/wp-json/wp/v2/posts
# Returns 401 Unauthorized
```

**Root Cause**: Apache strips Authorization headers for write operations

**Solution**: Add to WordPress `.htaccess`:

```apache
# Preserve Authorization headers
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
```

**Verification Commands**:

```bash
# Test authentication directly
npm run test:auth

# Debug WordPress REST API
curl -I https://your-site.com/wp-json/wp/v2/

# Check WordPress configuration
npm run fix:rest-auth
```

#### Multi-Site Configuration Issues

**Issue**: Site not found in multi-site setup

```javascript
Error: Site 'invalid-site' not found in configuration
```

**Solution**: Verify `mcp-wordpress.config.json` format:

```json
{
  "sites": [
    {
      "id": "unique-site-id",  // ← Must match --site parameter
      "name": "Human Readable Name",
      "config": {
        "WORDPRESS_SITE_URL": "https://site.com",
        "WORDPRESS_USERNAME": "username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  ]
}
```

**Debug Commands**:

```bash
# List configured sites
npm run status

# Test specific site
npm run status -- --site="your-site-id"

# Validate configuration
npm run test:config
```

### Performance and Caching Issues

#### Cache Performance Problems

**Issue**: Low cache hit rates or memory issues

```bash
Cache hit rate: 23% (expected: >70%)
Memory usage: 850MB (high)
```

**Solution**: Optimize cache configuration:

```typescript
// Adjust cache settings in src/cache/CacheManager.ts
const CACHE_CONFIG = {
  maxItems: 500,           // Reduce if memory constrained
  ttl: 300,               // 5 minutes (adjust based on content update frequency)
  checkPeriod: 120,       // Cleanup interval
  useMemoryLimit: true,   // Enable memory limits
  maxMemoryMB: 200       // Set appropriate memory limit
};
```

**Debug Commands**:

```bash
# Analyze cache performance
npm run test:cache

# Monitor cache in real-time
DEBUG=cache npm run dev

# Clear cache and restart
rm -rf cache/ && npm run dev
```

#### Performance Monitoring Issues

**Issue**: Performance tests failing or metrics collection errors

```bash
Performance test failed: Response time > 2000ms
```

**Solution**: Check system resources and API responsiveness:

```bash
# Check WordPress site performance
curl -w "@curl-format.txt" -o /dev/null -s https://your-site.com/wp-json/wp/v2/

# Monitor system resources
npm run test:performance

# Analyze bottlenecks
DEBUG=performance npm run dev
```

### Security and Dependency Issues

#### Security Scan Failures

**Issue**: Security vulnerabilities detected in dependencies

```bash
found 3 vulnerabilities (1 moderate, 2 high)
```

**Solution**: Update dependencies and run security fixes:

```bash
# Audit and fix
npm audit fix

# Force update if needed
npm audit fix --force

# Update specific packages
npm update package-name

# Run comprehensive security test
npm run security:full
```

#### Docker Build Issues

**Issue**: Docker build failures or container startup problems

```bash
Error: Cannot find module '/app/dist/index.js'
```

**Solution**: Ensure proper build process in Docker:

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Debug Commands**:

```bash
# Test local Docker build
docker build -t mcp-wordpress-test .
docker run --rm -it mcp-wordpress-test

# Check container logs
docker logs container-name

# Interactive debugging
docker run --rm -it --entrypoint sh mcp-wordpress-test
```

### Development Environment Setup

#### Node.js Version Compatibility

**Issue**: Node.js version mismatch errors

```bash
error: Unsupported engine: node@18.x.x (required: >=20.8.1)
```

**Solution**: Use Node Version Manager:

```bash
# Install and use correct Node.js version
nvm install 20.8.1
nvm use 20.8.1

# Set as default
nvm alias default 20.8.1

# Verify installation
node --version  # Should be >= 20.8.1
npm --version
```

#### Development Dependencies

**Issue**: Missing development tools or broken setup

```bash
husky: command not found
```

**Solution**: Reinstall development environment:

```bash
# Clean installation
rm -rf node_modules package-lock.json
npm install

# Reinstall husky hooks
npm run prepare

# Verify setup
npm run lint
npm run format:check
npm run test:fast
```

### Quick Diagnostic Commands

**Complete System Check**:

```bash
# Comprehensive health check
npm run health

# Connection and authentication test
npm run status

# Full test suite
npm test

# Security validation
npm run security:check

# Performance analysis
npm run test:performance
```

**Debug Information Collection**:

```bash
# Generate debug report
DEBUG=true npm run status > debug-report.txt 2>&1

# System information
node --version >> debug-report.txt
npm --version >> debug-report.txt
cat package.json | jq '.version' >> debug-report.txt
```

**Emergency Recovery**:

```bash
# Reset to clean state
git status
git stash  # Save any uncommitted changes
git pull origin main
npm ci
npm run build
npm run health
```

#### Repository Maintenance Guidelines

**Keep Repository Clean and Concise**

- **Markdown Files**: Limit root-level markdown files to essential documents only (README.md, CHANGELOG.md, CLAUDE.md,
  TODO.md)
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
