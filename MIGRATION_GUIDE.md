# Migration Guide: Single-Site to Multi-Site Configuration

This guide helps you migrate from the previous single-site configuration to the new multi-site configuration introduced in v2.0.0.

## Breaking Changes

### 1. Configuration Method Changed

**Old Method (Environment Variables):**
```bash
WORDPRESS_SITE_URL=https://example.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

**New Method (Configuration File):**
Create a `mcp-wordpress.config.json` file:
```json
{
  "sites": [
    {
      "id": "main",
      "name": "My WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://example.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  ]
}
```

### 2. Tool Usage Changed

All tools now require a `site` parameter when multiple sites are configured.

**Old Usage:**
```
wp_list_posts
```

**New Usage:**
```
wp_list_posts --site="main"
```

Note: If only one site is configured, the `site` parameter is optional and that site will be used by default.

### 3. Tool Architecture Refactored

Tools have been refactored from function-based to class-based architecture:
- All tools are now organized into classes (e.g., `PostTools`, `PageTools`)
- Tool registration is centralized through `src/tools/index.ts`
- Each tool category has its own class file in `src/tools/`

## Migration Steps

### Step 1: Backup Your Configuration

Save your current environment variables:
```bash
cp .env .env.backup
```

### Step 2: Create Configuration File

Create `mcp-wordpress.config.json` in the project root:

```json
{
  "sites": [
    {
      "id": "main",
      "name": "Your Site Name",
      "config": {
        "WORDPRESS_SITE_URL": "YOUR_SITE_URL",
        "WORDPRESS_USERNAME": "YOUR_USERNAME",
        "WORDPRESS_APP_PASSWORD": "YOUR_APP_PASSWORD",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  ]
}
```

Replace the values with your actual configuration from `.env`.

### Step 3: Update Tool Usage

If you have scripts or automation using the tools, update them to include the site parameter:

```bash
# Old
wp_create_post --title="Hello" --content="World"

# New (explicit site)
wp_create_post --site="main" --title="Hello" --content="World"

# New (implicit - only works with single site)
wp_create_post --title="Hello" --content="World"
```

### Step 4: Test Your Configuration

Run the health check to verify your configuration:
```bash
npm run health
```

### Step 5: Remove Old Configuration (Optional)

Once verified, you can remove the old `.env` file:
```bash
rm .env
```

## Adding Multiple Sites

The main benefit of the new configuration is support for multiple WordPress sites:

```json
{
  "sites": [
    {
      "id": "site1",
      "name": "Main Website",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.com",
        "WORDPRESS_USERNAME": "admin1",
        "WORDPRESS_APP_PASSWORD": "password1"
      }
    },
    {
      "id": "site2", 
      "name": "Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog.site2.com",
        "WORDPRESS_USERNAME": "admin2",
        "WORDPRESS_APP_PASSWORD": "password2"
      }
    }
  ]
}
```

Then use tools with specific sites:
```bash
wp_list_posts --site="site1"
wp_create_post --site="site2" --title="New Blog Post"
```

## Backward Compatibility

The server maintains backward compatibility with environment variables. If no `mcp-wordpress.config.json` file is found, it will fall back to using environment variables as before.

## Troubleshooting

### Issue: "Site parameter is required"
**Solution:** When multiple sites are configured, you must specify which site to use with the `--site` parameter.

### Issue: "Site 'xyz' not found"
**Solution:** Check that the site ID in your command matches an ID in your configuration file.

### Issue: Tools not working after migration
**Solution:** Run `npm run health` to diagnose configuration issues.

## Need Help?

- Check the [CLAUDE.md](./CLAUDE.md) file for detailed documentation
- Run `npm run health` for system diagnostics
- Open an issue on GitHub if you encounter problems