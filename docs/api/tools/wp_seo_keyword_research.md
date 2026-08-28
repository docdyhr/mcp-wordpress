# wp_seo_keyword_research

![seo](https://img.shields.io/badge/category-seo-lightgrey)

Research keywords and get suggestions based on topic and competition analysis

## Parameters

_No parameters required._

## Examples

### Basic seo Usage

Simple example of using wp_seo_keyword_research

**Command:**

```bash
wp_seo_keyword_research
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_keyword_research executed successfully"
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

Using wp_seo_keyword_research with specific site targeting

**Command:**

```bash
wp_seo_keyword_research --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_seo_keyword_research executed successfully"
}
```

## Response Format

**Return Type:** `seo[]`

```json
{
  "success": true,
  "data": {
    // seo[] response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_seo_keyword_research",
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
