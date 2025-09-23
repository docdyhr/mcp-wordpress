# wp_create_page

![page](https://img.shields.io/badge/category-page-lightgrey)

Creates a new page.

## Parameters

| Parameter | Type     | Required | Description                               | Default   | Examples                                              |
| --------- | -------- | -------- | ----------------------------------------- | --------- | ----------------------------------------------------- |
| `title`   | `string` | ✅       | The title for the page.                   | -         | `My Blog Post`, `Hello World`                         |
| `content` | `string` | ❌       | The content for the page, in HTML format. | -         | `<p>Post content here</p>`, `This is my post content` |
| `status`  | `string` | ❌       | The publishing status for the page.       | `publish` | `example`                                             |

## Examples

### Basic page Usage

Simple example of using wp_create_page

**Command:**

```bash
wp_create_page --title="Example Post Title"
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

### Advanced page Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_create_page --title="Example Post Title" --content="This is example content for the post." --status="publish"
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

- `publish_pages`
- `edit_pages`

**Note:** The authenticated user must have these capabilities to successfully execute this tool.

## Response Format

**Return Type:** `page`

```json
{
  "success": true,
  "data": {
    // page response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_create_page",
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
