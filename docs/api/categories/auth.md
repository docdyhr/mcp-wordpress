# auth Tools

Authentication testing and management tools

**Tool Count:** 3

## Available Tools

- [`wp_get_auth_status`](./tools/wp_get_auth_status.md)
- [`wp_switch_auth_method`](./tools/wp_switch_auth_method.md)
- [`wp_test_auth`](./tools/wp_test_auth.md)

## Common Usage Patterns

- Manage auth efficiently
- Bulk auth operations
- Search and filter auth

## Examples

### Basic auth Workflow

```bash
# List all auth
wp_list_auth

# Get specific item
wp_get_aut --id=123

# Create new item
wp_create_aut --title="Example"
```

### Multi-Site auth Management

```bash
# Work with specific site
wp_list_auth --site=production

# Bulk operations
wp_list_auth --site=staging --limit=50
```
