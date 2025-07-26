# VS Code Integration Guide

**Complete guide to integrating WordPress MCP Server with VS Code and related tools**

## Table of Contents

- [Cline Integration](#cline-integration)
- [GitHub Copilot Integration](#github-copilot-integration)
- [Continue Integration](#continue-integration)
- [VS Code Extensions](#vs-code-extensions)
- [Troubleshooting](#troubleshooting)

## Cline Integration

### Overview

[Cline](https://github.com/cline/cline) is a VS Code extension that brings AI assistance directly to your editor. It
supports MCP servers for extended functionality.

### Installation

1. **Install Cline Extension**

   ```bash
   # Install from VS Code Marketplace
   code --install-extension cline.cline
   ```

2. **Configure MCP Server**

   Open Cline settings and add MCP server configuration:

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

### Usage Examples

**Content Creation Workflow:**

```text
🧑‍💻 You: "Create a new WordPress post about VS Code productivity tips"
🤖 Cline: "I'll create a new post for you using the WordPress MCP server..."
         [Uses wp_create_post with generated content]
```

**Site Management:**

```text
🧑‍💻 You: "Check my WordPress site stats and list recent posts"
🤖 Cline: "Let me check your site statistics and recent posts..."
         [Uses wp_get_site_settings and wp_list_posts]
```

**Media Management:**

```text
🧑‍💻 You: "Upload this image to WordPress and create a gallery post"
🤖 Cline: "I'll upload the image and create a gallery post..."
         [Uses wp_upload_media and wp_create_post]
```

### Advanced Configuration

**Multi-Site Setup:**

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
        "WORDPRESS_SITE_URL": "https://blog.example.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy-yyyy-yyyy-yyyy"
      }
    }
  }
}
```

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
        "MCP_PERFORMANCE_MODE": "true"
      }
    }
  }
}
```

## GitHub Copilot Integration

### Copilot Overview

GitHub Copilot can work with MCP servers through workspace configuration and custom prompts.

### Setup

1. **Install GitHub Copilot Extension**

   ```bash
   code --install-extension github.copilot
   ```

2. **Create Workspace Configuration**

   Create `.vscode/settings.json` in your project:

   ```json
   {
     "copilot.workspace.mcpServers": {
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

3. **Configure Custom Prompts**

   Create `.vscode/copilot-prompts.json`:

   ```json
   {
     "wordpress-post": {
       "description": "Create WordPress post with MCP",
       "prompt": "Use the WordPress MCP server to create a new post with the following details: {{title}}, {{content}}, {{status}}"
     },
     "wordpress-site-check": {
       "description": "Check WordPress site status",
       "prompt": "Use the WordPress MCP server to check site status, list recent posts, and provide a summary"
     }
   }
   ```

### Usage Patterns

**Code Generation with WordPress Context:**

```typescript
// Copilot will suggest WordPress-aware code
const createPost = async (title: string, content: string) => {
  // @copilot: Use WordPress MCP server to create post
  const result = await mcpClient.call("wp_create_post", {
    title,
    content,
    status: "publish",
  });
  return result;
};
```

**Content Management Scripts:**

```typescript
// @copilot: Generate WordPress content management script
import { WordPressMCP } from "mcp-wordpress";

const managePosts = async () => {
  // Copilot will suggest WordPress-specific operations
  const posts = await wordpress.listPosts({ status: "draft" });
  // Process draft posts...
};
```

## Continue Integration

### Continue Overview

[Continue](https://continue.dev/) is an open-source VS Code extension for AI-powered coding assistance.

### Installation & Setup

1. **Install Continue Extension**

   ```bash
   code --install-extension continue.continue
   ```

2. **Configure MCP Server**

   Edit `~/.continue/config.json`:

   ```json
   {
     "mcpServers": {
       "wordpress": {
         "command": "npx",
         "args": ["-y", "mcp-wordpress"],
         "env": {
           "WORDPRESS_SITE_URL": "https://your-site.com",
           "WORDPRESS_USERNAME": "your-username",
           "WORDPRESS_APP_PASSWORD": "your-app-password"
         },
         "timeout": 30000
       }
     },
     "contextProviders": [
       {
         "name": "wordpress",
         "params": {
           "serverName": "wordpress"
         }
       }
     ]
   }
   ```

### Continue Usage Examples

**WordPress Development Workflow:**

```text
/wordpress What are my recent posts?
/wordpress Create a new post about "AI in web development"
/wordpress Check my site performance metrics
/wordpress List all users with editor role
```

**Content Creation:**

```text
/wordpress Generate a blog post about TypeScript best practices and publish it as a draft
/wordpress Upload an image from my desktop and create a photo gallery post
/wordpress Search for all posts containing "tutorial" and provide a summary
```

**Site Management:**

```text
/wordpress Check my WordPress site health and security status
/wordpress List all plugins and their versions
/wordpress Create a backup of my site content
/wordpress Optimize my site performance settings
```

## VS Code Extensions

### Recommended Extensions

**Essential Extensions:**

- **WordPress Snippets** - Code snippets for WordPress development
- **PHP Intelephense** - PHP language support
- **REST Client** - Test WordPress REST API endpoints
- **GitLens** - Git integration for version control

**MCP-Compatible Extensions:**

- **Cline** - AI assistant with MCP support
- **Continue** - Open-source AI coding assistant
- **GitHub Copilot** - AI-powered code completion
- **Tabnine** - AI code completion

### Configuration

**Create workspace settings (`.vscode/settings.json`):**

```json
{
  "php.validate.executablePath": "/usr/bin/php",
  "wordpress.path": "/path/to/wordpress",
  "rest-client.environmentVariables": {
    "wordpress": {
      "baseUrl": "https://your-site.com",
      "username": "your-username",
      "password": "your-app-password"
    }
  },
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

**Create tasks (`.vscode/tasks.json`):**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "WordPress: Test Connection",
      "type": "shell",
      "command": "npx",
      "args": ["mcp-wordpress", "test-auth"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "WordPress: List Recent Posts",
      "type": "shell",
      "command": "npx",
      "args": ["mcp-wordpress", "list-posts", "--per_page=10"],
      "group": "build"
    }
  ]
}
```

## Troubleshooting

### Common Issues

**1. MCP Server Not Starting**

```bash
# Check if MCP server is accessible
npx mcp-wordpress --version

# Test connection manually
npx mcp-wordpress wp_test_auth
```

**2. Authentication Failures**

```bash
# Verify credentials
curl -u username:app-password https://your-site.com/wp-json/wp/v2/users/me

# Check application password format
# ✅ Correct: xxxx-xxxx-xxxx-xxxx
# ❌ Wrong: "xxxx-xxxx-xxxx-xxxx" (no quotes)
```

**3. Extension Configuration Issues**

```json
// Check extension settings
{
  "cline.debug": true,
  "cline.logLevel": "debug",
  "continue.telemetryEnabled": false
}
```

### Debug Mode

**Enable debug logging:**

```bash
# Set environment variable
export DEBUG=mcp-wordpress:*

# Run with debug output
npx mcp-wordpress wp_test_auth
```

**VS Code debugging:**

```json
{
  "launch": {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Debug MCP WordPress",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/node_modules/mcp-wordpress/dist/index.js",
        "env": {
          "DEBUG": "mcp-wordpress:*",
          "WORDPRESS_SITE_URL": "https://your-site.com",
          "WORDPRESS_USERNAME": "your-username",
          "WORDPRESS_APP_PASSWORD": "your-app-password"
        }
      }
    ]
  }
}
```

### Performance Optimization

**Optimize MCP server performance:**

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
        "MCP_CACHE_TTL": "300",
        "MCP_REQUEST_TIMEOUT": "30000",
        "MCP_MAX_CONNECTIONS": "10"
      }
    }
  }
}
```

**Reduce extension overhead:**

```json
{
  "cline.autoStart": false,
  "cline.maxConcurrentRequests": 3,
  "continue.maxConcurrentRequests": 2
}
```

## Best Practices

### Security

- Never commit credentials to version control
- Use environment variables for sensitive data
- Regularly rotate WordPress application passwords
- Enable HTTPS for all WordPress connections

### Performance

- Use caching for frequently accessed data
- Implement connection pooling
- Set appropriate timeouts
- Monitor resource usage

### Development Workflow

- Use version control for configuration files
- Test integrations in development environment
- Document custom prompts and workflows
- Keep extensions updated

### Collaboration

- Share workspace configuration with team
- Document custom MCP server configurations
- Use consistent naming conventions
- Maintain integration documentation

---

## Resources

### Documentation

- [Cline Documentation](https://github.com/cline/cline/wiki)
- [Continue Documentation](https://continue.dev/docs)
- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [VS Code Extension API](https://code.visualstudio.com/api)

### Community

- [WordPress MCP Server Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)
- [VS Code Community](https://github.com/microsoft/vscode/discussions)
- [MCP Protocol Discussions](https://github.com/modelcontextprotocol/protocol/discussions)

### Support

- GitHub Issues: [Report integration problems](https://github.com/docdyhr/mcp-wordpress/issues)
- Email Support: <support@example.com>
- Community Forum: [WordPress MCP Community](https://community.example.com)

---

_This guide is regularly updated. Last updated: 2024-01-15_

_For VS Code integration questions, visit our
[GitHub Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)_
