# MCP WordPress Server - Blueprint

## Overview

This MCP (Model Context Protocol) server enables complete management of a WordPress CMS system through structured tools and functions. The server utilizes the WordPress REST API v2 for all operations.

## WordPress REST API Foundation

**Yes, WordPress has a very powerful REST API!** The WordPress REST API v2 provides complete access to:

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

### Components

1. **MCP Server** (Node.js/JavaScript)
   - Implements MCP protocol
   - Provides tools for WordPress operations
   - Handles authentication
   - Validates and formats data

2. **WordPress REST API Client**
   - HTTP client for WordPress API
   - Authentication (Application Passwords, JWT, OAuth)
   - Error handling and retry logic

3. **Tool Definitions**
   - Structured MCP tools for each WordPress operation
   - Schema validation for parameters
   - Typed responses

## Main Functionalities

### 1. Content Management

#### Blog Posts
- `create_post` - Create new blog post
  - Title, content, excerpt, author
  - Assign categories and tags
  - Set featured image
  - Publication status (draft, publish, private)
  - Schedule publication date

- `update_post` - Edit existing post
- `delete_post` - Delete post
- `list_posts` - List posts (with filtering)
- `get_post` - Get single post

#### Pages (Static Pages)
- `create_page` - Create new page
- `update_page` - Edit page
- `delete_page` - Delete page
- `list_pages` - List pages
- `get_page` - Get single page

#### Media Management
- `upload_media` - Upload files (images, videos, PDFs)
- `list_media` - Browse media library
- `delete_media` - Delete media
- `update_media` - Edit metadata

### 2. User Management
- `create_user` - Create new user
- `update_user` - Update user data
- `delete_user` - Delete user
- `list_users` - List users
- `get_user` - Get user profile

### 3. Taxonomies (Categories & Tags)
- `create_category` - New category
- `update_category` - Edit category
- `delete_category` - Delete category
- `list_categories` - List categories
- `create_tag` / `update_tag` / `delete_tag` / `list_tags` - Tag management

### 4. Comments
- `approve_comment` - Approve comment
- `reject_comment` - Reject comment
- `delete_comment` - Delete comment
- `list_comments` - List comments (including pending)
- `reply_comment` - Reply to comment

### 5. Site Management
- `get_site_settings` - Get WordPress settings
- `update_site_settings` - Update settings
- `list_themes` - Available themes
- `activate_theme` - Activate theme
- `list_plugins` - Installed plugins
- `activate_plugin` / `deactivate_plugin` - Manage plugins

### 6. Navigation & Menus
- `create_menu` - Create new menu
- `update_menu` - Edit menu
- `add_menu_item` - Add menu item
- `remove_menu_item` - Remove menu item
- `list_menus` - List all menus

### 7. Advanced Features
- `bulk_operations` - Edit multiple posts/pages simultaneously
- `search_content` - Site-wide search
- `get_analytics` - Basic analytics (if available)
- `backup_content` - Export content
- `import_content` - Import content

## Technical Implementation

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
│   └── types.js         # JavaScript Type Definitions
├── utils/                # Utilities
│   ├── validation.js    # Schema Validation
│   ├── formatting.js    # Data Formatting
│   ├── errors.js        # Error Handling
│   └── debug.js         # Debug Logger (STDIO compatible)
└── config/
    └── schema.js         # MCP Tool Schemas
```

### Authentication

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

### Configuration

```javascript
const wordpressConfig = {
  baseUrl: 'https://example.com',      // WordPress site URL
  username: 'api-user',               // WordPress username
  password: 'xxxx xxxx xxxx xxxx',    // Application password
  authMethod: 'app-password',         // Authentication method
  timeout: 30000,                     // Request timeout
  retryAttempts: 3,                   // Retry logic
  rateLimiting: {
    requestsPerMinute: 60,
    burstLimit: 10
  }
};
```

### Error Handling

- **401 Unauthorized** - Check authentication
- **403 Forbidden** - Insufficient user permissions  
- **404 Not Found** - Resource doesn't exist
- **429 Too Many Requests** - Rate limiting
- **500 Server Error** - WordPress-side error

### Rate Limiting

WordPress API has no default rate limits, but:
- Polite implementation with configurable limits
- Exponential backoff on errors
- Queue system for bulk operations

## Security

### Best Practices
1. **HTTPS Only** - All API calls over encrypted connection
2. **Application Passwords** - No real user passwords
3. **Least Privilege** - Minimal required user permissions
4. **Input Validation** - Validate all parameters
5. **Output Sanitization** - Clean responses
6. **Audit Logging** - Log all operations

### WordPress User Permissions
- **Administrator** - Full access to all functions
- **Editor** - Posts, pages, comments, media
- **Author** - Own posts and media
- **Contributor** - Own posts (draft only)
- **Subscriber** - Read only

## Installation & Setup

### Prerequisites
- WordPress 5.0+ with enabled REST API
- Node.js 18+
- JavaScript
- MCP SDK

### WordPress-side Preparation
1. Enable REST API (default active)
2. Create Application Password for user
3. Configure user permissions accordingly
4. Optional: Configure CORS headers

### MCP Server Installation
```bash
npm install
npm run build
npm start
```

### Configuration
```json
{
  "wordpress": {
    "baseUrl": "https://your-wordpress-site.com",
    "username": "api-user",
    "password": "xxxx xxxx xxxx xxxx xxxx xxxx",
    "authMethod": "app-password"
  }
}
```

## Testing

### Unit Tests
- Tool definitions
- API client
- Authentication
- Data validation

### Integration Tests
- Real WordPress installation
- Complete CRUD operations
- Error scenarios

### E2E Tests
- MCP client integration
- Complete workflows

## Monitoring & Logging

### Metrics
- API response times
- Error rates
- Usage statistics
- Rate limiting events

### Logging
- Structured JSON logs
- Request/response logging (STDIO compatible)
- Error stack traces
- User action audit trail

## Roadmap

### Phase 1: Core Functionality
- [x] Blueprint created
- [ ] Basic MCP server setup
- [ ] Posts/pages CRUD
- [ ] Media upload
- [ ] Authentication

### Phase 2: Advanced Features
- [ ] Comments management
- [ ] User management
- [ ] Taxonomies
- [ ] Bulk operations

### Phase 3: Pro Features
- [ ] Menu management
- [ ] Plugin/theme management  
- [ ] SEO integration
- [ ] Analytics integration
- [ ] Backup/restore

### Phase 4: Extensions
- [ ] WooCommerce integration
- [ ] Custom post types
- [ ] Advanced Custom Fields
- [ ] Multisite support

## Conclusion

The WordPress REST API provides everything needed for a complete MCP WordPress server. With over 30 different endpoints, virtually all WordPress functions can be controlled remotely. The API is stable, well-documented, and has been an integral part of WordPress since WordPress 4.7 (2016).

The MCP server will provide a user-friendly interface to manage WordPress sites completely through natural language - from content creation to complete site administration.
