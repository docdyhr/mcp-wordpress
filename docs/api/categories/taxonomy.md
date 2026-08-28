# taxonomy Tools

taxonomy management tools

**Tool Count:** 10

## Available Tools

- [`wp_create_category`](../tools/wp_create_category.md)
- [`wp_create_tag`](../tools/wp_create_tag.md)
- [`wp_delete_category`](../tools/wp_delete_category.md)
- [`wp_delete_tag`](../tools/wp_delete_tag.md)
- [`wp_get_category`](../tools/wp_get_category.md)
- [`wp_get_tag`](../tools/wp_get_tag.md)
- [`wp_list_categories`](../tools/wp_list_categories.md)
- [`wp_list_tags`](../tools/wp_list_tags.md)
- [`wp_update_category`](../tools/wp_update_category.md)
- [`wp_update_tag`](../tools/wp_update_tag.md)

## Common Usage Patterns

- Manage taxonomy efficiently
- Bulk taxonomy operations
- Search and filter taxonomy

## Examples

### Basic taxonomy Workflow

```bash
# List all taxonomy
wp_list_categories

# Get a single item
wp_get_category --id=123

# Create a new item
wp_create_category --title="Example"
```

### Multi-Site taxonomy Management

```bash
# Work with a specific site
wp_list_categories --site=production

# Bulk operations
wp_list_categories --site=staging --limit=50
```
