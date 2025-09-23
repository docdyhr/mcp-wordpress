# media Tools

File upload, management, and media library tools

**Tool Count:** 5

## Available Tools

- [`wp_delete_media`](./tools/wp_delete_media.md)
- [`wp_get_media`](./tools/wp_get_media.md)
- [`wp_list_media`](./tools/wp_list_media.md)
- [`wp_update_media`](./tools/wp_update_media.md)
- [`wp_upload_media`](./tools/wp_upload_media.md)

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

# Get specific item
wp_get_medi --id=123

# Create new item
wp_create_medi --title="Example"
```

### Multi-Site media Management

```bash
# Work with specific site
wp_list_media --site=production

# Bulk operations
wp_list_media --site=staging --limit=50
```
