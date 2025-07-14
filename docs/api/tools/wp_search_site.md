# wp_search_site

![site](https://img.shields.io/badge/category-site-lightblue)

Performs a site-wide search for content.

## Parameters

| Parameter | Type     | Required | Description                    | Default | Examples  |
| --------- | -------- | -------- | ------------------------------ | ------- | --------- |
| `term`    | `string` | ✅       | The search term to look for.   | -       | `example` |
| `type`    | `string` | ❌       | The type of content to search. | -       | `example` |

## Examples

### Basic site Usage

Simple example of using wp_search_site

**Command:**

```bash
wp_search_site --term="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_search_site executed successfully"
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

**Return Type:** `site[]`

```json
{
  "success": true,
  "data": {
    // site[] response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_search_site",
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
