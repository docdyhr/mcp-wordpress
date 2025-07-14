# Smithery Setup Guide

Complete guide for installing and configuring MCP WordPress Server using Smithery package manager.

## 🎯 What is Smithery?

Smithery is a dedicated package manager for Model Context Protocol (MCP) servers, designed to simplify the
installation, configuration, and management of MCP tools.

### Why Choose Smithery?

| Feature | Smithery | Manual Setup |
|---------|----------|--------------|
| **Installation** | One command | Multiple steps |
| **Updates** | Automatic | Manual process |
| **Configuration** | GUI wizard | Config file editing |
| **Claude Integration** | Automatic | Manual config |
| **Package Management** | Built-in | Manual tracking |

## 📋 Prerequisites

### System Requirements

- **Operating System**: macOS, Linux, or Windows
- **Node.js**: 16.0 or higher
- **Claude Desktop**: Latest version
- **WordPress Site**: Version 5.0+ with REST API enabled

### WordPress Requirements

- WordPress user account with appropriate permissions
- Application Password enabled
- REST API accessible (test: `https://yoursite.com/wp-json/wp/v2/`)

## 🚀 Installation

### Step 1: Install Smithery

```bash
# Install Smithery package manager
npm install -g @smithery/cli

# Verify installation
smithery --version
```

### Step 2: Install MCP WordPress Server

```bash
# Install mcp-wordpress package
smithery install mcp-wordpress

# Verify installation
smithery list | grep mcp-wordpress
```

### Step 3: Configure WordPress Connection

```bash
# Start configuration wizard
smithery configure mcp-wordpress
```

The configuration wizard will prompt for:

- **WordPress Site URL**: `https://yoursite.com`
- **Username**: Your WordPress username
- **Application Password**: Generated from WordPress admin
- **Authentication Method**: Recommended: `app-password`

## 🔑 WordPress Application Password Setup

### Creating Application Password

1. **Log into WordPress Admin**
   - Navigate to your WordPress admin dashboard
   - Go to **Users** → **Your Profile**

2. **Generate Application Password**
   - Scroll to **Application Passwords** section
   - Application Name: `Smithery MCP WordPress`
   - Click **Add New Application Password**

3. **Copy the Password**
   - WordPress displays: `AbCd EfGh IjKl MnOp QrSt UvWx`
   - **Important**: Copy exactly with spaces
   - Store securely - you won't see it again

4. **Enter in Smithery Configuration**
   - Paste the password when prompted
   - Smithery will securely store it

## ⚙️ Configuration Options

### Basic Configuration

```bash
# Configure with prompts
smithery configure mcp-wordpress

# View current configuration
smithery config show mcp-wordpress

# Edit configuration file
smithery config edit mcp-wordpress
```

### Advanced Configuration

```json
{
  "wordpress": {
    "siteUrl": "https://yoursite.com",
    "username": "your-username",
    "appPassword": "AbCd EfGh IjKl MnOp QrSt UvWx",
    "authMethod": "app-password"
  },
  "server": {
    "port": 3000,
    "debug": false,
    "caching": true
  }
}
```

### Multi-Site Configuration

For managing multiple WordPress sites:

```bash
# Add additional site
smithery configure mcp-wordpress --add-site

# Select active site
smithery configure mcp-wordpress --select-site site-id

# List configured sites
smithery config sites mcp-wordpress
```

## 🖥️ Claude Desktop Integration

### Automatic Setup

Smithery automatically configures Claude Desktop:

```bash
# Start MCP server and register with Claude
smithery start mcp-wordpress

# Verify Claude Desktop connection
smithery status mcp-wordpress
```

### Manual Claude Desktop Configuration

If automatic setup fails, manually add to Claude config:

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "smithery",
      "args": ["run", "mcp-wordpress"]
    }
  }
}
```

## 🔧 Management Commands

### Server Management

```bash
# Start MCP server
smithery start mcp-wordpress

# Stop MCP server
smithery stop mcp-wordpress

# Restart server
smithery restart mcp-wordpress

# Check server status
smithery status mcp-wordpress
```

### Package Management

```bash
# Update to latest version
smithery update mcp-wordpress

# Check for updates
smithery outdated

# View package information
smithery info mcp-wordpress

# Remove package
smithery remove mcp-wordpress
```

### Debugging and Logs

```bash
# View real-time logs
smithery logs mcp-wordpress --follow

# View recent logs
smithery logs mcp-wordpress --lines 50

# Enable debug mode
smithery configure mcp-wordpress --debug

# Run diagnostics
smithery diagnose mcp-wordpress
```

## ✅ Verification

### Test Installation

1. **Start the Server**

   ```bash
   smithery start mcp-wordpress
   ```

2. **Check Status**

   ```bash
   smithery status mcp-wordpress
   # Should show: "Running on port 3000"
   ```

3. **Test Claude Desktop Integration**
   - Restart Claude Desktop
   - Type: "List my WordPress posts"
   - Should display your WordPress content

### Health Check

```bash
# Run comprehensive health check
smithery health mcp-wordpress

# Test WordPress connection
smithery test mcp-wordpress --connection

# Verify all tools are working
smithery test mcp-wordpress --tools
```

## 🐛 Troubleshooting

### Common Issues

#### Installation Fails

```bash
# Clear Smithery cache
smithery cache clear

# Reinstall package
smithery remove mcp-wordpress
smithery install mcp-wordpress
```

#### Connection Issues

```bash
# Test WordPress connection
curl https://yoursite.com/wp-json/wp/v2/

# Verify credentials
smithery test mcp-wordpress --auth

# Check configuration
smithery config show mcp-wordpress
```

#### Claude Desktop Not Connecting

```bash
# Restart services
smithery restart mcp-wordpress

# Check Claude Desktop config
smithery config claude-desktop

# View connection logs
smithery logs mcp-wordpress | grep -i claude
```

### Debug Mode

```bash
# Enable detailed logging
smithery configure mcp-wordpress --debug=true

# View debug logs
smithery logs mcp-wordpress --level debug

# Run in foreground for debugging
smithery run mcp-wordpress --foreground
```

## 🔄 Updates and Maintenance

### Automatic Updates

```bash
# Enable automatic updates
smithery configure mcp-wordpress --auto-update

# Check update schedule
smithery schedule list
```

### Manual Updates

```bash
# Check for updates
smithery outdated

# Update specific package
smithery update mcp-wordpress

# Update all packages
smithery update --all
```

### Backup and Restore

```bash
# Backup configuration
smithery backup mcp-wordpress

# Restore from backup
smithery restore mcp-wordpress --backup-id backup-123

# List available backups
smithery backup list
```

## 🔐 Security

### Best Practices

1. **Secure Credentials**
   - Use Application Passwords (not main password)
   - Regenerate passwords regularly
   - Use minimal WordPress user permissions

2. **Network Security**
   - Use HTTPS for WordPress sites
   - Configure firewall rules if needed
   - Monitor access logs

3. **Smithery Security**

   ```bash
   # View security audit
   smithery audit mcp-wordpress
   
   # Update to security patches
   smithery update mcp-wordpress --security-only
   ```

## 🆘 Getting Help

### Smithery Support

- **Documentation**: [Smithery Docs](https://smithery.ai/docs)
- **GitHub**: [Smithery Repository](https://github.com/smithery-ai/smithery)
- **Discord**: [Smithery Community](https://discord.gg/smithery)

### MCP WordPress Support

- **Documentation**: [Project Docs](../README.md)
- **Issues**: [GitHub Issues](https://github.com/docdyhr/mcp-wordpress/issues)
- **Discussions**: [GitHub Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)

### Common Commands Reference

```bash
# Quick reference
smithery help mcp-wordpress

# Command documentation
smithery help install
smithery help configure
smithery help start

# Get support information
smithery support mcp-wordpress
```

---

**Ready to start?** Install Smithery and transform your WordPress management experience with the power of MCP!
