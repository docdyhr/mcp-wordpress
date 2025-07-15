# WordPress Test Site Setup Guide

For comprehensive mcp-evals testing, set up a dedicated WordPress test site.

## 🎯 **Recommended Approach**

### Option 1: WordPress.com Test Site (Easiest)

1. **Create Account**: Go to [WordPress.com](https://wordpress.com)
2. **Create Site**: Choose "Start with a free site"
3. **Site URL**: Something like `your-test-site.wordpress.com`
4. **Enable REST API**: Should be enabled by default

### Option 2: Local WordPress (Most Control)

```bash
# Using WordPress CLI
wp core download
wp config create --dbname=wordpress_test --dbuser=root --dbpass=password
wp core install --url=http://localhost:8080 --title="Test Site" --admin_user=admin --admin_password=password --admin_email=test@example.com

# Or using Docker
docker run -d -p 8080:80 -e WORDPRESS_DB_HOST=mysql -e WORDPRESS_DB_NAME=wordpress --name wordpress wordpress:latest
```

### Option 3: Staging Environment

Use your existing hosting provider's staging environment if available.

## 🔐 **Application Password Setup**

1. **Log into WordPress Admin**
2. **Go to Users → Profile**
3. **Scroll to Application Passwords**
4. **Add New Password**:
   - Name: `MCP Evaluations`
   - Click "Add New Application Password"
5. **Copy Password**: Format like `AbCd EfGh IjKl MnOp QrSt UvWx`

## 📝 **Test Data Creation**

For comprehensive testing, create sample content:

```bash
# Sample posts
wp post create --post_type=post --post_title="Test Post 1" --post_content="Content for testing" --post_status=publish
wp post create --post_type=post --post_title="Test Post 2" --post_content="More test content" --post_status=draft

# Sample pages
wp post create --post_type=page --post_title="Test Page" --post_content="Page content" --post_status=publish

# Sample users
wp user create testuser test@example.com --role=author --user_pass=testpass123

# Sample categories
wp term create category "Test Category" --slug=test-category
```

## 🧪 **Testing Permissions**

Ensure your test user has appropriate permissions:

- **Administrator**: Full access to all tools
- **Editor**: Posts, pages, comments, media
- **Author**: Own posts and media only

## 🔧 **Configuration Examples**

### GitHub Secrets

```bash
TEST_WORDPRESS_URL=https://your-test-site.wordpress.com
TEST_WORDPRESS_USER=admin
TEST_WORDPRESS_PASSWORD=AbCd EfGh IjKl MnOp QrSt UvWx
```

### Local .env.evaluation

```bash
TEST_WORDPRESS_URL=http://localhost:8080
TEST_WORDPRESS_USER=admin
TEST_WORDPRESS_PASSWORD=AbCd EfGh IjKl MnOp QrSt UvWx
```

### mcp-wordpress.config.json

```json
{
  "sites": [
    {
      "id": "test-site",
      "name": "Evaluation Test Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://your-test-site.wordpress.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "AbCd EfGh IjKl MnOp QrSt UvWx"
      }
    }
  ]
}
```

## ⚠️ **Security Considerations**

1. **Separate Test Site**: Never use production sites for testing
2. **Limited Permissions**: Use minimal required permissions
3. **Temporary Content**: Test content should be disposable
4. **Network Security**: Ensure test sites are properly secured
5. **Credential Rotation**: Regularly rotate test credentials

## 🚀 **Testing Commands**

```bash
# Test with existing sites
npm run eval:quick

# Test with specific configuration
npx mcp-eval evaluations/config/existing-sites-eval.yaml dist/index.js

# Test connection only
npm run status
```

## 📊 **Expected Results**

A properly configured test site should:

- ✅ Connect successfully via REST API
- ✅ Allow tool operations based on user permissions
- ✅ Return consistent, predictable results
- ✅ Handle errors gracefully
- ✅ Support all MCP WordPress tools

---

**Ready to test?** Choose your preferred setup method and configure the credentials accordingly!
