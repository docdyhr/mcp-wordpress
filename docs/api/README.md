# WordPress MCP Server - API Documentation

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![Tools](https://img.shields.io/badge/tools-60+-green)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![License](https://img.shields.io/badge/license-MIT-blue)


## Overview

The WordPress MCP Server provides **59 tools** across **10 categories** for comprehensive WordPress management through the Model Context Protocol.

**Last Updated:** 19.7.2025  
**Version:** 1.2.0  
**Coverage:** 59/59 tools with examples

## Quick Start

### Basic Usage
```bash
# List all posts
wp_list_posts

# Get specific post
wp_get_post --id=123

# Create new post
wp_create_post --title="My Post" --content="Post content"
```

### Multi-Site Usage
```bash
# Target specific site
wp_list_posts --site=site1

# Use with different authentication
wp_get_site_settings --site=production
```

## Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| [comment](./categories/comment.md) | 7 | comment management tools |
| [cache](./categories/cache.md) | 4 | Performance caching and optimization tools |
| [site](./categories/site.md) | 6 | Site settings and configuration tools |
| [taxonomy](./categories/taxonomy.md) | 10 | taxonomy management tools |
| [page](./categories/page.md) | 6 | page management tools |
| [post](./categories/post.md) | 6 | post management tools |
| [user](./categories/user.md) | 6 | user management tools |
| [media](./categories/media.md) | 5 | File upload, management, and media library tools |
| [auth](./categories/auth.md) | 3 | Authentication testing and management tools |
| [performance](./categories/performance.md) | 6 | Performance monitoring and analytics tools |

## Available Tools

| Tool | Category | Description |
|------|----------|-------------|
| [`wp_approve_comment`](./tools/wp_approve_comment.md) | comment | Approves a pending comment. |
| [`wp_cache_clear`](./tools/wp_cache_clear.md) | cache | Clear cache for a WordPress site. |
| [`wp_cache_info`](./tools/wp_cache_info.md) | cache | Get detailed cache configuration and status information. |
| [`wp_cache_stats`](./tools/wp_cache_stats.md) | cache | Get cache statistics for a WordPress site. |
| [`wp_cache_warm`](./tools/wp_cache_warm.md) | cache | Pre-warm cache with essential WordPress data. |
| [`wp_create_application_password`](./tools/wp_create_application_password.md) | site | Creates a new application password for a user. |
| [`wp_create_category`](./tools/wp_create_category.md) | taxonomy | Creates a new category. |
| [`wp_create_comment`](./tools/wp_create_comment.md) | comment | Creates a new comment on a post. |
| [`wp_create_page`](./tools/wp_create_page.md) | page | Creates a new page. |
| [`wp_create_post`](./tools/wp_create_post.md) | post | Creates a new WordPress post with comprehensive validation and detailed success feedback including management links.

**Usage Examples:**
• Simple post: `wp_create_post --title="My New Post" --content="<p>Hello World!</p>"`
• Draft post: `wp_create_post --title="Draft Post" --status="draft"`
• Categorized post: `wp_create_post --title="Tech News" --categories=[1,5] --tags=[10,20]`
• Scheduled post: `wp_create_post --title="Future Post" --status="future" --date="2024-12-25T10:00:00"`
• Complete post: `wp_create_post --title="Complete Post" --content="<p>Content</p>" --excerpt="Summary" --status="publish"` |
| [`wp_create_tag`](./tools/wp_create_tag.md) | taxonomy | Creates a new tag. |
| [`wp_create_user`](./tools/wp_create_user.md) | user | Creates a new user. |
| [`wp_delete_application_password`](./tools/wp_delete_application_password.md) | site | Revokes an existing application password. |
| [`wp_delete_category`](./tools/wp_delete_category.md) | taxonomy | Deletes a category. |
| [`wp_delete_comment`](./tools/wp_delete_comment.md) | comment | Deletes a comment. |
| [`wp_delete_media`](./tools/wp_delete_media.md) | media | Deletes a media item. |
| [`wp_delete_page`](./tools/wp_delete_page.md) | page | Deletes a page. |
| [`wp_delete_post`](./tools/wp_delete_post.md) | post | Deletes a WordPress post with option for permanent deletion or moving to trash. |
| [`wp_delete_tag`](./tools/wp_delete_tag.md) | taxonomy | Deletes a tag. |
| [`wp_delete_user`](./tools/wp_delete_user.md) | user | Deletes a user. |
| [`wp_get_application_passwords`](./tools/wp_get_application_passwords.md) | site | Lists application passwords for a specific user. |
| [`wp_get_auth_status`](./tools/wp_get_auth_status.md) | auth | Gets the current authentication status for a configured WordPress site. |
| [`wp_get_category`](./tools/wp_get_category.md) | taxonomy | Retrieves a single category by its ID. |
| [`wp_get_comment`](./tools/wp_get_comment.md) | comment | Retrieves a single comment by its ID. |
| [`wp_get_current_user`](./tools/wp_get_current_user.md) | user | Retrieves the currently authenticated user with comprehensive profile information including roles, capabilities, and account details.

**Usage Examples:**
• Get current user: `wp_get_current_user`
• Check permissions: Use this to verify your current user's capabilities and roles
• Account verification: Confirm you're authenticated with the correct account
• Profile details: View registration date, email, and user metadata |
| [`wp_get_media`](./tools/wp_get_media.md) | media | Retrieves a single media item by its ID. |
| [`wp_get_page`](./tools/wp_get_page.md) | page | Retrieves a single page by its ID. |
| [`wp_get_page_revisions`](./tools/wp_get_page_revisions.md) | page | Retrieves revisions for a specific page. |
| [`wp_get_post`](./tools/wp_get_post.md) | post | Retrieves detailed information about a single post including metadata, content statistics, and management links. |
| [`wp_get_post_revisions`](./tools/wp_get_post_revisions.md) | post | Retrieves the revision history for a specific post showing author and modification dates. |
| [`wp_get_site_settings`](./tools/wp_get_site_settings.md) | site | Retrieves the general settings for a WordPress site. |
| [`wp_get_tag`](./tools/wp_get_tag.md) | taxonomy | Retrieves a single tag by its ID. |
| [`wp_get_user`](./tools/wp_get_user.md) | user | Retrieves a single user by their ID. |
| [`wp_list_categories`](./tools/wp_list_categories.md) | taxonomy | Lists categories from a WordPress site. |
| [`wp_list_comments`](./tools/wp_list_comments.md) | comment | Lists comments from a WordPress site, with filters. |
| [`wp_list_media`](./tools/wp_list_media.md) | media | Lists media items from a WordPress site, with filters. |
| [`wp_list_pages`](./tools/wp_list_pages.md) | page | Lists pages from a WordPress site, with filters. |
| [`wp_list_posts`](./tools/wp_list_posts.md) | post | Lists posts from a WordPress site with comprehensive filtering options. Supports search, status filtering, and category/tag filtering with enhanced metadata display.

**Usage Examples:**
• Basic listing: `wp_list_posts`
• Search posts: `wp_list_posts --search="AI trends"`
• Filter by status: `wp_list_posts --status="draft"`
• Category filtering: `wp_list_posts --categories=[1,2,3]`
• Paginated results: `wp_list_posts --per_page=20 --page=2`
• Combined filters: `wp_list_posts --search="WordPress" --status="publish" --per_page=10` |
| [`wp_list_tags`](./tools/wp_list_tags.md) | taxonomy | Lists tags from a WordPress site. |
| [`wp_list_users`](./tools/wp_list_users.md) | user | Lists users from a WordPress site with comprehensive filtering and detailed user information including roles, registration dates, and activity status.

**Usage Examples:**
• List all users: `wp_list_users`
• Search users: `wp_list_users --search="john"`
• Filter by role: `wp_list_users --roles=["editor","author"]`
• Find admins: `wp_list_users --roles=["administrator"]`
• Combined search: `wp_list_users --search="smith" --roles=["subscriber"]` |
| [`wp_performance_alerts`](./tools/wp_performance_alerts.md) | performance | Get performance alerts and anomaly detection results |
| [`wp_performance_benchmark`](./tools/wp_performance_benchmark.md) | performance | Compare current performance against industry benchmarks |
| [`wp_performance_export`](./tools/wp_performance_export.md) | performance | Export comprehensive performance report |
| [`wp_performance_history`](./tools/wp_performance_history.md) | performance | Get historical performance data and trends |
| [`wp_performance_optimize`](./tools/wp_performance_optimize.md) | performance | Get optimization recommendations and insights |
| [`wp_performance_stats`](./tools/wp_performance_stats.md) | performance | Get real-time performance statistics and metrics |
| [`wp_search_site`](./tools/wp_search_site.md) | site | Performs a site-wide search for content across posts, pages, and media with comprehensive results and metadata.

**Usage Examples:**
• Search everything: `wp_search_site --term="WordPress"`
• Search posts only: `wp_search_site --term="tutorial" --type="posts"`
• Search pages: `wp_search_site --term="about" --type="pages"`
• Search media: `wp_search_site --term="logo" --type="media"`
• Find specific content: `wp_search_site --term="contact form"` |
| [`wp_spam_comment`](./tools/wp_spam_comment.md) | comment | Marks a comment as spam. |
| [`wp_switch_auth_method`](./tools/wp_switch_auth_method.md) | auth | Switches the authentication method for a site for the current session. |
| [`wp_test_auth`](./tools/wp_test_auth.md) | auth | Tests the authentication and connectivity for a configured WordPress site with detailed connection diagnostics.

**Usage Examples:**
• Test connection: `wp_test_auth`
• Multi-site test: `wp_test_auth --site="my-site"`
• Verify setup: Use this after configuring new credentials
• Troubleshoot: Run when experiencing connection issues
• Health check: Regular verification of WordPress connectivity |
| [`wp_update_category`](./tools/wp_update_category.md) | taxonomy | Updates an existing category. |
| [`wp_update_comment`](./tools/wp_update_comment.md) | comment | Updates an existing comment. |
| [`wp_update_media`](./tools/wp_update_media.md) | media | Updates the metadata of an existing media item. |
| [`wp_update_page`](./tools/wp_update_page.md) | page | Updates an existing page. |
| [`wp_update_post`](./tools/wp_update_post.md) | post | Updates an existing WordPress post with validation and detailed confirmation. |
| [`wp_update_site_settings`](./tools/wp_update_site_settings.md) | site | Updates one or more general settings for a WordPress site. |
| [`wp_update_tag`](./tools/wp_update_tag.md) | taxonomy | Updates an existing tag. |
| [`wp_update_user`](./tools/wp_update_user.md) | user | Updates an existing user. |
| [`wp_upload_media`](./tools/wp_upload_media.md) | media | Uploads a file to the WordPress media library. |

## Authentication

All tools support multiple authentication methods:
- **Application Passwords** (recommended)
- **JWT Authentication** 
- **Basic Authentication** (development only)
- **API Key Authentication**

## Error Handling

Standard error response format:
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "endpoint": "/wp-json/wp/v2/posts",
    "method": "GET"
  }
}
```

## Configuration

### Multi-Site Configuration
```json
{
  "sites": [
    {
      "id": "site1",
      "name": "My WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://example.com",
        "WORDPRESS_USERNAME": "username",
        "WORDPRESS_APP_PASSWORD": "app_password"
      }
    }
  ]
}
```

## Response Formats

All tools return responses in this format:
```json
{
  "success": true,
  "data": {
    // Tool-specific response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "site": "site1",
    "tool": "wp_list_posts"
  }
}
```

## Performance Monitoring

The server includes comprehensive performance monitoring:
- Real-time metrics collection
- Historical performance analysis
- Industry benchmark comparisons
- Automated optimization recommendations

See [Performance Monitoring Guide](./performance/README.md) for details.

## Additional Resources

- [Tool Reference](./tools/README.md) - Detailed tool documentation
- [Type Definitions](./types/README.md) - TypeScript type definitions
- [Examples](./examples/README.md) - Usage examples and workflows
- [OpenAPI Specification](./openapi.json) - Machine-readable API spec

## Support

- **Documentation:** [GitHub Repository](https://github.com/docdyhr/mcp-wordpress)
- **Issues:** [GitHub Issues](https://github.com/docdyhr/mcp-wordpress/issues)
- **Discussions:** [GitHub Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)
