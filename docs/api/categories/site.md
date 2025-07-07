# site Tools

Site settings and configuration tools

**Tool Count:** 6

## Available Tools

- [`wp_create_application_password`](./tools/wp_create_application_password.md)
- [`wp_delete_application_password`](./tools/wp_delete_application_password.md)
- [`wp_get_application_passwords`](./tools/wp_get_application_passwords.md)
- [`wp_get_site_settings`](./tools/wp_get_site_settings.md)
- [`wp_search_site`](./tools/wp_search_site.md)
- [`wp_update_site_settings`](./tools/wp_update_site_settings.md)

## Common Usage Patterns

- Manage site efficiently
- Bulk site operations
- Search and filter site

## Examples

### Basic site Workflow

```bash
# List all site
wp_list_site

# Get specific item
wp_get_sit --id=123

# Create new item  
wp_create_sit --title="Example"
```

### Multi-Site site Management

```bash
# Work with specific site
wp_list_site --site=production

# Bulk operations
wp_list_site --site=staging --limit=50
```
