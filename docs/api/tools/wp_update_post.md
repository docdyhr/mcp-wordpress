# wp_update_post

![post](https://img.shields.io/badge/category-post-lightgrey)

Updates an existing WordPress post with comprehensive validation and change tracking. All parameters except ID are
optional - only provided fields will be updated.

**Usage Examples:** • Update title: `wp_update_post --id=123 --title="New Title"` • Update content:
`wp_update_post --id=123 --content="<p>Updated content</p>"` • Change status:
`wp_update_post --id=123 --status="publish"` • Update categories: `wp_update_post --id=123 --categories=[1,5,10]` • Set
featured image: `wp_update_post --id=123 --featured_media=42` • Remove featured image:
`wp_update_post --id=123 --featured_media=0` • Multiple updates:
`wp_update_post --id=123 --title="New Title" --status="publish" --categories=[1,2]`

## Parameters

| Parameter        | Type     | Required | Description                                                                | Default   | Examples                                              |
| ---------------- | -------- | -------- | -------------------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| `id`             | `number` | ✅       | The ID of the post to update.                                              | -         | `123`, `456`                                          |
| `title`          | `string` | ❌       | The new title for the post.                                                | -         | `My Blog Post`, `Hello World`                         |
| `content`        | `string` | ❌       | The new content for the post, in HTML format.                              | -         | `<p>Post content here</p>`, `This is my post content` |
| `status`         | `string` | ❌       | The new publishing status for the post.                                    | `publish` | `example`                                             |
| `excerpt`        | `string` | ❌       | The new excerpt for the post.                                              | -         | `example`                                             |
| `categories`     | `array`  | ❌       | An array of category IDs to assign to the post.                            | -         | `example`                                             |
| `tags`           | `array`  | ❌       | An array of tag IDs to assign to the post.                                 | -         | `example`                                             |
| `featured_media` | `number` | ❌       | The ID of the featured media (image). Use 0 to remove featured media.      | -         | `example`                                             |
| `date`           | `string` | ❌       | The date the post was published, in the site's timezone (ISO 8601 format). | -         | `example`                                             |

## Examples

### Basic post Usage

Simple example of using wp_update_post

**Command:**

```bash
wp_update_post --id="123"
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

Using wp_update_post with specific site targeting

**Command:**

```bash
wp_update_post --site="site1" --id="123"
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

### Advanced post Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_update_post --id="123" --title="Example Post Title" --content="This is example content for the post." --status="publish" --excerpt="example_value" --categories="example_value" --tags="example_value" --featured_media="example_value" --date="example_value"
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

**Endpoint:** `/wp-json/wp/v2/posts/{id}`

This tool directly interfaces with the WordPress REST API endpoint above. The response format and available parameters
are determined by WordPress core functionality.

### WordPress Documentation

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Endpoint Reference](https://developer.wordpress.org/rest-api/reference/)

## Required Permissions

This tool requires the following WordPress user capabilities:

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
    "tool": "wp_update_post",
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
