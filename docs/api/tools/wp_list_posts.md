# wp_list_posts

![post](https://img.shields.io/badge/category-post-lightgrey)

Lists posts from a WordPress site, with filters.

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `per_page` | `number` | ❌ | Number of items to return per page (max 100). | `10` | `10`, `20` |
| `search` | `string` | ❌ | Limit results to those matching a search term. | - | `wordpress`, `tutorial` |
| `status` | `string` | ❌ | Filter by post status. | `publish` | `example` |
| `categories` | `array` | ❌ | Limit results to posts in specific category IDs. | - | `example` |
| `tags` | `array` | ❌ | Limit results to posts with specific tag IDs. | - | `example` |

## Examples

### Basic post Usage

Simple example of using wp_list_posts

**Command:**
```bash
wp_list_posts 
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Example post 1",
      "status": "publish"
    },
    {
      "id": 2,
      "title": "Example post 2",
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


### Advanced post Configuration

Comprehensive example using all available parameters

**Command:**
```bash
wp_list_posts --per_page="10" --search="wordpress" --status="publish" --categories="example_value" --tags="example_value"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Example post 1",
      "status": "publish"
    },
    {
      "id": 2,
      "title": "Example post 2",
      "status": "draft"
    }
  ],
  "total": 2,
  "pages": 1
}
```




## WordPress REST API Mapping

**Endpoint:** `/wp-json/wp/v2/posts`

This tool directly interfaces with the WordPress REST API endpoint above. The response format and available parameters are determined by WordPress core functionality.

### WordPress Documentation
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Endpoint Reference](https://developer.wordpress.org/rest-api/reference/)




## Response Format

**Return Type:** `post[]`

```json
{
  "success": true,
  "data": {
    // post[] response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_list_posts",
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
