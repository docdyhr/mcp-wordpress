# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build System
```bash
npm run build              # Compile TypeScript to JavaScript
npm run build:watch        # Watch mode compilation
npm run typecheck          # Type checking without output
```

### Testing & Diagnostics
```bash
npm test                   # Run main test suite (typescript tests)
npm run test:typescript    # Run TypeScript build tests
npm run test:tools         # Test all MCP tools functionality
npm run test:mcp           # Test MCP protocol integration
npm run test:integration   # Integration tests with WordPress
npm run test:auth          # Authentication system tests
npm run test:watch         # Watch mode for tests
npm run test:coverage      # Generate coverage report (50% threshold)
npm run test:fast          # Quick test run
npm run health             # Comprehensive system health check
```

### Development & Debugging
```bash
npm run dev                # Development mode with debug output
npm run setup              # Interactive setup wizard
npm run status             # Check connection status
DEBUG=true npm run dev     # Enable debug logging
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
- Handles 54 WordPress management tools across 8 categories.
- Manages tool registration and request routing for each configured site.
- Implements graceful error handling with authentication-aware responses.

**WordPress Client** (`src/client/api.ts`): HTTP client for WordPress REST API v2.
- A separate client instance is created for each configured site.
- Supports multiple authentication methods (App Passwords, JWT, Basic, API Key).
- Implements request/response handling with comprehensive error management.

**Tool System** (`src/tools/`): Modular, class-based tool implementations.
- **Architecture**: All tools are refactored from functions to classes for better organization and maintainability.
- **Registration**: An `index.ts` file exports all tool classes for centralized registration.
- **Multi-Site Support**: All tools accept a `site` parameter to target specific WordPress sites.
- **Error Handling**: Each tool class implements comprehensive error handling and validation.

**Tool Categories (54 total tools):**
  - **Posts** (`posts.ts` - PostTools): Create, read, update, delete blog posts (12 tools)
  - **Pages** (`pages.ts` - PageTools): Static page management (8 tools)
  - **Media** (`media.ts` - MediaTools): File upload and media library management (6 tools)
  - **Users** (`users.ts` - UserTools): User account management (8 tools)
  - **Comments** (`comments.ts` - CommentTools): Comment moderation and management (6 tools)
  - **Taxonomies** (`taxonomies.ts` - TaxonomyTools): Categories and tags (8 tools)
  - **Site** (`site.ts` - SiteTools): Site settings and statistics (4 tools)
  - **Auth** (`auth.ts` - AuthTools): Authentication testing and management (2 tools)

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

**⚠️ CRITICAL: Preventing Secret Commits**
- Always check `.gitignore` includes sensitive files:
  - `mcp-wordpress.config.json`
  - `.env`
  - Any files containing passwords, API keys, or tokens
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