# NPX Setup Guide

This guide provides step-by-step instructions for using the MCP WordPress server with NPX - the quickest way to get
started without local installation.

---

## 🚀 What is NPX?

NPX is a package runner that comes with npm 5.2+. It allows you to:

- Run packages without installing them locally
- Always use the latest published version
- Avoid global installations
- Get started in seconds

## 📋 Prerequisites

- Node.js 18+ with npm 5.2+ (check with `npx --version`)
- WordPress site with REST API enabled
- WordPress Application Password (recommended)

## 🎯 Quick Start

### 1. Claude Desktop Configuration

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

#### Single-Site Setup

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "npx",
      "args": ["-y", "mcp-wordpress"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your_username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  }
}
```

#### Multi-Site Setup

First, create `mcp-wordpress.config.json` in your home directory:

```json
{
  "sites": [
    {
      "id": "site1",
      "name": "Main Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    {
      "id": "site2",
      "name": "Blog Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog.site2.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy"
      }
    }
  ]
}
```

Then use this simpler Claude Desktop configuration:

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

### 2. Generate WordPress Application Password

1. Log into WordPress Admin
2. Go to Users → Your Profile
3. Scroll to "Application Passwords"
4. Enter a name (e.g., "Claude Desktop")
5. Click "Add New Application Password"
6. Copy the generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)

### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the NPX-based server.

## 🧪 Testing NPX Setup

### Manual Testing (Terminal)

Test the NPX setup before using in Claude Desktop:

```bash
# Single-site test
WORDPRESS_SITE_URL=https://your-site.com \
WORDPRESS_USERNAME=your_username \
WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx" \
npx -y mcp-wordpress

# Multi-site test (with config file in current directory)
npx -y mcp-wordpress
```

### Claude Desktop Testing

After configuration, test with these commands:

- "List my WordPress posts"
- "Show my site statistics"
- "What WordPress tools are available?"

## 🔧 NPX Options

### Force Latest Version

```json
{
  "command": "npx",
  "args": ["--yes", "--package=mcp-wordpress@latest", "mcp-wordpress"]
}
```

### Use Specific Version

```json
{
  "command": "npx",
  "args": ["-y", "mcp-wordpress@1.2.4"]
}
```

### Clear NPX Cache

If you're having issues with cached versions:

```bash
# Clear npx cache
rm -rf ~/.npm/_npx

# Or force fresh download
npx --ignore-existing mcp-wordpress
```

## 🆚 NPX vs Other Methods

### NPX Advantages

✅ **No installation required** - Just configure and use ✅ **Always latest version** - Automatic updates ✅ **No
maintenance** - No local files to manage ✅ **Quick setup** - Under 30 seconds ✅ **Cross-platform** - Works everywhere
Node.js works

### NPX Limitations

❌ **Requires internet** - Downloads package on first run ❌ **Slower startup** - Initial download takes time ❌ **No
customization** - Can't modify the code ❌ **No offline work** - Needs internet connection

### When to Use NPX

- ✅ You just want to use WordPress tools
- ✅ You want automatic updates
- ✅ You don't need to modify code
- ✅ You have reliable internet

### When NOT to Use NPX

- ❌ You need to customize the tools
- ❌ You're developing new features
- ❌ You work offline frequently
- ❌ You need a specific version locked

## 🔍 Troubleshooting

### Common Issues

**"Command not found: npx"**

- Install Node.js 18+ which includes npx
- Or install npx globally: `npm install -g npx`

**"No matching version found"**

- Check your internet connection
- Try clearing npm cache: `npm cache clean --force`

**"Authentication failed"**

- Verify Application Password has no extra spaces
- Check WordPress username is correct
- Ensure REST API is accessible

**"Config file not found"**

- For multi-site, ensure `mcp-wordpress.config.json` is in:
  - Home directory: `~/mcp-wordpress.config.json`
  - Or current directory when testing

### Debug Mode

Enable debug output by adding to env:

```json
{
  "env": {
    "DEBUG": "true",
    "LOG_LEVEL": "debug"
  }
}
```

## 📊 Performance Tips

### NPX Caching

NPX caches packages after first download:

- First run: Downloads package (5-10 seconds)
- Subsequent runs: Uses cache (instant)
- Cache location: `~/.npm/_npx/`

### Network Optimization

For slow connections, pre-cache the package:

```bash
# Pre-download the package
npx -y mcp-wordpress --help

# Now it's cached for Claude Desktop use
```

## 🎯 Quick Reference

### Essential Commands

```bash
# Check npx version
npx --version

# Test connection
npx -y mcp-wordpress

# Clear cache
rm -rf ~/.npm/_npx

# View package info
npm view mcp-wordpress
```

### Environment Variables

```bash
WORDPRESS_SITE_URL      # Required: Your WordPress URL
WORDPRESS_USERNAME      # Required: WordPress username
WORDPRESS_APP_PASSWORD  # Required: Application password
WORDPRESS_AUTH_METHOD   # Optional: Auth method (default: app-password)
DEBUG                   # Optional: Enable debug output
LOG_LEVEL              # Optional: Logging level (debug, info, warn, error)
```

---

NPX provides the fastest way to get started with WordPress tools in Claude Desktop - no installation, no maintenance,
just pure functionality!
