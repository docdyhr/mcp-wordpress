# Claude Desktop Integration Guide

Complete guide for integrating MCP WordPress Server with Claude Desktop using the DXT extension.

## 🎯 Overview

The WordPress MCP DXT extension provides the **easiest way** to integrate WordPress management with Claude Desktop. No
command line, no configuration files - just click and configure.

### Why Choose DXT Extension?

| Feature           | DXT Extension     | NPX Method            |
| ----------------- | ----------------- | --------------------- |
| **Installation**  | 2 clicks          | Command line setup    |
| **Configuration** | Built-in UI       | Manual JSON editing   |
| **Updates**       | Automatic         | Manual                |
| **Security**      | Encrypted storage | Environment variables |
| **Multi-site**    | Single site only  | Unlimited sites       |

## 🚀 Quick Installation

### Step 1: Download DXT Package

**Option A: Direct Download**

- Click here:
  [`mcp-wordpress.dxt`](https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt)
  (3.4MB)

**Option B: Command Line**

```bash
curl -L -o mcp-wordpress.dxt \
  https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt
```

### Step 2: Install in Claude Desktop

1. **Open Claude Desktop**
2. **Navigate to Extensions**
   - Click the gear icon (⚙️) in the top-right
   - Select "Extensions" from the menu
3. **Install Extension**
   - Click "Install Extension" button
   - Select the downloaded `mcp-wordpress.dxt` file
   - Wait for installation to complete

### Step 3: Configure WordPress Connection

1. **Extension Settings**
   - Find "WordPress MCP Server" in your extensions list
   - Click the settings/configuration button

2. **Enter WordPress Details**
   - **Site URL**: Your WordPress site URL (e.g., `https://yoursite.com`)
   - **Username**: Your WordPress username
   - **Application Password**: Generated WordPress app password
   - **Authentication Method**: Leave as "app-password" (recommended)

3. **Test Connection**
   - Click "Test Connection" to verify setup
   - You should see a success message

## 🔑 WordPress Application Password Setup

### Creating Application Password

1. **Log into WordPress Admin**
   - Go to your WordPress admin panel
   - Navigate to **Users** → **Your Profile**

2. **Generate Application Password**
   - Scroll down to **Application Passwords** section
   - In the "New Application Password Name" field, enter: `Claude Desktop MCP`
   - Click **Add New Application Password**

3. **Copy the Password**
   - WordPress will show a password like: `AbCd EfGh IjKl MnOp QrSt UvWx`
   - **Important**: Copy this exactly with spaces
   - You won't be able to see this password again

### Application Password Security

- **Never share** your application password
- **Regenerate regularly** for security
- **Use specific names** to track different applications
- **Revoke unused passwords** immediately

## ⚙️ DXT Configuration Options

### User Configuration Fields

The DXT extension provides these configuration options:

| Field                              | Required | Description                         | Example                         |
| ---------------------------------- | -------- | ----------------------------------- | ------------------------------- |
| **WordPress Site URL**             | Yes      | Full URL to your WordPress site     | `https://mysite.com`            |
| **WordPress Username**             | Yes      | Your WordPress username             | `admin`                         |
| **WordPress Application Password** | Yes      | Generated app password              | `AbCd EfGh IjKl MnOp QrSt UvWx` |
| **Authentication Method**          | No       | Auth method (default: app-password) | `app-password`                  |
| **Debug Mode**                     | No       | Enable verbose logging              | `false`                         |

### Advanced Configuration

For advanced users, the DXT extension supports:

- **Encrypted credential storage** via OS keychain
- **Automatic error recovery** with retry logic
- **Performance monitoring** and optimization
- **Cache management** for improved speed

## 🧪 Testing Your Installation

### Basic Functionality Test

1. **Restart Claude Desktop**
   - Close and reopen Claude Desktop after configuration
   - This ensures the extension loads properly

2. **Test with Simple Command** Try typing in Claude:

   ```text
   "List my recent WordPress posts"
   ```

3. **Expected Response**
   - Claude should connect to your WordPress site
   - You should see a list of your recent posts
   - Each post should show title, status, and date

### Advanced Testing

**Test Different Tool Categories:**

```text
# Content Management
"Show me my WordPress site settings"
"List all my WordPress users"
"Check my recent comments"

# Performance Monitoring
"Show WordPress cache statistics"
"Check my site performance metrics"

# Media Management
"List recent media uploads"
```

## 🎯 Real-World Usage Examples

### Content Creation Workflow

```text
👤 "Help me create a blog post about sustainable living with SEO optimization"

🤖 Claude will:
1. Generate SEO-optimized content
2. Create the post in WordPress
3. Add appropriate categories and tags
4. Set featured image if provided
5. Schedule or publish as requested
```

### Site Management Tasks

```text
👤 "Analyze my WordPress site performance and suggest improvements"

🤖 Claude will:
1. Check cache statistics
2. Review performance metrics
3. Analyze content structure
4. Provide optimization recommendations
5. Implement suggested changes if approved
```

### Bulk Operations

```text
👤 "Update all posts from 2023 to include my new author bio"

🤖 Claude will:
1. List all posts from 2023
2. Show current author bios
3. Update each post with new bio
4. Confirm changes and provide summary
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Extension Not Loading

**Symptoms:**

- WordPress tools don't appear in Claude
- "Extension failed to load" message

**Solutions:**

```bash
# Check if DXT package is corrupted
ls -la mcp-wordpress.dxt

# Re-download if file size seems wrong
curl -L -o mcp-wordpress.dxt \
  https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt

# Reinstall extension
# Remove from Claude Desktop and reinstall
```

#### 2. Connection Failures

**Symptoms:**

- "Cannot connect to WordPress" errors
- "Authentication failed" messages

**Solutions:**

1. **Verify WordPress URL**

   ```bash
   # Test if WordPress REST API is accessible
   curl https://yoursite.com/wp-json/wp/v2/
   ```

2. **Check Application Password**
   - Ensure password includes spaces: `AbCd EfGh IjKl MnOp`
   - Regenerate if unsure about format
   - Verify WordPress user has sufficient permissions

3. **WordPress Configuration**
   - Ensure REST API is enabled
   - Check if Application Passwords are enabled
   - Verify user role has necessary permissions

#### 3. Tools Not Working

**Symptoms:**

- Some WordPress tools return errors
- Partial functionality only

**Solutions:**

1. **Check WordPress Permissions**

   ```text
   # Test specific permission in Claude
   "Test my WordPress authentication status"
   ```

2. **WordPress User Role Requirements**

   | Tool Category       | Minimum Role  |
   | ------------------- | ------------- |
   | **Read Operations** | Subscriber    |
   | **Posts/Pages**     | Author        |
   | **Media**           | Author        |
   | **Users**           | Editor        |
   | **Site Settings**   | Administrator |

#### 4. Performance Issues

**Symptoms:**

- Slow response times
- Timeout errors

**Solutions:**

1. **Enable Caching**
   - DXT extension has built-in caching
   - Check cache statistics: `"Show WordPress cache stats"`

2. **WordPress Optimization**
   - Use caching plugins on WordPress
   - Optimize database and media files
   - Consider upgrading hosting

### Debug Mode

Enable debug mode for detailed troubleshooting:

1. **In DXT Configuration**
   - Set "Debug Mode" to `true`
   - Save configuration

2. **Check Debug Output**
   - Look for detailed logs in Claude Desktop
   - Check for specific error messages

## 🔄 Updates and Maintenance

### Automatic Updates

The DXT extension includes automatic update capabilities:

- **Background Updates**: New versions download automatically
- **Change Notifications**: You'll be notified of important updates
- **Rollback Support**: Ability to rollback if issues occur

### Manual Updates

To manually update:

1. **Download Latest Version**
   - Get newest `mcp-wordpress.dxt` from GitHub
   - Check release notes for changes

2. **Replace Extension**
   - Remove current extension from Claude Desktop
   - Install new DXT package
   - Reconfigure if necessary (settings usually persist)

### Version Compatibility

| DXT Version | Claude Desktop | WordPress |
| ----------- | -------------- | --------- |
| **v1.5.3+** | Latest         | 5.0+      |
| **v1.4.x**  | 0.8+           | 5.0+      |
| **v1.3.x**  | 0.7+           | 5.0+      |

## 🆚 DXT vs Alternative Methods

### When to Use DXT Extension

✅ **Best for:**

- Non-technical users
- Single WordPress site
- Easy setup and maintenance
- Built-in security and updates

### When to Use NPX Method

✅ **Best for:**

- Multiple WordPress sites
- Command line comfort
- Custom configuration needs
- Development environments

### Migration Between Methods

**From DXT to NPX:**

1. Note your current DXT configuration
2. Remove DXT extension from Claude Desktop
3. Follow NPX setup guide with same credentials
4. Configure multi-site if needed

**From NPX to DXT:**

1. Note your current NPX configuration
2. Remove NPX from Claude Desktop config
3. Install DXT extension
4. Enter same WordPress credentials

## 🎓 Advanced Features

### Built-in Tool Discovery

The DXT extension includes intelligent tool discovery:

```text
# Ask Claude about available tools
"What WordPress tools are available?"
"Show me tools for managing WordPress media"
"What performance monitoring tools do you have?"
```

### Context-Aware Assistance

Claude understands WordPress context with DXT:

```text
# WordPress-specific help
"Help me optimize my WordPress site for speed"
"What's the best way to manage WordPress comments?"
"Show me WordPress security best practices"
```

### Integration with Claude's Knowledge

DXT combines with Claude's knowledge for enhanced assistance:

```text
# Content strategy with WordPress integration
"Analyze my WordPress posts and suggest a content calendar"
"Help me improve my WordPress site's SEO"
"Create a social media strategy based on my WordPress content"
```

## 🆘 Getting Help

### Support Resources

1. **Documentation**
   - [Complete Documentation](../README.md)
   - [Troubleshooting Guide](../TROUBLESHOOTING.md)
   - [API Reference](../api/README.md)

2. **Community Support**
   - [GitHub Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)
   - [Issue Tracker](https://github.com/docdyhr/mcp-wordpress/issues)

3. **Professional Support**
   - For enterprise needs
   - Custom integrations
   - Priority support

### Reporting Issues

When reporting DXT-related issues, include:

1. **DXT Version**: Check in Claude Desktop extensions
2. **WordPress Version**: From WordPress admin
3. **Error Messages**: Exact text of any errors
4. **Steps to Reproduce**: What you were trying to do
5. **Configuration**: WordPress role, site type, etc.

---

**Ready to get started?**
[Download the DXT extension](https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt)
and transform your
WordPress management experience!
