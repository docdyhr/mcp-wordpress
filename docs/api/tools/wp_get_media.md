# wp_get_media

![media](https://img.shields.io/badge/category-media-purple)

Retrieves a single media item by its ID.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `id` | `number` | ✅ | The unique identifier for the media item. | - | `123`, `456` |

## Examples

### Basic media Usage

Simple example of using wp_get_media

**Command:**
```bash
wp_get_media --id="123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Example media",
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






## Response Format

**Return Type:** `media`

```json
{
  "success": true,
  "data": {
    // media response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_get_media",
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
