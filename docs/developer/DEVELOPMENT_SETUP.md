# Development Setup Guide

This guide walks you through setting up a complete development environment for the MCP WordPress Server.

## 🔧 Prerequisites

### Required Software

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **npm 9+** - Comes with Node.js
- **Git** - [Download from git-scm.com](https://git-scm.com/)
- **TypeScript 5+** - Installed via npm
- **Docker & Docker Compose** - [Download from docker.com](https://docker.com/)

### Optional Tools

- **VS Code** - Recommended IDE with TypeScript support
- **GitHub CLI** - For GitHub integration (`gh`)
- **WordPress Site** - For testing (or use Docker test environment)

## 🚀 Quick Setup

### 1. Clone Repository

```bash
git clone https://github.com/docdyhr/mcp-wordpress.git
cd mcp-wordpress
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm ci

# Install development tools globally (optional)
npm install -g typescript @types/node jest
```

### 3. Build Project

```bash
# Initial build
npm run build

# Type checking
npm run typecheck
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Quick validation
npm run test:fast
```

## 📁 Project Structure

```text
mcp-wordpress/
├── src/                     # TypeScript source code
│   ├── index.ts            # Main MCP server entry point
│   ├── server.ts           # Server compatibility layer
│   ├── types/              # TypeScript type definitions
│   │   ├── wordpress.ts    # WordPress REST API types
│   │   ├── mcp.ts         # MCP protocol types
│   │   ├── client.ts      # Client interface types
│   │   └── index.ts       # Type exports
│   ├── client/             # WordPress API client (modular)
│   │   ├── WordPressClient.ts    # Main client orchestrator
│   │   ├── CachedWordPressClient.ts # Caching wrapper
│   │   ├── api.ts              # Legacy compatibility
│   │   ├── auth.ts             # Authentication utilities
│   │   └── managers/           # Manager components
│   │       ├── BaseManager.ts        # Common functionality
│   │       ├── AuthenticationManager.ts # Auth methods
│   │       └── RequestManager.ts      # HTTP operations
│   ├── tools/              # MCP tool implementations
│   │   ├── posts.ts       # Post management tools
│   │   ├── pages.ts       # Page management tools
│   │   ├── media.ts       # Media management tools
│   │   ├── users.ts       # User management tools
│   │   ├── comments.ts    # Comment management tools
│   │   ├── taxonomies.ts  # Categories/Tags tools
│   │   ├── site.ts        # Site settings tools
│   │   ├── auth.ts        # Authentication tools
│   │   ├── cache.ts       # Cache management tools
│   │   ├── performance.ts # Performance monitoring tools
│   │   └── index.ts       # Tool registry
│   ├── cache/              # Intelligent caching system
│   │   ├── CacheManager.ts        # Core cache functionality
│   │   ├── CacheInvalidation.ts   # Cache invalidation logic
│   │   └── types.ts               # Cache type definitions
│   ├── performance/        # Performance monitoring system
│   │   ├── PerformanceMonitor.ts  # Core monitoring
│   │   ├── MetricsCollector.ts    # Metrics collection
│   │   └── PerformanceAnalytics.ts # Analytics engine
│   ├── security/           # Security validation and utilities
│   │   ├── InputValidator.ts      # Input validation
│   │   ├── SecurityConfig.ts      # Security configuration
│   │   └── SecurityUtils.ts       # Security utilities
│   ├── docs/               # Documentation generation system
│   │   ├── DocumentationGenerator.ts # Doc extraction
│   │   └── MarkdownFormatter.ts       # Markdown formatting
│   ├── server/             # Server infrastructure
│   │   └── ToolRegistry.ts        # Tool registration system
│   └── utils/              # Shared utility functions
│       └── debug.ts               # Debug logging utilities
├── dist/                   # Compiled JavaScript output
├── tests/                  # Comprehensive test suite
│   ├── auth-headers-fix.test.js     # Authentication tests
│   ├── config-loading.test.js       # Configuration tests
│   ├── tool-validation.test.js      # Tool validation tests
│   ├── typescript-build.test.js     # Build tests
│   ├── env-loading.test.js          # Environment tests
│   ├── unit/                        # Unit tests
│   ├── security/                    # Security tests
│   ├── performance/                 # Performance tests
│   ├── cache/                       # Cache tests
│   ├── property/                    # Property-based tests
│   └── config/                      # Configuration tests
├── scripts/                # Build, test, and utility scripts
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD automation
```

## 🔧 Development Commands

### Build System

```bash
# TypeScript compilation
npm run build              # Compile to dist/
npm run build:watch        # Watch mode compilation
npm run typecheck          # Type checking without output

# Development mode
npm run dev                # Development with debug output
DEBUG=true npm run dev     # Enhanced debug logging
```

### Testing Commands

```bash
# Test execution
npm test                   # Run main test suite
npm run test:watch         # Watch mode testing
npm run test:coverage      # Generate coverage report (50% threshold)
npm run test:fast          # Quick test run

# Specific test suites
npm run test:typescript    # TypeScript build tests
npm run test:security      # Security validation tests
npm run test:performance   # Performance regression tests
npm run test:cache         # Cache system tests
npm run test:config        # Configuration validation tests
npm run test:property      # Property-based tests

# Integration tests
npm run test:tools         # Tool functionality tests
npm run test:auth          # Authentication tests
npm run test:mcp           # MCP protocol tests
npm run test:multisite     # Multi-site configuration tests

# Contract testing
npm run test:contracts     # Contract tests (mock)
npm run test:contracts:live # Live WordPress contract tests

# Docker test environment
npm run test:with-env      # Tests with Docker WordPress
./scripts/start-test-env.sh # Start test environment
```

### Code Quality

```bash
# Linting and formatting
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix ESLint errors
npm run format             # Prettier formatting
npm run format:check       # Check formatting without changes

# Security scanning
npm run security:check     # Quick vulnerability scan
npm run security:scan      # Comprehensive security scanning
npm run security:test      # Security policy validation
npm run security:full      # Complete security testing suite
```

### Documentation

```bash
# Documentation generation
npm run docs:generate      # Generate API documentation
npm run docs:validate      # Validate documentation completeness
npm run docs:serve         # Start local documentation server
npm run docs:watch         # Watch mode for documentation
```

### Utility Commands

```bash
# Status and diagnostics
npm run status             # Check connection status
npm run health             # Comprehensive system health check
npm run setup              # Interactive setup wizard

# Maintenance
npm run clean              # Clean build artifacts
npm run verify-claude      # Verify Claude integration
```

## 🐳 Docker Development Environment

### Test Environment Setup

```bash
# Start complete test environment
./scripts/start-test-env.sh

# Run tests with Docker environment
npm run test:with-env

# Stop test environment
docker-compose -f docker-compose.test.yml down
```

### Development with Docker

```bash
# Build Docker image
docker build -t mcp-wordpress-dev .

# Run development container
docker run --rm -it \
  -v $(pwd):/app \
  -w /app \
  mcp-wordpress-dev npm run dev

# Docker Compose for development
docker-compose up --profile dev
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# WordPress connection (for testing)
WORDPRESS_SITE_URL=https://your-test-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password

# Development settings
DEBUG=true
NODE_ENV=development
LOG_LEVEL=debug

# Test configuration
WORDPRESS_TEST_URL=http://localhost:8081
PACT_LIVE_TESTING=false
```

### Multi-Site Development

Create `mcp-wordpress.config.json` for multi-site testing:

```json
{
  "sites": [
    {
      "id": "test-site",
      "name": "Test WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "http://localhost:8081",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "test test test test test test"
      }
    },
    {
      "id": "dev-site",
      "name": "Development Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://your-dev-site.com",
        "WORDPRESS_USERNAME": "dev_user",
        "WORDPRESS_APP_PASSWORD": "your-dev-password"
      }
    }
  ]
}
```

## 🧪 Testing WordPress Setup

### Option 1: Use Docker Test Environment (Recommended)

```bash
# Automated test WordPress setup
./scripts/start-test-env.sh
```

This creates:

- WordPress instance on `http://localhost:8081`
- Admin user: `admin` / `password`
- Pre-configured application password
- MySQL database
- Isolated from your development environment

### Option 2: Manual WordPress Setup

1. Install WordPress locally or use existing site
2. Enable Application Passwords (WordPress 5.6+)
3. Create application password for testing
4. Configure `.env` file with credentials

### Option 3: Use WordPress.com or Hosted Site

1. Use existing WordPress site
2. Create application password
3. Configure credentials in `.env`
4. Ensure REST API is accessible

## 🔍 IDE Setup (VS Code Recommended)

### Required Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

### Workspace Settings

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "dist/": true,
    "node_modules/": true,
    "coverage/": true
  }
}
```

## 🚀 First Development Task

### 1. Verify Setup

```bash
# Check all systems
npm run health

# Run quick tests
npm run test:fast

# Check connection to WordPress
npm run status
```

### 2. Make a Small Change

```bash
# Edit a tool description in src/tools/posts.ts
# Run tests to verify
npm test

# Check linting
npm run lint

# Build project
npm run build
```

### 3. Test Integration

```bash
# Test with Claude Desktop (if configured)
npm run verify-claude

# Or test with development mode
npm run dev
```

## 🐛 Common Development Issues

### TypeScript Errors

```bash
# Check TypeScript configuration
npm run typecheck

# Clear and rebuild
rm -rf dist/
npm run build
```

### Test Failures

```bash
# Run specific test suite
npm run test:auth

# Debug with verbose output
DEBUG=true npm test

# Check test environment
./scripts/start-test-env.sh
npm run test:with-env
```

### WordPress Connection Issues

```bash
# Test WordPress REST API directly
curl https://your-site.com/wp-json/wp/v2/

# Check authentication
npm run status

# Re-run setup wizard
npm run setup
```

### Docker Issues

```bash
# Clean Docker environment
docker-compose -f docker-compose.test.yml down -v
docker system prune

# Rebuild test environment
./scripts/start-test-env.sh
```

## 📚 Next Steps

1. **[Architecture Guide](ARCHITECTURE.md)** - Understand the system design
2. **[API Reference](API_REFERENCE.md)** - Technical API documentation
3. **[Testing Guide](TESTING.md)** - Comprehensive testing information
4. **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute

---

**Need help?** Check the [troubleshooting guide](../TROUBLESHOOTING.md) or create an issue on GitHub.
