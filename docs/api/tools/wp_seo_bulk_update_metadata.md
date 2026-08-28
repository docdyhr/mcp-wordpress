# wp_seo_bulk_update_metadata

![seo](https://img.shields.io/badge/category-seo-lightgrey)

Update SEO metadata for multiple posts with progress tracking and error handling

## Parameters

| Parameter | Type      | Required | Description                                     | Default | Examples              |
| --------- | --------- | -------- | ----------------------------------------------- | ------- | --------------------- |
| `postIds` | `array`   | ✅       | Array of WordPress post IDs to update           | -       | `example`             |
| `updates` | `object`  | ✅       | Metadata fields to update for all posts         | -       | `example`             |
| `dryRun`  | `boolean` | ❌       | Perform a dry run without making actual changes | -       | `example`             |
| `site`    | `string`  | ❌       | Site identifier for multi-site setups           | -       | `site1`, `production` |

## Examples

### Basic seo Usage

Simple example of using wp_seo_bulk_update_metadata

**Command:**

```bash
wp_seo_bulk_update_metadata --postIds="example_value" --updates="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Created/Updated successfully",
    "status": "publish"
  }
}
```

**Error Example (Authentication failure):**

```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials or insufficient permissions"
}
```

### Multi-Site seo Usage

Using wp_seo_bulk_update_metadata with specific site targeting

**Command:**

```bash
wp_seo_bulk_update_metadata --site="site1" --postIds="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Created/Updated successfully",
    "status": "publish"
  }
}
```

### Advanced seo Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_seo_bulk_update_metadata --postIds="example_value" --updates="example_value" --dryRun="example_value" --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Created/Updated successfully",
    "status": "publish"
  }
}
```

## Response Format

**Return Type:** `seo`

```json
{
  "success": true,
  "data": {
    // seo response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_seo_bulk_update_metadata",
    "site": "site1"
  }
}
```

## Error Handling

### AUTHENTICATION_FAILED

**Message:** Authentication failed **Description:** Invalid credentials or insufficient permissions **Resolution:**
Check your authentication credentials and user permissions

### VALIDATION_ERROR

**Message:** Parameter validation failed **Description:** One or more required parameters are missing or invalid
**Resolution:** Review the required parameters and their formats

### NOT_FOUND

**Message:** Resource not found **Description:** The requested resource does not exist **Resolution:** Verify the
resource ID and ensure it exists

### PERMISSION_DENIED

**Message:** Insufficient permissions **Description:** The user does not have permission to perform this action
**Resolution:** Contact an administrator to grant the necessary permissions

---

_Generated automatically from tool definitions - Do not edit manually_
