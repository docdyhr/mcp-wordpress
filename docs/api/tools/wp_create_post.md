# wp_create_post

![post](https://img.shields.io/badge/category-post-lightgrey)

Creates a new WordPress post with comprehensive validation and detailed success feedback including management links.

**Usage Examples:** • Simple post: `wp_create_post --title="My New Post" --content="<p>Hello World!</p>"` • Draft post:
`wp_create_post --title="Draft Post" --status="draft"` • Categorized post:
`wp_create_post --title="Tech News" --categories=[1,5] --tags=[10,20]` • Post with featured image:
`wp_create_post --title="My Post" --content="<p>Content</p>" --featured_media=42` • Remove featured image:
`wp_create_post --title="My Post" --featured_media=0` • Scheduled post:
`wp_create_post --title="Future Post" --status="future" --date="2024-12-25T10:00:00"` • Complete post:
`wp_create_post --title="Complete Post" --content="<p>Content</p>" --excerpt="Summary" --status="publish"`

## Parameters

_No parameters required._

## Examples

### Basic post Usage

Simple example of using wp_create_post

**Command:**

```bash
wp_create_post
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

### Multi-Site post Usage

Using wp_create_post with specific site targeting

**Command:**

```bash
wp_create_post --site="site1"
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

## WordPress REST API Mapping

**Endpoint:** `/wp-json/wp/v2/posts`

This tool directly interfaces with the WordPress REST API endpoint above. The response format and available parameters
are determined by WordPress core functionality.

### WordPress Documentation

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Endpoint Reference](https://developer.wordpress.org/rest-api/reference/)

## Required Permissions

This tool requires the following WordPress user capabilities:

- `publish_posts`
- `edit_posts`

**Note:** The authenticated user must have these capabilities to successfully execute this tool.

## Response Format

**Return Type:** `post`

```json
{
  "success": true,
  "data": {
    // post response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_create_post",
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
