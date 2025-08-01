# wp_list_pages

![page](https://img.shields.io/badge/category-page-lightgrey)

Lists pages from a WordPress site, with filters.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `per_page` | `number` | ❌ | Number of items to return per page (max 100). | `10` | `10`, `20` |
| `search` | `string` | ❌ | Limit results to those matching a search term. | - | `wordpress`, `tutorial` |
| `status` | `string` | ❌ | Filter by page status. | `publish` | `example` |

## Examples

### Basic page Usage

Simple example of using wp_list_pages

**Command:**
```bash
wp_list_pages 
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Example page 1",
      "status": "publish"
    },
    {
      "id": 2,
      "title": "Example page 2",
      "status": "draft"
    }
  ],
  "total": 2,
  "pages": 1
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
wp_list_pages --per_page="10" --search="wordpress" --status="publish"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Example page 1",
      "status": "publish"
    },
    {
      "id": 2,
      "title": "Example page 2",
      "status": "draft"
    }
  ],
  "total": 2,
  "pages": 1
}
```








## Response Format

**Return Type:** `page[]`

```json
{
  "success": true,
  "data": {
    // page[] response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_list_pages",
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
