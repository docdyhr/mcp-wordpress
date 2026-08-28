# wp_search_site

![site](https://img.shields.io/badge/category-site-lightblue)

Performs a site-wide search for content across posts, pages, and media with comprehensive results and metadata.

**Usage Examples:** • Search everything: `wp_search_site --term="WordPress"` • Search posts only:
`wp_search_site --term="tutorial" --type="posts"` • Search pages: `wp_search_site --term="about" --type="pages"` •
Search media: `wp_search_site --term="logo" --type="media"` • Find specific content:
`wp_search_site --term="contact form"`

## Parameters

_No parameters required._

## Examples

### Basic site Usage

Simple example of using wp_search_site

**Command:**

```bash
wp_search_site
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

### Multi-Site site Usage

Using wp_search_site with specific site targeting

**Command:**

```bash
wp_search_site --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {},
  "message": "wp_search_site executed successfully"
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
