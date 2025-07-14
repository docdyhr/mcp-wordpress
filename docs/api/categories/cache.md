# cache Tools

Performance caching and optimization tools

**Tool Count:** 4

## Available Tools

- [`wp_cache_clear`](./tools/wp_cache_clear.md)
- [`wp_cache_info`](./tools/wp_cache_info.md)
- [`wp_cache_stats`](./tools/wp_cache_stats.md)
- [`wp_cache_warm`](./tools/wp_cache_warm.md)

## Common Usage Patterns

- Manage cache efficiently
- Bulk cache operations
- Search and filter cache

## Examples

### Basic cache Workflow

```bash
# List all cache
wp_list_cache

# Get specific item
wp_get_cach --id=123

# Create new item
wp_create_cach --title="Example"
```

### Multi-Site cache Management

```bash
# Work with specific site
wp_list_cache --site=production

# Bulk operations
wp_list_cache --site=staging --limit=50
```
