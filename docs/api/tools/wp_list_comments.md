# wp_list_comments

![comment](https://img.shields.io/badge/category-comment-lightgrey)

Lists comments from a WordPress site, with filters.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `post` | `number` | ❌ | Limit results to comments assigned to a specific post ID. | - | `example` |
| `status` | `string` | ❌ | Filter by comment status. | `publish` | `example` |

## Examples

### Basic comment Usage

Simple example of using wp_list_comments

**Command:**
```bash
wp_list_comments 
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Example comment 1",
      "status": "publish"
    },
    {
      "id": 2,
      "title": "Example comment 2",
      "status": "draft"
    }
  ],
  "total": 2,
  "pages": 1
}
```

**Error Example (Authentication failure):**
```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials or insufficient permissions"
}
```






## Response Format

**Return Type:** `comment[]`

```json
{
  "success": true,
  "data": {
    // comment[] response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_list_comments",
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
