# wp_update_site_settings

![site](https://img.shields.io/badge/category-site-lightblue)

Updates one or more general settings for a WordPress site.

## Parameters

| Parameter     | Type     | Required | Description                                            | Default | Examples                      |
| ------------- | -------- | -------- | ------------------------------------------------------ | ------- | ----------------------------- |
| `title`       | `string` | ❌       | The title of the site.                                 | -       | `My Blog Post`, `Hello World` |
| `description` | `string` | ❌       | The tagline or description of the site.                | -       | `example`                     |
| `timezone`    | `string` | ❌       | A city in the same timezone, e.g., 'America/New_York'. | -       | `example`                     |

## Examples

### Basic site Usage

Simple example of using wp_update_site_settings

**Command:**

```bash
wp_update_site_settings
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

### Advanced site Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_update_site_settings --title="Example Post Title" --description="example_value" --timezone="example_value"
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
    "tool": "wp_update_site_settings",
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

_Generated automatically from tool definitions - Do not edit manually_
