# wp_seo_get_live_data

![seo](https://img.shields.io/badge/category-seo-lightgrey)

Retrieve live SEO data from WordPress including plugin-specific metadata and configurations

## Parameters

| Parameter                | Type      | Required | Description                           | Default | Examples              |
| ------------------------ | --------- | -------- | ------------------------------------- | ------- | --------------------- |
| `postId`                 | `number`  | ✅       | WordPress post ID to get SEO data for | -       | `example`             |
| `includeAnalysis`        | `boolean` | ❌       | Include SEO analysis of the live data | -       | `example`             |
| `includeRecommendations` | `boolean` | ❌       | Include optimization recommendations  | -       | `example`             |
| `site`                   | `string`  | ❌       | Site identifier for multi-site setups | -       | `site1`, `production` |

## Examples

### Basic seo Usage

Simple example of using wp_seo_get_live_data

**Command:**

```bash
wp_seo_get_live_data --postId="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Example seo",
    "content": "Example content",
    "status": "publish",
    "date": "2024-01-01T00:00:00Z"
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

Using wp_seo_get_live_data with specific site targeting

**Command:**

```bash
wp_seo_get_live_data --site="site1" --postId="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Example seo",
    "content": "Example content",
    "status": "publish",
    "date": "2024-01-01T00:00:00Z"
  }
}
```

### Advanced seo Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_seo_get_live_data --postId="example_value" --includeAnalysis="example_value" --includeRecommendations="example_value" --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Example seo",
    "content": "Example content",
    "status": "publish",
    "date": "2024-01-01T00:00:00Z"
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
    "tool": "wp_seo_get_live_data",
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
