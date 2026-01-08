# DXT Package Update Guide

**Important**: Claude Desktop does **NOT** automatically update DXT packages. You must manually update to get the latest features and fixes.

---

## 📋 Table of Contents

- [Why Manual Updates?](#why-manual-updates)
- [How to Check Your Version](#how-to-check-your-version)
- [Update Process](#update-process)
- [Update Notification Tool](#update-notification-tool)
- [What's New in v3.0.0](#whats-new-in-v300)

---

## Why Manual Updates?

DXT packages in Claude Desktop require manual updates because:

1. **No Auto-Update Mechanism**: Claude Desktop doesn't currently support automatic DXT updates
2. **User Control**: You decide when to update (important for stability)
3. **Configuration Preservation**: Manual updates let you backup configs first

---

## How to Check Your Version

### Method 1: Check in Claude Desktop

Ask Claude:
```
What version of mcp-wordpress are you running?
```

Claude will respond with the current version number.

### Method 2: Check Manifest File

The DXT package is installed at:
```
~/Library/Application Support/Claude/Claude Extensions/local.dxt.thomas-dyhr.mcp-wordpress/manifest.json
```

Open this file and look for the `version` field.

### Method 3: Check Logs

View the server logs:
```bash
tail -50 ~/Library/Logs/Claude/mcp-server-WordPress\ MCP\ Server.log
```

The version is shown when the server starts.

---

## Update Process

### Step 1: Backup Your Configuration

If you're using multi-site configuration:

```bash
# Find your DXT installation directory
cd ~/Library/Application\ Support/Claude/Claude\ Extensions/local.dxt.thomas-dyhr.mcp-wordpress/

# Backup your config file (if it exists)
cp mcp-wordpress.config.json ~/mcp-wordpress.config.json.backup
```

### Step 2: Download Latest Version

Visit the releases page:
https://github.com/docdyhr/mcp-wordpress/releases/latest

Download: `mcp-wordpress.dxt`

### Step 3: Uninstall Old Version

1. Open **Claude Desktop**
2. Go to **Settings** → **Extensions**
3. Find **WordPress MCP Server**
4. Click **Uninstall** or **Remove**

### Step 4: Install New Version

1. In Claude Desktop, go to **Settings** → **Extensions**
2. Click **Install Extension** or **Add Extension**
3. Select the downloaded `mcp-wordpress.dxt` file
4. Follow the configuration wizard

**Single-Site**: Enter your WordPress credentials in the UI

**Multi-Site**: Skip the wizard, then copy your backed-up config:
```bash
cp ~/mcp-wordpress.config.json.backup ~/Library/Application\ Support/Claude/Claude\ Extensions/local.dxt.thomas-dyhr.mcp-wordpress/mcp-wordpress.config.json
```

### Step 5: Restart Claude Desktop

Completely quit and relaunch Claude Desktop to load the new version.

### Step 6: Verify Update

Ask Claude:
```
What version of mcp-wordpress are you running?
```

It should report the new version number.

---

## Update Notification Tool

The MCP WordPress server includes a version check tool that compares your installed version with the latest GitHub release.

### Using the Version Check Tool

Ask Claude:
```
Check if there's a new version of mcp-wordpress available
```

Or use the tool directly:
```
wp_check_version
```

**Response Example**:
```
✅ You're up to date! (v3.0.0)

or

⚠️  Update available!
Current version: v2.12.0
Latest version: v3.0.0
Download: https://github.com/docdyhr/mcp-wordpress/releases/tag/v3.0.0
```

---

## What's New in v3.0.0

### 🚀 Features
- Circuit breaker pattern for improved resilience
- Deprecation documentation for API lifecycle management

### 🐛 Security & Bug Fixes
- Resolved CodeQL security warnings
- Fixed js-yaml vulnerability
- Updated MCP SDK and body-parser dependencies
- Fixed flaky tests in env-loading, logger, and timing

### ♻️ Refactoring
- Migrated to path aliases (improved maintainability)
- Modularized api.ts and performance.ts
- Extracted SecurityCIPipeline into modular components

### 📚 Documentation
- Added sprint implementation documentation
- Removed Smithery references
- Updated README with v2.12.0+ features

**Full Changelog**: https://github.com/docdyhr/mcp-wordpress/blob/main/CHANGELOG.md

---

## Troubleshooting

### "Extension not found after update"

1. Make sure you completely quit Claude Desktop (not just close window)
2. On macOS, use Cmd+Q to fully quit
3. Relaunch Claude Desktop

### "Configuration lost after update"

If you forgot to backup your config:

1. Check if the old installation directory still exists:
   ```bash
   ls ~/Library/Application\ Support/Claude/Claude\ Extensions/
   ```
2. Look for directories with older version numbers
3. Copy the config file from there

### "Server won't start after update"

1. Check the logs:
   ```bash
   tail -100 ~/Library/Logs/Claude/mcp-server-WordPress\ MCP\ Server.log
   ```
2. Look for error messages
3. If you see authentication errors, reconfigure your credentials

---

## Best Practices

1. **Check for Updates Monthly**: Visit the releases page regularly
2. **Read Release Notes**: Understand what's changed before updating
3. **Backup Configs**: Always backup before uninstalling
4. **Test After Update**: Verify your sites still work after updating
5. **Report Issues**: If something breaks, open a GitHub issue

---

## Need Help?

- 📖 **Documentation**: https://github.com/docdyhr/mcp-wordpress
- 🐛 **Issues**: https://github.com/docdyhr/mcp-wordpress/issues
- 💬 **Discussions**: https://github.com/docdyhr/mcp-wordpress/discussions

---

**Last Updated**: 2026-01-08
**Current Version**: 3.0.0
