# Single Site Configuration Examples

This guide provides complete configuration examples for managing a single WordPress site with the MCP WordPress server.

## Basic Single Site Setup

### Environment Variables (.env)

```bash
# WordPress Site Configuration
WORDPRESS_SITE_URL=https://myblog.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password

# Optional Performance Settings
CACHE_ENABLED=true
CACHE_TTL=300
DEBUG=false
```

### Claude Desktop Configuration

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

## Authentication Method Examples

### Application Password (Recommended)

**Step 1: Generate Application Password**

1. WordPress Admin → Users → Your Profile
2. Scroll to "Application Passwords"
3. Enter name: "MCP WordPress Server"
4. Click "Add New Application Password"
5. Copy the generated password (includes spaces)

**Step 2: Configuration**

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://yoursite.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "abcd efgh ijkl mnop qrst uvwx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  }
}
```

### JWT Authentication

**Prerequisites**: Install JWT Authentication plugin

- Plugin: "JWT Authentication for WP-API"

**WordPress Configuration (wp-config.php)**

```php
define('JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
define('JWT_AUTH_CORS_ENABLE', true);
```

**MCP Configuration**

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://yoursite.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_PASSWORD": "your-password",
        "WORDPRESS_AUTH_METHOD": "jwt"
      }
    }
  }
}
```

### Basic Authentication (Development Only)

**⚠️ Warning**: Only use for local development - not secure for production!

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_PASSWORD": "admin",
        "WORDPRESS_AUTH_METHOD": "basic"
      }
    }
  }
}
```

## Performance-Optimized Configuration

### High-Performance Setup

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://yoursite.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "600",
        "CACHE_MAX_ITEMS": "1000",
        "RATE_LIMIT_ENABLED": "true",
        "PERFORMANCE_MONITORING": "true"
      }
    }
  }
}
```

### Memory-Constrained Setup

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://yoursite.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "300",
        "CACHE_MAX_ITEMS": "200",
        "CACHE_MAX_MEMORY_MB": "50"
      }
    }
  }
}
```

## Debugging Configuration

### Development Debug Mode

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://yoursite.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "DEBUG": "true",
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Security Debug Mode

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://yoursite.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "DEBUG": "security",
        "SECURITY_MONITORING": "true",
        "AUTH_DEBUG": "true"
      }
    }
  }
}
```

## Use Case Specific Configurations

### Content Creator Setup

**Focus**: Post management, media uploads, SEO optimization

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://myblog.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "CACHE_ENABLED": "true",
        "MEDIA_UPLOAD_TIMEOUT": "60000",
        "PERFORMANCE_MONITORING": "true"
      }
    }
  }
}
```

### Site Administrator Setup

**Focus**: User management, settings, security monitoring

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://company-website.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "SECURITY_MONITORING": "true",
        "RATE_LIMIT_ENABLED": "true",
        "CACHE_ENABLED": "true",
        "DEBUG": "false"
      }
    }
  }
}
```

### Developer Setup

**Focus**: API testing, development features, detailed logging

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "dev-user",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "DEBUG": "true",
        "NODE_ENV": "development",
        "CACHE_ENABLED": "false",
        "LOG_LEVEL": "debug",
        "API_TIMEOUT": "30000"
      }
    }
  }
}
```

## Local Development with Docker

### Docker Compose WordPress Setup

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

### Corresponding MCP Configuration

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "your-generated-password",
        "DEBUG": "true",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Testing Your Configuration

### Quick Connection Test

```bash
# Test if the configuration works
npx mcp-wordpress --help

# Test WordPress connection
curl -u username:password http://localhost:8080/wp-json/wp/v2/users/me
```

### Claude Desktop Test

1. Save your configuration to Claude Desktop config file
2. Restart Claude Desktop
3. Open a new conversation
4. Type: "Test my WordPress connection"
5. Expected response: "✅ Authentication successful! Connected to: [Your Site Name]"

## Troubleshooting Common Issues

### Configuration File Location

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json` **Windows**:
`%APPDATA%\Claude\claude_desktop_config.json` **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Common Fixes

1. **Tools not appearing**: Restart Claude Desktop after configuration changes
2. **Authentication errors**: Regenerate application password
3. **Connection timeouts**: Check `WORDPRESS_SITE_URL` format
4. **Permission errors**: Ensure user has appropriate WordPress role

### Validation Commands

```bash
# Validate JSON syntax
cat claude_desktop_config.json | jq .

# Test WordPress REST API
curl https://yoursite.com/wp-json/wp/v2/

# Test authentication
curl -u username:password https://yoursite.com/wp-json/wp/v2/users/me
```
