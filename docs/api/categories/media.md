# media Tools

File upload, management, and media library tools

**Tool Count:** 5

## Available Tools

- [`wp_delete_media`](../tools/wp_delete_media.md)
- [`wp_get_media`](../tools/wp_get_media.md)
- [`wp_list_media`](../tools/wp_list_media.md)
- [`wp_update_media`](../tools/wp_update_media.md)
- [`wp_upload_media`](../tools/wp_upload_media.md)

## Common Usage Patterns

- Upload images and files
- Organize media library
- Generate thumbnails and variants
- Bulk media operations

## Examples

### Basic media Workflow

```bash
# List all media
wp_list_media

# Get a single item
wp_get_media --id=123
```

### Multi-Site media Management

```bash
# Work with a specific site
wp_list_media --site=production

# Bulk operations
wp_list_media --site=staging --limit=50
```
