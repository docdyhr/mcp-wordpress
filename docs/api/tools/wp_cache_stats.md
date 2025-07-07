# wp_cache_stats

![cache](https://img.shields.io/badge/category-cache-grey)

Get cache statistics for a WordPress site.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `site` | `string` | ❌ | Site ID to get cache stats for. If not provided, uses default site or fails if multiple sites configured. | - | `site1`, `production` |

## Examples

### Basic cache Usage

Simple example of using wp_cache_stats

**Command:**

```bash
wp_cache_stats 
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_cache_stats executed successfully"
}
```

**Error Example (Authentication failure):**

```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials or insufficient permissions"
}
```

### Multi-Site cache Usage

Using wp_cache_stats with specific site targeting

**Command:**

```bash
wp_cache_stats --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_cache_stats executed successfully"
}
```

## Response Format

**Return Type:** `CacheStats`

```json
{
  "success": true,
  "data": {
    // CacheStats response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_cache_stats",
    "site": "site1"
  }
}
```

## Error Handling

### AUTHENTICATION_FAILED

**Message:** Authentication failed  
**Description:** Invalid credentials or insufficient permissions  
**Resolution:** Check your authentication credentials and user permissions

### VALIDATION_ERROR

**Message:** Parameter validation failed  
**Description:** One or more required parameters are missing or invalid  
**Resolution:** Review the required parameters and their formats

### NOT_FOUND

**Message:** Resource not found  
**Description:** The requested resource does not exist  
**Resolution:** Verify the resource ID and ensure it exists

### PERMISSION_DENIED

**Message:** Insufficient permissions  
**Description:** The user does not have permission to perform this action  
**Resolution:** Contact an administrator to grant the necessary permissions

---

*Generated automatically from tool definitions - Do not edit manually*
