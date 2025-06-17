# MCP WordPress Server

A comprehensive Model Context Protocol (MCP) server for WordPress management through the WordPress REST API v2. Completely written in TypeScript for maximum type safety and better developer experience.

## 🚀 Features

- **54 WordPress Management Tools** across 8 categories
- **100% TypeScript** - Complete type safety and IntelliSense
- **Modern ES Modules** - Optimized for performance
- **Interactive Setup Wizard** - Easy configuration
- **Comprehensive Testing** - Complete test suite
- **Flexible Authentication** - Supports App Passwords, JWT, Basic Auth
- **Debug & Monitoring** - Structured logging and error tracking

## ⚡ Quick Start

### 1. Installation

```bash
git clone <repository-url>
cd mcp-wordpress
npm install
```

### 2. Setup Wizard

```bash
npm run setup
```

The setup wizard guides you through:
- WordPress site configuration
- Authentication method selection
- Connection testing
- Claude Desktop configuration

### 3. Start Server

```bash
npm start
```

## 🚀 Lazy Setup via Claude Desktop

If you're feeling lazy and want Claude to handle the entire setup process for you, just paste this prompt into Claude Desktop:

```
Build and configure the MCP WordPress server project from https://github.com/AiondaDotCom/mcp-wordpress locally on my computer. 

Please:
1. Clone the repository to an appropriate directory
2. Install all dependencies 
3. Run the setup wizard and help me configure my WordPress connection
4. Test the connection to make sure everything works
5. Set up the Claude Desktop MCP configuration
6. Run a quick test to verify all tools are working

My WordPress site URL is: [YOUR_WORDPRESS_URL]
My WordPress username is: [YOUR_USERNAME]

Guide me through any steps that require manual input, and let me know if you need any additional information from me.
```

**Just replace `[YOUR_WORDPRESS_URL]` and `[YOUR_USERNAME]` with your actual WordPress site details, and Claude will handle the rest!**

## 🔧 Configuration

### Environment Variables (.env)

```env
WORDPRESS_SITE_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password
DEBUG=false
```

### Claude Desktop Integration

After the setup wizard, an MCP configuration is automatically created. Add this to your Claude Desktop `mcp.json`:

#### Automatic Configuration
```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "node",
      "args": ["/path/to/mcp-wordpress/dist/index.js"],
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

#### Alternative: Using .env File
```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "node",
      "args": ["/path/to/mcp-wordpress/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Claude Desktop Configuration File Locations

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## 🛠 Build System

### TypeScript Build

```bash
# Compile
npm run build

# Watch mode
npm run build:watch

# Type checking
npm run typecheck
```

### Development

```bash
# Development mode with debug output
npm run dev

# Check status
npm run status

# Re-run setup
npm run setup
```

## 🔐 Authentication

### WordPress Application Passwords (Recommended)

1. **WordPress Admin** → **Users** → **Profile**
2. Scroll to **Application Passwords**
3. Enter name (e.g., "MCP WordPress Server")
4. Click **Add New Application Password**
5. Copy generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)

### Alternative Authentication Methods

```env
# JWT Authentication (requires JWT plugin)
WORDPRESS_AUTH_METHOD=jwt
WORDPRESS_JWT_SECRET=your-jwt-secret

# Basic Authentication (not recommended for production)
WORDPRESS_AUTH_METHOD=basic
WORDPRESS_PASSWORD=your-actual-password

# API Key Authentication (requires API Key plugin)
WORDPRESS_AUTH_METHOD=api-key
WORDPRESS_API_KEY=your-api-key
```

## 📋 Available Tools (54 Tools)

### 📝 Posts (6 Tools)
- `wp_list_posts` - List and filter blog posts
- `wp_get_post` - Get specific post
- `wp_create_post` - Create new posts
- `wp_update_post` - Edit posts
- `wp_delete_post` - Delete posts
- `wp_get_post_revisions` - Get post revisions

### 📄 Pages (6 Tools)
- `wp_list_pages` - List pages
- `wp_get_page` - Get specific page
- `wp_create_page` - Create new pages
- `wp_update_page` - Edit pages
- `wp_delete_page` - Delete pages
- `wp_get_page_revisions` - Get page revisions

### 🖼️ Media (6 Tools)
- `wp_list_media` - Browse media library
- `wp_get_media` - Get media details
- `wp_upload_media` - Upload files
- `wp_update_media` - Edit media metadata
- `wp_delete_media` - Delete media
- `wp_get_media_sizes` - Get available image sizes

### 👥 Users (6 Tools)
- `wp_list_users` - List users
- `wp_get_user` - Get user details
- `wp_create_user` - Create new users
- `wp_update_user` - Edit user profiles
- `wp_delete_user` - Delete users
- `wp_get_current_user` - Get current user

### 💬 Comments (7 Tools)
- `wp_list_comments` - List comments
- `wp_get_comment` - Get comment details
- `wp_create_comment` - Create new comments
- `wp_update_comment` - Edit comments
- `wp_delete_comment` - Delete comments
- `wp_approve_comment` - Approve comments
- `wp_spam_comment` - Mark comments as spam

### 🏷️ Taxonomies (10 Tools)
- `wp_list_categories` - List categories
- `wp_get_category` - Get category details
- `wp_create_category` - Create new categories
- `wp_update_category` - Edit categories
- `wp_delete_category` - Delete categories
- `wp_list_tags` - List tags
- `wp_get_tag` - Get tag details
- `wp_create_tag` - Create new tags
- `wp_update_tag` - Edit tags
- `wp_delete_tag` - Delete tags

### ⚙️ Site Management (7 Tools)
- `wp_get_site_settings` - Get site settings
- `wp_update_site_settings` - Update site settings
- `wp_get_site_stats` - Get site statistics
- `wp_search_site` - Site-wide search
- `wp_get_application_passwords` - List app passwords
- `wp_create_application_password` - Create new app passwords
- `wp_delete_application_password` - Delete app passwords

### 🔐 Authentication (6 Tools)
- `wp_test_auth` - Test authentication
- `wp_get_auth_status` - Get authentication status
- `wp_start_oauth_flow` - Start OAuth flow
- `wp_complete_oauth_flow` - Complete OAuth flow
- `wp_refresh_oauth_token` - Refresh OAuth token
- `wp_switch_auth_method` - Switch authentication method

## 🧪 Testing

```bash
# Run all tests
npm test

# Tests with coverage
npm run test:coverage

# Quick tests
npm run test:fast

# MCP integration tests
npm run test:mcp

# Tool integration tests
npm run test:tools

# Tests in watch mode
npm run test:watch
```

## 📊 Status & Monitoring

```bash
# Check connection status
npm run status

# Debug mode
DEBUG=true npm run dev

# Lint code
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

## 🏗 Project Structure

```
mcp-wordpress/
├── src/                     # TypeScript source code
│   ├── index.ts            # Main MCP server
│   ├── server.ts           # Server compatibility
│   ├── types/              # TypeScript definitions
│   │   ├── wordpress.ts    # WordPress API types
│   │   ├── mcp.ts         # MCP protocol types
│   │   ├── client.ts      # Client interface types
│   │   └── index.ts       # Type exports
│   ├── client/             # WordPress API client
│   │   ├── api.ts         # HTTP client
│   │   └── auth.ts        # Authentication
│   ├── tools/              # MCP tool implementations
│   │   ├── posts.ts       # Post management
│   │   ├── pages.ts       # Page management
│   │   ├── media.ts       # Media management
│   │   ├── users.ts       # User management
│   │   ├── comments.ts    # Comment management
│   │   ├── taxonomies.ts  # Categories/Tags
│   │   ├── site.ts        # Site settings
│   │   └── auth.ts        # Authentication
│   └── utils/              # Utility functions
│       └── debug.ts       # Debug logger
├── dist/                   # Compiled JavaScript files
├── bin/                    # Utility scripts
│   ├── setup.js          # Setup wizard
│   └── status.js          # Status checker
├── tests/                  # Test suite
├── scripts/                # Build and test scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.json       # Jest test configuration
└── package.json           # Node.js project configuration
```

## 💡 TypeScript Features

- **Complete Type Safety** - Compile-time validation
- **IntelliSense Support** - Better IDE integration
- **Type-safe API Client** - Typed HTTP methods
- **Comprehensive WordPress Types** - 400+ lines of precise definitions
- **MCP Protocol Types** - Tool definitions and handlers
- **Enhanced Error Handling** - Typed exceptions
- **Source Maps** - Debugging support

## 🔧 WordPress Requirements

- **WordPress 5.0+** with REST API enabled
- **HTTPS** (recommended for production)
- **User with appropriate permissions**
- **Application Passwords** enabled (WordPress 5.6+)

### WordPress User Roles

| Role | Access |
|------|--------|
| **Administrator** | Full access to all functions |
| **Editor** | Posts, pages, comments, media |
| **Author** | Own posts and media |
| **Contributor** | Own posts (drafts only) |
| **Subscriber** | Read only |

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to WordPress"**
   - Check WORDPRESS_SITE_URL
   - Ensure REST API is accessible
   - Test: `curl https://your-site.com/wp-json/wp/v2/`

2. **"Authentication failed"**
   - Verify username and app password
   - Ensure Application Passwords are enabled
   - Try running `npm run setup` again

3. **"TypeScript compilation errors"**
   - Run `npm run typecheck`
   - Ensure all dependencies are installed

### Debug Logs

```bash
DEBUG=true npm run dev
```

## 📚 API Documentation

- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Create pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🚀 Powered by TypeScript for better development experience and type safety!**