# wp_list_plugins

![system](https://img.shields.io/badge/category-system-lightgrey)

Lists installed WordPress plugins with their active status, version, and author. Requires the activate_plugins
capability.

## Parameters

_No parameters required._

## Examples

### Basic system Usage

Simple example of using wp_list_plugins

**Command:**

```bash
wp_list_plugins
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "plugin": "woocommerce/woocommerce.php",
      "status": "active",
      "name": "WooCommerce",
      "version": "9.0",
      "author": "Automattic"
    },
    {
      "plugin": "hello.php",
      "status": "inactive",
      "name": "Hello Dolly",
      "version": "1.7.2",
      "author": "Matt Mullenweg"
    }
  ]
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

Using wp_list_plugins with specific site targeting

**Command:**

```bash
wp_list_plugins --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "plugin": "woocommerce/woocommerce.php",
      "status": "active",
      "name": "WooCommerce",
      "version": "9.0",
      "author": "Automattic"
    },
    {
      "plugin": "hello.php",
      "status": "inactive",
      "name": "Hello Dolly",
      "version": "1.7.2",
      "author": "Matt Mullenweg"
    }
  ]
}
```

## WordPress REST API Mapping

**Endpoint:** `/wp-json/wp/v2/plugins`

This tool directly interfaces with the WordPress REST API endpoint above. The response format and available parameters
are determined by WordPress core functionality.

### WordPress Documentation

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Endpoint Reference](https://developer.wordpress.org/rest-api/reference/)

## Required Permissions

This tool requires the following WordPress user capabilities:

- `activate_plugins`

**Note:** The authenticated user must have these capabilities to successfully execute this tool.

## Response Format

**Return Type:** `WordPressPlugin[]`

```json
{
  "success": true,
  "data": {
    // WordPressPlugin[] response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_list_plugins",
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
