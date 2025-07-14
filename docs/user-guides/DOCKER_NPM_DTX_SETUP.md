# Docker, NPM, and DTX Setup Guide

This guide provides step-by-step instructions for setting up the MCP WordPress server using Docker, NPM, and DTX,
including Claude Desktop configuration.

---

## 🚀 Docker Setup

### 1. Build the Docker Image

Use the provided `Dockerfile` to build the MCP WordPress container:

```bash
git clone https://github.com/docdyhr/mcp-wordpress.git
cd mcp-wordpress
docker build -t mcp-wordpress .
```

### 2. Run the Docker Container

Start the container with the necessary environment variables:

```bash
# For Claude Desktop MCP integration (recommended)
docker run --rm -i \
  -e WORDPRESS_SITE_URL=https://example.com \
  -e WORDPRESS_USERNAME=your_username \
  -e WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx" \
  mcp-wordpress

# For debugging/testing (background mode)
docker run -d --name mcp-wordpress-debug \
  -e WORDPRESS_SITE_URL=https://example.com \
  -e WORDPRESS_USERNAME=your_username \
  -e WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx" \
  mcp-wordpress
```

### 3. Multi-Site Configuration

For multi-site setups, mount a configuration file:

1. Create `mcp-wordpress.config.json`:

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

1. Run the container with the configuration file:

```bash
# For Claude Desktop MCP integration (recommended)
docker run --rm -i \
  -v $(pwd)/mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  mcp-wordpress

# For debugging/testing (background mode)
docker run -d --name mcp-wordpress-multisite \
  -v $(pwd)/mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  mcp-wordpress
```

---

## 📦 NPM Setup

### 1. Install Dependencies

Clone the repository and install dependencies:

```bash
git clone https://github.com/docdyhr/mcp-wordpress.git
cd mcp-wordpress
npm install
```

### 2. Run the Setup Wizard

Run the interactive setup wizard:

```bash
npm run setup
```

### 3. Start the Server

Start the MCP WordPress server:

```bash
npm start
```

### 4. Test the Tools

Run tests to verify functionality:

```bash
npm run test:tools
```

---

## 🖼️ DTX Setup

### 1. Build the DTX Package

Use the provided script to build the DTX package:

```bash
npm run build
```

### 2. Deploy the DTX Package

Deploy the DTX package to the appropriate directory:

```bash
cp -r dxt/ /path/to/dtx/directory
```

### 3. Verify DTX Integration

Ensure the DTX package is correctly integrated by checking the `manifest.json` file:

```json
{
  "name": "MCP WordPress",
  "version": "1.0.0",
  "description": "DTX package for MCP WordPress",
  "main": "index.js"
}
```

---

## 🤖 Claude Desktop Configuration

### 1. Update Configuration File

Add the MCP WordPress server to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "node",
      "args": ["/path/to/your/mcp-wordpress/dist/index.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://example.com",
        "WORDPRESS_USERNAME": "your_username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  }
}
```

### 2. Restart Claude Desktop

Close and reopen Claude Desktop to load the new configuration.

### 3. Test Integration

Use natural language commands in Claude Desktop to interact with your WordPress site:

- "List my WordPress posts"
- "Show me my site statistics"
- "What categories do I have?"

---

## 🛠️ Maintenance Commands

### Docker

```bash
docker ps                # List running containers
docker logs mcp-wordpress # View container logs
docker stop mcp-wordpress # Stop the container
docker rm mcp-wordpress   # Remove the container
```

### NPM

```bash
npm run status          # Check WordPress connection
npm run health          # Full system health check
npm run verify-claude   # Verify Claude Desktop integration
```

### DTX

```bash
npm run build           # Rebuild the DTX package
```
