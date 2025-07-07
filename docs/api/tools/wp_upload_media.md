# wp_upload_media

![media](https://img.shields.io/badge/category-media-purple)

Uploads a file to the WordPress media library.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `file_path` | `string` | ✅ | The local, absolute path to the file to upload. | - | `example` |
| `title` | `string` | ❌ | The title for the media item. | - | `My Blog Post`, `Hello World` |
| `alt_text` | `string` | ❌ | Alternative text for the media item (for accessibility). | - | `example` |
| `caption` | `string` | ❌ | The caption for the media item. | - | `example` |
| `description` | `string` | ❌ | The description for the media item. | - | `example` |
| `post` | `number` | ❌ | The ID of a post to attach this media to. | - | `example` |

## Examples

### Basic media Usage

Simple example of using wp_upload_media

**Command:**

```bash
wp_upload_media --file_path="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_upload_media executed successfully"
}
```

**Error Example (Authentication failure):**

```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials or insufficient permissions"
}
```

### Advanced media Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_upload_media --file_path="example_value" --title="Example Post Title" --alt_text="example_value" --caption="example_value" --description="example_value" --post="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_upload_media executed successfully"
}
```

## Required Permissions

This tool requires the following WordPress user capabilities:

- `upload_files`

**Note:** The authenticated user must have these capabilities to successfully execute this tool.

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
    "tool": "wp_upload_media",
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
