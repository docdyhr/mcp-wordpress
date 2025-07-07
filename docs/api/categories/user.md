# user Tools

user management tools

**Tool Count:** 6

## Available Tools

- [`wp_create_user`](./tools/wp_create_user.md)
- [`wp_delete_user`](./tools/wp_delete_user.md)
- [`wp_get_current_user`](./tools/wp_get_current_user.md)
- [`wp_get_user`](./tools/wp_get_user.md)
- [`wp_list_users`](./tools/wp_list_users.md)
- [`wp_update_user`](./tools/wp_update_user.md)

## Common Usage Patterns

- Manage user efficiently
- Bulk user operations
- Search and filter user

## Examples

### Basic user Workflow

```bash
# List all user
wp_list_user

# Get specific item
wp_get_use --id=123

# Create new item  
wp_create_use --title="Example"
```

### Multi-Site user Management

```bash
# Work with specific site
wp_list_user --site=production

# Bulk operations
wp_list_user --site=staging --limit=50
```
