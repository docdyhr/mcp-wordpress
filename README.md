# MCP WordPress Server

<div align="center">
<img src="images/wordpress-mcp-logo.png" width="50%" alt="WordPress MCP Logo">
</div>

A comprehensive Model Context Protocol (MCP) server for WordPress management through the WordPress REST API v2. Completely written in TypeScript with modular architecture and 95%+ test coverage.

[![NPM Version](https://img.shields.io/npm/v/mcp-wordpress)](https://www.npmjs.com/package/mcp-wordpress)
[![Test Coverage](https://img.shields.io/badge/test%20coverage-95%25%2B-brightgreen)](https://github.com/docdyhr/mcp-wordpress)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://github.com/docdyhr/mcp-wordpress)
[![Architecture](https://img.shields.io/badge/architecture-modular-orange)](https://github.com/docdyhr/mcp-wordpress/blob/main/REFACTORING.md)

## 🚀 Features

- **59 WordPress Management Tools** across 10 categories
- **⚡ Intelligent Caching System** - Multi-layer response caching with 50-70% performance improvement
- **📊 Real-Time Performance Monitoring** - Comprehensive metrics, analytics, and optimization insights
- **📚 Auto-Generated API Documentation** - Complete tool documentation with OpenAPI specification
- **🐳 Docker Support** - Containerized deployment for production environments
- **🏗 Modular Architecture** - Manager-based composition pattern (94% code reduction)
- **Multi-Site Support** - Manage multiple WordPress sites from one configuration
- **100% TypeScript** - Complete type safety and IntelliSense
- **🎯 95%+ Test Coverage** - All critical functionality verified and tested
- **⚡ Performance Optimized** - Intelligent rate limiting and memory management
- **🔒 Flexible Authentication** - Supports App Passwords, JWT, Basic Auth, API Key
- **📊 Comprehensive Monitoring** - Structured logging and error tracking
- **🛠 Production Ready** - Security-reviewed and battle-tested
- **🔄 100% Backward Compatible** - Zero breaking changes during refactoring

## ⚡ Quick Start

Choose your preferred setup method:

- 🚀 **[NPX Setup](docs/user-guides/NPX_SETUP.md)** - Zero installation, always latest version
- 💻 **[NPM Setup](docs/user-guides/NPM_SETUP.md)** - Local development and customization
- 🐳 **[Docker Setup](docs/user-guides/DOCKER_SETUP.md)** - Containerized deployment
- 📦 **[DTX Setup](docs/user-guides/DTX_SETUP.md)** - Claude Desktop Extension package

### Ultra-Quick NPX Start

```bash
# Run directly with NPX (recommended)
npx -y mcp-wordpress

# Or install globally
npm install -g mcp-wordpress
mcp-wordpress
```

### Setup Wizard

```bash
# For any installation method
npm run setup
```

## 🏆 Latest Achievement: v1.2.1 - Test Infrastructure & Multi-Site Enhancement

Building on v1.2.0's performance monitoring and documentation features, v1.2.1 delivers **100% test reliability**, **enhanced multi-site support**, and **production-ready repository organization**:

### ✅ Test Infrastructure Overhaul (v1.2.1)

- **🔧 100% Test Success Rate**: Fixed all failing integration and tool tests
- **🌐 Multi-Site Testing**: Comprehensive test suite for multi-site WordPress configurations
- **🛡️ Enhanced Security**: Improved .gitignore and credential protection
- **📋 Test Organization**: Streamlined test scripts and better error reporting
- **⚡ Quick Validation**: New `npm run test:multisite` command for rapid configuration testing

### 🌐 Multi-Site Configuration Enhancements (v1.2.1)

- **📝 Complete Documentation**: Comprehensive Claude Desktop setup guide for multi-site usage
- **🔧 Fixed Configuration**: Resolved JWT authentication validation issues
- **✅ Site Validation**: Enhanced uniqueness checks for site URLs and IDs
- **🚀 Quick Testing**: Instant validation of all configured WordPress sites
- **📊 Status Reporting**: Clear success/failure reporting for each site configuration

---

## 🏆 Previous Achievement: v1.2.0 - Performance & Documentation Revolution

We've implemented a **comprehensive performance monitoring system**, **intelligent caching**, **auto-generated documentation**, and **Docker containerization** - all while maintaining complete backward compatibility:

### ⚡ Performance Monitoring System

- **📊 Real-Time Metrics**: Response times, cache hit rates, error tracking, system resources
- **📈 Historical Analytics**: Trend analysis, anomaly detection, predictive insights
- **🎯 Industry Benchmarks**: Compare against performance standards with optimization recommendations
- **🚨 Smart Alerts**: Automated performance alerts and threshold monitoring
- **📋 Comprehensive Reports**: Export detailed performance data in multiple formats
- **⚙️ Optimization Engine**: AI-powered recommendations for performance improvements

### 🏗️ Intelligent Caching System

- **🚀 50-70% Performance Improvement**: Reduced API calls for taxonomy and authentication operations
- **📊 Multi-Layer Architecture**: HTTP response caching + in-memory application cache + intelligent invalidation
- **🎯 Site-Specific Isolation**: Complete cache separation for multi-site WordPress installations
- **🔧 Cache Management Tools**: 4 new MCP tools for monitoring and managing cache performance
- **⏱️ Sub-Millisecond Operations**: Cache hits deliver responses in under 1ms

### 📚 Auto-Generated Documentation

- **📖 Complete API Documentation**: All 59 tools with examples, parameters, and usage guides
- **🔧 OpenAPI Specification**: Machine-readable API spec for integration
- **🔄 Automated CI/CD Pipeline**: Documentation updates automatically on code changes
- **✅ Quality Validation**: Comprehensive documentation quality checks
- **🌐 Multi-Format Output**: Markdown, JSON, and OpenAPI formats

### 🐳 Docker Containerization

- **📦 Production-Ready Images**: Optimized Docker containers for deployment
- **🔧 Development Environment**: Docker Compose for local development
- **⚙️ Environment Configuration**: Flexible configuration via environment variables
- **🚀 Easy Deployment**: One-command deployment to any Docker environment

**📚 Complete Documentation**:

- [Performance Monitoring Guide](./docs/PERFORMANCE.md)
- [Caching System Guide](./docs/CACHING.md)
- [API Documentation](./docs/api/README.md)
- [Docker Deployment Guide](./docs/DOCKER.md)

## 🔐 Authentication & Testing Status (v1.2.4+)

✅ **Application Passwords** - Tested and working perfectly
✅ **JWT Authentication** - Supported with plugin  
✅ **Basic Authentication** - Development ready
✅ **API Key Authentication** - Plugin-based support
✅ **Main Test Suite** - 100% success rate (144/144 tests passing)
✅ **Security Tests** - 100% success rate (40/40 tests passing)
✅ **Performance Tests** - 100% success rate (8/8 tests passing)
✅ **Tool Tests** - 100% success rate (14/14 tools working)
✅ **CI/CD Pipeline** - Fully functional with automated publishing

The setup wizard guides you through:

- WordPress site configuration
- Authentication method selection
- Connection testing
- Claude Desktop configuration

## 🚀 Claude Desktop Integration

### 📖 Complete Setup Guides

For detailed setup instructions, see our comprehensive guides:

- **[NPX Setup Guide](docs/user-guides/NPX_SETUP.md)** - Zero installation method
- **[NPM Setup Guide](docs/user-guides/NPM_SETUP.md)** - Local development
- **[Docker Setup Guide](docs/user-guides/DOCKER_SETUP.md)** - Containerized deployment
- **[DTX Setup Guide](docs/user-guides/DTX_SETUP.md)** - Desktop Extension package

### 🤖 Claude Desktop Quick Prompts

**For NPX Users (Easiest):**

```text
Set up MCP WordPress using NPX. My site: [YOUR_SITE_URL], username: [YOUR_USERNAME]. Help with application password creation and Claude Desktop configuration.
```

**For Local Development:**

```text
Set up MCP WordPress locally from GitHub. Clone, install, configure for my site: [YOUR_SITE_URL], username: [YOUR_USERNAME]. Include Claude Desktop setup.
```

**Replace placeholders with your actual WordPress details - Claude will handle the rest!**

## 🔧 Configuration

The MCP WordPress server supports multiple configuration methods to fit different needs.

### Setup Methods Overview

| Method     | Best For                   | Configuration File                      |
| ---------- | -------------------------- | --------------------------------------- |
| **NPX**    | Quick start, always latest | Claude Desktop config only              |
| **NPM**    | Local development          | `.env` or Claude Desktop config         |
| **Docker** | Production deployment      | Environment variables or mounted config |
| **DTX**    | Simple GUI setup           | DTX config + optional multi-site file   |

### Environment Variables

**Core Configuration:**

```env
WORDPRESS_SITE_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password
DEBUG=false
```

**📖 Detailed Configuration Guides:**

- **[NPX Configuration](docs/user-guides/NPX_SETUP.md#quick-start)** - Claude Desktop environment variables
- **[NPM Configuration](docs/user-guides/NPM_SETUP.md#configuration)** - Local `.env` file setup
- **[Docker Configuration](docs/user-guides/DOCKER_SETUP.md#configuration)** - Container environment setup
- **[DTX Configuration](docs/user-guides/DTX_SETUP.md#configuration)** - Extension package setup

### Claude Desktop Integration

**Configuration File Locations:**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Quick NPX Example:**

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "your-app-password"
      }
    }
  }
}
```

🔗 **See the detailed setup guides above for complete configuration examples for each method.**

## 🌐 Multi-Site Configuration

MCP WordPress Server supports managing multiple WordPress sites from a single configuration. This is perfect for agencies, developers managing multiple client sites, or anyone with multiple WordPress installations.

### Setting Up Multi-Site Configuration

1. **Create a `mcp-wordpress.config.json` file** in your project root:

```json
{
  "sites": [
    {
      "id": "site1",
      "name": "My Main Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    {
      "id": "site2",
      "name": "My Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog.site2.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    },
    {
      "id": "dev",
      "name": "Development Site",
      "config": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "dev_user",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz"
      }
    }
  ]
}
```

1. **Configure Claude Desktop for Multi-Site**:

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["mcp-wordpress"]
    }
  }
}
```

Note: When using multi-site configuration, you don't need to specify environment variables in Claude Desktop. The server will read from your `mcp-wordpress.config.json` file.

### Using Multi-Site Tools

When you have multiple sites configured, all tools require a `site` parameter:

```text
# List posts from site1
wp_list_posts --site="site1"

# Create a post on the blog site
wp_create_post --site="site2" --title="New Blog Post" --content="Content here"

# Get user info from development site
wp_get_current_user --site="dev"
```

### Important Multi-Site Notes

- **Site IDs must be unique** - Each site needs a unique identifier
- **Security**: The `mcp-wordpress.config.json` file contains sensitive credentials and should NEVER be committed to version control
- **Default Site**: If only one site is configured, it will be used by default without needing the `--site` parameter
- **Authentication**: Each site can use different authentication methods (app-password, jwt, basic, api-key)

### Example: Managing Multiple Client Sites

```json
{
  "sites": [
    {
      "id": "client-acme",
      "name": "ACME Corporation",
      "config": {
        "WORDPRESS_SITE_URL": "https://acme-corp.com",
        "WORDPRESS_USERNAME": "mcp_admin",
        "WORDPRESS_APP_PASSWORD": "aaaa bbbb cccc dddd eeee ffff"
      }
    },
    {
      "id": "client-tech",
      "name": "TechStartup Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog.techstartup.io",
        "WORDPRESS_USERNAME": "content_manager",
        "WORDPRESS_APP_PASSWORD": "gggg hhhh iiii jjjj kkkk llll"
      }
    },
    {
      "id": "client-shop",
      "name": "Online Shop",
      "config": {
        "WORDPRESS_SITE_URL": "https://shop.example.com",
        "WORDPRESS_USERNAME": "shop_admin",
        "WORDPRESS_APP_PASSWORD": "mmmm nnnn oooo pppp qqqq rrrr",
        "WORDPRESS_AUTH_METHOD": "jwt",
        "WORDPRESS_JWT_SECRET": "your-jwt-secret-here"
      }
    }
  ]
}
```

Then in Claude Desktop, you can manage all sites:

```text
# Check posts across all client sites
wp_list_posts --site="client-acme" --per_page=5
wp_list_posts --site="client-tech" --per_page=5
wp_list_posts --site="client-shop" --per_page=5

# Update content on specific sites
wp_update_post --site="client-acme" --id=123 --title="Updated Title"

# Manage media across sites
wp_list_media --site="client-shop" --media_type="image"
```

## 🛠 Build System

### TypeScript Build

```bash
# Compile
npm run build

# Watch mode
npm run build:watch

# Type checking
npm run typecheck
```

### Development

```bash
# Development mode with debug output
npm run dev

# Check status
npm run status

# Re-run setup
npm run setup
```

## 🔐 Authentication

### WordPress Application Passwords (Recommended)

1. **WordPress Admin** → **Users** → **Profile**
2. Scroll to **Application Passwords**
3. Enter name (e.g., "MCP WordPress Server")
4. Click **Add New Application Password**
5. Copy generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)

### Alternative Authentication Methods

```env
# JWT Authentication (requires JWT plugin)
WORDPRESS_AUTH_METHOD=jwt
WORDPRESS_JWT_SECRET=your-jwt-secret

# Basic Authentication (not recommended for production)
WORDPRESS_AUTH_METHOD=basic
WORDPRESS_PASSWORD=your-actual-password

# API Key Authentication (requires API Key plugin)
WORDPRESS_AUTH_METHOD=api-key
WORDPRESS_API_KEY=your-api-key
```

## 📋 Available Tools (59 Tools)

### 📝 Posts (6 Tools)

- `wp_list_posts` - List and filter blog posts
- `wp_get_post` - Get specific post
- `wp_create_post` - Create new posts
- `wp_update_post` - Edit posts
- `wp_delete_post` - Delete posts
- `wp_get_post_revisions` - Get post revisions

### 📄 Pages (6 Tools)

- `wp_list_pages` - List pages
- `wp_get_page` - Get specific page
- `wp_create_page` - Create new pages
- `wp_update_page` - Edit pages
- `wp_delete_page` - Delete pages
- `wp_get_page_revisions` - Get page revisions

### 🖼️ Media (6 Tools)

- `wp_list_media` - Browse media library
- `wp_get_media` - Get media details
- `wp_upload_media` - Upload files
- `wp_update_media` - Edit media metadata
- `wp_delete_media` - Delete media
- `wp_get_media_sizes` - Get available image sizes

### 👥 Users (6 Tools)

- `wp_list_users` - List users
- `wp_get_user` - Get user details
- `wp_create_user` - Create new users
- `wp_update_user` - Edit user profiles
- `wp_delete_user` - Delete users
- `wp_get_current_user` - Get current user

### 💬 Comments (7 Tools)

- `wp_list_comments` - List comments
- `wp_get_comment` - Get comment details
- `wp_create_comment` - Create new comments
- `wp_update_comment` - Edit comments
- `wp_delete_comment` - Delete comments
- `wp_approve_comment` - Approve comments
- `wp_spam_comment` - Mark comments as spam

### 🏷️ Taxonomies (10 Tools)

- `wp_list_categories` - List categories
- `wp_get_category` - Get category details
- `wp_create_category` - Create new categories
- `wp_update_category` - Edit categories
- `wp_delete_category` - Delete categories
- `wp_list_tags` - List tags
- `wp_get_tag` - Get tag details
- `wp_create_tag` - Create new tags
- `wp_update_tag` - Edit tags
- `wp_delete_tag` - Delete tags

### ⚙️ Site Management (7 Tools)

- `wp_get_site_settings` - Get site settings
- `wp_update_site_settings` - Update site settings
- `wp_get_site_stats` - Get site statistics
- `wp_search_site` - Site-wide search
- `wp_get_application_passwords` - List app passwords
- `wp_create_application_password` - Create new app passwords
- `wp_delete_application_password` - Delete app passwords

### 🔐 Authentication (6 Tools)

- `wp_test_auth` - Test authentication
- `wp_get_auth_status` - Get authentication status
- `wp_start_oauth_flow` - Start OAuth flow
- `wp_complete_oauth_flow` - Complete OAuth flow
- `wp_refresh_oauth_token` - Refresh OAuth token
- `wp_switch_auth_method` - Switch authentication method

### ⚡ Cache Management (4 Tools)

- `wp_cache_stats` - Get real-time cache performance statistics
- `wp_cache_clear` - Clear cache entries with optional pattern matching
- `wp_cache_warm` - Pre-populate cache with essential data
- `wp_cache_info` - Get detailed cache configuration and status

### 📊 Performance Monitoring (6 Tools)

- `wp_performance_stats` - Get real-time performance statistics and metrics
- `wp_performance_history` - Get historical performance data and trends
- `wp_performance_benchmark` - Compare current performance against industry benchmarks
- `wp_performance_alerts` - Get performance alerts and anomaly detection results
- `wp_performance_optimize` - Get optimization recommendations and insights
- `wp_performance_export` - Export comprehensive performance report

## 🧪 Testing

### Current Test Status ✅

- **Main Test Suite**: 144/144 passed (100%) - Optimized for CI/CD reliability
- **TypeScript Build Tests**: 21/21 passed (100%)
- **Security Tests**: 40/40 passed (100%) - Comprehensive vulnerability testing
- **Configuration Tests**: 27/27 passed (100%) - Multi-site validation
- **Property-Based Tests**: 12/12 passed (100%) - Generative testing
- **Performance Tests**: 8/8 passed (100%) - Regression detection
- **Contract Tests**: Available via dedicated command when needed
- **Overall Success Rate**: 100% - All critical functionality verified

### Test Commands

```bash
# Run all tests (improved)
npm test

# Run tests with Docker test environment (recommended)
npm run test:with-env

# Tests with coverage (70% threshold)
npm run test:coverage

# Quick tests
npm run test:fast

# Individual test suites
npm run test:security        # Security tests
npm run test:config          # Configuration tests
npm run test:property        # Property-based tests
npm run test:contracts       # Contract tests
npm run test:performance     # Performance regression tests

# Integration tests
npm run test:mcp             # MCP protocol tests
npm run test:tools           # Tool functionality tests
npm run test:auth            # Authentication tests

# Live contract tests with automated setup
npm run test:contracts:live

# Tests in watch mode
npm run test:watch

# Manual authentication check
./scripts/wp-auth-check.sh
```

### Docker Test Environment

The project now includes a complete Docker test environment for reliable testing:

```bash
# Start test environment
./scripts/start-test-env.sh

# Run tests with test environment
npm run test:with-env

# Stop test environment
docker-compose -f docker-compose.test.yml down
```

The test environment includes:

- WordPress with pre-configured test user and application password
- MySQL database
- Pact broker for contract testing
- Automated WordPress configuration for API testing

## 📊 Status & Monitoring

```bash
# Check connection status
npm run status

# Debug mode
DEBUG=true npm run dev

# Lint code
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

## 🏗 Project Structure

```diagram
mcp-wordpress/
├── src/                     # TypeScript source code
│   ├── index.ts            # Main MCP server
│   ├── server.ts           # Server compatibility
│   ├── types/              # TypeScript definitions
│   │   ├── wordpress.ts    # WordPress API types
│   │   ├── mcp.ts         # MCP protocol types
│   │   ├── client.ts      # Client interface types
│   │   └── index.ts       # Type exports
│   ├── client/             # WordPress API client
│   │   ├── api.ts         # HTTP client
│   │   └── auth.ts        # Authentication
│   ├── tools/              # MCP tool implementations
│   │   ├── posts.ts       # Post management
│   │   ├── pages.ts       # Page management
│   │   ├── media.ts       # Media management
│   │   ├── users.ts       # User management
│   │   ├── comments.ts    # Comment management
│   │   ├── taxonomies.ts  # Categories/Tags
│   │   ├── site.ts        # Site settings
│   │   └── auth.ts        # Authentication
│   └── utils/              # Utility functions
│       └── debug.ts       # Debug logger
├── dist/                   # Compiled JavaScript files
├── bin/                    # Utility scripts
│   ├── setup.js          # Setup wizard
│   └── status.js          # Status checker
├── tests/                  # Test suite
├── scripts/                # Build and test scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.json       # Jest test configuration
└── package.json           # Node.js project configuration
```

## 💡 TypeScript Features

- **Complete Type Safety** - Compile-time validation
- **IntelliSense Support** - Better IDE integration
- **Type-safe API Client** - Typed HTTP methods
- **Comprehensive WordPress Types** - 400+ lines of precise definitions
- **MCP Protocol Types** - Tool definitions and handlers
- **Enhanced Error Handling** - Typed exceptions
- **Source Maps** - Debugging support

## 🔧 WordPress Requirements

- **WordPress 5.0+** with REST API enabled
- **HTTPS** (recommended for production)
- **User with appropriate permissions**
- **Application Passwords** enabled (WordPress 5.6+)

### WordPress User Roles

| Role              | Access                        |
| ----------------- | ----------------------------- |
| **Administrator** | Full access to all functions  |
| **Editor**        | Posts, pages, comments, media |
| **Author**        | Own posts and media           |
| **Contributor**   | Own posts (drafts only)       |
| **Subscriber**    | Read only                     |

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to WordPress"**
   - Check WORDPRESS_SITE_URL
   - Ensure REST API is accessible
   - Test: `curl https://your-site.com/wp-json/wp/v2/`

2. **"Authentication failed"**
   - Verify username and app password
   - Ensure Application Passwords are enabled
   - Try running `npm run setup` again

3. **"TypeScript compilation errors"**
   - Run `npm run typecheck`
   - Ensure all dependencies are installed

### Debug Logs

```bash
DEBUG=true npm run dev
```

## 📚 API Documentation

- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🐳 Docker Support

Docker support with production-ready containers and Claude Desktop integration.

### Quick Docker Start

```bash
# Single-site with environment variables
docker run --rm -i \
  -e WORDPRESS_SITE_URL=https://your-site.com \
  -e WORDPRESS_USERNAME=your-username \
  -e WORDPRESS_APP_PASSWORD=your-app-password \
  docdyhr/mcp-wordpress:latest

# Multi-site with config file
docker run --rm -i \
  -v ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  docdyhr/mcp-wordpress:latest
```

### Claude Desktop Docker Integration

**Single-Site:**

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "WORDPRESS_SITE_URL=https://your-site.com",
        "-e",
        "WORDPRESS_USERNAME=your-username",
        "-e",
        "WORDPRESS_APP_PASSWORD=your-app-password",
        "docdyhr/mcp-wordpress:latest"
      ]
    }
  }
}
```

**Multi-Site:**

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/path/to/mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro",
        "docdyhr/mcp-wordpress:latest"
      ]
    }
  }
}
```

**📖 Complete Docker Guide**: [docs/user-guides/DOCKER_SETUP.md](docs/user-guides/DOCKER_SETUP.md)

## 🧪 Contract Testing with Live WordPress

Test the MCP server against a real WordPress instance using our automated testing setup:

```bash copy
# Automated live contract testing (recommended)
npm run test:contracts:live
```

This command will:

- 🐳 Start isolated WordPress + MySQL containers (port 8081)
- ⚙️ Auto-configure WordPress with test data and authentication
- 🧪 Run contract tests against the live WordPress API
- 🧹 Clean up automatically when done

**Features:**

- **Zero Conflicts**: Uses isolated containers with separate ports
- **Fully Automated**: WordPress installation, user creation, and app password generation
- **Real API Testing**: Validates actual WordPress REST API behavior
- **CI/CD Ready**: Works in continuous integration environments

**Manual Setup Alternative:**

```bash
# Test setup phase only
bash scripts/test-setup-only.sh

# Use existing WordPress instance
export WORDPRESS_TEST_URL="https://your-wordpress-site.com"
export WORDPRESS_USERNAME="your-username"
export WORDPRESS_APP_PASSWORD="your-app-password"
export PACT_LIVE_TESTING="true"
npm run test:contracts
```

**📖 Full Contract Testing Guide**: [docs/contract-testing.md](./docs/contract-testing.md)

## 📝 Recent Updates

### v1.2.0 - Performance & Documentation Revolution

- ✅ **Real-Time Performance Monitoring**
  - Comprehensive metrics collection (response times, cache hit rates, system resources)
  - Historical performance analysis with trend detection
  - Industry benchmark comparisons with optimization recommendations
  - Smart alerts and anomaly detection
  - Comprehensive performance reports with export options
  - AI-powered optimization engine for performance improvements
- ⚡ **Intelligent Caching System**
  - 50-70% performance improvement with reduced API calls
  - Multi-layer caching architecture with intelligent invalidation
  - Site-specific cache isolation for multi-site installations
  - New MCP tools for cache performance monitoring and management
  - Sub-millisecond response times for cache hits
- 📚 **Auto-Generated Documentation**
  - Complete API documentation for all 59 tools with examples and usage guides
  - Machine-readable OpenAPI specification for integration
  - Automated CI/CD pipeline for documentation updates
  - Comprehensive documentation quality validation
  - Multi-format output including Markdown, JSON, and OpenAPI
- 🐳 **Docker Containerization**
  - Production-ready Docker images for easy deployment
  - Docker Compose setup for local development
  - Flexible environment configuration via variables
  - One-command deployment to any Docker environment

**📚 Read the full release notes for all details!**

## 🚀 Release & Publishing

This project uses automated semantic versioning and publishing to NPM and Docker Hub.

### 📦 Installation Options

**NPM Package:**

```bash
# Latest stable version
npm install -g mcp-wordpress

# Specific version
npm install -g mcp-wordpress@1.2.2

# Use with npx (no installation)
npx mcp-wordpress
```

**Docker Images:**

```bash
# Latest stable version
docker pull docdyhr/mcp-wordpress:latest

# Specific version
docker pull docdyhr/mcp-wordpress:1.2.2

# Test container (interactive)
docker run --rm -i docdyhr/mcp-wordpress:latest
```

### 🏷️ Release Process

**Automated Releases:**

- Releases are automatically created when conventional commits are pushed to the `main` branch
- Semantic versioning determines the version bump automatically
- NPM and Docker Hub publishing happens automatically on release

**Conventional Commit Format:**

```bash
# Patch release (1.2.2 → 1.2.4)
fix: resolve authentication timeout issue

# Minor release (1.2.2 → 1.3.0)
feat: add new performance monitoring tools

# Major release (1.2.2 → 2.0.0)
feat!: redesign MCP tool interface
BREAKING CHANGE: tool parameter structure has changed
```

**Manual Release (if needed):**

```bash
# Test release locally
npm run release:dry

# Create release manually (requires proper permissions)
npm run release
```

### 📋 Release Checklist

For contributors planning releases:

1. **Pre-Release Validation:**
   - ✅ All tests passing (`npm test`)
   - ✅ Documentation updated
   - ✅ Performance benchmarks within acceptable range
   - ✅ Security audit clean (`npm audit`)

2. **Commit with Conventional Format:**

   ```bash
   git add .
   git commit -m "feat: add new functionality"
   git push origin main
   ```

3. **Automated Process Handles:**
   - 📝 Generate release notes
   - 🏷️ Create GitHub release
   - 📦 Publish to NPM with provenance
   - 🐳 Build and push Docker images (multi-arch)
   - 📚 Update CHANGELOG.md
   - 🔗 Update Docker Hub description

### 🌍 Distribution Channels

- **NPM:** [`mcp-wordpress`](https://www.npmjs.com/package/mcp-wordpress)
- **Docker Hub:** [`docdyhr/mcp-wordpress`](https://hub.docker.com/r/docdyhr/mcp-wordpress)
- **GitHub Releases:** [Latest releases](https://github.com/docdyhr/mcp-wordpress/releases)

---

## 🙏 Acknowledgments

Special thanks to **[Stephan Ferraro](https://github.com/ferraro)** for the upstream main project that inspired this implementation.

> _"We are all standing on the shoulders of giants"_
