# wp_update_comment

![comment](https://img.shields.io/badge/category-comment-lightgrey)

Updates an existing comment.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `id` | `number` | ✅ | The ID of the comment to update. | - | `123`, `456` |
| `content` | `string` | ❌ | The updated content for the comment. | - | `<p>Post content here</p>`, `This is my post content` |
| `status` | `string` | ❌ | The new status for the comment. | `publish` | `example` |

## Examples

### Basic comment Usage

Simple example of using wp_update_comment

**Command:**

```bash
wp_update_comment --id="123"
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

### Advanced comment Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_update_comment --id="123" --content="This is example content for the post." --status="publish"
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

**Return Type:** `comment`

```json
{
  "success": true,
  "data": {
    // comment response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_update_comment",
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
