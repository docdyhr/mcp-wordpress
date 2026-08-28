# wp_check_version

![system](https://img.shields.io/badge/category-system-lightgrey)

Check if a newer version of mcp-wordpress is available. Returns current version, latest version, and download URL if
update is available.

## Parameters

_No parameters required._

## Examples

### Basic system Usage

Simple example of using wp_check_version

**Command:**

```bash
wp_check_version
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_check_version executed successfully"
}
```

**Error Example (Authentication failure):**

```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials or insufficient permissions"
}
```

### Multi-Site system Usage

Using wp_check_version with specific site targeting

**Command:**

```bash
wp_check_version --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_check_version executed successfully"
}
```

## Response Format

**Return Type:** `object`

```json
{
  "success": true,
  "data": {
    // object response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_check_version",
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
