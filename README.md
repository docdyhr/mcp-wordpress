# MCP WordPress Server

<div align="center">
<img src="images/wordpress-mcp-logo.png" width="50%" alt="WordPress MCP Logo">
</div>

A comprehensive Model Context Protocol (MCP) server for WordPress management through Claude Desktop. Manage your WordPress sites with natural language through 59 powerful tools.

[![NPM Version](https://img.shields.io/npm/v/mcp-wordpress)](https://www.npmjs.com/package/mcp-wordpress)
[![Test Coverage](https://img.shields.io/badge/test%20coverage-95%25%2B-brightgreen)](https://github.com/docdyhr/mcp-wordpress)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://github.com/docdyhr/mcp-wordpress)

## ⚡ Quick Start

**Choose your setup method:**

- 🚀 **[NPX Setup](docs/user-guides/NPX_SETUP.md)** - Zero installation, always latest (Recommended)
- 💻 **[NPM Setup](docs/user-guides/NPM_SETUP.md)** - Local development
- 🐳 **[Docker Setup](docs/user-guides/DOCKER_SETUP.md)** - Containerized deployment
- 📦 **[DTX Setup](docs/user-guides/DTX_SETUP.md)** - Claude Desktop Extension

### Ultra-Quick Start (NPX)

```bash
# Run directly with NPX (recommended)
npx -y mcp-wordpress

# Follow the setup wizard
npm run setup
```

**Setup takes 2 minutes** - the wizard guides you through WordPress connection and Claude Desktop configuration.

## 🚀 Features

### WordPress Management

- **59 WordPress Tools** - Posts, pages, media, users, comments, categories, tags, site settings
- **Multi-Site Support** - Manage multiple WordPress sites from one configuration
- **Flexible Authentication** - App Passwords (recommended), JWT, Basic Auth, API Key

### Performance & Monitoring

- **⚡ Intelligent Caching** - 50-70% performance improvement with multi-layer caching
- **📊 Real-Time Monitoring** - Performance metrics, analytics, and optimization insights
- **🔒 Production Ready** - Security-reviewed, 95%+ test coverage, battle-tested

### Developer Experience

- **100% TypeScript** - Complete type safety and IntelliSense
- **🐳 Docker Support** - Containerized deployment for production
- **📚 Auto-Generated Docs** - Complete API documentation with examples
- **🔄 100% Backward Compatible** - Zero breaking changes

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

📖 **[Complete Tool Documentation](docs/api/README.md)**

## 🤖 Claude Desktop Integration

### Quick Prompts for Claude

**Setup Help:**

```text
Set up MCP WordPress using NPX. My site: https://mysite.com, username: myuser. Help with application password creation and Claude Desktop configuration.
```

**Content Management:**

```text
List my recent WordPress posts, then help me create a new post about [topic] with SEO-optimized content.
```

**Site Analysis:**

```text
Check my WordPress site performance, cache statistics, and provide optimization recommendations.
```

### Configuration Example

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

📖 **[Complete Claude Desktop Setup](docs/user-guides/NPX_SETUP.md)**

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

## 📚 Documentation

### User Guides

- **[NPX Setup](docs/user-guides/NPX_SETUP.md)** - Quick start guide
- **[NPM Setup](docs/user-guides/NPM_SETUP.md)** - Local development
- **[Docker Setup](docs/user-guides/DOCKER_SETUP.md)** - Production deployment
- **[DTX Setup](docs/user-guides/DTX_SETUP.md)** - Desktop extension

### Technical Documentation

- **[API Documentation](docs/api/README.md)** - Complete tool reference
- **[Performance Guide](docs/PERFORMANCE_MONITORING.md)** - Monitoring and optimization
- **[Caching Guide](docs/CACHING.md)** - Cache configuration and management
- **[Security Guide](docs/SECURITY_TESTING.md)** - Security best practices

### Developer Resources

- **[Development Guide](docs/developer/README.md)** - Contributing and development
- **[API Reference](docs/developer/API_REFERENCE.md)** - Technical API details
- **[Architecture Guide](docs/developer/ARCHITECTURE.md)** - System architecture
- **[Testing Guide](docs/developer/TESTING.md)** - Test suite and CI/CD

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

## 🙏 Acknowledgments

Special thanks to **[Stephan Ferraro](https://github.com/ferraro)** for the upstream project that inspired this implementation.

---

**Ready to get started?** Choose your setup method above and follow the guide - you'll be managing WordPress with Claude in minutes! 🚀
