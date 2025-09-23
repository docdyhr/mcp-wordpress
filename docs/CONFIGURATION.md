# Configuration Guide

Complete configuration reference for MCP WordPress Server supporting single-site and multi-site deployments.

## 🎯 Configuration Overview

The MCP WordPress Server supports flexible configuration through multiple methods:

| Method                    | Best For                   | Configuration File           |
| ------------------------- | -------------------------- | ---------------------------- |
| **Environment Variables** | Single site, development   | `.env`                       |
| **Multi-Site JSON**       | Multiple sites, production | `mcp-wordpress.config.json`  |
| **Claude Desktop**        | Desktop integration        | `claude_desktop_config.json` |
| **DXT Extension**         | Easy desktop setup         | Built-in UI                  |

## 🌐 Single-Site Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# WordPress Connection (Required)
WORDPRESS_SITE_URL=https://your-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Authentication Method (Optional)
WORDPRESS_AUTH_METHOD=app-password

# Environment Settings (Optional)
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info

# Performance Settings (Optional)
DISABLE_CACHE=false
CACHE_TTL=300
MAX_CACHE_SIZE=1000

# Security Settings (Optional)
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=60000
```

### Environment Variable Reference

#### Required Variables

| Variable                 | Required | Description                    | Example                         |
| ------------------------ | -------- | ------------------------------ | ------------------------------- |
| `WORDPRESS_SITE_URL`     | Yes      | Full WordPress site URL        | `https://blog.example.com`      |
| `WORDPRESS_USERNAME`     | Yes      | WordPress username             | `admin`                         |
| `WORDPRESS_APP_PASSWORD` | Yes      | WordPress application password | `AbCd EfGh IjKl MnOp QrSt UvWx` |

#### Authentication Variables

| Variable                | Default        | Description           | Options                                   |
| ----------------------- | -------------- | --------------------- | ----------------------------------------- |
| `WORDPRESS_AUTH_METHOD` | `app-password` | Authentication method | `app-password`, `jwt`, `basic`, `api-key` |

#### Runtime Variables

| Variable    | Default      | Description          | Options                                    |
| ----------- | ------------ | -------------------- | ------------------------------------------ |
| `NODE_ENV`  | `production` | Runtime environment  | `development`, `production`, `test`, `dxt` |
| `DEBUG`     | `false`      | Enable debug logging | `true`, `false`                            |
| `LOG_LEVEL` | `info`       | Logging verbosity    | `error`, `warn`, `info`, `debug`           |

#### Performance Variables

| Variable         | Default | Description                  | Range           |
| ---------------- | ------- | ---------------------------- | --------------- |
| `DISABLE_CACHE`  | `false` | Disable caching system       | `true`, `false` |
| `CACHE_TTL`      | `300`   | Cache time-to-live (seconds) | `60-3600`       |
| `MAX_CACHE_SIZE` | `1000`  | Maximum cache entries        | `100-10000`     |

## 🏢 Multi-Site Configuration

### Configuration File Structure

Create `mcp-wordpress.config.json` in your project root:

```json
{
  "sites": [
    {
      "id": "main-site",
      "name": "Main WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://main-site.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    },
    {
      "id": "client-blog",
      "name": "Client Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://client-blog.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "WORDPRESS_AUTH_METHOD": "jwt"
      }
    },
    {
      "id": "dev-site",
      "name": "Development Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://dev.example.com",
        "WORDPRESS_USERNAME": "developer",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz",
        "WORDPRESS_AUTH_METHOD": "basic"
      }
    }
  ]
}
```

### Multi-Site Configuration Rules

#### Site Identification

- **`id`**: Unique identifier (alphanumeric, hyphens, underscores only)
- **`name`**: Human-readable name for documentation
- **Maximum sites**: 50 sites per configuration

#### Uniqueness Requirements

All of these must be unique across all sites:

- Site IDs
- Site names
- WordPress site URLs

#### Site-Specific Usage

```bash
# Target specific site with --site parameter
wp_list_posts --site="main-site"
wp_create_post --site="client-blog" --title="New Post"
wp_get_site_settings --site="dev-site"

# If only one site configured, --site parameter is optional
# If multiple sites configured, --site parameter is required
```

### Multi-Site Example Configurations

#### Agency Setup

```json
{
  "sites": [
    {
      "id": "agency-main",
      "name": "Agency Main Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://agency.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    {
      "id": "client-a",
      "name": "Client A Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://clienta.com/blog",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy"
      }
    },
    {
      "id": "client-b",
      "name": "Client B E-commerce",
      "config": {
        "WORDPRESS_SITE_URL": "https://clientb-shop.com",
        "WORDPRESS_USERNAME": "shop_manager",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz"
      }
    }
  ]
}
```

#### Development Workflow

```json
{
  "sites": [
    {
      "id": "production",
      "name": "Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://mysite.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "prod prod prod prod prod prod"
      }
    },
    {
      "id": "staging",
      "name": "Staging Environment",
      "config": {
        "WORDPRESS_SITE_URL": "https://staging.mysite.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "stag stag stag stag stag stag"
      }
    },
    {
      "id": "local",
      "name": "Local Development",
      "config": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "dev",
        "WORDPRESS_APP_PASSWORD": "locl locl locl locl locl locl",
        "WORDPRESS_AUTH_METHOD": "basic"
      }
    }
  ]
}
```

## 🔐 Authentication Configuration

### Application Passwords (Recommended)

**WordPress Setup:**

1. **Enable Application Passwords** (WordPress 5.6+)
2. **Generate Password**: Users → Profile → Application Passwords
3. **Copy Password**: Exact format with spaces

**Configuration:**

```json
{
  "WORDPRESS_AUTH_METHOD": "app-password",
  "WORDPRESS_USERNAME": "your-username",
  "WORDPRESS_APP_PASSWORD": "AbCd EfGh IjKl MnOp QrSt UvWx"
}
```

**Security Benefits:**

- ✅ Revocable without changing main password
- ✅ Scoped permissions
- ✅ Audit trail
- ✅ WordPress native support

### JWT Authentication

**WordPress Setup:**

1. **Install JWT Plugin**: JWT Authentication for WP-API
2. **Configure JWT Secret** in wp-config.php
3. **Get JWT Token** via login endpoint

**Configuration:**

```json
{
  "WORDPRESS_AUTH_METHOD": "jwt",
  "WORDPRESS_USERNAME": "your-username",
  "WORDPRESS_APP_PASSWORD": "your-jwt-token"
}
```

**WordPress JWT Setup:**

```php
// wp-config.php
define('JWT_AUTH_SECRET_KEY', 'your-secret-key');
define('JWT_AUTH_CORS_ENABLE', true);
```

### Basic Authentication

**⚠️ Development Only - Not recommended for production**

**Configuration:**

```json
{
  "WORDPRESS_AUTH_METHOD": "basic",
  "WORDPRESS_USERNAME": "your-username",
  "WORDPRESS_APP_PASSWORD": "your-regular-password"
}
```

### API Key Authentication

**WordPress Setup:**

1. **Install API Key Plugin**
2. **Generate API Key** in WordPress admin
3. **Configure Key Permissions**

**Configuration:**

```json
{
  "WORDPRESS_AUTH_METHOD": "api-key",
  "WORDPRESS_USERNAME": "your-username",
  "WORDPRESS_APP_PASSWORD": "your-api-key"
}
```

## ⚙️ Claude Desktop Configuration

### NPX Method

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "your-app-password",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  }
}
```

### NPM Global Method

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "mcp-wordpress",
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "your-app-password"
      }
    }
  }
}
```

### Multi-Site in Claude Desktop

For multi-site setups, create a configuration file and reference it:

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "cwd": "/path/to/your/config/directory"
    }
  }
}
```

## 🐳 Docker Configuration

### Docker Environment Setup

```bash
# Single site
docker run -d \
  --name mcp-wordpress \
  -e WORDPRESS_SITE_URL=https://your-site.com \
  -e WORDPRESS_USERNAME=your-username \
  -e WORDPRESS_APP_PASSWORD="your app password" \
  docdyhr/mcp-wordpress:latest
```

### Docker Compose

```yaml
version: "3.8"
services:
  mcp-wordpress:
    image: docdyhr/mcp-wordpress:latest
    environment:
      WORDPRESS_SITE_URL: https://your-site.com
      WORDPRESS_USERNAME: your-username
      WORDPRESS_APP_PASSWORD: your app password
      WORDPRESS_AUTH_METHOD: app-password
      DEBUG: "false"
    volumes:
      - ./config:/app/config
    restart: unless-stopped
```

### Multi-Site with Docker

```yaml
version: "3.8"
services:
  mcp-wordpress:
    image: docdyhr/mcp-wordpress:latest
    volumes:
      - ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro
    restart: unless-stopped
```

## 🔧 Advanced Configuration

### Performance Tuning

#### Cache Configuration

```bash
# Optimize for high-traffic sites
CACHE_TTL=600              # 10 minutes
MAX_CACHE_SIZE=5000        # 5000 entries
CACHE_CLEANUP_INTERVAL=300 # 5 minutes

# Optimize for low-memory environments
CACHE_TTL=120              # 2 minutes
MAX_CACHE_SIZE=100         # 100 entries
DISABLE_CACHE=false        # Keep basic caching
```

#### Rate Limiting

```bash
# Conservative limits
RATE_LIMIT_REQUESTS=100    # 100 requests
RATE_LIMIT_WINDOW=60000    # per minute

# Aggressive limits
RATE_LIMIT_REQUESTS=1000   # 1000 requests
RATE_LIMIT_WINDOW=60000    # per minute
```

### Security Hardening

#### Network Security

```bash
# Bind to specific interface (Docker/production)
BIND_ADDRESS=127.0.0.1
PORT=3000

# SSL/TLS Configuration
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
FORCE_HTTPS=true
```

#### Authentication Security

```bash
# Strengthen authentication
AUTH_TIMEOUT=300           # 5 minute auth timeout
MAX_AUTH_ATTEMPTS=3        # Max failed attempts
AUTH_LOCKOUT_DURATION=900  # 15 minute lockout
```

### Monitoring Configuration

#### Logging

```bash
# Development logging
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug

# Production logging
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
LOG_FILE=/var/log/mcp-wordpress.log
```

#### Performance Monitoring

```bash
# Enable performance tracking
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_SAMPLE_RATE=0.1  # 10% sampling
METRICS_ENDPOINT=/metrics

# Disable in resource-constrained environments
ENABLE_PERFORMANCE_MONITORING=false
```

## ✅ Configuration Validation

### Validation Commands

```bash
# Validate current configuration
npm run config:validate

# Test specific site (multi-site)
npm run config:test --site="site-id"

# Validate and show configuration
npm run config:show
```

### Common Validation Errors

#### 1. Invalid URL Format

```bash
# ❌ Common mistakes
WORDPRESS_SITE_URL=mysite.com           # Missing protocol
WORDPRESS_SITE_URL=https://mysite.com/  # Trailing slash
WORDPRESS_SITE_URL=http://localhost     # Missing port for local

# ✅ Correct formats
WORDPRESS_SITE_URL=https://mysite.com
WORDPRESS_SITE_URL=http://localhost:8080
WORDPRESS_SITE_URL=https://blog.mysite.com
```

#### 2. Invalid Authentication Method

```bash
# ❌ Invalid
WORDPRESS_AUTH_METHOD=password          # Not supported

# ✅ Valid options
WORDPRESS_AUTH_METHOD=app-password       # Recommended
WORDPRESS_AUTH_METHOD=jwt               # With plugin
WORDPRESS_AUTH_METHOD=basic             # Development only
WORDPRESS_AUTH_METHOD=api-key           # With plugin
```

#### 3. Multi-Site Configuration Errors

```bash
# ❌ Duplicate site IDs
{"id": "site1", ...}
{"id": "site1", ...}  # Error: duplicate ID

# ❌ Invalid site ID characters
{"id": "site 1", ...}      # Spaces not allowed
{"id": "site@1", ...}      # Special chars not allowed

# ✅ Valid site IDs
{"id": "site-1", ...}      # Hyphens OK
{"id": "site_1", ...}      # Underscores OK
{"id": "site1", ...}       # Alphanumeric OK
```

## 🔄 Configuration Migration

### From Single-Site to Multi-Site

1. **Backup Current Configuration**

   ```bash
   cp .env .env.backup
   ```

2. **Create Multi-Site Config**

   ```json
   {
     "sites": [
       {
         "id": "default",
         "name": "Main Site",
         "config": {
           "WORDPRESS_SITE_URL": "your-current-url",
           "WORDPRESS_USERNAME": "your-current-username",
           "WORDPRESS_APP_PASSWORD": "your-current-password"
         }
       }
     ]
   }
   ```

3. **Update Claude Desktop Config**
   ```json
   {
     "mcpServers": {
       "mcp-wordpress": {
         "command": "npx",
         "args": ["-y", "mcp-wordpress"],
         "cwd": "/path/to/config/directory"
       }
     }
   }
   ```

### From Multi-Site to Single-Site

1. **Choose Primary Site** from multi-site config
2. **Extract Configuration**

   ```bash
   # From mcp-wordpress.config.json site
   WORDPRESS_SITE_URL=https://primary-site.com
   WORDPRESS_USERNAME=primary-username
   WORDPRESS_APP_PASSWORD=primary-password
   ```

3. **Update Environment** and remove config file

## 🛡️ Security Best Practices

### Credential Management

1. **Never commit credentials** to version control

   ```bash
   # Add to .gitignore
   .env
   mcp-wordpress.config.json
   claude_desktop_config.json
   ```

2. **Use Application Passwords** instead of main passwords
3. **Rotate credentials regularly**
4. **Use minimal permissions** for WordPress users
5. **Monitor authentication logs**

### Configuration Security

1. **File Permissions**

   ```bash
   # Secure configuration files
   chmod 600 .env
   chmod 600 mcp-wordpress.config.json
   ```

2. **Environment Isolation**

   ```bash
   # Separate configs for different environments
   .env.development
   .env.staging
   .env.production
   ```

3. **Secrets Management**
   ```bash
   # Use secrets management for production
   # Examples: AWS Secrets Manager, HashiCorp Vault
   ```

## 📚 Configuration Examples

### Example Templates

Complete configuration examples are available in:

- **[Single-Site Template](../examples/basic-setup/.env.example)**
- **[Multi-Site Template](../examples/multi-site/mcp-wordpress.config.json.example)**
- **[Docker Template](../examples/docker/docker-compose.yml)**
- **[Claude Desktop Template](../examples/claude-desktop/config.json)**

### Production Configuration

```bash
# Production best practices
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
WORDPRESS_AUTH_METHOD=app-password
DISABLE_CACHE=false
CACHE_TTL=600
RATE_LIMIT_REQUESTS=1000
```

### Development Configuration

```bash
# Development best practices
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
WORDPRESS_AUTH_METHOD=app-password
DISABLE_CACHE=false
CACHE_TTL=60
```

---

**Need help with configuration?** Check the [Troubleshooting Guide](TROUBLESHOOTING.md) or
[open an issue](https://github.com/docdyhr/mcp-wordpress/issues/new) for assistance.
