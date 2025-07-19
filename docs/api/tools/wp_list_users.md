# wp_list_users

![user](https://img.shields.io/badge/category-user-lightgrey)

Lists users from a WordPress site with comprehensive filtering and detailed user information including roles, registration dates, and activity status.

**Usage Examples:**
• List all users: `wp_list_users`
• Search users: `wp_list_users --search="john"`
• Filter by role: `wp_list_users --roles=["editor","author"]`
• Find admins: `wp_list_users --roles=["administrator"]`
• Combined search: `wp_list_users --search="smith" --roles=["subscriber"]`

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `search` | `string` | ❌ | Limit results to those matching a search term. | - | `wordpress`, `tutorial` |
| `roles` | `array` | ❌ | Limit results to users with specific roles. | - | `example` |

## Examples

### Basic user Usage

Simple example of using wp_list_users

**Command:**
```bash
wp_list_users 
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Example user 1",
      "status": "publish"
    },
    {
      "id": 2,
      "title": "Example user 2",
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

**Return Type:** `user[]`

```json
{
  "success": true,
  "data": {
    // user[] response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_list_users",
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
