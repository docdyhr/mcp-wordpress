# wp_delete_media

![media](https://img.shields.io/badge/category-media-purple)

Deletes a media item.

## Parameters

_No parameters required._

## Examples

### Basic media Usage

Simple example of using wp_delete_media

**Command:**

```bash
wp_delete_media
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": 123
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

### Multi-Site media Usage

Using wp_delete_media with specific site targeting

**Command:**

```bash
wp_delete_media --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": 123
  }
}
```

## Required Permissions

This tool requires the following WordPress user capabilities:

- `delete_files`

**Note:** The authenticated user must have these capabilities to successfully execute this tool.

## Response Format

**Return Type:** `DeleteResult`

```json
{
  "success": true,
  "data": {
    // DeleteResult response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_delete_media",
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
