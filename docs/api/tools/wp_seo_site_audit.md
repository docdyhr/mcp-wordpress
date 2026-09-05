# wp_seo_site_audit

![seo](https://img.shields.io/badge/category-seo-lightgrey)

Perform comprehensive SEO audit of the WordPress site including technical, content, and performance analysis

## Parameters

| Parameter              | Type      | Required | Description                                     | Default | Examples              |
| ---------------------- | --------- | -------- | ----------------------------------------------- | ------- | --------------------- |
| `auditType`            | `string`  | ❌       | Type of audit to perform (default: full)        | -       | `example`             |
| `maxPages`             | `number`  | ❌       | Maximum number of pages to audit (default: 100) | -       | `example`             |
| `includeExternalLinks` | `boolean` | ❌       | Include external link validation in audit       | -       | `example`             |
| `force`                | `boolean` | ❌       | Force refresh, bypassing cached audit results   | -       | `example`             |
| `site`                 | `string`  | ❌       | Site identifier for multi-site setups           | -       | `site1`, `production` |

## Examples

### Basic seo Usage

Simple example of using wp_seo_site_audit

**Command:**

```bash
wp_seo_site_audit
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_site_audit executed successfully"
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

Using wp_seo_site_audit with specific site targeting

**Command:**

```bash
wp_seo_site_audit --site="site1" --auditType="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_site_audit executed successfully"
}
```

### Advanced seo Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_seo_site_audit --auditType="example_value" --maxPages="example_value" --includeExternalLinks="example_value" --force="example_value" --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_site_audit executed successfully"
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
    "tool": "wp_seo_site_audit",
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
