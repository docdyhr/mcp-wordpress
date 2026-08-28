# post Tools

post management tools

**Tool Count:** 6

## Available Tools

- [`wp_create_post`](../tools/wp_create_post.md)
- [`wp_delete_post`](../tools/wp_delete_post.md)
- [`wp_get_post`](../tools/wp_get_post.md)
- [`wp_get_post_revisions`](../tools/wp_get_post_revisions.md)
- [`wp_list_posts`](../tools/wp_list_posts.md)
- [`wp_update_post`](../tools/wp_update_post.md)

## Common Usage Patterns

- Manage post efficiently
- Bulk post operations
- Search and filter post

## Examples

### Basic post Workflow

```bash
# List all post
wp_list_posts

# Get a single item
wp_get_post --id=123

# Create a new item
wp_create_post --title="Example"
```

### Multi-Site post Management

```bash
# Work with a specific site
wp_list_posts --site=production

# Bulk operations
wp_list_posts --site=staging --limit=50
```
