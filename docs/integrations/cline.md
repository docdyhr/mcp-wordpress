# Cline Integration Guide

**Complete guide to integrating WordPress MCP Server with Cline AI assistant**

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Advanced Workflows](#advanced-workflows)
- [Troubleshooting](#troubleshooting)

## Overview

[Cline](https://github.com/cline/cline) is a powerful VS Code extension that brings AI assistance directly to your
editor. With MCP server support, Cline can interact with your WordPress sites through natural language commands.

### Benefits

- **Natural Language Interface** - Control WordPress through conversational commands
- **Integrated Development** - WordPress management without leaving VS Code
- **Automation** - Streamline content creation and site management workflows
- **Multi-Site Support** - Manage multiple WordPress sites from one interface

## Installation

### Step 1: Install Cline Extension

**Via VS Code Marketplace:**

```bash
code --install-extension cline.cline
```

**Manual Installation:**

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Cline"
4. Click "Install"

### Step 2: Install WordPress MCP Server

**Global Installation:**

```bash
npm install -g mcp-wordpress
```

**Or use NPX (recommended):**

```bash
# NPX will automatically download and run the latest version
npx mcp-wordpress --version
```

### Step 3: Verify Installation

```bash
# Test MCP server
npx mcp-wordpress wp_test_auth

# Check Cline extension
code --list-extensions | grep cline
```

## Configuration

### Basic Configuration

1. **Open Cline Settings**

   - Open Command Palette (Ctrl+Shift+P)
   - Type "Cline: Open Settings"
   - Or navigate to File > Preferences > Settings > Extensions > Cline

2. **Add MCP Server Configuration**

   In Cline settings, add:

   ```json
   {
     "cline.mcpServers": {
       "wordpress": {
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

### Multi-Site Configuration

For managing multiple WordPress sites:

```json
{
  "cline.mcpServers": {
    "wordpress-main": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://main-site.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx-xxxx-xxxx-xxxx"
      }
    },
    "wordpress-blog": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://blog.company.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy-yyyy-yyyy-yyyy"
      }
    },
    "wordpress-store": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://store.company.com",
        "WORDPRESS_USERNAME": "shop-manager",
        "WORDPRESS_APP_PASSWORD": "zzzz-zzzz-zzzz-zzzz"
      }
    }
  }
}
```

### Advanced Configuration

**Performance Optimization:**

```json
{
  "cline.mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["./node_modules/mcp-wordpress/dist/index.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "your-app-password",
        "MCP_CACHE_ENABLED": "true",
        "MCP_CACHE_TTL": "300",
        "MCP_REQUEST_TIMEOUT": "30000",
        "DEBUG": "mcp-wordpress:*"
      },
      "timeout": 30000
    }
  }
}
```

## Usage Examples

### Basic WordPress Operations

**Test Connection:**

```text
You: "Test my WordPress connection"
Cline: "I'll test your WordPress connection using the MCP server..."
Result: ✅ Authentication successful! Connected to: Your Site Name
```

**List Recent Posts:**

```text
You: "Show me my recent WordPress posts"
Cline: "Let me fetch your recent posts..."
Result: 📊 Posts Summary: 15 total posts
        📝 Status Breakdown: publish: 12, draft: 3
        🌐 Source: https://your-site.com
```

**Create New Post:**

```text
You: "Create a new WordPress post titled 'AI in Web Development' with content about modern AI tools"
Cline: "I'll create a new post about AI in web development..."
Result: ✅ Post "AI in Web Development" created successfully (ID: 123)
        🔗 Edit: https://your-site.com/wp-admin/post.php?post=123&action=edit
```

### Content Management

**Search Content:**

```text
You: "Search for all posts containing 'tutorial' in my WordPress site"
Cline: "Searching for posts containing 'tutorial'..."
Result: Found 8 results for "tutorial":
        - [post] Complete WordPress Tutorial
        - [post] CSS Grid Tutorial
        - [page] Tutorial Archive
```

**Update Existing Post:**

```text
You: "Update post ID 123 to change its status to published"
Cline: "I'll update the post status to published..."
Result: ✅ Post 123 updated successfully
        Status changed from draft to publish
```

**Manage Media:**

```text
You: "Upload the image 'hero-banner.jpg' from my desktop to WordPress"
Cline: "I'll upload the image to your WordPress media library..."
Result: ✅ Media uploaded successfully (ID: 456)
        📎 File: hero-banner.jpg
        🔗 URL: https://your-site.com/wp-content/uploads/2024/01/hero-banner.jpg
```

### Site Management

**Check Site Health:**

```text
You: "Check my WordPress site health and performance"
Cline: "I'll check your site health and performance metrics..."
Result: 📊 Site Health Report:
        - Cache hit rate: 67%
        - Average response time: 245ms
        - Total posts: 150
        - Total users: 12
```

**User Management:**

```text
You: "List all users with admin role on my WordPress site"
Cline: "I'll list all administrator users..."
Result: 👥 Administrator Users:
        - John Doe (john@example.com) - Last login: 2024-01-14
        - Jane Smith (jane@example.com) - Last login: 2024-01-15
```

**Backup Content:**

```text
You: "Export all my WordPress posts as a backup"
Cline: "I'll export your WordPress posts..."
Result: 📦 Backup created: wordpress-posts-2024-01-15.json
        📊 Exported: 150 posts, 25 pages, 8 media items
```

### Multi-Site Management

**Site-Specific Operations:**

```text
You: "List posts from my blog site and store site"
Cline: "I'll list posts from both sites..."
Result: 📝 Blog Site (blog.company.com): 45 posts
        📝 Store Site (store.company.com): 23 posts
```

**Cross-Site Content:**

```text
You: "Create the same post on both my main site and blog site"
Cline: "I'll create the post on both sites..."
Result: ✅ Post created on main-site (ID: 123)
        ✅ Post created on blog-site (ID: 456)
```

## Advanced Workflows

### Content Creation Workflow

**AI-Powered Blog Post Creation:**

```text
You: "Create a comprehensive blog post about 'WordPress Security Best Practices' with:
     - SEO-optimized title
     - Meta description
     - 1500+ words
     - Proper heading structure
     - Call-to-action"

Cline: "I'll create a comprehensive WordPress security blog post..."
      [Generates content with AI]
      [Uses wp_create_post with optimized content]
      [Adds meta description and SEO elements]
      [Sets proper categories and tags]
```

**Content Series Management:**

```text
You: "Create a 5-part tutorial series about 'WordPress Development' with:
     - Sequential numbering
     - Cross-references between posts
     - Same category and tags
     - Published on schedule"

Cline: "I'll create a 5-part tutorial series..."
      [Creates multiple posts with wp_create_post]
      [Sets up proper taxonomy structure]
      [Schedules posts for publication]
```

### Site Maintenance Workflow

**Regular Maintenance Tasks:**

```text
You: "Perform my weekly WordPress maintenance routine:
     - Check site performance
     - List recent comments for moderation
     - Clear cache
     - Generate performance report"

Cline: "I'll perform your weekly maintenance routine..."
      [Uses wp_performance_stats]
      [Uses wp_list_comments with pending status]
      [Uses wp_cache_clear]
      [Generates comprehensive report]
```

**Security Audit Workflow:**

```text
You: "Perform a security audit of my WordPress site:
     - Check user permissions
     - Review recent login activity
     - Validate authentication settings
     - Generate security report"

Cline: "I'll perform a security audit..."
      [Uses wp_list_users with role analysis]
      [Uses wp_get_auth_status]
      [Reviews user capabilities]
      [Generates security recommendations]
```

### Development Integration

**Theme Development Support:**

```text
You: "Help me test my new WordPress theme:
     - Create sample posts for each post format
     - Test with different content lengths
     - Verify category and tag display"

Cline: "I'll help test your theme with sample content..."
      [Creates posts with various formats]
      [Tests different content scenarios]
      [Verifies taxonomy display]
```

**Plugin Testing:**

```text
You: "Test my WordPress plugin functionality:
     - Create test posts
     - Test plugin features
     - Verify data integrity"

Cline: "I'll test your plugin functionality..."
      [Creates test content]
      [Executes plugin-specific operations]
      [Validates results]
```

## Troubleshooting

### Common Issues

**1. MCP Server Not Responding**

```text
Error: "MCP server 'wordpress' is not responding"

Solution:
1. Check if MCP server is installed: npx mcp-wordpress --version
2. Verify credentials in configuration
3. Test connection manually: npx mcp-wordpress wp_test_auth
4. Check VS Code output panel for errors
```

**2. Authentication Failures**

```text
Error: "Authentication failed: 401 Unauthorized"

Solution:
1. Verify WordPress application password format (no quotes)
2. Check username spelling and case sensitivity
3. Ensure Application Passwords are enabled in WordPress
4. Test with curl:
   curl -u username:app-password https://your-site.com/wp-json/wp/v2/users/me
```

**3. Timeout Issues**

```text
Error: "Request timeout after 30 seconds"

Solution:
1. Increase timeout in configuration:
   "timeout": 60000
2. Check WordPress site performance
3. Verify network connectivity
4. Enable debug mode for detailed logs
```

### Debug Mode

**Enable Debug Logging:**

```json
{
  "cline.mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "your-app-password",
        "DEBUG": "mcp-wordpress:*"
      }
    }
  }
}
```

**View Debug Output:**

1. Open VS Code Output panel (View > Output)
2. Select "Cline" from the dropdown
3. Look for MCP server logs and errors

### Performance Optimization

**Optimize MCP Server Performance:**

```json
{
  "cline.mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["./node_modules/mcp-wordpress/dist/index.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "your-app-password",
        "MCP_CACHE_ENABLED": "true",
        "MCP_CACHE_TTL": "300",
        "MCP_REQUEST_TIMEOUT": "30000",
        "MCP_MAX_CONNECTIONS": "10"
      }
    }
  }
}
```

**Cline Configuration Optimization:**

```json
{
  "cline.autoStart": false,
  "cline.maxConcurrentRequests": 3,
  "cline.requestTimeout": 30000,
  "cline.enableCaching": true
}
```

## Best Practices

### Security

- Never commit credentials to version control
- Use environment variables for sensitive data
- Regularly rotate WordPress application passwords
- Enable HTTPS for all WordPress connections
- Use minimal required user permissions

### Performance

- Enable caching for frequently accessed data
- Set appropriate request timeouts
- Use connection pooling for multiple requests
- Monitor resource usage
- Optimize WordPress site performance

### Workflow

- Use descriptive command language
- Be specific about site targets in multi-site setups
- Regularly test integrations
- Document custom workflows
- Keep extensions updated

### Collaboration

- Share workspace configuration with team
- Document custom MCP server configurations
- Use consistent naming conventions
- Maintain integration documentation

## Resources

### Documentation

- [Cline Documentation](https://github.com/cline/cline/wiki)
- [MCP Protocol Specification](https://github.com/modelcontextprotocol/protocol)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)

### Community

- [WordPress MCP Server Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)
- [Cline Community](https://github.com/cline/cline/discussions)
- [VS Code Community](https://github.com/microsoft/vscode/discussions)

### Support

- **GitHub Issues**: [Report problems](https://github.com/docdyhr/mcp-wordpress/issues)
- **Community Forum**: [Get help](https://github.com/docdyhr/mcp-wordpress/discussions)
- **Email Support**: <support@your-domain.com>

---

_This guide is regularly updated. Last updated: 2024-01-15_

_For Cline-specific questions, visit the [Cline GitHub repository](https://github.com/cline/cline)_
