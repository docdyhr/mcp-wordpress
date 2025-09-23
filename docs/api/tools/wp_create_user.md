# wp_create_user

![user](https://img.shields.io/badge/category-user-lightgrey)

Creates a new user.

## Parameters

| Parameter  | Type     | Required | Description                              | Default | Examples                             |
| ---------- | -------- | -------- | ---------------------------------------- | ------- | ------------------------------------ |
| `username` | `string` | ✅       | The username for the new user.           | -       | `john_doe`, `admin`                  |
| `email`    | `string` | ✅       | The email address for the new user.      | -       | `user@example.com`, `admin@site.com` |
| `password` | `string` | ✅       | The password for the new user.           | -       | `example`                            |
| `roles`    | `array`  | ❌       | An array of roles to assign to the user. | -       | `example`                            |

## Examples

### Basic user Usage

Simple example of using wp_create_user

**Command:**

```bash
wp_create_user --username="john_doe" --email="user@example.com"
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
wp_create_user --username="john_doe" --email="user@example.com" --password="example_value" --roles="example_value"
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

- `create_users`

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
    "tool": "wp_create_user",
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
