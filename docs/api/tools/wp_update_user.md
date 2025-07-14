# wp_update_user

![user](https://img.shields.io/badge/category-user-lightgrey)

Updates an existing user.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `id` | `number` | ✅ | The ID of the user to update. | - | `123`, `456` |
| `email` | `string` | ❌ | The new email address for the user. | - | `user@example.com`, `admin@site.com` |
| `name` | `string` | ❌ | The new display name for the user. | - | `example` |

## Examples

### Basic user Usage

Simple example of using wp_update_user

**Command:**
```bash
wp_update_user --id="123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Created/Updated successfully",
    "status": "publish"
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


### Advanced user Configuration

Comprehensive example using all available parameters

**Command:**
```bash
wp_update_user --id="123" --email="user@example.com" --name="example_value"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Created/Updated successfully",
    "status": "publish"
  }
}
```






## Required Permissions

This tool requires the following WordPress user capabilities:

- `edit_users`

**Note:** The authenticated user must have these capabilities to successfully execute this tool.


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
    "tool": "wp_update_user",
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
