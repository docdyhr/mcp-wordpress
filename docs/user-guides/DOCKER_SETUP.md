# Docker Setup Guide

This guide provides step-by-step instructions for setting up the MCP WordPress server using Docker, specifically for Claude Desktop integration.

---

## 🚀 Quick Start

### 1. Pull the Docker Image

```bash
docker pull docdyhr/mcp-wordpress:latest
```

### 2. Add to Claude Desktop configuration

## 🎯 Claude Desktop Integration (Recommended)

### Single-Site Setup

Add this to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "WORDPRESS_SITE_URL=https://your-site.com",
        "-e",
        "WORDPRESS_USERNAME=your_username",
        "-e",
        "WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx",
        "docdyhr/mcp-wordpress:latest"
      ]
    }
  }
}
```

### Multi-Site Setup (Recommended)

1. **Create `mcp-wordpress.config.json`**:

```json
{
  "sites": [
    {
      "id": "site1",
      "name": "Main Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    {
      "id": "site2",
      "name": "Blog Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog.site2.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy"
      }
    }
  ]
}
```

2. **Add to Claude Desktop configuration**:

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/absolute/path/to/mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro",
        "docdyhr/mcp-wordpress:latest"
      ]
    }
  }
}
```

## 🔧 Standalone Docker Usage

### Single-Site Mode

```bash
# Interactive mode (recommended for testing)
docker run --rm -i \
  -e WORDPRESS_SITE_URL=https://your-site.com \
  -e WORDPRESS_USERNAME=your_username \
  -e WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx" \
  docdyhr/mcp-wordpress:latest

# Background mode (for debugging/logs)
docker run -d --name mcp-wordpress-debug \
  -e WORDPRESS_SITE_URL=https://your-site.com \
  -e WORDPRESS_USERNAME=your_username \
  -e WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx" \
  docdyhr/mcp-wordpress:latest
```

### Multi-Site Mode

```bash
# Interactive mode
docker run --rm -i \
  -v ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  docdyhr/mcp-wordpress:latest

# Background mode (for debugging/logs)
docker run -d --name mcp-wordpress-multisite \
  -v ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  docdyhr/mcp-wordpress:latest
```

## 🐳 Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-wordpress:
    image: docdyhr/mcp-wordpress:latest
    container_name: mcp-wordpress
    restart: unless-stopped
    volumes:
      # Mount configuration file (choose one approach)
      - ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro
      # OR mount .env file for single-site
      - ./.env:/app/.env:ro
    environment:
      - NODE_ENV=production
    # Note: No ports exposed - MCP uses stdin/stdout
```

**Start with Docker Compose:**

```bash
docker-compose up -d
```

## 🛠️ Development & Debugging

### View Logs

```bash
# For named containers
docker logs mcp-wordpress-debug
docker logs -f mcp-wordpress-multisite  # Follow logs

# For Docker Compose
docker-compose logs -f mcp-wordpress
```

### Container Management

```bash
# List running containers
docker ps

# Stop containers
docker stop mcp-wordpress-debug
docker-compose down

# Remove containers
docker rm mcp-wordpress-debug
```

### Test Configuration

```bash
# Test single-site setup
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | \
docker run --rm -i \
  -e WORDPRESS_SITE_URL=https://your-site.com \
  -e WORDPRESS_USERNAME=your_username \
  -e WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx" \
  docdyhr/mcp-wordpress:latest

# Test multi-site setup
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | \
docker run --rm -i \
  -v ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  docdyhr/mcp-wordpress:latest
```

## 🔍 Troubleshooting

### Common Issues

**1. MCP Integration Not Working**

- ❌ **Problem**: Using `-d` flag in Claude Desktop config
- ✅ **Solution**: Remove `-d` flag, use `--rm -i` instead

**2. Configuration File Not Found**

- ❌ **Problem**: Wrong mount path `/app/config/mcp-wordpress.config.json`
- ✅ **Solution**: Use correct path `/app/mcp-wordpress.config.json`

**3. Permission Denied**

- ❌ **Problem**: Config file not readable by container
- ✅ **Solution**: Use absolute paths and check file permissions

**4. App Password with Spaces**

- ❌ **Problem**: Spaces in password breaking Docker args
- ✅ **Solution**: Quote the password in command line, or use config file

### Validation Commands

```bash
# Verify image exists
docker images | grep mcp-wordpress

# Check container health
docker run --rm docdyhr/mcp-wordpress:latest --health-check

# Validate config file
docker run --rm -i \
  -v ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  docdyhr/mcp-wordpress:latest --validate-config
```

## 🚨 Important Notes

### ✅ Do's

- ✅ Use `--rm -i` for Claude Desktop integration
- ✅ Mount config file to `/app/mcp-wordpress.config.json`
- ✅ Use absolute paths for volume mounts
- ✅ Quote passwords with spaces in command line

### ❌ Don'ts  

- ❌ **Never use `-d` flag with Claude Desktop** (breaks MCP communication)
- ❌ **Don't expose ports** like `-p 3000:3000` (unnecessary for MCP)
- ❌ **Don't use named containers** with `--name` for MCP (can cause conflicts)
- ❌ **Don't mount to `/app/config/`** (wrong path)

## 🔄 After Setup

1. **Restart Claude Desktop** to load the new configuration
2. **Test the integration** with commands like:
   - "List my WordPress posts"
   - "Show my site statistics"
   - "What WordPress sites do I have configured?"

The Docker container will start automatically when Claude Desktop needs to use WordPress tools.
