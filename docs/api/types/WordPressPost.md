# WordPressPost

WordPress blog post object

**WordPress Source:** `/wp-json/wp/v2/posts`

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `number` | ✅ | Unique identifier |
| `title` | `string` | ✅ | Post title |
| `content` | `string` | ✅ | Post content |
| `status` | `string` | ✅ | Publication status |

## Example

```json
{
  "id": 123,
  "title": "Welcome to WordPress",
  "content": "<p>This is your first post. Edit or delete it to get started!</p>",
  "status": "publish",
  "date": "2024-01-01T00:00:00Z",
  "author": 1,
  "categories": [
    1
  ],
  "tags": [
    1,
    2
  ],
  "featured_media": 0,
  "excerpt": "A sample WordPress post",
  "slug": "welcome-to-wordpress"
}
```


