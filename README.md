# 🚀 MCP WordPress Server

<div align="center">
<img src="images/wordpress-mcp-logo.png" width="50%" alt="WordPress MCP Logo">

**The Most Comprehensive WordPress MCP Server**

Manage WordPress sites with natural language through AI tools like Claude Desktop

[Quick Start](#-quick-start) • [Why This MCP Server?](#-why-this-mcp-server)
[Installation Options](#-installation-options) • [Documentation](#-documentation) • [Examples](#-examples)

[![CI/CD Pipeline](https://github.com/docdyhr/mcp-wordpress/workflows/%F0%9F%9A%80%20CI%2FCD%20Pipeline/badge.svg)](https://github.com/docdyhr/mcp-wordpress/actions)
[![GitHub Stars](https://img.shields.io/github/stars/docdyhr/mcp-wordpress?style=social)](https://github.com/docdyhr/mcp-wordpress/stargazers)
[![NPM Version](https://img.shields.io/npm/v/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![NPM Downloads](https://img.shields.io/npm/dm/mcp-wordpress?logo=npm&logoColor=white)](https://www.npmjs.com/package/mcp-wordpress)
[![NPM Total Downloads](https://img.shields.io/npm/dt/mcp-wordpress?logo=npm&logoColor=white&label=total%20downloads)](https://www.npmjs.com/package/mcp-wordpress)
[![Docker Pulls](https://img.shields.io/docker/pulls/docdyhr/mcp-wordpress?logo=docker&logoColor=white)](https://hub.docker.com/r/docdyhr/mcp-wordpress)
[![Line Coverage](https://img.shields.io/badge/lines%20coverage-96.17%25-brightgreen?logo=vitest&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Branch Coverage](https://img.shields.io/badge/branch%20coverage-95.83%25-brightgreen?logo=vitest&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Function Coverage](https://img.shields.io/badge/function%20coverage-100.00%25-brightgreen?logo=vitest&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
[![Test Results](https://img.shields.io/badge/tests-512%2F512%20passing-brightgreen?logo=vitest&logoColor=white)](https://github.com/docdyhr/mcp-wordpress)
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
- 🔒 **Production Ready**: 512 tests (100% pass rate), security audited, battle-tested
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

1. **Download**: [`mcp-wordpress.dxt`](https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt) (3.4MB)
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

To install mcp-wordpress for Claude Desktop automatically via
[Smithery](https://smithery.ai/server/@docdyhr/mcp-wordpress):

```bash
npx -y @smithery/cli install @docdyhr/mcp-wordpress --client claude
```

### 🔧 Other Options

- 💻 **[NPM Setup](docs/user-guides/NPM_SETUP.md)** - Local development
- 🐳 **[Docker Setup](docs/user-guides/DOCKER_SETUP.md)** - Production deployment
- 📦 **[Smithery Setup](docs/user-guides/SMITHERY_SETUP.md)** - MCP package manager (detailed guide)
- 🔧 **[Manual Build](docs/developer/BUILD_SYSTEM.md)** - Custom builds

## 📋 Configuration Examples

### Single Site Setup

**Environment Variables (.env)**

```bash
WORDPRESS_SITE_URL=https://myblog.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password
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

### Multi-Site Agency Setup

**Configuration File (mcp-wordpress.config.json)**

```json
{
  "sites": [
    {
      "id": "main-corporate",
      "name": "Corporate Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://company.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    },
    {
      "id": "client-restaurant",
      "name": "Restaurant Client",
      "config": {
        "WORDPRESS_SITE_URL": "https://bestrestaurant.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    },
    {
      "id": "client-ecommerce",
      "name": "E-commerce Client",
      "config": {
        "WORDPRESS_SITE_URL": "https://onlinestore.com",
        "WORDPRESS_USERNAME": "shopmanager",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  ]
}
```

### Development Environment

**Local WordPress with Docker**

```yaml
# docker-compose.yml
version: "3.8"
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wordpress_data:/var/www/html

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
      MYSQL_ROOT_PASSWORD: rootpassword
    volumes:
      - db_data:/var/lib/mysql

volumes:
  wordpress_data:
  db_data:
```

**MCP WordPress Development Config**

```json
{
  "sites": [
    {
      "id": "local-dev",
      "name": "Local Development",
      "config": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "dev-password-here",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  ]
}
```

### Production Deployment

**Server Environment Variables**

```bash
# /etc/environment or systemd service
WORDPRESS_SITE_URL=https://production-site.com
WORDPRESS_USERNAME=api-user
WORDPRESS_APP_PASSWORD=secure-production-password
WORDPRESS_AUTH_METHOD=app-password
NODE_ENV=production
CACHE_ENABLED=true
CACHE_TTL=3600
RATE_LIMIT_ENABLED=true
DEBUG=false
```

**Docker Production Setup**

```dockerfile
# Dockerfile.production
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

### JWT Authentication Setup

**WordPress Plugin Configuration**

```php
// wp-config.php
define('JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
define('JWT_AUTH_CORS_ENABLE', true);
```

**MCP Configuration**

```json
{
  "sites": [
    {
      "id": "jwt-site",
      "name": "JWT Authentication Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site-with-jwt.com",
        "WORDPRESS_USERNAME": "api-user",
        "WORDPRESS_PASSWORD": "user-password",
        "WORDPRESS_AUTH_METHOD": "jwt"
      }
    }
  ]
}
```

## 🌟 What Makes This Special

### 🏆 Feature Comparison

| Feature                    | This Server            | Competition     |
| -------------------------- | ---------------------- | --------------- |
| **Tools Available**        | 59 tools               | 20-30 tools     |
| **Claude Desktop DXT**     | ✅ 2-click install     | ❌ Manual setup |
| **Multi-Site Support**     | ✅ Unlimited sites     | ❌ Single site  |
| **TypeScript**             | ✅ 100% coverage       | ⚠️ Partial/None |
| **Performance Monitoring** | ✅ Real-time analytics | ❌ Basic only   |
| **Test Coverage**          | ✅ 404 tests (100% pass / 30% lines) | ⚠️ Limited      |
| **Production Ready**       | ✅ Security audited    | ⚠️ Unknown      |

### 🚀 Core Capabilities

#### WordPress Management

- **59 WordPress Tools** across 10 categories
- **Multi-Site Support** - Manage unlimited WordPress installations
- **Flexible Authentication** - App Passwords, JWT, Basic Auth, API Key
- **Real-Time Sync** - Instant updates across all connected tools

#### Performance & Reliability

- **⚡ Intelligent Caching** - 50-70% performance improvement
- **📊 Real-Time Monitoring** - Performance metrics and optimization insights
- **🔒 Production Ready** - Security-reviewed, 96.17% line coverage with Vitest testing framework
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

### Site Management (Monitoring & Admin)

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

## 🎨 Real-World Workflows

### Content Marketing Agency Workflow

**Scenario**: Managing 20+ client blogs with consistent SEO optimization

```text
💬 "Analyze the top 5 performing posts across all sites and create similar content for underperforming clients"
💬 "Batch update all client sites with the new privacy policy footer"
💬 "Generate a weekly performance report comparing all client sites"
💬 "Create social media snippets from the latest blog posts on each site"
```

### E-commerce Store Management

**Scenario**: Managing product launches and inventory updates

```text
💬 "Create a product launch post with gallery, specifications, and pricing for the new iPhone case"
💬 "Update all 'out of stock' products with restock notifications"
💬 "Generate product comparison pages for similar items"
💬 "Create seasonal landing pages with current promotions"
```

### News Website Operations

**Scenario**: Breaking news and content moderation

```text
💬 "Publish breaking news about the tech merger with social media integration"
💬 "Moderate comments on controversial articles and flag inappropriate content"
💬 "Create topic clusters around trending news stories"
💬 "Schedule social media posts for peak engagement times"
```

### Educational Institution Portal

**Scenario**: Course management and student communications

```text
💬 "Create course announcement pages with enrollment forms"
💬 "Update faculty profiles with new publications and achievements"
💬 "Generate student newsletter with upcoming events and deadlines"
💬 "Moderate discussion forums and highlight valuable contributions"
```

### Non-Profit Organization

**Scenario**: Fundraising campaigns and volunteer coordination

```text
💬 "Create donation campaign pages with progress tracking"
💬 "Update volunteer opportunity listings with current needs"
💬 "Generate impact reports showing donation effectiveness"
💬 "Create event registration pages with automated confirmations"
```

## 🚀 Advanced Automation Examples

### Smart Content Workflows

**Automated SEO Optimization**

```text
You: "Optimize all posts from the last month for better SEO performance"
Claude: "I'll analyze and optimize your recent posts...
- Analyzed 15 posts from the last 30 days
- Updated meta descriptions for 12 posts
- Added focus keywords to 8 posts
- Optimized heading structure in 10 posts
- Improved internal linking in 15 posts
- Average SEO score improved from 67% to 89%"
```

**Content Gap Analysis**

```text
You: "Identify content gaps in our blog compared to competitor topics"
Claude: "After analyzing your content and common industry topics...
- Missing topics: 'AI in Healthcare', 'Remote Work Security', 'Green Technology'
- Underperforming categories: 'Tutorials' (only 3 posts vs 15+ needed)
- Recommended: 8 new posts to fill major gaps
- Priority topics based on search volume and competition"
```

### Maintenance Automation

**Site Health Monitoring**

```text
You: "Perform a comprehensive site health check and fix any issues"
Claude: "Running complete site diagnostics...
- ✅ SSL certificate valid (expires: March 15, 2025)
- ⚠️ 3 broken internal links found and flagged
- ✅ All images optimized (average load time: 1.2s)
- ⚠️ 2 plugins need updates
- ✅ Database optimized (reduced size by 15%)
- ✅ Cache performance: 78% hit rate"
```

**User Management Automation**

```text
You: "Clean up user accounts and update permissions for the new team structure"
Claude: "Updating user management...
- Deactivated 5 inactive accounts (no login >6 months)
- Updated 12 user roles to match new org chart
- Created 3 new editor accounts for content team
- Set up role-based content access restrictions
- Configured automated welcome emails for new users"
```

### Performance Optimization

**Intelligent Cache Management**

```text
You: "Analyze site performance and implement optimal caching strategies"
Claude: "Implementing performance optimizations...
- Enabled object caching (40% speed improvement)
- Configured CDN for static assets
- Optimized database queries (reduced load time by 25%)
- Set up page caching with smart invalidation
- Compressed and optimized 47 images
- Site speed improved from 3.2s to 1.8s average load time"
```

## 🎯 Industry-Specific Solutions

### Healthcare Practices

```text
💬 "Create HIPAA-compliant patient information pages with secure forms"
💬 "Update doctor profiles with latest certifications and specializations"
💬 "Generate appointment booking pages with calendar integration"
💬 "Create health education content with medical disclaimers"
```

### Legal Firms

```text
💬 "Create practice area pages with case study examples"
💬 "Update attorney profiles with recent wins and bar admissions"
💬 "Generate client intake forms with confidentiality notices"
💬 "Create legal blog posts with proper citations and disclaimers"
```

### Real Estate Agencies

```text
💬 "Create property listing pages with virtual tour embeds"
💬 "Update agent profiles with recent sales and market statistics"
💬 "Generate neighborhood guide pages with local amenities"
💬 "Create mortgage calculator pages with current rates"
```

### Restaurants & Food Service

```text
💬 "Create menu pages with dietary restriction filters"
💬 "Update chef profiles with signature dishes and cooking philosophy"
💬 "Generate event booking pages for private dining"
💬 "Create food blog posts with recipe cards and nutritional information"
```

📖 **[More Examples](docs/examples/)** | **[Use Case Library](docs/use-cases/)**

## 🛠️ Troubleshooting Guide

### Quick Diagnostics

**Connection Issues**

```bash
# Test WordPress connection
npm run status

# Debug mode with detailed logs
DEBUG=true npm run dev

# Test specific site in multi-site setup
npm run status -- --site="your-site-id"
```

**Authentication Problems**

```bash
# Verify WordPress application password
curl -u username:app_password https://your-site.com/wp-json/wp/v2/users/me

# Test authentication with different methods
npm run test:auth

# Regenerate application password
npm run setup
```

**Performance Issues**

```bash
# Check cache performance
npm run test:cache

# Monitor real-time performance
npm run test:performance

# Clear all caches
rm -rf cache/ && npm run dev
```

### Common Error Solutions

| Error                         | Cause                    | Solution                           |
| ----------------------------- | ------------------------ | ---------------------------------- |
| `401 Unauthorized`            | Invalid credentials      | Regenerate application password    |
| `403 Forbidden`               | Insufficient permissions | Check user role (Editor+ required) |
| `404 Not Found`               | Wrong site URL           | Verify WORDPRESS_SITE_URL          |
| `SSL Certificate Error`       | HTTPS issues             | Add SSL exception or use HTTP      |
| `Connection Timeout`          | Network/firewall         | Check WordPress REST API access    |
| `Tools not showing in Claude` | Config file format       | Validate JSON syntax               |
| `Plugin conflicts`            | WordPress plugins        | Disable conflicting plugins        |
| `Rate limiting`               | Too many requests        | Implement request throttling       |

### WordPress-Specific Issues

**REST API Not Available**

```bash
# Test REST API directly
curl https://your-site.com/wp-json/wp/v2/

# Check if REST API is disabled
grep -r "rest_api" wp-config.php

# Verify permalink structure
wp-admin → Settings → Permalinks → Post name
```

**Application Password Issues**

```text
1. WordPress Admin → Users → Profile
2. Scroll to "Application Passwords"
3. Ensure feature is enabled (WordPress 5.6+)
4. Generate new password if needed
5. Copy password exactly (includes spaces)
```

**Multi-Site Configuration Problems**

```json
// Check mcp-wordpress.config.json format
{
  "sites": [
    {
      "id": "unique-site-id",
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

### Environment-Specific Solutions

**Claude Desktop Integration**

```json
// Verify claude_desktop_config.json format
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

**Docker Deployment Issues**

```bash
# Check container logs
docker logs mcp-wordpress

# Verify environment variables
docker exec mcp-wordpress env | grep WORDPRESS

# Test network connectivity
docker exec mcp-wordpress curl https://your-site.com/wp-json/wp/v2/
```

**NPX Runtime Problems**

```bash
# Clear NPX cache
npx clear-npx-cache

# Use specific version
npx mcp-wordpress@latest

# Install globally instead
npm install -g mcp-wordpress
```

### Getting Help

**Self-Diagnostics**

```bash
# Comprehensive health check
npm run health

# Security validation
npm run security:check

# Performance analysis
npm run test:performance
```

**Debug Information Collection**

```bash
# Generate debug report
DEBUG=true npm run status > debug-report.txt 2>&1

# Include system information
node --version >> debug-report.txt
npm --version >> debug-report.txt
os-info >> debug-report.txt
```

**Community Support**

- 🐛 [Report Issues](https://github.com/docdyhr/mcp-wordpress/issues)
- 💬 [Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)
- 📧 [Security Issues](mailto:security@docdyhr.com)
- 📚 [Documentation](docs/TROUBLESHOOTING.md)

## 🧪 Testing & Status

### Current Test Status ✅

- **Main Test Suite**: 512/512 passed (100%) with Vitest
- **Security Tests**: 40/40 passed (100%)
- **Performance Tests**: 8/8 passed (100%)
- **CI/CD Pipeline**: Fully functional with Vitest integration

### Test Your Installation

```bash
# Check connection status
npm run status

# Run full test suite (Vitest)
npm test

# Run tests with coverage
npm run test:coverage

# Quick validation
npm run test:fast
```

## 🔒 Security Status

### Comprehensive Security Testing

Our security posture is continuously monitored through automated testing and vulnerability scanning:

| **Security Area**          | **Status** | **Tests**     | **Coverage**                                        |
| -------------------------- | ---------- | ------------- | --------------------------------------------------- |
| **XSS Protection**         | ✅ Secure  | 6/6 passing   | Script injection, URL validation, HTML sanitization |
| **SQL Injection**          | ✅ Secure  | 3/3 passing   | Query parameterization, input validation            |
| **Path Traversal**         | ✅ Secure  | 3/3 passing   | File path validation, directory restrictions        |
| **Input Validation**       | ✅ Secure  | 9/9 passing   | Length limits, format validation, sanitization      |
| **Authentication**         | ✅ Secure  | 7/7 passing   | Bypass prevention, token validation                 |
| **Rate Limiting**          | ✅ Secure  | 3/3 passing   | DoS protection, request throttling                  |
| **Information Disclosure** | ✅ Secure  | 2/2 passing   | Error sanitization, sensitive data protection       |
| **Penetration Testing**    | ✅ Secure  | 12/12 passing | Comprehensive attack simulation                     |

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
- **[Publishing Troubleshooting](docs/PUBLISHING-TROUBLESHOOTING.md)** - Fix publishing issues
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

1. **🏆 [Download DXT Extension](https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt)** - Easiest setup
   (2 minutes)
2. **⚡ [Try NPX Method](docs/user-guides/NPX_SETUP.md)** - Power user setup (5 minutes)
3. **📚 [Explore All Tools](docs/api/README.md)** - See what's possible
4. **💬 [Join Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)** - Get help and share ideas

---

## 🔗 Similar Projects

Looking for alternatives or complementary tools? Check out these WordPress MCP implementations:

- **[Automattic WordPress MCP](https://github.com/Automattic/wordpress-mcp)** - Official WordPress MCP server by
  Automattic

---

## 🙏 Acknowledgments

Special thanks to **[Stephan Ferraro](https://github.com/ferraro)** for the upstream project that inspired this
implementation.

---

<div align="center">

**⭐ Found this helpful? [Give us a star on GitHub!](https://github.com/docdyhr/mcp-wordpress) ⭐**

</div>
