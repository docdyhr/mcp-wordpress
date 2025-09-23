# wp_switch_auth_method

![auth](https://img.shields.io/badge/category-auth-darkblue)

Switches the authentication method for a site for the current session.

## Parameters

| Parameter   | Type     | Required | Description                                                               | Default | Examples            |
| ----------- | -------- | -------- | ------------------------------------------------------------------------- | ------- | ------------------- |
| `method`    | `string` | ✅       | The new authentication method to use.                                     | -       | `example`           |
| `username`  | `string` | ❌       | The username for 'app-password' or 'basic' authentication.                | -       | `john_doe`, `admin` |
| `password`  | `string` | ❌       | The Application Password for 'app-password' or password for 'basic' auth. | -       | `example`           |
| `jwt_token` | `string` | ❌       | The token for 'jwt' authentication.                                       | -       | `example`           |

## Examples

### Basic auth Usage

Simple example of using wp_switch_auth_method

**Command:**

```bash
wp_switch_auth_method --method="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_switch_auth_method executed successfully"
}
```

**Error Example (Authentication failure):**

```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials or insufficient permissions"
}
```

### Advanced auth Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_switch_auth_method --method="example_value" --username="john_doe" --password="example_value" --jwt_token="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_switch_auth_method executed successfully"
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
    "tool": "wp_switch_auth_method",
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
