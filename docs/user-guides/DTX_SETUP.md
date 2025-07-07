# DTX (Desktop Extension) Setup Guide

This guide provides step-by-step instructions for setting up the MCP WordPress server using the DTX (Desktop Extension) package format for Claude Desktop.

---

## 🖼️ What is DTX?

DTX (Desktop Extension) is a package format for Claude Desktop that provides:

- **One-Click Installation** - Install directly through Claude Desktop
- **Secure Configuration** - Credentials stored in OS keychain
- **Built-in Documentation** - Tool descriptions and usage examples
- **User-Friendly Setup** - No command line required
- **Automatic Updates** - Easy version management

## 🚀 Quick DTX Installation

### Method 1: Install from Built Package

1. **Download the DTX Package**

   ```bash
   # Download the latest release
   curl -L https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt -o mcp-wordpress.dxt
   ```

2. **Install in Claude Desktop**
   - Open Claude Desktop
   - Go to **Extensions** menu
   - Click **Install Extension**
   - Select the `mcp-wordpress.dxt` file
   - Follow the configuration prompts

### Method 2: Build DTX Package Yourself

1. **Clone and Build**

   ```bash
   git clone https://github.com/docdyhr/mcp-wordpress.git
   cd mcp-wordpress
   npm install
   npm run build
   npm run dxt:package
   ```

2. **Install the Generated Package**
   - The package will be created as `mcp-wordpress.dxt`
   - Install through Claude Desktop Extensions menu

## ⚙️ DTX Configuration

After installation, Claude Desktop will prompt you to configure:

### Single-Site Configuration (Default)

The DTX GUI interface supports single-site configuration:

1. **WordPress Site URL**
   - Enter your full WordPress site URL
   - Example: `https://yoursite.com`

2. **WordPress Username**
   - Your WordPress admin username
   - Must have appropriate permissions

3. **WordPress Application Password**
   - Generate in WordPress: Admin → Users → Profile → Application Passwords
   - Format: `xxxx xxxx xxxx xxxx xxxx xxxx`

4. **Authentication Method** (Optional)
   - **Application Password** (Recommended)
   - JWT Authentication
   - Basic Authentication
   - API Key Authentication

5. **Debug Mode** (Optional)
   - Enable for troubleshooting
   - Provides verbose logging

### Multi-Site Configuration (Manual Setup)

The DTX package supports multi-site configuration, but requires manual setup:

#### Method 1: Using mcp-wordpress.config.json (Recommended)

1. **After DTX installation**, create a `mcp-wordpress.config.json` file in your home directory:

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

2. **Place the file in one of these locations:**
   - **macOS/Linux**: `~/mcp-wordpress.config.json`
   - **Windows**: `%USERPROFILE%\mcp-wordpress.config.json`
   - **DTX Install Directory**: Next to the DTX package files

3. **Skip the DTX configuration prompts (or enter dummy values)**

4. **Restart Claude Desktop** - the server will detect and use your config file

#### Method 2: Environment Variable Override

Set the `MCP_WORDPRESS_CONFIG_PATH` environment variable to point to your config file:

```bash
# macOS/Linux
export MCP_WORDPRESS_CONFIG_PATH=/path/to/mcp-wordpress.config.json

# Windows
set MCP_WORDPRESS_CONFIG_PATH=C:\path\to\mcp-wordpress.config.json
```

Then restart Claude Desktop.

### How Multi-Site Works with DTX

When using multi-site configuration:

1. **All sites are available** in every tool by using the `--site` parameter
2. **Example**: `wp_list_posts --site="site1"`
3. **If `--site` is omitted**:
   - Single site: Uses the configured site
   - Multi-site: Shows error if more than one site exists

### Testing Multi-Site Configuration

After setup, test with these commands:

```text
# List posts from specific site
wp_list_posts --site="site1"

# Get stats from another site
wp_get_site_stats --site="site2"

# See all configured sites
wp_test_auth
```

## 🔧 DTX Development Commands

### Building DTX Package

```bash
# Clean previous builds
npm run dxt:clean

# Build the DTX package
npm run dxt:build

# Package everything (clean + build)
npm run dxt:package

# Validate the package (requires dxt CLI)
npm run dxt:validate
```

### DTX Package Structure

The DTX package includes:

```
mcp-wordpress.dxt/
├── manifest.json          # DTX configuration and metadata
├── icon.png              # Extension icon
├── screenshots/          # Usage screenshots
├── dist/                 # Compiled application
└── node_modules/         # Dependencies (production only)
```

## 📋 DTX Features

### Automatic Configuration

The DTX package automatically configures:

- **22 Primary Tools** - Complete WordPress management toolkit
- **4 Built-in Prompts** - Pre-configured workflows
- **Secure Credentials** - Stored in OS keychain
- **Environment Variables** - Automatically set based on user input

### Built-in Prompts

After installation, you'll have access to these prompts:

1. **Setup WordPress** - Initial site setup and configuration
2. **Content Management** - Content creation and management workflow
3. **Performance Optimization** - Performance monitoring and optimization
4. **Multi-Site Management** - Multi-site administration workflow

### Tool Categories

The DTX includes 59 tools across:

- **Posts & Pages** - Content management
- **Media Library** - File uploads and management
- **Users & Comments** - User administration and moderation
- **Categories & Tags** - Taxonomy management
- **Site Settings** - Configuration and statistics
- **Authentication** - Security and access management
- **Cache Management** - Performance optimization
- **Performance Monitoring** - Real-time analytics

## 🔍 DTX Troubleshooting

### Installation Issues

**Problem**: "Package format not recognized"

- **Solution**: Ensure you have the latest Claude Desktop version

**Problem**: "Installation failed"

- **Solution**: Check that the DTX file isn't corrupted; rebuild if necessary

### Configuration Issues

**Problem**: "Authentication failed"

- **Solution**: Verify your Application Password is correct and has no quotes

**Problem**: "Site not accessible"

- **Solution**: Check your WordPress URL and ensure REST API is enabled

### Debugging DTX

1. **Enable Debug Mode** in the DTX configuration
2. **Check Claude Desktop logs** in Console.app (macOS)
3. **Test manually** with NPX: `npx -y mcp-wordpress`

## 🆚 DTX vs Other Installation Methods

### DTX Advantages

✅ **One-click installation** through Claude Desktop  
✅ **Secure credential storage** in OS keychain  
✅ **Built-in documentation** and prompts  
✅ **No command line required**  
✅ **Automatic dependency management**

### DTX Limitations

❌ **Less flexibility** than manual configuration  
❌ **Limited customization** options  
❌ **Requires DTX-compatible Claude Desktop**

### When to Use DTX

- You want the simplest installation experience
- You prefer GUI configuration over command line
- You don't need custom configurations
- You want automatic updates and management

### When to Use Other Methods

- You need custom configurations
- You're developing or contributing to the project
- You prefer command line control
- You need to modify the source code

## 🔄 Updating DTX Package

### Automatic Updates

- Claude Desktop will notify you of available updates
- Click **Update** when prompted

### Manual Updates

1. Download the latest DTX package
2. Go to Extensions → Manage Extensions
3. Remove the old version
4. Install the new version
5. Re-configure if necessary

## 📦 DTX Package Distribution

### For Users

- Download from GitHub Releases
- Install directly in Claude Desktop

### For Developers

```bash
# Build and test locally
npm run dxt:package
# Install the generated mcp-wordpress.dxt file

# Validate before distribution
npm run dxt:validate
```

---

## 🎯 Quick Start Summary

1. **Download**: Get `mcp-wordpress.dxt` from releases
2. **Install**: Extensions menu in Claude Desktop
3. **Configure**: Enter WordPress credentials
4. **Test**: Try "List my WordPress posts"
5. **Explore**: Use built-in prompts and tools

The DTX format provides the easiest way to get started with WordPress management in Claude Desktop!
