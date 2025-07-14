# WordPress REST API Authentication Troubleshooting Guide

## Issue: POST Requests Return 401 Unauthorized with Application Passwords

This document addresses the common issue where WordPress REST API POST/PUT/DELETE requests fail with 401 Unauthorized
errors, while GET requests work fine with the same application password credentials.

## Symptoms

- ✅ GET requests work perfectly with application passwords
- ✅ WP-CLI commands work with the same credentials
- ✅ User has administrator role and all necessary capabilities
- ❌ POST/PUT/DELETE requests return 401 Unauthorized
- ❌ Error: `rest_cannot_create` or similar permission errors

## Root Causes

### 1. Authorization Header Stripping (.htaccess)

**Most Common Cause:** Apache strips the `Authorization` header by default, particularly affecting write operations.

**Solution:** Add to your `.htaccess` file:

```apache
# WordPress REST API - Preserve Authorization Header
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
```

Alternative approach:

```apache
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
```

### 2. Docker Environment Configuration

**Issue:** WordPress requires HTTPS for application passwords by default, but Docker development environments typically
use HTTP.

**Solution:** Add to your `docker-compose.yml`:

```yaml
services:
  wordpress:
    environment:
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_ENVIRONMENT_TYPE', 'local');
```

### 3. Wrong Application Password Source

**Issue:** WordPress has multiple places to generate passwords, and using the wrong one causes failures.

**Solution:** Generate application passwords from:

- ✅ `/wp-admin/profile.php` - User Profile page
- ❌ NOT from 2FA/Security plugin settings

### 4. HTTP Authentication Interference

**Issue:** Server-level HTTP authentication interferes with WordPress authentication.

**Solution:** Configure server to exclude `/wp-json/` from HTTP auth, or temporarily disable.

## Technical Differences: WP-CLI vs REST API

| Aspect               | WP-CLI              | REST API                   |
| -------------------- | ------------------- | -------------------------- |
| Access Method        | Direct file system  | HTTP requests              |
| Authentication       | Bypasses web server | Requires HTTP headers      |
| Configuration Impact | Not affected        | Subject to .htaccess rules |
| Proxy Impact         | Not affected        | Can be blocked by proxies  |

## Docker-Specific Solutions

📖 **For complete Docker setup**: See [Docker Setup Guide](user-guides/DOCKER_SETUP.md)

### Complete Docker Configuration

```yaml
version: "3.8"
services:
  wordpress:
    image: wordpress:latest
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
      # Enable application passwords in local development
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_ENVIRONMENT_TYPE', 'local');
    volumes:
      - ./wp-htaccess.conf:/var/www/html/.htaccess
```

### WordPress .htaccess Template

Create `wp-htaccess.conf`:

```apache
# BEGIN WordPress
RewriteEngine On

# REST API Authorization Header Fix
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]

# Standard WordPress Rules
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
# END WordPress
```

## Debugging Steps

### 1. Test Authorization Header Passing

```bash
# Test if headers reach WordPress
curl -v -H "Authorization: Basic $(echo -n 'username:app_password' | base64)" \
     https://your-site.com/wp-json/wp/v2/posts
```

Look for `Authorization` header in the request output.

### 2. WordPress Debug Information

Add to `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);

// Log REST API authentication attempts
add_action('rest_authentication_errors', function($result) {
    error_log('REST Auth Result: ' . print_r($result, true));
    return $result;
});
```

### 3. Test Script

```javascript
const testAuth = async () => {
  const username = "your_username";
  const appPassword = "xxxx xxxx xxxx xxxx xxxx xxxx"; // Preserve spaces
  const siteUrl = "http://localhost:8081";

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  console.log("Testing GET request...");
  const getResponse = await fetch(`${siteUrl}/wp-json/wp/v2/posts?per_page=1`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  console.log("GET Status:", getResponse.status);

  console.log("Testing POST request...");
  const postResponse = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Auth Test Post",
      content: "Testing authentication",
      status: "draft",
    }),
  });
  console.log("POST Status:", postResponse.status);

  if (!postResponse.ok) {
    const error = await postResponse.json();
    console.log("Error:", error);
  }
};

testAuth();
```

## Common Security Plugin Issues

### Wordfence

- Check if REST API is blocked in Wordfence settings
- Temporarily disable to test

### iThemes Security

- May block REST API requests
- Check "WordPress Tweaks" → "Disable REST API"

### Jetpack

- May interfere with authentication
- Check Jetpack security settings

## Production Considerations

1. **Always use HTTPS** in production
2. **Remove WP_ENVIRONMENT_TYPE override** in production
3. **Monitor failed authentication attempts**
4. **Use strong application passwords**
5. **Regularly rotate application passwords**

## Verification Checklist

- [ ] `.htaccess` includes Authorization header preservation
- [ ] Docker environment sets `WP_ENVIRONMENT_TYPE` to `local`
- [ ] Application password generated from correct location
- [ ] No HTTP authentication conflicts
- [ ] User has administrator role
- [ ] Security plugins allow REST API access
- [ ] WordPress debug logging enabled for testing

## Alternative Authentication Methods

If application passwords continue to fail:

1. **JWT Authentication Plugin**
2. **OAuth 2.0 Plugin**
3. **Custom nonce-based authentication**
4. **API Key plugins**

Remember: The goal is to achieve the same level of functionality that WP-CLI provides, but through the REST API
interface.
