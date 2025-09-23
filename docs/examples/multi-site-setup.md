# Multi-Site Configuration Examples

This guide provides comprehensive examples for managing multiple WordPress sites with a single MCP WordPress server
instance.

## Basic Multi-Site Configuration

### Configuration File Structure

Create `mcp-wordpress.config.json` in your project root:

```json
{
  "sites": [
    {
      "id": "main-site",
      "name": "Main Company Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://company.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    },
    {
      "id": "blog",
      "name": "Company Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog.company.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  ]
}
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"]
    }
  }
}
```

## Agency Configuration Examples

### Digital Marketing Agency Setup

**Scenario**: Managing 10+ client websites with different access levels

```json
{
  "sites": [
    {
      "id": "agency-main",
      "name": "Agency Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://digitalagency.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "CACHE_ENABLED": "true",
        "PERFORMANCE_MONITORING": "true"
      }
    },
    {
      "id": "client-restaurant",
      "name": "Restaurant Client",
      "config": {
        "WORDPRESS_SITE_URL": "https://bestrestaurant.com",
        "WORDPRESS_USERNAME": "content-manager",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "CACHE_TTL": "300"
      }
    },
    {
      "id": "client-ecommerce",
      "name": "E-commerce Client",
      "config": {
        "WORDPRESS_SITE_URL": "https://onlinestore.com",
        "WORDPRESS_USERNAME": "shop-manager",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz",
        "RATE_LIMIT_ENABLED": "true"
      }
    },
    {
      "id": "client-law-firm",
      "name": "Law Firm Client",
      "config": {
        "WORDPRESS_SITE_URL": "https://lawfirm.com",
        "WORDPRESS_USERNAME": "legal-editor",
        "WORDPRESS_APP_PASSWORD": "aaaa aaaa aaaa aaaa aaaa aaaa",
        "SECURITY_MONITORING": "true"
      }
    },
    {
      "id": "client-healthcare",
      "name": "Healthcare Practice",
      "config": {
        "WORDPRESS_SITE_URL": "https://medicalpractice.com",
        "WORDPRESS_USERNAME": "medical-admin",
        "WORDPRESS_APP_PASSWORD": "bbbb bbbb bbbb bbbb bbbb bbbb",
        "CACHE_ENABLED": "true",
        "SECURITY_MONITORING": "true"
      }
    }
  ]
}
```

### Freelancer Portfolio Setup

**Scenario**: Managing personal portfolio plus client projects

```json
{
  "sites": [
    {
      "id": "portfolio",
      "name": "Personal Portfolio",
      "config": {
        "WORDPRESS_SITE_URL": "https://johndeveloper.com",
        "WORDPRESS_USERNAME": "john",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "DEBUG": "true",
        "PERFORMANCE_MONITORING": "true"
      }
    },
    {
      "id": "client-startup",
      "name": "Startup Client",
      "config": {
        "WORDPRESS_SITE_URL": "https://innovativestartup.com",
        "WORDPRESS_USERNAME": "startup-editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy"
      }
    },
    {
      "id": "client-nonprofit",
      "name": "Non-Profit Client",
      "config": {
        "WORDPRESS_SITE_URL": "https://helpingothers.org",
        "WORDPRESS_USERNAME": "volunteer-coordinator",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz",
        "CACHE_ENABLED": "true"
      }
    }
  ]
}
```

## Development Environment Setup

### Local Development with Multiple Sites

```json
{
  "sites": [
    {
      "id": "local-main",
      "name": "Local Development Site",
      "config": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "local-dev-password",
        "DEBUG": "true",
        "NODE_ENV": "development"
      }
    },
    {
      "id": "staging",
      "name": "Staging Environment",
      "config": {
        "WORDPRESS_SITE_URL": "https://staging.mysite.com",
        "WORDPRESS_USERNAME": "staging-admin",
        "WORDPRESS_APP_PASSWORD": "staging-password",
        "CACHE_ENABLED": "false",
        "DEBUG": "true"
      }
    },
    {
      "id": "production",
      "name": "Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://mysite.com",
        "WORDPRESS_USERNAME": "prod-admin",
        "WORDPRESS_APP_PASSWORD": "secure-prod-password",
        "CACHE_ENABLED": "true",
        "SECURITY_MONITORING": "true",
        "DEBUG": "false"
      }
    }
  ]
}
```

## Authentication Method Combinations

### Mixed Authentication Methods

```json
{
  "sites": [
    {
      "id": "modern-site",
      "name": "Modern WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://modern.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    },
    {
      "id": "jwt-site",
      "name": "JWT Enabled Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://jwtsite.com",
        "WORDPRESS_USERNAME": "api-user",
        "WORDPRESS_PASSWORD": "secure-password",
        "WORDPRESS_AUTH_METHOD": "jwt"
      }
    },
    {
      "id": "legacy-site",
      "name": "Legacy Site (Basic Auth)",
      "config": {
        "WORDPRESS_SITE_URL": "https://legacy.com",
        "WORDPRESS_USERNAME": "legacy-admin",
        "WORDPRESS_PASSWORD": "legacy-password",
        "WORDPRESS_AUTH_METHOD": "basic"
      }
    }
  ]
}
```

## Performance-Optimized Multi-Site

### High-Traffic Sites Configuration

```json
{
  "sites": [
    {
      "id": "high-traffic-news",
      "name": "News Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://newssite.com",
        "WORDPRESS_USERNAME": "news-editor",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "600",
        "CACHE_MAX_ITEMS": "2000",
        "RATE_LIMIT_ENABLED": "true",
        "PERFORMANCE_MONITORING": "true"
      }
    },
    {
      "id": "ecommerce-store",
      "name": "E-commerce Store",
      "config": {
        "WORDPRESS_SITE_URL": "https://store.com",
        "WORDPRESS_USERNAME": "store-manager",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "300",
        "RATE_LIMIT_ENABLED": "true",
        "API_TIMEOUT": "15000"
      }
    },
    {
      "id": "corporate-site",
      "name": "Corporate Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://corporation.com",
        "WORDPRESS_USERNAME": "corporate-admin",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "900",
        "SECURITY_MONITORING": "true"
      }
    }
  ]
}
```

### Memory-Efficient Configuration

```json
{
  "sites": [
    {
      "id": "small-blog-1",
      "name": "Personal Blog 1",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog1.com",
        "WORDPRESS_USERNAME": "blogger",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "CACHE_ENABLED": "true",
        "CACHE_MAX_ITEMS": "100",
        "CACHE_MAX_MEMORY_MB": "20"
      }
    },
    {
      "id": "small-blog-2",
      "name": "Personal Blog 2",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog2.com",
        "WORDPRESS_USERNAME": "blogger",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "CACHE_ENABLED": "true",
        "CACHE_MAX_ITEMS": "100",
        "CACHE_MAX_MEMORY_MB": "20"
      }
    }
  ]
}
```

## Industry-Specific Configurations

### Healthcare Practice Management

```json
{
  "sites": [
    {
      "id": "main-practice",
      "name": "Main Medical Practice",
      "config": {
        "WORDPRESS_SITE_URL": "https://medicalpractice.com",
        "WORDPRESS_USERNAME": "medical-admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "SECURITY_MONITORING": "true",
        "CACHE_ENABLED": "true",
        "DEBUG": "false"
      }
    },
    {
      "id": "specialist-clinic",
      "name": "Specialist Clinic",
      "config": {
        "WORDPRESS_SITE_URL": "https://specialistclinic.com",
        "WORDPRESS_USERNAME": "clinic-manager",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "SECURITY_MONITORING": "true"
      }
    }
  ]
}
```

### Educational Institution

```json
{
  "sites": [
    {
      "id": "university-main",
      "name": "University Main Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://university.edu",
        "WORDPRESS_USERNAME": "web-admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "CACHE_ENABLED": "true",
        "PERFORMANCE_MONITORING": "true"
      }
    },
    {
      "id": "student-portal",
      "name": "Student Portal",
      "config": {
        "WORDPRESS_SITE_URL": "https://students.university.edu",
        "WORDPRESS_USERNAME": "student-services",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy",
        "RATE_LIMIT_ENABLED": "true"
      }
    },
    {
      "id": "faculty-blog",
      "name": "Faculty Blog Network",
      "config": {
        "WORDPRESS_SITE_URL": "https://faculty.university.edu",
        "WORDPRESS_USERNAME": "faculty-coordinator",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz"
      }
    }
  ]
}
```

## Using Multi-Site Configuration

### Command Examples

```bash
# List all configured sites
npx mcp-wordpress --list-sites

# Test connection to specific site
npx mcp-wordpress --test-site="main-site"

# Use specific site in Claude
"List all posts from the blog site"
# Uses: wp_list_posts --site="blog"

"Create a new user on the main-site"
# Uses: wp_create_user --site="main-site" --username="newuser" --email="user@example.com"
```

### Claude Desktop Usage

```text
💬 "List all posts from my blog site"
💬 "Create a new page on the main-site with title 'About Us'"
💬 "Upload an image to the restaurant client site"
💬 "Check performance metrics for the ecommerce site"
💬 "Show me recent comments from all sites"
```

## Security Considerations

### Site Isolation

Each site in the configuration maintains complete isolation:

- Separate authentication credentials
- Independent cache systems
- Isolated performance monitoring
- Individual security settings

### Access Control

```json
{
  "sites": [
    {
      "id": "public-site",
      "name": "Public Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://public.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "limited-permissions-password"
      }
    },
    {
      "id": "admin-site",
      "name": "Administrative Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://admin.company.com",
        "WORDPRESS_USERNAME": "super-admin",
        "WORDPRESS_APP_PASSWORD": "full-permissions-password",
        "SECURITY_MONITORING": "true",
        "RATE_LIMIT_ENABLED": "true"
      }
    }
  ]
}
```

## Configuration Management

### Environment-Based Configuration

**Development**

```json
{
  "sites": [
    {
      "id": "dev-site",
      "name": "Development Site",
      "config": {
        "WORDPRESS_SITE_URL": "http://localhost:8080",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "dev-password",
        "DEBUG": "true",
        "CACHE_ENABLED": "false"
      }
    }
  ]
}
```

**Production**

```json
{
  "sites": [
    {
      "id": "prod-site",
      "name": "Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://production.com",
        "WORDPRESS_USERNAME": "prod-admin",
        "WORDPRESS_APP_PASSWORD": "secure-prod-password",
        "DEBUG": "false",
        "CACHE_ENABLED": "true",
        "SECURITY_MONITORING": "true"
      }
    }
  ]
}
```

## Troubleshooting Multi-Site Issues

### Common Problems

1. **Site ID not found**

   - Verify the `id` field matches exactly
   - Check for typos in site parameter

2. **Authentication fails for specific site**

   - Test each site's credentials individually
   - Regenerate application passwords if needed

3. **Performance issues with many sites**
   - Enable caching for frequently used sites
   - Adjust cache limits based on available memory

### Debug Commands

```bash
# List all configured sites
npm run status

# Test specific site
npm run status -- --site="site-id"

# Validate configuration file
npm run test:config

# Test all sites
npm run test:multisite
```

### Validation Script

```bash
#!/bin/bash
# validate-config.sh

echo "Validating multi-site configuration..."

# Check if config file exists
if [ ! -f "mcp-wordpress.config.json" ]; then
    echo "❌ Configuration file not found"
    exit 1
fi

# Validate JSON syntax
if ! cat mcp-wordpress.config.json | jq . > /dev/null 2>&1; then
    echo "❌ Invalid JSON syntax"
    exit 1
fi

# Test each site
sites=$(cat mcp-wordpress.config.json | jq -r '.sites[].id')
for site in $sites; do
    echo "Testing site: $site"
    npm run status -- --site="$site"
done

echo "✅ Multi-site configuration validated"
```

This comprehensive multi-site setup allows you to manage unlimited WordPress sites efficiently through a single Claude
Desktop configuration.
