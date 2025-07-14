# DXT Installation Guide

This guide walks you through installing the WordPress MCP Server as a Claude Desktop Extension (DXT).

## Prerequisites

- Claude Desktop application installed
- WordPress site with admin access
- WordPress Application Password (recommended)

## Installation Steps

### 1. Download or Build the DXT Package

**Option A: Download Pre-built Package**

- Download `mcp-wordpress.dxt` from the releases page
- Skip to step 2

**Option B: Build from Source**

```bash
# Install the official DXT CLI tool
npm install -g @anthropic-ai/dxt

# Build the DXT package
npm run dxt:package:official
```

### 2. Install in Claude Desktop

1. Open Claude Desktop
2. Navigate to **Extensions** menu
3. Click **Install Extension**
4. Select the `mcp-wordpress.dxt` file
5. Click **Install**

### 3. Configure WordPress Credentials

After installation, you'll be prompted to configure:

#### Required Fields

- **WordPress Site URL**: Your site's full URL (e.g., `https://yoursite.com`)
- **WordPress Username**: Your WordPress admin username
- **WordPress Application Password**: Generate this in WordPress Admin

#### Optional Fields

- **Authentication Method**: Default is "app-password" (recommended)
- **Debug Mode**: Enable for troubleshooting (default: false)

#### Generating Application Password

1. Go to WordPress Admin → Users → Your Profile
2. Scroll to "Application Passwords" section
3. Enter a name (e.g., "Claude Desktop")
4. Click "Add New Application Password"
5. Copy the generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
6. Use this password in the DXT configuration

### 4. Verify Installation

After configuration, the extension should appear in your Claude Desktop extensions list. You can test it by asking
Claude to:

- "List my recent WordPress posts"
- "Check my WordPress site status"
- "Show available WordPress tools"

## Troubleshooting

### Installation Fails

- Ensure you're using the official DXT package built with the DXT CLI tool
- Check that all required files are included in the package
- Verify Claude Desktop is up to date

### Server Crashes After Installation

- **Entry Point Issues**: Ensure manifest.json points to correct entry_point (`dist/index.js`)
- **Path Resolution**: Use `${__dirname}/dist/index.js` in mcp_config.args for absolute paths
- **Missing Dependencies**: Verify node_modules are included in the DXT package
- **Configuration Issues**: Check that user configuration fields are properly filled

### Authentication Issues

- Ensure Application Password is correctly formatted (spaces between groups)
- Verify WordPress REST API is enabled
- Check that your user has appropriate permissions

### Connection Problems

- Verify WordPress site URL is correct and accessible
- Check for SSL certificate issues
- Ensure WordPress REST API endpoints are not blocked

## Build Process Details

The DXT package is built using the official Anthropic DXT CLI tool to ensure compatibility:

```bash
# Clean previous builds
npm run dxt:clean

# Install DXT CLI if not already installed
npm install -g @anthropic-ai/dxt

# Copy manifest and icon to root (required by DXT CLI)
cp dxt/manifest.json .
cp dxt/icon.png .

# Create .dxtignore to exclude development files
# (See .dxtignore file for exclusion patterns)

# Build with official DXT tool
dxt pack . mcp-wordpress.dxt
```

### Key Requirements for DXT Packaging

1. **Use Official DXT CLI**: The `dxt pack` command ensures proper package structure
2. **Proper .dxtignore**: Exclude development files, tests, and unnecessary dependencies
3. **Root-level manifest.json**: DXT CLI expects manifest at project root
4. **Include node_modules**: Production dependencies must be included
5. **Compiled Code**: Include `dist/` directory with compiled TypeScript

## Package Contents

The final DXT package includes:

- `manifest.json` - Extension metadata and configuration
- `icon.png` - Extension icon
- `dist/` - Compiled TypeScript code
- `node_modules/` - Production dependencies (filtered)
- `package.json` - Node.js package configuration
- `LICENSE` - License file

## Security Notes

- Application Passwords are stored securely by Claude Desktop
- Never commit `mcp-wordpress.config.json` containing credentials
- Use `.gitignore` to exclude sensitive configuration files
- Rotate Application Passwords if accidentally exposed

## Multi-Site Support

The DXT extension supports managing multiple WordPress sites. Configure additional sites through the extension settings
or use site-specific commands with the `--site` parameter.
