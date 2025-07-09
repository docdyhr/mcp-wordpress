# DXT Extension Debugging Guide

## Quick Start Debugging

**Extension failing? Run this first:**

```bash
# 1. Check if it's a valid zip
unzip -t extension.dxt

# 2. Extract and inspect structure
unzip extension.dxt -d temp/ && ls -la temp/

# 3. Validate manifest
cat temp/manifest.json | jq .

# 4. Check for nested directories (common issue!)
unzip -l extension.dxt | head -5
```

## Common Error Patterns & Solutions

### 1. "Invalid zip data" / "Failed to unzip"

```bash
# Verify file integrity
file extension.dxt
zip -T extension.dxt

# Fix: Repackage correctly
cd extension-source/
zip -r ../extension.dxt * # NOT the directory itself!
```

### 2. "Invalid manifest" errors

```bash
# Install DXT CLI first
npm install -g @anthropic-ai/dxt

# Validate manifest
dxt validate manifest.json

# Common fixes:
# - Missing required fields (name, version, description, type, main)
# - Invalid JSON syntax
# - Wrong structure for prompts/tools
```

### 3. "Module not found" / Missing dependencies

```bash
# For Node.js extensions
npm install
zip -r extension.dxt manifest.json server.js package*.json node_modules/

# For Python extensions
pip install -r requirements.txt -t lib/
zip -r extension.dxt manifest.json main.py lib/
```

## Manifest Structure (MCP Type)

```json
{
  "name": "extension-name",
  "version": "1.0.0",
  "description": "Clear description",
  "type": "mcp",
  "main": "server.js",
  "mcp": {
    "command": "node",
    "args": ["server.js"],
    "env": {}
  },
  "user_config": {
    "api_key": {
      "type": "string",
      "title": "API Key",
      "description": "Your service API key",
      "sensitive": true,
      "required": true
    }
  },
  "prompts": {
    "example_prompt": {
      "name": "example_prompt",
      "description": "What this prompt does",
      "arguments": {
        "input": {
          "type": "string",
          "description": "Input parameter",
          "required": true
        }
      }
    }
  }
}
```

## Development Workflow

### 1. Initialize Extension

```bash
mkdir my-extension && cd my-extension
dxt init  # Interactive setup
# OR
dxt init --yes  # Quick defaults
```

### 2. Develop & Test Locally

```bash
# Test your server directly
node server.js  # or python main.py

# Validate manifest frequently
dxt validate .
```

### 3. Package Extension

```bash
# From extension directory
dxt pack . my-extension.dxt

# Manual packaging (if needed)
zip -r ../my-extension.dxt manifest.json server.js package*.json node_modules/
```

### 4. Debug Installation Issues

```bash
# Test the package
unzip -t my-extension.dxt

# Verify structure (no nested dirs!)
unzip -l my-extension.dxt | grep -E "manifest.json|server.js|main.py"

# Should show files at root:
# 0  2024-01-01 12:00   manifest.json
# 0  2024-01-01 12:00   server.js
# NOT: my-extension/manifest.json
```

## Quick Fixes

### Fix Nested Directory Structure

```bash
unzip bad.dxt
cd extracted-folder/
zip -r ../fixed.dxt *
```

### Fix Invalid JSON

```bash
# Pretty print and validate
jq . manifest.json > manifest-fixed.json
mv manifest-fixed.json manifest.json
```

### Add Missing Dependencies

```bash
# Node.js
npm install
npm list --depth=0  # Verify

# Python
pip freeze > requirements.txt
```

### Debug MCP Communication

```javascript
// Add logging to your server
console.error('[DEBUG]', JSON.stringify(request, null, 2));

// Test with stdio
echo '{"jsonrpc":"2.0","method":"initialize","id":1}' | node server.js
```

## Best Practices

1. **Always validate before packaging**: `dxt validate .`
2. **Test locally first**: Run your server standalone
3. **Use semantic versioning**: Update version on changes
4. **Include all dependencies**: Bundle everything needed
5. **Handle errors gracefully**: Don't crash on bad input
6. **Use user_config for secrets**: Mark sensitive fields
7. **Keep file structure flat**: No nested directories

## Debugging Checklist

- [ ] Valid zip file? (`unzip -t`)
- [ ] Correct structure? (files at root)
- [ ] Valid JSON? (`jq . manifest.json`)
- [ ] All required fields? (`dxt validate`)
- [ ] Dependencies included? (`node_modules/` or `lib/`)
- [ ] Main file exists? (`server.js` or as specified)
- [ ] MCP protocol implemented? (initialize, tools/prompts)
- [ ] Error handling in place?

## Need Help?

1. Check examples: <https://github.com/anthropics/dxt/tree/main/examples>
2. Use `dxt init` for correct structure
3. Test with `dxt validate` before packaging
4. Enable debug logs in Claude Desktop settings
