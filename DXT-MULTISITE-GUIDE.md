# DXT Multi-Site Configuration Guide

**Updated**: 2026-04-30 **Status**: ✅ Multi-Site Support CONFIRMED

---

## You Were Right

The DXT package **DOES support multi-site** configuration. I was wrong to say it didn't. Here's how it actually works:

---

## How Multi-Site Works in DXT

### Default Installation (Single-Site via UI)

When you install the DXT package, Claude Desktop shows a configuration form:

```text
WordPress Site URL:     [Enter URL]
WordPress Username:     [Enter username]
App Password:           [Enter password]
Auth Method:            [app-password]
Debug Mode:             [false]
```

This creates **environment variables** that configure ONE site.

### Advanced Configuration (Multi-Site via Config File)

**The server looks for a multi-site config file on every start, in this order (first existing file wins):**

1. `MCP_WORDPRESS_CONFIG` — an explicit path (set via the extension's **Config File Path** setting). If it is set but
   the file is missing, startup fails — it never silently falls back.
2. `~/.config/mcp-wordpress/config.json`
3. `~/mcp-wordpress.config.json`
4. `<extension install dir>/mcp-wordpress.config.json` — the legacy location.

> **⚠️ Keep your config outside the extension install dir.** Claude Desktop replaces that directory on every extension
> update (the old one is renamed to `...backup-<timestamp>`), so a config that only lives there disappears and the
> server quietly falls back to the single-site UI settings. Locations 1–3 survive updates.

**Opt-in is required.** Because a multi-site file holds credentials for every listed site, the server refuses to load
one unless `MCP_WORDPRESS_ALLOW_MULTI_SITE=true` (the extension's **Allow Multi-Site Config** setting). Without it,
startup fails with an error naming the file it found.

**Priority**:

1. **First**: Look for a config file (order above)
2. **If found**: Load ALL sites from config (ignore UI settings)
3. **If not found**: Use UI environment variables (single-site)

---

## How to Enable Multi-Site in DXT

### Step 1: Find the DXT Installation Directory

After installing the DXT package, the server files are located in the Claude Desktop extensions directory.

**Typical location** (may vary):

```text
~/Library/Application Support/Claude/Claude Extensions/local.dxt.thomas-dyhr.mcp-wordpress/
```

Or check the log file to see the working directory:

```bash
tail ~/Library/Logs/Claude/mcp-server-WordPress\ MCP\ Server.log
# Look for: "Current working directory: /path/to/dxt"
```

### Step 2: Copy the Example Config

The DXT package **includes** `mcp-wordpress.config.json.example`. Copy it to a location that survives updates:

```bash
mkdir -p ~/.config/mcp-wordpress
cp ~/Library/Application\ Support/Claude/Claude\ Extensions/local.dxt.thomas-dyhr.mcp-wordpress/mcp-wordpress.config.json.example \
   ~/.config/mcp-wordpress/config.json
chmod 600 ~/.config/mcp-wordpress/config.json
```

Then, in Claude Desktop → **Settings** → **Extensions** → **WordPress MCP Server**, turn on **Allow Multi-Site Config**.
To keep the file somewhere else, set **Config File Path** to its absolute path.

> **Heads up:** a symlink or copy placed _inside_ the extension install dir does **not** reliably survive updates —
> Claude Desktop replaces the whole directory. Use one of the locations above instead.

### Step 3: Edit the Config File

```json
{
  "sites": [
    {
      "id": "site1",
      "name": "My First Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.example.com",
        "WORDPRESS_USERNAME": "user1",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    {
      "id": "site2",
      "name": "My Second Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site2.example.com",
        "WORDPRESS_USERNAME": "user2",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy"
      }
    },
    {
      "id": "site3",
      "name": "My Third Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site3.example.com",
        "WORDPRESS_USERNAME": "user3",
        "WORDPRESS_APP_PASSWORD": "zzzz zzzz zzzz zzzz zzzz zzzz"
      }
    }
  ]
}
```

### Step 4: Restart Claude Desktop

The server will:

1. Look for the config file (see the lookup order above)
2. Find it!
3. Load all 3 sites
4. **Override the UI single-site configuration**

### Step 5: Verify Multi-Site Mode

Check the logs:

```bash
tail -f ~/Library/Logs/Claude/mcp-server-WordPress\ MCP\ Server.log
```

You should see:

```text
Found multi-site configuration file
Loading 3 WordPress sites from configuration
✓ Loaded site: site1 (My First Site)
✓ Loaded site: site2 (My Second Site)
✓ Loaded site: site3 (My Third Site)
```

### Step 6: Use Multi-Site Tools

Now when calling tools, specify the site:

```shell
# Test auth for specific site
wp_test_auth --site="site1"

# List posts from site2
wp_list_posts --site="site2"

# Get settings from site3
wp_get_site_settings --site="site3"
```

---

## Configuration Comparison

| Method                     | Configuration               | Priority                | Sites    |
| -------------------------- | --------------------------- | ----------------------- | -------- |
| **UI Form** (default)      | Claude Desktop UI           | Low                     | 1 site   |
| **Config File** (advanced) | `mcp-wordpress.config.json` | **HIGH** (overrides UI) | Up to 50 |

---

## Why This Works

### The DXT Package Includes

1. ✅ **Full source code** (`dist/` directory)
2. ✅ **Config example** (`mcp-wordpress.config.json.example`)
3. ✅ **All dependencies** (`node_modules/`)
4. ✅ **Multi-site logic** (unchanged from NPM version)

### The Server Logic

```typescript
// On startup (see ServerConfiguration.resolveMultiSiteConfigFile for the real lookup order):
const configPath = resolveMultiSiteConfigFile(); // MCP_WORDPRESS_CONFIG, ~/.config/..., ~/..., install dir

// Check if config file exists
if (fileExists(configPath)) {
  // ✅ Multi-site mode
  return loadMultiSiteConfig(configPath);
} else {
  // ✅ Single-site mode (from UI)
  return loadSingleSiteFromEnv(mcpConfig);
}
```

**No special DXT mode** - it's the same code as NPM installation!

---

## My Apologies

I incorrectly stated that:

- ❌ "DXT doesn't support multi-site"
- ❌ "For multi-site, use NPM installation"
- ❌ "DXT = single-site only"

**The truth**:

- ✅ DXT supports multi-site via config file
- ✅ DXT includes the example config file
- ✅ Config file **overrides** UI settings
- ✅ Exact same functionality as NPM version

---

## Updated Manifest Description

The new manifest now correctly states:

> "Supports single-site (via UI) and multi-site (via mcp-wordpress.config.json file)."

And the long description explains:

> **Multi-Site (Advanced)**: Create `~/.config/mcp-wordpress/config.json` (or `~/mcp-wordpress.config.json`, or point
> **Config File Path** at any file). Copy from the included `mcp-wordpress.config.json.example`, configure multiple
> sites, enable **Allow Multi-Site Config**, and restart Claude Desktop.

---

## What Changed in the Fixes

### What I Fixed (Correctly)

1. ✅ Zod version mismatch (`v4.1.3` → `v3.25.0`) - **CRITICAL**
2. ✅ Outdated version number (`2.6.3` → `2.10.2`)

### What I Fixed (Incorrectly)

1. ❌ ~~Removed multi_site_management prompt~~ - **SHOULD KEEP THIS**
2. ❌ ~~Updated docs to say "no multi-site"~~ - **WRONG**

### What Should Be Fixed

1. ✅ **Restore** `multi_site_management` prompt
2. ✅ **Update** docs to correctly explain multi-site config file method

---

## Should We Restore the Multi-Site Prompt?

**Question**: Should I restore the `multi_site_management` prompt that I removed?

**Arguments FOR restoring**:

- ✅ Multi-site DOES work with config file
- ✅ Prompt provides helpful workflow
- ✅ Users who configure multi-site will want it

**Arguments AGAINST restoring**:

- ⚠️ Prompt might confuse single-site users (majority)
- ⚠️ Requires users to manually create config file first
- ⚠️ Not accessible via UI alone

**My recommendation**: Restore it with updated description explaining it requires config file setup.

---

## Summary

You were absolutely correct:

**Multi-site works in DXT** by creating `mcp-wordpress.config.json` in a location that survives extension updates
(`~/.config/mcp-wordpress/config.json`, `~/mcp-wordpress.config.json`, or a path set via **Config File Path**) and
enabling **Allow Multi-Site Config**. The server detects it on startup and loads all configured sites, completely
overriding the UI single-site configuration.

The DXT package **includes everything needed**:

- ✅ Example config file
- ✅ Full multi-site code
- ✅ All dependencies

**Both use the exact same code and the same config lookup** (see the order above): `MCP_WORDPRESS_CONFIG`,
`~/.config/mcp-wordpress/config.json`, `~/mcp-wordpress.config.json`, then the legacy `mcp-wordpress.config.json` in the
package root (the DXT install directory, or the npm package directory). The DXT differs only in that its install
directory is replaced on every extension update, so keep the file in one of the user-level locations.

---

**Thank you for the correction!**
