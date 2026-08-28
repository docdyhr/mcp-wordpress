# wp_seo_validate_schema

![seo](https://img.shields.io/badge/category-seo-lightgrey)

Validate JSON-LD schema markup for correctness and compliance

## Parameters

| Parameter            | Type      | Required | Description                                       | Default | Examples              |
| -------------------- | --------- | -------- | ------------------------------------------------- | ------- | --------------------- |
| `schema`             | `object`  | ✅       | JSON-LD schema object to validate                 | -       | `example`             |
| `schemaType`         | `string`  | ❌       | Expected schema type for validation               | -       | `example`             |
| `useGoogleValidator` | `boolean` | ❌       | Use Google's Rich Results Test API for validation | -       | `example`             |
| `site`               | `string`  | ❌       | Site identifier for multi-site setups             | -       | `site1`, `production` |

## Examples

### Basic seo Usage

Simple example of using wp_seo_validate_schema

**Command:**

```bash
wp_seo_validate_schema --schema="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_validate_schema executed successfully"
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

Using wp_seo_validate_schema with specific site targeting

**Command:**

```bash
wp_seo_validate_schema --site="site1" --schema="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_validate_schema executed successfully"
}
```

### Advanced seo Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_seo_validate_schema --schema="example_value" --schemaType="example_value" --useGoogleValidator="example_value" --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_validate_schema executed successfully"
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
    "tool": "wp_seo_validate_schema",
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
