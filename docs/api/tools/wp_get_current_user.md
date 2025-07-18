# wp_get_current_user

![user](https://img.shields.io/badge/category-user-lightgrey)

Retrieves the currently authenticated user with comprehensive profile information including roles, capabilities, and account details.

**Usage Examples:**
• Get current user: `wp_get_current_user`
• Check permissions: Use this to verify your current user's capabilities and roles
• Account verification: Confirm you're authenticated with the correct account
• Profile details: View registration date, email, and user metadata

## Parameters

*No parameters required.*

## Examples

### Basic user Usage

Simple example of using wp_get_current_user

**Command:**
```bash
wp_get_current_user 
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Example user",
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

**Return Type:** `user`

```json
{
  "success": true,
  "data": {
    // user response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_get_current_user",
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
