# wp_seo_analyze_content

![seo](https://img.shields.io/badge/category-seo-lightgrey)

Analyze WordPress post content for SEO optimization opportunities including readability, keyword density, structure, and
technical factors

## Parameters

| Parameter       | Type     | Required | Description                                     | Default | Examples              |
| --------------- | -------- | -------- | ----------------------------------------------- | ------- | --------------------- |
| `postId`        | `number` | ✅       | WordPress post ID to analyze                    | -       | `example`             |
| `analysisType`  | `string` | ❌       | Type of SEO analysis to perform (default: full) | -       | `example`             |
| `focusKeywords` | `array`  | ❌       | Primary keywords to analyze for optimization    | -       | `example`             |
| `site`          | `string` | ❌       | Site identifier for multi-site setups           | -       | `site1`, `production` |

## Examples

### Basic seo Usage

Simple example of using wp_seo_analyze_content

**Command:**

```bash
wp_seo_analyze_content --postId="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_analyze_content executed successfully"
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

Using wp_seo_analyze_content with specific site targeting

**Command:**

```bash
wp_seo_analyze_content --site="site1" --postId="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_analyze_content executed successfully"
}
```

### Advanced seo Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_seo_analyze_content --postId="example_value" --analysisType="example_value" --focusKeywords="example_value" --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_analyze_content executed successfully"
}
```

## Response Format

**Return Type:** `object`

```json
{
  "success": true,
  "data": {
    // object response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_seo_analyze_content",
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
