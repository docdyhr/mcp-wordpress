# system Tools

system management tools

**Tool Count:** 3

## Available Tools

- [`wp_check_version`](../tools/wp_check_version.md)
- [`wp_list_plugins`](../tools/wp_list_plugins.md)
- [`wp_list_themes`](../tools/wp_list_themes.md)

## Common Usage Patterns

- Manage system efficiently
- Bulk system operations
- Search and filter system

## Examples

### Basic system Workflow

```bash
# List all system
wp_list_plugins
```

### Multi-Site system Management

```bash
# Work with a specific site
wp_list_plugins --site=production

# Use the same tool against another site
wp_list_plugins --site=staging
```
