# wp_delete_comment

![comment](https://img.shields.io/badge/category-comment-lightgrey)

Deletes a comment.

## Parameters

| Parameter | Type      | Required | Description                                                                           | Default | Examples     |
| --------- | --------- | -------- | ------------------------------------------------------------------------------------- | ------- | ------------ |
| `id`      | `number`  | ✅       | The ID of the comment to delete.                                                      | -       | `123`, `456` |
| `force`   | `boolean` | ❌       | If true, the comment will be permanently deleted. Defaults to false (moved to trash). | -       | `example`    |

## Examples

### Basic comment Usage

Simple example of using wp_delete_comment

**Command:**

```bash
wp_delete_comment --id="123"
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
    "tool": "wp_delete_comment",
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
