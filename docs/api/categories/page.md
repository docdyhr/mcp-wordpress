# page Tools

page management tools

**Tool Count:** 6

## Available Tools

- [`wp_create_page`](./tools/wp_create_page.md)
- [`wp_delete_page`](./tools/wp_delete_page.md)
- [`wp_get_page`](./tools/wp_get_page.md)
- [`wp_get_page_revisions`](./tools/wp_get_page_revisions.md)
- [`wp_list_pages`](./tools/wp_list_pages.md)
- [`wp_update_page`](./tools/wp_update_page.md)

## Common Usage Patterns

- Manage page efficiently
- Bulk page operations
- Search and filter page

## Examples

### Basic page Workflow

```bash
# List all page
wp_list_page

# Get specific item
wp_get_pag --id=123

# Create new item
wp_create_pag --title="Example"
```

### Multi-Site page Management

```bash
# Work with specific site
wp_list_page --site=production

# Bulk operations
wp_list_page --site=staging --limit=50
```
