# wp_update_media

![media](https://img.shields.io/badge/category-media-purple)

Updates the metadata of an existing media item.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `id` | `number` | ✅ | The ID of the media item to update. | - | `123`, `456` |
| `title` | `string` | ❌ | The new title for the media item. | - | `My Blog Post`, `Hello World` |
| `alt_text` | `string` | ❌ | The new alternative text. | - | `example` |
| `caption` | `string` | ❌ | The new caption. | - | `example` |
| `description` | `string` | ❌ | The new description. | - | `example` |

## Examples

### Basic media Usage

Simple example of using wp_update_media

**Command:**

```bash
wp_update_media --id="123"
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

### Advanced media Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_update_media --id="123" --title="Example Post Title" --alt_text="example_value" --caption="example_value" --description="example_value"
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

**Return Type:** `media`

```json
{
  "success": true,
  "data": {
    // media response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_update_media",
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
