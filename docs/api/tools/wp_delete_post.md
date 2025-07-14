# wp_delete_post

![post](https://img.shields.io/badge/category-post-lightgrey)

Deletes a post.

## Parameters

| Parameter | Type      | Required | Description                                                              | Default | Examples     |
| --------- | --------- | -------- | ------------------------------------------------------------------------ | ------- | ------------ |
| `id`      | `number`  | ✅       | The ID of the post to delete.                                            | -       | `123`, `456` |
| `force`   | `boolean` | ❌       | If true, permanently delete. If false, move to trash. Defaults to false. | -       | `example`    |

## Examples

### Basic post Usage

Simple example of using wp_delete_post

**Command:**

```bash
wp_delete_post --id="123"
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

## WordPress REST API Mapping

**Endpoint:** `/wp-json/wp/v2/posts/{id}`

This tool directly interfaces with the WordPress REST API endpoint above. The response format and available parameters
are determined by WordPress core functionality.

### WordPress Documentation

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Endpoint Reference](https://developer.wordpress.org/rest-api/reference/)

## Required Permissions

This tool requires the following WordPress user capabilities:

- `delete_posts`

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
    "tool": "wp_delete_post",
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
