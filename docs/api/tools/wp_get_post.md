# wp_get_post

![post](https://img.shields.io/badge/category-post-lightgrey)

Retrieves a single post by its ID.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `id` | `number` | ✅ | The unique identifier for the post. | - | `123`, `456` |

## Examples

### Basic post Usage

Simple example of using wp_get_post

**Command:**
```bash
wp_get_post --id="123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Example post",
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


## WordPress REST API Mapping

**Endpoint:** `/wp-json/wp/v2/posts/{id}`

This tool directly interfaces with the WordPress REST API endpoint above. The response format and available
parameters are determined by WordPress core functionality.

### WordPress Documentation
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Endpoint Reference](https://developer.wordpress.org/rest-api/reference/)




## Response Format

**Return Type:** `post`

```json
{
  "success": true,
  "data": {
    // post response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_get_post",
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
