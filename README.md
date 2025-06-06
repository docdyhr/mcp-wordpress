# MCP WordPress Server

A comprehensive Model Context Protocol (MCP) server that provides complete WordPress CMS management capabilities through the WordPress REST API v2. This server includes **54 WordPress management tools** across 8 categories, interactive setup wizard, status monitoring, and comprehensive testing framework.

## Overview

This MCP server enables complete WordPress site management through structured tools and functions, utilizing the WordPress REST API v2 for all operations. Control your WordPress site content, users, media, and settings through natural language interactions with Claude or other MCP-compatible clients.

## WordPress REST API Integration

**WordPress has a powerful REST API!** The WordPress REST API v2 provides complete access to:

- **Posts** (`/wp/v2/posts`) - Create, edit, delete blog posts
- **Pages** (`/wp/v2/pages`) - Manage static pages  
- **Media** (`/wp/v2/media`) - Upload and manage images, files
- **Users** (`/wp/v2/users`) - User management
- **Categories/Tags** (`/wp/v2/categories`, `/wp/v2/tags`) - Taxonomies
- **Comments** (`/wp/v2/comments`) - Comment moderation
- **Settings** (`/wp/v2/settings`) - Site settings
- **Themes** (`/wp/v2/themes`) - Theme management
- **Plugins** (`/wp/v2/plugins`) - Plugin management
- **Menus** - Navigation management
- **Widgets** - Sidebar widgets
- **Custom Post Types** - Custom content types

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  MCP-WordPress   │───▶│  WordPress Site │
│   (Claude/LLM)  │    │     Server       │    │   (REST API)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Features

### Content Management
- Create, edit, and delete blog posts and pages
- Manage categories and tags
- Upload and organize media files
- Schedule posts for future publication
- Bulk content operations

### User Management
- Create and manage user accounts
- Update user profiles and roles
- Handle user permissions

### Site Administration
- Manage site settings
- Theme and plugin management
- Navigation menu control
- Comment moderation

### Advanced Features
- Site-wide search capabilities
- Content import/export
- Analytics integration (when available)
- SEO management tools

## Quick Start

### 1. Interactive Setup Wizard
Run the interactive setup wizard to configure your WordPress connection:

```bash
npm run setup
```

The setup wizard will:
- Guide you through WordPress site configuration
- Help you choose the best authentication method
- Test your WordPress connection
- Generate Claude Desktop configuration
- Provide step-by-step integration instructions

### 2. Check Status
Verify your configuration and WordPress connectivity:

```bash
npm run status
```

### 3. Run Integration Tests
Test all MCP tools and WordPress connectivity:

```bash
npm run test:mcp
```

## Installation

### Prerequisites
- WordPress 5.0+ with REST API enabled
- Node.js 18+
- WordPress site with appropriate user permissions

### WordPress Setup
1. Ensure REST API is enabled (default in WordPress 5.0+)
2. Create Application Password for your user account
3. Configure user permissions appropriately
4. Optional: Configure CORS headers if needed

### Install Dependencies
```bash
npm install
```

### Configuration
Create a `.env` file with your WordPress credentials:

```env
WORDPRESS_SITE_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password
```

**Alternative Authentication Methods:**
```env
# JWT Authentication (requires JWT plugin)
WORDPRESS_AUTH_METHOD=jwt
WORDPRESS_JWT_SECRET=your-jwt-secret

# Basic Authentication (not recommended for production)
WORDPRESS_AUTH_METHOD=basic
WORDPRESS_PASSWORD=your-actual-password

# API Key Authentication (requires API key plugin)
WORDPRESS_AUTH_METHOD=api-key
WORDPRESS_API_KEY=your-api-key
```

### Test Your Configuration
```bash
# Check WordPress connectivity and tool loading
npm run status

# Run comprehensive integration tests
npm run test:mcp
```

### Run the Server
```bash
npm start
```

## Authentication

WordPress REST API supports multiple authentication methods:

1. **Application Passwords** (Recommended)
   - WordPress 5.6+ native support
   - User-specific app passwords
   - HTTP Basic Auth over HTTPS

2. **JWT Authentication** (Plugin required)
   - JSON Web Tokens
   - Stateless authentication

3. **OAuth 2.0** (Plugin required)
   - For external applications

## Available Tools (54 Total)

This MCP server provides **54 comprehensive WordPress management tools** organized into 8 categories:

### 📝 Posts (8 tools)
- `wp_create_post` - Create new blog posts with full content support
- `wp_get_post` - Retrieve specific post by ID with all metadata
- `wp_update_post` - Edit existing posts (content, status, metadata)
- `wp_delete_post` - Delete posts permanently or move to trash
- `wp_list_posts` - List posts with filtering, sorting, and pagination
- `wp_search_posts` - Search posts by title, content, or metadata
- `wp_get_post_revisions` - Get post revision history
- `wp_duplicate_post` - Duplicate existing posts

### 📄 Pages (7 tools)
- `wp_create_page` - Create new static pages
- `wp_get_page` - Retrieve specific page by ID
- `wp_update_page` - Edit existing pages
- `wp_delete_page` - Delete pages
- `wp_list_pages` - List pages with hierarchy support
- `wp_search_pages` - Search pages by title or content
- `wp_get_page_hierarchy` - Get page parent-child relationships

### 🖼️ Media (8 tools)
- `wp_upload_media` - Upload images, videos, documents with metadata
- `wp_get_media` - Retrieve media file details and URLs
- `wp_update_media` - Edit media metadata (title, alt text, description)
- `wp_delete_media` - Delete media files from library
- `wp_list_media` - Browse media library with filtering
- `wp_search_media` - Search media by filename or metadata
- `wp_get_media_sizes` - Get available image sizes for media
- `wp_regenerate_thumbnails` - Regenerate image thumbnails

### 👥 Users (7 tools)
- `wp_create_user` - Create new user accounts with roles
- `wp_get_user` - Get user profile information
- `wp_update_user` - Update user profiles and settings
- `wp_delete_user` - Delete user accounts
- `wp_list_users` - List users with role filtering
- `wp_search_users` - Search users by name or email
- `wp_update_user_role` - Change user roles and capabilities

### 💬 Comments (6 tools)
- `wp_get_comment` - Retrieve specific comment details
- `wp_update_comment` - Edit comment content and metadata
- `wp_delete_comment` - Delete comments permanently
- `wp_list_comments` - List comments with status filtering
- `wp_approve_comment` - Approve pending comments
- `wp_spam_comment` - Mark comments as spam

### 🏷️ Taxonomies (8 tools)
- `wp_create_category` - Create new post categories
- `wp_get_category` - Get category details
- `wp_update_category` - Edit category information
- `wp_delete_category` - Delete categories
- `wp_list_categories` - List all categories with hierarchy
- `wp_create_tag` - Create new post tags
- `wp_get_tag` - Get tag details
- `wp_list_tags` - List all tags

### ⚙️ Site Management (6 tools)
- `wp_get_site_info` - Get WordPress site information and stats
- `wp_get_site_settings` - Retrieve site settings and configuration
- `wp_update_site_settings` - Update site settings
- `wp_get_site_health` - Check site health and system status
- `wp_clear_cache` - Clear various caches (if caching plugins installed)
- `wp_backup_database` - Create database backup (if backup plugins installed)

### 🔐 Authentication (4 tools)
- `wp_verify_connection` - Test WordPress REST API connectivity
- `wp_get_current_user` - Get current authenticated user info
- `wp_test_permissions` - Test user permissions for various operations
- `wp_refresh_auth` - Refresh authentication tokens (JWT/OAuth)

## Utility Scripts

### Interactive Setup Wizard
Run the setup wizard to configure your WordPress connection:

```bash
npm run setup
# or
node bin/setup.js
```

**Features:**
- Interactive WordPress site URL configuration
- Authentication method selection (App Password, JWT, Basic, API Key)
- Connection testing and validation
- Claude Desktop configuration generation
- Step-by-step integration instructions

### Status Checker
Check your WordPress connection and server status:

```bash
npm run status
# or  
node bin/status.js
```

**Diagnostics Include:**
- ✅ Configuration validation
- 🔌 WordPress REST API connectivity
- 🔐 Authentication method testing
- 🛠️ Tool loading verification (54 tools across 8 categories)
- 👤 User permissions checking
- 📊 Detailed connection diagnostics

### MCP Integration Tests
Run comprehensive integration tests:

```bash
npm run test:mcp
# or
node scripts/test-mcp.js
```

**Test Coverage:**
- 🚀 MCP server startup and initialization
- 📋 Tool listing verification (54 tools)
- 🔐 Authentication method testing
- 🧪 All tool categories validation
- ⚡ Error handling verification
- 📊 Detailed test reporting

## Security

### WordPress Application Passwords (Recommended)
WordPress 5.6+ includes native Application Password support:

1. Go to **Users → Profile** in WordPress admin
2. Scroll to **Application Passwords** section
3. Enter application name (e.g., "MCP WordPress Server")
4. Click **Add New Application Password**
5. Copy the generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
6. Use this password in your `.env` file as `WORDPRESS_APP_PASSWORD`

### Authentication Methods Comparison

| Method | Security | Setup | WordPress Version | Plugins Required |
|--------|----------|-------|-------------------|------------------|
| **App Password** | ⭐⭐⭐⭐⭐ | Easy | 5.6+ | None |
| **JWT** | ⭐⭐⭐⭐ | Medium | Any | JWT Auth Plugin |
| **Basic Auth** | ⭐⭐ | Easy | Any | None (not recommended) |
| **API Key** | ⭐⭐⭐⭐ | Medium | Any | API Key Plugin |

### Best Practices
- HTTPS only for all API calls
- Use Application Passwords instead of real user passwords
- Implement least privilege principle
- Validate all input parameters
- Sanitize all output responses
- Audit log all operations

### WordPress User Roles
- **Administrator** - Full access to all functions
- **Editor** - Posts, pages, comments, media
- **Author** - Own posts and media
- **Contributor** - Own posts (draft only)
- **Subscriber** - Read only

## Development

### Project Structure
```
src/
├── index.js              # MCP Server Entry Point
├── tools/                # MCP Tool Definitions
│   ├── posts.js         # Post Management Tools
│   ├── pages.js         # Page Management Tools
│   ├── media.js         # Media Management Tools
│   ├── users.js         # User Management Tools
│   ├── comments.js      # Comment Management Tools
│   ├── taxonomies.js    # Categories/Tags Tools
│   ├── site.js          # Site Settings Tools
│   └── navigation.js    # Menu Management Tools
├── client/               # WordPress API Client
│   ├── api.js           # HTTP Client
│   ├── auth.js          # Authentication
│   └── types.js         # Type Definitions
├── utils/                # Utilities
│   ├── validation.js    # Schema Validation
│   ├── formatting.js    # Data Formatting
│   ├── errors.js        # Error Handling
│   └── debug.js         # Debug Logger
└── config/
    └── schema.js         # MCP Tool Schemas
```

### Testing
```bash
npm test
npm run test:integration
npm run test:e2e
```

### Debug Mode
```bash
DEBUG=true npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: Check the `docs/` folder
- WordPress REST API: [Official Documentation](https://developer.wordpress.org/rest-api/)

---

**Note**: This server requires WordPress 5.0+ and uses the WordPress REST API v2. Ensure your WordPress installation has the REST API enabled and properly configured.
