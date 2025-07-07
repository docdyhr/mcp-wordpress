# wp_get_auth_status

![auth](https://img.shields.io/badge/category-auth-darkblue)

Gets the current authentication status for a configured WordPress site.

## Parameters

*No parameters required.*

## Examples

### Basic auth Usage

Simple example of using wp_get_auth_status

**Command:**

```bash
wp_get_auth_status 
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Example auth",
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

**Return Type:** `auth`

```json
{
  "success": true,
  "data": {
    // auth response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_get_auth_status",
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
