# 🚀 MCP WordPress Server

<div align="center">
<img src="images/wordpress-mcp-logo.png" width="50%" alt="WordPress MCP Logo">

**The Most Comprehensive WordPress MCP Server**

Manage WordPress sites with natural language through AI tools like Claude Desktop

[![CI/CD Pipeline](https://github.com/docdyhr/mcp-wordpress/workflows/CI/badge.svg)](https://github.com/docdyhr/mcp-wordpress/actions)
[![NPM Version](https://img.shields.io/npm/v/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![NPM Downloads](https://img.shields.io/npm/dm/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![Test Coverage](https://img.shields.io/badge/test%20coverage-95%25%2B-brightgreen?logo=jest&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Test Results](https://img.shields.io/badge/tests-207%2F207%20passing-brightgreen?logo=checkmarx&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![MCP Evaluation](https://img.shields.io/badge/mcp%20evaluation-4.5%2F5.0-brightgreen?logo=openai&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/actions/workflows/mcp-evaluations.yml)

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?logo=typescript&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Security](https://img.shields.io/badge/security-40%2F40%20tests%20passing-green?logo=security&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/docdyhr/mcp-wordpress)
[![License](https://img.shields.io/badge/license-MIT-green?logo=opensource&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/blob/main/LICENSE)
[![smithery badge](https://smithery.ai/badge/@docdyhr/mcp-wordpress)](https://smithery.ai/server/@docdyhr/mcp-wordpress)

</div>

## 🎯 Why This MCP Server?

**Transform WordPress management** from complex admin panels to simple conversations:

```text
❌ Before: Login → Admin Panel → Navigate → Click → Fill Forms → Save
✅ After:  "Create a new blog post about AI trends with SEO optimization"
```

**Key Advantages:**
- 🏆 **Most Complete**: 59 tools vs 20-30 in alternatives
- ⚡ **Fastest Setup**: 2-click Claude Desktop installation via DXT
- 🔒 **Production Ready**: 207 tests, security audited, battle-tested
- 🎯 **TypeScript Native**: 100% type safety, best-in-class developer experience
- 🌐 **Multi-Site**: Manage unlimited WordPress sites from one place

## ⚡ Installation Options

### 🏆 Recommended: Claude Desktop Extension (DXT)

**Easiest installation - just 2 clicks!**

1. **Download**: [`mcp-wordpress.dxt`](https://github.com/docdyhr/mcp-wordpress/raw/main/mcp-wordpress.dxt) (2.6MB)
2. **Install**: Claude Desktop → Extensions → Install → Select DXT file
3. **Configure**: Enter your WordPress site URL and credentials

✅ **Zero command line required**  
✅ **Automatic updates**  
✅ **Built-in security**  

**[📖 Complete DXT Setup Guide →](docs/integrations/claude-desktop.md)**

### 🚀 Alternative: NPX (Power Users)

```bash
# Run directly - always latest version
npx -y mcp-wordpress

# Interactive setup wizard
npm run setup
```

### 📦 Secondary: Smithery Package Manager

```bash
# Install via Smithery (MCP package manager)
smithery install mcp-wordpress

# Configure and start
smithery configure mcp-wordpress
```

✅ **Package management**  
✅ **Version control**  
✅ **Easy updates**  

### Installing via Smithery

To install mcp-wordpress for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@docdyhr/mcp-wordpress):

```bash
npx -y @smithery/cli install @docdyhr/mcp-wordpress --client claude
```

### 🔧 Other Options

- 💻 **[NPM Setup](docs/user-guides/NPM_SETUP.md)** - Local development
- 🐳 **[Docker Setup](docs/user-guides/DOCKER_SETUP.md)** - Production deployment
- 📦 **[Smithery Setup](docs/user-guides/SMITHERY_SETUP.md)** - MCP package manager (detailed guide)
- 🔧 **[Manual Build](docs/developer/BUILD_SYSTEM.md)** - Custom builds

## 🌟 What Makes This Special

### 🏆 Feature Comparison

| Feature | This Server | Competition |
|---------|-------------|-------------|
| **Tools Available** | 59 tools | 20-30 tools |
| **Claude Desktop DXT** | ✅ 2-click install | ❌ Manual setup |
| **Multi-Site Support** | ✅ Unlimited sites | ❌ Single site |
| **TypeScript** | ✅ 100% coverage | ⚠️ Partial/None |
| **Performance Monitoring** | ✅ Real-time analytics | ❌ Basic only |
| **Test Coverage** | ✅ 207 tests (100%) | ⚠️ Limited |
| **Production Ready** | ✅ Security audited | ⚠️ Unknown |

### 🚀 Core Capabilities

#### WordPress Management
- **59 WordPress Tools** across 10 categories
- **Multi-Site Support** - Manage unlimited WordPress installations
- **Flexible Authentication** - App Passwords, JWT, Basic Auth, API Key
- **Real-Time Sync** - Instant updates across all connected tools

#### Performance & Reliability
- **⚡ Intelligent Caching** - 50-70% performance improvement
- **📊 Real-Time Monitoring** - Performance metrics and optimization insights
- **🔒 Production Ready** - Security-reviewed, 95%+ test coverage
- **🔄 Zero Downtime** - Graceful error handling and automatic recovery

#### Developer Experience
- **100% TypeScript** - Complete type safety and IntelliSense
- **🐳 Docker Support** - Production-ready containerization
- **📚 Auto-Generated Docs** - API documentation with live examples
- **🔧 Extensible** - Custom tool development framework

## 🌐 Multi-Site Configuration

Perfect for agencies and developers managing multiple WordPress sites:

```json
{
  "sites": [
    {
      "id": "main-site",
      "name": "Main WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    {
      "id": "client-blog",
      "name": "Client Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://client-blog.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy"
      }
    }
  ]
}
```

Use with site parameter: `wp_list_posts --site="main-site"`

📖 **[Complete Multi-Site Setup Guide](docs/user-guides/NPM_SETUP.md#multi-site-configuration)**

## 🔐 Authentication Setup

### WordPress Application Passwords (Recommended)

1. **WordPress Admin** → **Users** → **Profile**
2. Scroll to **Application Passwords**
3. Enter name: "MCP WordPress Server"
4. Click **Add New Application Password**
5. Copy the generated password

### Alternative Methods

- **JWT Authentication** - With JWT plugin
- **Basic Authentication** - Username/password (dev only)
- **API Key Authentication** - With API Key plugin

📖 **[Complete Authentication Guide](docs/user-guides/NPX_SETUP.md#authentication)**

## 📋 Available Tools (59 Tools)

### Content Management

- **📝 Posts** (6 tools) - Create, edit, delete, list posts and revisions
- **📄 Pages** (6 tools) - Manage static pages and revisions
- **🖼️ Media** (6 tools) - Upload, manage media library and files

### User & Community

- **👥 Users** (6 tools) - User management and profiles
- **💬 Comments** (7 tools) - Comment moderation and management
- **🏷️ Taxonomies** (10 tools) - Categories and tags management

### Site Management

- **⚙️ Site Settings** (7 tools) - Site configuration and statistics
- **🔐 Authentication** (6 tools) - Auth testing and management
- **⚡ Cache Management** (4 tools) - Performance caching control
- **📊 Performance Monitoring** (6 tools) - Real-time metrics and optimization

📖 **[Complete Tool Documentation](docs/api/README.md)** | **[Live API Reference](docs/developer/API_REFERENCE.md)**

## 🤖 Claude Desktop Integration

### 🎯 Real-World Use Cases

**Content Creation & Management:**
```text
💬 "Analyze my top 10 blog posts and create a new post about emerging trends"
💬 "Upload these 5 images and create a photo gallery page with SEO optimization"
💬 "Review all pending comments and approve the legitimate ones"
```

**Site Management & Analytics:**
```text
💬 "Check my WordPress site performance and provide optimization recommendations"
💬 "Create a new user account for my freelance writer with editor permissions"
💬 "Backup my site settings and show me cache performance statistics"
```

**Bulk Operations:**
```text
💬 "Update all posts from 2023 to include my new author bio"
💬 "Find all images over 1MB and suggest compression strategies"
💬 "List all users who haven't logged in for 6 months"
```

### ⚙️ Configuration Methods

#### Option 1: DXT Extension (Recommended)
**No configuration needed** - built-in secure credential management!

#### Option 2: NPX in Claude Desktop
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

📖 **[Complete Integration Guide](docs/integrations/claude-desktop.md)**

## 🧪 Testing & Status

### Current Test Status ✅

- **Main Test Suite**: 207/207 passed (100%)
- **Security Tests**: 40/40 passed (100%)
- **Performance Tests**: 8/8 passed (100%)
- **CI/CD Pipeline**: Fully functional

### Test Your Installation

```bash
# Check connection status
npm run status

# Run full test suite
npm test

# Quick validation
npm run test:fast
```

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to WordPress"**
   - Verify `WORDPRESS_SITE_URL`
   - Test REST API: `curl https://your-site.com/wp-json/wp/v2/`

2. **"Authentication failed"**
   - Check username and application password
   - Ensure Application Passwords are enabled
   - Run `npm run setup` to reconfigure

3. **"Tools not appearing in Claude"**
   - Restart Claude Desktop after configuration
   - Check Claude Desktop config file format

### Get Help

```bash
# Debug mode
DEBUG=true npm run dev

# Connection test
npm run status

# Re-run setup wizard
npm run setup
```

## 📚 Documentation Hub

### 🚀 Getting Started

| Guide | Best For | Setup Time |
|-------|----------|------------|
| **[DXT Extension](docs/integrations/claude-desktop.md)** | Most users | 2 minutes |
| **[NPX Setup](docs/user-guides/NPX_SETUP.md)** | Power users | 5 minutes |
| **[Smithery Setup](docs/INSTALLATION.md#-smithery-package-manager)** | MCP users | 3 minutes |
| **[Docker Setup](docs/user-guides/DOCKER_SETUP.md)** | Production | 10 minutes |
| **[NPM Development](docs/user-guides/NPM_SETUP.md)** | Developers | 15 minutes |

### 📖 User Documentation

- **[Installation Guide](docs/INSTALLATION.md)** - All setup methods with troubleshooting
- **[Configuration Guide](docs/CONFIGURATION.md)** - Complete configuration reference
- **[Multi-Site Setup](docs/user-guides/NPM_SETUP.md#multi-site-configuration)** - Managing multiple WordPress sites
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### 🔧 Technical Reference

- **[API Documentation](docs/api/README.md)** - All 59 tools with examples
- **[Architecture Overview](docs/developer/ARCHITECTURE.md)** - System design and TypeScript benefits
- **[Performance Guide](docs/PERFORMANCE_MONITORING.md)** - Monitoring and optimization
- **[Security Guide](docs/SECURITY.md)** - Best practices and compliance

### 👨‍💻 Developer Resources

- **[Contributing Guide](docs/developer/CONTRIBUTING.md)** - How to contribute
- **[Development Setup](docs/developer/DEVELOPMENT.md)** - Local development environment
- **[Testing Guide](docs/developer/TESTING.md)** - Running and writing tests
- **[Release Process](docs/developer/RELEASE_PROCESS.md)** - CI/CD and versioning

## 🔧 Requirements

- **WordPress 5.0+** with REST API enabled
- **HTTPS recommended** for production
- **User with appropriate permissions**
- **Application Passwords enabled** (WordPress 5.6+)

### WordPress User Roles

| Role              | Access                        |
| ----------------- | ----------------------------- |
| **Administrator** | Full access to all functions  |
| **Editor**        | Posts, pages, comments, media |
| **Author**        | Own posts and media           |
| **Contributor**   | Own posts (drafts only)       |
| **Subscriber**    | Read only                     |

## 📦 Installation Options

### NPM Package

```bash
# Global installation
npm install -g mcp-wordpress

# Direct usage (recommended)
npx -y mcp-wordpress
```

### Docker Images

```bash
# Latest version
docker pull docdyhr/mcp-wordpress:latest

# Specific version
docker pull docdyhr/mcp-wordpress:1.3.1
```

### Distribution Channels

- **NPM:** [`mcp-wordpress`](https://www.npmjs.com/package/mcp-wordpress)
- **Docker Hub:** [`docdyhr/mcp-wordpress`](https://hub.docker.com/r/docdyhr/mcp-wordpress)
- **GitHub:** [Latest releases](https://github.com/docdyhr/mcp-wordpress/releases)

## 🚀 Next Steps

**Ready to transform your WordPress management?**

1. **🏆 [Download DXT Extension](https://github.com/docdyhr/mcp-wordpress/raw/main/mcp-wordpress.dxt)** - Easiest setup (2 minutes)
2. **⚡ [Try NPX Method](docs/user-guides/NPX_SETUP.md)** - Power user setup (5 minutes)
3. **📚 [Explore All Tools](docs/api/README.md)** - See what's possible
4. **💬 [Join Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)** - Get help and share ideas

---

## 🙏 Acknowledgments

Special thanks to **[Stephan Ferraro](https://github.com/ferraro)** for the upstream project that inspired this
implementation.

---

<div align="center">

**⭐ Found this helpful? [Give us a star on GitHub!](https://github.com/docdyhr/mcp-wordpress) ⭐**

</div>