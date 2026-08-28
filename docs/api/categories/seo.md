# seo Tools

seo management tools

**Tool Count:** 11

## Available Tools

- [`wp_seo_analyze_content`](./tools/wp_seo_analyze_content.md)
- [`wp_seo_bulk_update_metadata`](./tools/wp_seo_bulk_update_metadata.md)
- [`wp_seo_generate_metadata`](./tools/wp_seo_generate_metadata.md)
- [`wp_seo_generate_schema`](./tools/wp_seo_generate_schema.md)
- [`wp_seo_get_live_data`](./tools/wp_seo_get_live_data.md)
- [`wp_seo_keyword_research`](./tools/wp_seo_keyword_research.md)
- [`wp_seo_site_audit`](./tools/wp_seo_site_audit.md)
- [`wp_seo_suggest_internal_links`](./tools/wp_seo_suggest_internal_links.md)
- [`wp_seo_test_integration`](./tools/wp_seo_test_integration.md)
- [`wp_seo_track_serp`](./tools/wp_seo_track_serp.md)
- [`wp_seo_validate_schema`](./tools/wp_seo_validate_schema.md)

## Common Usage Patterns

- Manage seo efficiently
- Bulk seo operations
- Search and filter seo

## Examples

### Basic seo Workflow

```bash
# List all seo
wp_list_seo

# Get specific item
wp_get_se --id=123

# Create new item
wp_create_se --title="Example"
```

### Multi-Site seo Management

```bash
# Work with specific site
wp_list_seo --site=production

# Bulk operations
wp_list_seo --site=staging --limit=50
```
