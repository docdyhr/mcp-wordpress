# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues with MCP WordPress Server.

## 🔍 Quick Diagnosis

### Health Check Commands

Before diving into specific issues, run these diagnostic commands:

```bash
# Overall system health
npm run health

# Connection status
npm run status

# Test authentication
npm run test:auth

# Quick tool validation
npm run test:tools

# Performance check
npm run test:performance
```

### Common Issue Categories

| Issue Type                                     | Symptoms                | Quick Fix               |
| ---------------------------------------------- | ----------------------- | ----------------------- |
| **[Connection](#-connection-issues)**          | Can't reach WordPress   | Check URL and network   |
| **[Authentication](#-authentication-issues)**  | Login failures          | Verify credentials      |
| **[Tools](#️-tool-issues)**                    | Commands not working    | Check permissions       |
| **[Performance](#-performance-issues)**        | Slow responses          | Enable caching          |
| **[Claude Desktop](#️-claude-desktop-issues)** | Not appearing in Claude | Restart and reconfigure |

## 🌐 Connection Issues

### Issue: "Cannot connect to WordPress"

**Symptoms:**

- Connection timeout errors
- "Site not reachable" messages
- Network-related failures

**Diagnosis:**

```bash
# Test WordPress REST API manually
curl -i https://your-site.com/wp-json/wp/v2/

# Should return HTTP 200 with JSON data
# If not, WordPress REST API may be disabled
```

**Solutions:**

1. **Verify WordPress URL Format**

   ```bash
   # ✅ Correct formats
   https://yoursite.com
   https://www.yoursite.com
   https://blog.yoursite.com

   # ❌ Incorrect formats
   yoursite.com          # Missing protocol
   https://yoursite.com/ # Trailing slash
   ```

2. **Check WordPress REST API**

   - Go to **Settings** → **Permalinks** in WordPress admin
   - Click "Save Changes" to refresh rewrite rules
   - Verify REST API is not disabled by plugins

3. **Network and Firewall**

   ```bash
   # Test connectivity
   ping yoursite.com

   # Test HTTPS
   curl -I https://yoursite.com

   # Test specific port if needed
   telnet yoursite.com 443
   ```

4. **WordPress Configuration**
   ```php
   // In wp-config.php, ensure REST API is enabled
   // Remove or comment out if present:
   // add_filter('rest_enabled', '__return_false');
   ```

### Issue: "SSL Certificate Error"

**Symptoms:**

- SSL verification failures
- Certificate warnings

**Solutions:**

```bash
# For development only - disable SSL verification
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Better solution: Fix SSL certificate
# Contact your hosting provider or use Let's Encrypt
```

## 🔐 Authentication Issues

### Issue: "Authentication failed"

**Symptoms:**

- 401 Unauthorized errors
- "Invalid credentials" messages
- Login repeatedly fails

**Diagnosis:**

```bash
# Test authentication manually
curl -u "username:app-password" https://your-site.com/wp-json/wp/v2/users/me

# Should return user information
# If 401, credentials are wrong
```

**Solutions:**

1. **Application Password Format**

   ```bash
   # ✅ Correct format (with spaces)
   WORDPRESS_APP_PASSWORD="AbCd EfGh IjKl MnOp QrSt UvWx"

   # ❌ Incorrect formats
   WORDPRESS_APP_PASSWORD=AbCdEfGhIjKlMnOpQrStUvWx  # No spaces
   WORDPRESS_APP_PASSWORD='AbCd EfGh...'             # Single quotes
   WORDPRESS_APP_PASSWORD="AbCd-EfGh-IjKl..."       # Hyphens instead of spaces
   ```

2. **Regenerate Application Password**

   - WordPress Admin → Users → Profile
   - Delete old application password
   - Create new one: "MCP WordPress Server"
   - Copy the exact password shown (with spaces)

3. **Check WordPress User Permissions**

   ```text
   # Minimum role requirements:
   - Read operations: Subscriber
   - Create/edit posts: Author
   - Manage comments: Editor
   - Site settings: Administrator
   ```

4. **Verify Application Passwords are Enabled**
   ```php
   // In functions.php or plugin
   // Ensure this is NOT present:
   // add_filter('wp_is_application_passwords_available', '__return_false');
   ```

### Issue: "Permission denied for operation"

**Symptoms:**

- Some tools work, others fail
- "Insufficient permissions" errors

**Solutions:**

1. **Check User Role Requirements**

   ```bash
   # Test user capabilities
   curl -u "username:app-password" \
     https://your-site.com/wp-json/wp/v2/users/me | \
     jq '.capabilities'
   ```

2. **Role-Based Access Matrix** | Operation | Subscriber | Author | Editor | Admin |
   |-----------|------------|--------|--------|-------| | Read posts | ✅ | ✅ | ✅ | ✅ | | Create posts | ❌ | ✅ | ✅
   | ✅ | | Edit others' posts | ❌ | ❌ | ✅ | ✅ | | Manage users | ❌ | ❌ | ❌ | ✅ | | Site settings | ❌ | ❌ | ❌
   | ✅ |

## 🛠️ Tool Issues

### Issue: "Tool not found" or "Command failed"

**Symptoms:**

- Specific WordPress tools don't work
- "Unknown tool" errors
- Tools missing from Claude

**Diagnosis:**

```bash
# List available tools
npm run test:tools

# Test specific tool
DEBUG=true npm run dev
# Then try the failing tool
```

**Solutions:**

1. **Verify Tool Registration**

   ```bash
   # Check all tools are loaded
   npm run status | grep "tools available"
   # Should show "59 tools available"
   ```

2. **Test Individual Tool Categories**

   ```text
   # In Claude, test each category:
   "List my WordPress posts"          # Posts tools
   "Show my WordPress users"          # User tools
   "Check WordPress site settings"    # Site tools
   "Show cache statistics"            # Cache tools
   ```

3. **Check Multi-Site Configuration**

   ```bash
   # If using multi-site, always specify site parameter
   # ✅ Correct
   wp_list_posts --site="main-site"

   # ❌ Incorrect (will fail with multiple sites)
   wp_list_posts
   ```

### Issue: "Invalid parameters" errors

**Symptoms:**

- Tools reject valid-looking parameters
- Type validation errors

**Solutions:**

1. **Check Parameter Types**

   ```text
   # ✅ Correct parameter types
   wp_create_post --title="My Post" --content="Content here"

   # ❌ Incorrect (missing quotes for strings)
   wp_create_post --title=My Post --content=Content here
   ```

2. **Required vs Optional Parameters**
   ```bash
   # Check tool documentation
   # Each tool specifies required parameters
   # See docs/api/tools/[tool-name].md
   ```

## ⚡ Performance Issues

### Issue: Slow response times

**Symptoms:**

- Tools take a long time to respond
- Timeout errors
- Claude appears to hang

**Diagnosis:**

```bash
# Check performance metrics
npm run test:performance

# Test with caching disabled
DISABLE_CACHE=true npm run dev

# Monitor cache statistics
npm run cache:stats
```

**Solutions:**

1. **Enable Caching**

   ```bash
   # Ensure caching is enabled (default)
   # Remove this line if present:
   # DISABLE_CACHE=true

   # Check cache performance
   npm run cache:stats
   ```

2. **WordPress Optimization**

   - Install caching plugin (W3 Total Cache, WP Rocket)
   - Optimize database and images
   - Use CDN for media files
   - Upgrade hosting if necessary

3. **Network Optimization**

   ```bash
   # Test network latency
   ping your-site.com

   # Test WordPress response time
   time curl -s https://your-site.com/wp-json/wp/v2/ > /dev/null
   ```

### Issue: Memory or CPU high usage

**Symptoms:**

- System becomes slow
- High resource usage
- Crashes or restarts

**Solutions:**

1. **Monitor Resource Usage**

   ```bash
   # Check memory usage
   npm run test:performance | grep memory

   # Monitor during operation
   top -p $(pgrep node)
   ```

2. **Optimize Configuration**

   ```bash
   # Reduce cache size if memory is limited
   # Edit configuration:
   CACHE_MAX_SIZE=100  # Reduce from default 1000

   # Disable performance monitoring in production
   DISABLE_PERFORMANCE_MONITORING=true
   ```

## 🖥️ Claude Desktop Issues

### Issue: "WordPress tools not appearing in Claude"

**Symptoms:**

- Claude doesn't recognize WordPress commands
- No WordPress functionality available
- "I don't have access to WordPress" responses

**Solutions:**

1. **Restart Claude Desktop**

   ```bash
   # Always restart Claude Desktop after configuration changes
   # This ensures MCP server connections are refreshed
   ```

2. **Check Configuration File**

   **For DXT Extension:**

   - Verify extension is enabled in Claude Desktop
   - Check configuration in Extensions settings
   - Reinstall DXT if necessary

   **For NPX/NPM Method:**

   ```json
   // Verify Claude Desktop config file format
   {
     "mcpServers": {
       "mcp-wordpress": {
         "command": "npx",
         "args": ["-y", "mcp-wordpress"],
         "env": {
           "WORDPRESS_SITE_URL": "https://your-site.com",
           "WORDPRESS_USERNAME": "your-username",
           "WORDPRESS_APP_PASSWORD": "your-app-password"
         }
       }
     }
   }
   ```

3. **Verify Configuration File Location**

   **macOS:**

   ```bash
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

   **Windows:**

   ```bash
   %APPDATA%\Claude\claude_desktop_config.json
   ```

   **Linux:**

   ```bash
   ~/.config/claude_desktop_config.json
   ```

### Issue: "Server connection failed"

**Symptoms:**

- Claude shows "MCP server connection failed"
- Server appears to start but then disconnects

**Solutions:**

1. **Check Server Logs**

   ```bash
   # Run server manually to see errors
   DEBUG=true npx -y mcp-wordpress

   # Look for specific error messages
   # Common issues: missing dependencies, port conflicts
   ```

2. **JSON-RPC Protocol Issues**

   ```bash
   # Recent fix for DXT: JSON parsing errors
   # Update to latest version
   curl -L -o mcp-wordpress.dxt \
     https://github.com/docdyhr/mcp-wordpress/releases/latest/download/\
     mcp-wordpress.dxt

   # Reinstall DXT extension
   ```

3. **Environment Issues**

   ```bash
   # Test Node.js version
   node --version  # Should be 16+

   # Test npm access
   npm --version

   # Clear npm cache if needed
   npm cache clean --force
   ```

## 🐳 Docker Issues

### Issue: Container won't start

**Symptoms:**

- Docker container exits immediately
- "Configuration missing" errors

**Solutions:**

1. **Check Environment Variables**

   ```bash
   # Verify all required variables are set
   docker run --rm docdyhr/mcp-wordpress:latest env | grep WORDPRESS

   # Should show:
   # WORDPRESS_SITE_URL=...
   # WORDPRESS_USERNAME=...
   # WORDPRESS_APP_PASSWORD=...
   ```

2. **Check Container Logs**

   ```bash
   # View container logs
   docker logs mcp-wordpress

   # Follow logs in real-time
   docker logs -f mcp-wordpress
   ```

3. **Test Configuration**
   ```bash
   # Test with environment file
   docker run --rm --env-file .env docdyhr/mcp-wordpress:latest npm run status
   ```

## 🔧 Advanced Debugging

### Enable Debug Mode

1. **Environment Variable**

   ```bash
   DEBUG=true npm run dev
   ```

2. **For Claude Desktop DXT**

   - Enable "Debug Mode" in extension settings
   - Check Claude Desktop console for detailed logs

3. **Comprehensive Debugging**
   ```bash
   # Maximum debug output
   NODE_ENV=development DEBUG=true LOG_LEVEL=debug npm run dev
   ```

### Debug Specific Components

```bash
# Test individual components
npm run test:auth          # Authentication only
npm run test:tools         # Tool registration
npm run test:integration   # WordPress API integration
npm run test:cache         # Cache functionality
npm run test:performance   # Performance monitoring
```

### Network Debugging

```bash
# Capture network traffic
tcpdump -i any -w capture.pcap host your-site.com

# Analyze with Wireshark or:
tcpdump -r capture.pcap -A | grep -i wordpress
```

### WordPress Debug Mode

```php
// Add to wp-config.php for WordPress debugging
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);

// Check WordPress debug log
tail -f /path/to/wordpress/wp-content/debug.log
```

## 📋 Issue Reporting Template

When reporting issues, include this information:

````markdown
### Environment

- **Installation Method**: DXT/NPX/NPM/Docker
- **Version**: [Check with npm list mcp-wordpress]
- **Node.js Version**: [node --version]
- **Operating System**: [OS and version]
- **Claude Desktop Version**: [If applicable]

### WordPress Details

- **WordPress Version**: [Check in WP admin]
- **User Role**: [Administrator/Editor/etc.]
- **Authentication Method**: [app-password/jwt/basic]
- **REST API URL**: [https://site.com/wp-json/wp/v2/]

### Issue Description

- **What you were trying to do**:
- **What happened instead**:
- **Error messages** (exact text):
- **Steps to reproduce**:

### Debug Information

```bash
# Output of diagnostic commands
npm run health
npm run status
DEBUG=true [command that failed]
```
````

### Configuration

[Include relevant configuration, redacting sensitive information]

```text

## 🆘 Getting Help

### Self-Help Resources

1. **[Documentation Hub](README.md)** - Complete documentation
2. **[API Reference](api/README.md)** - Tool documentation
3. **[GitHub Issues](https://github.com/docdyhr/mcp-wordpress/issues)** - Known issues and solutions

### Community Support

1. **[GitHub Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)** - Community Q&A
2. **[Issue Tracker](https://github.com/docdyhr/mcp-wordpress/issues/new)** - Bug reports

### Professional Support

For enterprise users or complex integrations:
- Priority support available
- Custom configuration assistance
- Integration consulting

---

**Still having issues?** [Open a GitHub issue](https://github.com/docdyhr/mcp-wordpress/issues/new) with the debugging information above, and we'll help you resolve it!
```
