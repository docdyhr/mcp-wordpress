# comment Tools

comment management tools

**Tool Count:** 7

## Available Tools

- [`wp_approve_comment`](./tools/wp_approve_comment.md)
- [`wp_create_comment`](./tools/wp_create_comment.md)
- [`wp_delete_comment`](./tools/wp_delete_comment.md)
- [`wp_get_comment`](./tools/wp_get_comment.md)
- [`wp_list_comments`](./tools/wp_list_comments.md)
- [`wp_spam_comment`](./tools/wp_spam_comment.md)
- [`wp_update_comment`](./tools/wp_update_comment.md)

## Common Usage Patterns

- Manage comment efficiently
- Bulk comment operations
- Search and filter comment

## Examples

### Basic comment Workflow
```bash
# List all comment
wp_list_comment

# Get specific item
wp_get_commen --id=123

# Create new item  
wp_create_commen --title="Example"
```

### Multi-Site comment Management
```bash
# Work with specific site
wp_list_comment --site=production

# Bulk operations
wp_list_comment --site=staging --limit=50
```
