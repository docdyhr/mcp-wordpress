<div align="right">
<a href="https://railway.com?referralCode=QhjuBc">
  <img width="160" src="https://raw.githubusercontent.com/docdyhr/.github/main/assets/railway-corner-v2@2x.png" alt="Deploy on Railway — $20 free credits">
</a>
</div>

# 🚀 MCP WordPress Server

<div align="center">
<img src="images/wordpress-mcp-logo.png" width="50%" alt="WordPress MCP Logo">

**The Most Comprehensive WordPress MCP Server**

Manage WordPress sites with natural language through AI tools like Claude Desktop

[Quick Start](#-quick-start) • [Why This MCP Server?](#-why-this-mcp-server)
[Installation Options](#-installation-options) • [Documentation](#-documentation) • [Examples](#-examples)

[![CI/CD Pipeline](https://github.com/docdyhr/mcp-wordpress/actions/workflows/main-ci.yml/badge.svg)](https://github.com/docdyhr/mcp-wordpress/actions/workflows/main-ci.yml)
[![GitHub Stars](https://img.shields.io/github/stars/docdyhr/mcp-wordpress?style=social)](https://github.com/docdyhr/mcp-wordpress/stargazers)
[![NPM Version](https://img.shields.io/npm/v/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![NPM Downloads](https://img.shields.io/npm/dm/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![NPM Total Downloads](https://img.shields.io/npm/dt/mcp-wordpress?logo=npm&logoColor=white&label=total%20downloads)](https://www.npmjs.com/package/mcp-wordpress)
[![Docker Pulls](https://img.shields.io/docker/pulls/docdyhr/mcp-wordpress?logo=docker&logoColor=white)](https://hub.docker.com/r/docdyhr/mcp-wordpress)
[![Coverage Status](https://img.shields.io/codecov/c/github/docdyhr/mcp-wordpress?logo=codecov&logoColor=white)](https://codecov.io/gh/docdyhr/mcp-wordpress)
[![MCP Evaluation](https://img.shields.io/badge/mcp%20evaluation-4.5%2F5.0-brightgreen?logo=openai&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/actions/workflows/mcp-evaluations.yml)

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?logo=typescript&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![CodeQL](https://github.com/docdyhr/mcp-wordpress/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/docdyhr/mcp-wordpress/actions/workflows/codeql-analysis.yml)
[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/docdyhr/mcp-wordpress)
[![License](https://img.shields.io/badge/license-MIT-green?logo=opensource&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/blob/main/LICENSE)
<!-- Badges updated: 2025-12-23 -->
### 🎉 **v3.3.14** - CI-Tested on Node 20/22/24

</div>

## 🎯 Why This MCP Server?

**Transform WordPress management** from complex admin panels to simple conversations:

```text
❌ Before: Login → Admin Panel → Navigate → Click → Fill Forms → Save
✅ After:  "Create a new blog post about AI trends with SEO optimization"
```

**Key Advantages:**

- 🏆 **Most Complete**: 71 tools vs 20-30 in alternatives
- ⚡ **Fastest Setup**: 2-click Claude Desktop installation via DXT
- 🔒 **CI-Tested**: 2750+ tests across Node 20/22/24, CodeQL + Trivy security scanning
- 🎯 **TypeScript Native**: 100% type safety, best-in-class developer experience
- 🌐 **Multi-Site**: Manage unlimited WordPress sites from one place

## 🚀 Quick Start

Get up and running in **under 5 minutes**:

### Prerequisites

- **WordPress**: Version 5.6+ with REST API enabled
- **Claude Desktop**: Latest version installed
- **Application Password**: Generated from WordPress admin panel

### 3-Step Setup

**1️⃣ Generate WordPress Application Password**

```text
WordPress Admin → Users → Profile → Application Passwords → Add New
```

**2️⃣ Install MCP Server (Choose One)**

**Option A: DXT Extension (Easiest)**

```bash
# Download and install in Claude Desktop
curl -L https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt -o mcp-wordpress.dxt
# Then: Claude Desktop → Extensions → Install → Select DXT file
```

**Option B: NPM Global Install**

```bash
npm install -g mcp-wordpress
```

**3️⃣ Test Your Connection**

```text
In Claude: "Test my WordPress connection"
Response: "✅ Authentication successful! Connected to: Your Site Name"
```

📺 **[Watch 2-minute Setup Video](https://github.com/docdyhr/mcp-wordpress/wiki/setup-video)** | 📖
**[Detailed Setup Guide](docs/INSTALLATION.md)**

## ⚡ Installation Options

### 🏆 Recommended: Claude Desktop Extension (DXT)

**Easiest installation - just 2 clicks!**

1. **Download**:
   [`mcp-wordpress.dxt`](https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt) (3.4MB)
2. **Install**: Claude Desktop → Extensions → Install → Select DXT file
3. **Configure**: Enter your WordPress site URL and credentials

✅ **Zero command line required** ✅ **Easy updates** ✅ **Built-in security**

**[📖 Complete DXT Setup Guide →](docs/integrations/claude-desktop.md)**

### 🚀 Alternative: NPX (Power Users)

```bash
# Run directly - always latest version
npx -y mcp-wordpress

# Interactive setup wizard
npm run setup
```

### 🔧 Other Options

- 💻 **[NPM Setup](docs/user-guides/NPM_SETUP.md)** - Local development
- 🐳 **[Docker Setup](docs/user-guides/DOCKER_SETUP.md)** - Production deployment
- 🔧 **[Manual Build](docs/developer/BUILD_SYSTEM.md)** - Custom builds

## 📋 Configuration

**Single Site (.env)**

```bash
WORDPRESS_SITE_URL=https://myblog.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

**Claude Desktop Config**

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://myblog.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

📖 **[Complete Configuration Guide](docs/CONFIGURATION.md)** — multi-site, JWT, Docker, production environments

## 🔐 Authentication

WordPress Application Passwords are recommended:

1. **WordPress Admin** → **Users** → **Profile** → **Application Passwords** → **Add New**
2. Copy the generated password into your config

Alternative methods: JWT, Basic Auth, API Key — see **[Authentication Configuration](docs/CONFIGURATION.md#authentication-configuration)**

## 🌟 What Makes This Special

| Feature                    | This Server                            | Competition     |
| -------------------------- | -------------------------------------- | --------------- |
| **Tools Available**        | 71 tools                               | 20-30 tools     |
| **Claude Desktop DXT**     | ✅ 2-click install                     | ❌ Manual setup |
| **Multi-Site Support**     | ✅ Unlimited sites                     | ❌ Single site  |
| **TypeScript**             | ✅ 100% TypeScript, strict mode        | ⚠️ Partial/None |
| **Performance Monitoring** | ✅ Real-time analytics                 | ❌ Basic only   |
| **Test Coverage**          | ✅ 2750+ tests, ~76% line coverage     | ⚠️ Limited      |
| **Security Scanning**      | ✅ CodeQL + Trivy in CI                | ⚠️ Unknown      |

## 📋 Available Tools (71 Tools)

### Content Management

- **📝 Posts** (6 tools) - Create, edit, delete, list posts and revisions
- **📄 Pages** (6 tools) - Manage static pages and revisions
- **🖼️ Media** (5 tools) - Upload, manage media library and files
- **🔍 SEO** (11 tools) - Content analysis, metadata, schema markup, SERP tracking, keyword research

### User & Community

- **👥 Users** (6 tools) - User management and profiles
- **💬 Comments** (7 tools) - Comment moderation and management
- **🏷️ Taxonomies** (10 tools) - Categories and tags management

### Site Management

- **⚙️ Site Settings** (6 tools) - Site configuration and statistics
- **🔐 Authentication** (3 tools) - Auth testing and management
- **⚡ Cache Management** (4 tools) - Performance caching control
- **📊 Performance Monitoring** (6 tools) - Real-time metrics and optimization
- **🛠️ System** (1 tool) - Version checking

📖 **[Complete Tool Documentation](docs/api/README.md)** | **[Live API Reference](docs/developer/API_REFERENCE.md)**

## 🤖 Examples

```text
💬 "Create a new blog post about AI trends with SEO optimization"
💬 "Check my WordPress site performance and provide optimization recommendations"
💬 "Find all draft posts older than 30 days and provide a summary"
💬 "Batch update all client sites with the new privacy policy footer"
💬 "List all posts from my client-blog site"
```

📖 **[More Examples](docs/examples/)** | **[Real-World Workflows](docs/examples/use-case-workflows.md)**

## 🧪 Testing & Security

```bash
npm test              # Full test suite (2750/2750 passing, 94 files)
npm run test:security # Security tests (371/371 passing)
npm run health        # System health check
```

📖 **[Security Documentation](docs/SECURITY.md)** — OWASP coverage, penetration testing, compliance

## 🛠️ Troubleshooting

```bash
npm run health         # System check
DEBUG=true npm run dev # Debug logging
npm run fix:rest-auth  # Fix WordPress 401 errors
```

| Error | Solution |
|-------|----------|
| `401 Unauthorized` | Regenerate application password |
| `403 Forbidden` | Check user role (Editor+ required) |
| `404 Not Found` | Verify `WORDPRESS_SITE_URL` |
| `Connection Timeout` | Check WordPress REST API access |

📖 **[Full Troubleshooting Guide](docs/TROUBLESHOOTING.md)**

## 📚 Documentation

### Getting Started

- **[Quick Start Guide](#-quick-start)** - Get running in 5 minutes
- **[Installation Guide](docs/INSTALLATION.md)** - Detailed setup instructions
- **[Configuration Guide](docs/CONFIGURATION.md)** - All configuration options
- **[Authentication Setup](docs/SECURITY.md#authentication)** - WordPress auth methods

### User Guides

- **[Basic Usage](docs/examples/single-site-setup.md)** - Common tasks and workflows
- **[Advanced Workflows](docs/examples/use-case-workflows.md)** - Complex automation
- **[Multi-Site Management](docs/examples/multi-site-setup.md)** - Managing multiple sites
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Integration Guides

- **[Claude Desktop](docs/integrations/claude-desktop.md)** - Complete Claude integration
- **[VS Code](docs/integrations/vs-code.md)** - VS Code extension setup
- **[Cline](docs/integrations/cline.md)** - Cline AI assistant integration
- **[Developer Guide](docs/developer/README.md)** - Build your own MCP client

### Developer Documentation

- **[API Reference](docs/developer/API_REFERENCE.md)** - Complete tool documentation
- **[Architecture](docs/ARCHITECTURE.md)** - System design and decisions
- **[Contributing](CONTRIBUTING.md)** - Development guidelines
- **[Build System](docs/developer/BUILD_SYSTEM.md)** - Build and release

### Deployment & Operations

- **[Docker Deployment](docs/DOCKER.md)** - Container deployment
- **[Publishing Troubleshooting](docs/PUBLISHING-TROUBLESHOOTING.md)** - Fix publishing issues
- **[Security Best Practices](docs/SECURITY.md)** - Production security
- **[Caching](docs/CACHING.md)** - Performance and caching guide

## 🔧 Requirements

- **WordPress 5.0+** with REST API enabled
- **HTTPS recommended** for production
- **Application Passwords enabled** (WordPress 5.6+)

| Role              | Access                        |
| ----------------- | ----------------------------- |
| **Administrator** | Full access to all functions  |
| **Editor**        | Posts, pages, comments, media |
| **Author**        | Own posts and media           |
| **Contributor**   | Own posts (drafts only)       |
| **Subscriber**    | Read only                     |

## 🚀 Next Steps

**Ready to transform your WordPress management?**

1. **🏆 [Download DXT Extension](https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt)** - Easiest setup (2 minutes)
2. **⚡ [Try NPX Method](docs/user-guides/NPX_SETUP.md)** - Power user setup (5 minutes)
3. **📚 [Explore All Tools](docs/api/README.md)** - See what's possible
4. **💬 [Join Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)** - Get help and share ideas

---

## 🔗 Similar Projects

- **[Automattic WordPress MCP](https://github.com/Automattic/wordpress-mcp)** - Official WordPress MCP server by Automattic

---

## 📋 Changelog

### v3.3.14 (June 2026)

- **🔒 Security Updates** - Patch moderate Hono vulnerabilities, update allowlisted npm-bundled advisories
- **🧪 CI** - Smoke-test improvements and Node 24 validation

### v3.x Series (2025–2026)

- **🏗️ Modular Architecture** - Domain-specific operation modules and composition pattern
- **🔄 Fault Tolerance** - Circuit breaker pattern with automatic recovery
- **📊 2200+ Tests** - Comprehensive test suite across security, cache, server, client, config, utils, tools, and performance
- **⚡ Caching Layer** - `CachedWordPressClient` with configurable TTL; 50–70% faster repeat requests
- **🌐 Multi-Site** - Unlimited WordPress sites from one configuration file
- **🔐 4 Auth Methods** - App Passwords (recommended), JWT, Basic, API Key
- **🐳 Docker & DXT** - One-click Claude Desktop extension and Docker Hub image

For the full history see [CHANGELOG.md](CHANGELOG.md).

---

## 🙏 Acknowledgments

Special thanks to **[Stephan Ferraro](https://github.com/ferraro)** for the upstream project that inspired this
implementation.

---

<div align="center">

**⭐ Found this helpful? [Give us a star on GitHub!](https://github.com/docdyhr/mcp-wordpress) ⭐**

</div>
