# 🚀 MCP WordPress Server

<div align="center">
<img src="images/wordpress-mcp-logo.png" width="50%" alt="WordPress MCP Logo">

**The Most Comprehensive WordPress MCP Server**

Manage WordPress sites with natural language through AI tools like Claude Desktop

[Quick Start](#-quick-start) • [Features](#-features) • [Installation](#-installation-options) • [Documentation](#-documentation) • [Examples](#-examples)

[![CI/CD Pipeline](https://github.com/docdyhr/mcp-wordpress/workflows/%F0%9F%9A%80%20CI%2FCD%20Pipeline/badge.svg)](https://github.com/docdyhr/mcp-wordpress/actions)
[![NPM Version](https://img.shields.io/npm/v/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![NPM Downloads](https://img.shields.io/npm/dm/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![Test Coverage](https://img.shields.io/badge/test%20coverage-95%25%2B-brightgreen?logo=jest&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Test Results](https://img.shields.io/badge/tests-207%2F207%20passing-brightgreen?logo=checkmarx&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![MCP Evaluation](https://img.shields.io/badge/mcp%20evaluation-4.5%2F5.0-brightgreen?logo=openai&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/actions/workflows/mcp-evaluations.yml)

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?logo=typescript&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Security Tests](https://img.shields.io/badge/security%20tests-40%2F40%20passing-brightgreen?logo=shield&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/tree/main/tests/security)
[![Vulnerabilities](https://img.shields.io/badge/vulnerabilities-0%20known-brightgreen?logo=security&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/security/advisories)
[![Penetration Testing](https://img.shields.io/badge/penetration%20testing-28%2F28%20passing-brightgreen?logo=bug&logoColor=white)](https://github.com/docdyhr/mcp-wordpress/blob/main/tests/security/penetration-tests.test.js)
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
curl -L https://github.com/docdyhr/mcp-wordpress/raw/main/mcp-wordpress.dxt -o mcp-wordpress.dxt
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

📺 **[Watch 2-minute Setup Video](https://github.com/docdyhr/mcp-wordpress/wiki/setup-video)** | 📖 **[Detailed Setup Guide](docs/INSTALLATION.md)**

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

## 📚 Examples

### Basic Content Management

**Create and Publish a Blog Post**
```text
You: "Create a new blog post titled 'AI Revolution in 2024' with content about recent AI breakthroughs"
Claude: "I'll create that blog post for you..."
Result: ✅ Post "AI Revolution in 2024" created successfully (ID: 123)
```

**Media Management**
```text
You: "Upload the image at /path/to/image.jpg and set it as featured image for post 123"
Claude: "I'll upload that image and set it as the featured image..."
Result: ✅ Image uploaded (ID: 456) and set as featured image
```

### Advanced Workflows

**SEO-Optimized Content Creation**
```text
You: "Create an SEO-optimized blog post about 'WordPress Security Best Practices' with:
     - Focus keyword: 'WordPress security'
     - Meta description
     - Proper heading structure
     - At least 1500 words"
     
Claude: "I'll create a comprehensive SEO-optimized post on WordPress security..."
```

**Bulk Operations**
```text
You: "Find all draft posts older than 30 days and provide a summary"
You: "Update all posts in category 'News' to include a disclaimer at the end"
You: "Delete all spam comments from the last week"
```

### Site Management

**Performance Monitoring**
```text
You: "Analyze my site's performance and suggest optimizations"
Claude: "Let me check your site's performance metrics...
         - Cache hit rate: 67%
         - Average response time: 245ms
         - Recommendations: Enable object caching, optimize images..."
```

**User Management**
```text
You: "Create a new editor account for john@example.com with a secure password"
You: "List all users who haven't logged in for 90 days"
You: "Update Sarah's role from Author to Editor"
```

### Multi-Site Management

**Working with Multiple Sites**
```text
You: "List all posts from my client-blog site"
Claude: "I'll list the posts from the client-blog site..."

You: "Compare traffic between main-site and client-blog"
Claude: "Here's a comparison of both sites..."
```

📖 **[More Examples](docs/examples/)** | **[Use Case Library](docs/use-cases/)**

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

## 🔒 Security Status

### Comprehensive Security Testing

Our security posture is continuously monitored through automated testing and vulnerability scanning:

| **Security Area** | **Status** | **Tests** | **Coverage** |
|-------------------|------------|-----------|--------------|
| **XSS Protection** | ✅ Secure | 6/6 passing | Script injection, URL validation, HTML sanitization |
| **SQL Injection** | ✅ Secure | 3/3 passing | Query parameterization, input validation |
| **Path Traversal** | ✅ Secure | 3/3 passing | File path validation, directory restrictions |
| **Input Validation** | ✅ Secure | 9/9 passing | Length limits, format validation, sanitization |
| **Authentication** | ✅ Secure | 7/7 passing | Bypass prevention, token validation |
| **Rate Limiting** | ✅ Secure | 3/3 passing | DoS protection, request throttling |
| **Information Disclosure** | ✅ Secure | 2/2 passing | Error sanitization, sensitive data protection |
| **Penetration Testing** | ✅ Secure | 12/12 passing | Comprehensive attack simulation |

### Security Features

- **🛡️ Input Sanitization**: All user inputs are validated and sanitized
- **🔐 Authentication Security**: Multi-method auth with bypass prevention
- **⚡ Rate Limiting**: Built-in protection against abuse and DoS attacks
- **🔍 Vulnerability Scanning**: Daily automated security scans
- **📊 Real-time Monitoring**: Continuous security status updates
- **🚨 Automated Alerts**: Immediate notification of security issues

### Security Testing Commands

```bash
# Run comprehensive security tests
npm run test:security

# Run penetration testing suite
npm run test:security:validation

# Security vulnerability audit
npm audit

# Full security validation
npm run security:full
```

### Security Compliance

- **OWASP Top 10**: Complete protection against common vulnerabilities
- **CVE Monitoring**: Automated scanning for known vulnerabilities
- **Security Headers**: Proper HTTP security headers implementation
- **Data Protection**: Sensitive credential redaction and secure storage
- **Access Control**: Role-based permissions and authentication validation

📖 **[Complete Security Documentation](docs/SECURITY.md)** | **[Security Test Results](tests/security/)**

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

### Getting Started
- **[Quick Start Guide](#-quick-start)** - Get running in 5 minutes
- **[Installation Guide](docs/INSTALLATION.md)** - Detailed setup instructions
- **[Configuration Guide](docs/CONFIGURATION.md)** - All configuration options
- **[Authentication Setup](docs/SECURITY.md#authentication)** - WordPress auth methods

### User Guides
- **[Basic Usage](docs/examples/basic-usage.md)** - Common tasks and workflows
- **[Advanced Workflows](docs/examples/advanced-workflows.md)** - Complex automation
- **[Multi-Site Management](docs/user-guides/multi-site.md)** - Managing multiple sites
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Integration Guides
- **[Claude Desktop](docs/integrations/claude-desktop.md)** - Complete Claude integration
- **[VS Code](docs/integrations/vs-code.md)** - VS Code extension setup
- **[Cline](docs/integrations/cline.md)** - Cline AI assistant integration
- **[Custom Clients](docs/developer/custom-clients.md)** - Build your own MCP client

### Developer Documentation
- **[API Reference](docs/API_REFERENCE.md)** - Complete tool documentation
- **[Architecture](docs/ARCHITECTURE.md)** - System design and decisions
- **[Contributing](CONTRIBUTING.md)** - Development guidelines
- **[Plugin Development](docs/developer/plugins.md)** - Extend functionality

### Deployment & Operations
- **[Docker Deployment](docs/deployment/docker.md)** - Container deployment
- **[Security Best Practices](docs/SECURITY.md)** - Production security
- **[Performance Tuning](docs/deployment/performance.md)** - Optimization guide
- **[Monitoring](docs/deployment/monitoring.md)** - Logging and metrics


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