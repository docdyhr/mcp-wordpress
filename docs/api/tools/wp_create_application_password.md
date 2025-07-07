# wp_create_application_password

![site](https://img.shields.io/badge/category-site-lightblue)

Creates a new application password for a user.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `user_id` | `number` | ✅ | The ID of the user to create the password for. | - | `example` |
| `app_name` | `string` | ✅ | The name of the application this password is for. | - | `example` |

## Examples

### Basic site Usage

Simple example of using wp_create_application_password

**Command:**

```bash
wp_create_application_password --user_id="example_value" --app_name="example_value"
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

## Response Format

**Return Type:** `site`

```json
{
  "success": true,
  "data": {
    // site response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_create_application_password",
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
