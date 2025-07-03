---
name: 🐛 Bug Report
about: Report a bug or unexpected behavior in MCP WordPress Server
title: '[BUG] '
labels: 'bug'
assignees: ''
---

## 🐛 Bug Description

**What happened?**
A clear and concise description of the bug.

**What did you expect to happen?**
A clear description of what you expected to happen instead.

## 🔄 Steps to Reproduce

**Minimal reproduction steps:**
1. Configure MCP server with [specific settings]
2. Run command `[command]`
3. Observe [unexpected behavior]

**Can you reproduce this consistently?**
- [ ] Yes, every time
- [ ] Sometimes (intermittent)
- [ ] No, only happened once

## 🌍 Environment

**System Information:**
- **OS**: [e.g., macOS 14.0, Ubuntu 22.04, Windows 11]
- **Node.js version**: [e.g., v20.10.0]
- **MCP WordPress version**: [e.g., v1.3.0]
- **WordPress version**: [e.g., 6.4.2]
- **Installation method**: [NPM, Docker, source code]

**WordPress Configuration:**
- **WordPress URL**: [e.g., https://example.com (or indicate local)]
- **Authentication method**: [app-password, JWT, basic, API key]
- **Multi-site**: [Yes/No]
- **Active plugins**: [List any security/cache plugins that might interfere]

**MCP Configuration:**
```json
[Share relevant parts of your configuration, redacting sensitive data]
```

## 📋 Error Details

**Error messages or logs:**
```
[Paste error messages, stack traces, or relevant log output]
```

**Console output:**
```
[Share relevant console output]
```

**Browser/client errors (if applicable):**
```
[Any client-side errors]
```

## 🔍 Additional Context

**Screenshots or recordings:**
[Attach any visual evidence that helps explain the problem]

**Workarounds discovered:**
[Any temporary solutions you've found]

**Impact assessment:**
- [ ] Blocks all functionality
- [ ] Blocks specific tools/features
- [ ] Causes performance issues
- [ ] Causes data inconsistency
- [ ] Minor inconvenience

**Related tools/commands affected:**
- [ ] Posts management (wp_list_posts, wp_create_post, etc.)
- [ ] Media uploads (wp_upload_media)
- [ ] User management (wp_list_users, etc.)
- [ ] Cache operations (wp_cache_clear, etc.)
- [ ] Performance monitoring
- [ ] Authentication/connection
- [ ] Configuration loading

## 🔧 Debugging Information

**Have you tried these troubleshooting steps?**
- [ ] Cleared cache (`wp_cache_clear`)
- [ ] Verified WordPress credentials
- [ ] Checked WordPress REST API directly
- [ ] Tested with minimal configuration
- [ ] Reviewed server logs
- [ ] Updated to latest version

**Debug output (if available):**
```bash
# Run with debug enabled
DEBUG=true npm run dev
# Or with Docker
docker run -e DEBUG=true docdyhr/mcp-wordpress
```

## 📊 System Health

**MCP health check:**
```bash
# Run health check and share output
npm run health
```

**WordPress REST API test:**
```bash
# Test direct API access
curl -u username:app_password https://yoursite.com/wp-json/wp/v2/posts
```

---

**Checklist for submitters:**
- [ ] I've searched existing issues for duplicates
- [ ] I've provided clear reproduction steps
- [ ] I've included environment details
- [ ] I've redacted sensitive information
- [ ] I've tested with the latest version