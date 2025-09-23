# Installation Guide

Complete installation guide for MCP WordPress Server with all supported methods.

## 🎯 Choose Your Installation Method

| Method                                           | Best For     | Setup Time | Difficulty   |
| ------------------------------------------------ | ------------ | ---------- | ------------ |
| **[DXT Extension](#-dxt-extension-recommended)** | Most users   | 2 minutes  | Beginner     |
| **[NPX](#-npx-quick-start)**                     | Power users  | 5 minutes  | Beginner     |
| **[Smithery](#-smithery-package-manager)**       | MCP users    | 3 minutes  | Beginner     |
| **[NPM Global](#-npm-global-installation)**      | Developers   | 10 minutes | Intermediate |
| **[Docker](#-docker-deployment)**                | Production   | 15 minutes | Intermediate |
| **[Development](#️-development-setup)**          | Contributors | 20 minutes | Advanced     |

## 🏆 DXT Extension (Recommended)

The easiest way to get started with WordPress MCP in Claude Desktop.

### Prerequisites

- Claude Desktop application
- WordPress site with REST API enabled
- WordPress Application Password

### Installation Steps

1. **Download DXT Package**

   ```bash
   # Download the latest DXT package
   curl -L -o mcp-wordpress.dxt \
     https://github.com/docdyhr/mcp-wordpress/releases/latest/download/mcp-wordpress.dxt
   ```

2. **Install in Claude Desktop**

   - Open Claude Desktop
   - Go to Extensions menu
   - Click "Install Extension"
   - Select the downloaded `mcp-wordpress.dxt` file

3. **Configure WordPress Connection**
   - Enter your WordPress site URL
   - Provide your WordPress username
   - Add your Application Password
   - Test the connection

### Creating WordPress Application Password

1. Log into your WordPress admin panel
2. Go to **Users** → **Profile**
3. Scroll to **Application Passwords** section
4. Enter name: "Claude Desktop MCP"
5. Click **Add New Application Password**
6. Copy the generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)

**📖 [Complete DXT Setup Guide →](integrations/claude-desktop.md)**

## ⚡ NPX Quick Start

Best for users who want the latest version without installation.

### NPX Prerequisites

- Node.js 16+ and npm
- WordPress site with REST API enabled
- WordPress Application Password

### Installation

```bash
# Run directly with NPX (always uses latest version)
npx -y mcp-wordpress

# Interactive setup wizard
npm run setup
```

### Claude Desktop Configuration

Add to your Claude Desktop config:

```json
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

**📖 [Complete NPX Setup Guide →](user-guides/NPX_SETUP.md)**

## 📦 Smithery Package Manager

Smithery is a dedicated package manager for MCP servers, providing easy installation and management.

### Prerequisites

- Smithery package manager installed
- Claude Desktop application
- WordPress site with REST API enabled
- WordPress Application Password

### Installation

```bash
# Install mcp-wordpress via Smithery
smithery install mcp-wordpress

# Verify installation
smithery list | grep mcp-wordpress
```

### Configuration

```bash
# Configure the WordPress connection
smithery configure mcp-wordpress

# Start the MCP server
smithery start mcp-wordpress

# Check status
smithery status mcp-wordpress
```

### Claude Desktop Integration

Smithery automatically configures Claude Desktop integration. After installation:

1. **Restart Claude Desktop**
2. **Test WordPress functionality**
   ```text
   "List my WordPress posts"
   ```

### Smithery Commands

```bash
# Install package
smithery install mcp-wordpress

# Update to latest version
smithery update mcp-wordpress

# Configure settings
smithery configure mcp-wordpress

# Start/stop server
smithery start mcp-wordpress
smithery stop mcp-wordpress

# View logs
smithery logs mcp-wordpress

# Remove package
smithery remove mcp-wordpress
```

**📖 [Complete Smithery Setup Guide →](user-guides/SMITHERY_SETUP.md)**

## 📦 NPM Global Installation

For developers who prefer global npm packages.

### NPM Installation

```bash
# Install globally
npm install -g mcp-wordpress

# Verify installation
mcp-wordpress --version

# Run setup wizard
mcp-wordpress setup
```

### Configuration

Create `.env` file or configure environment variables:

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
WORDPRESS_SITE_URL=https://your-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=your-app-password
WORDPRESS_AUTH_METHOD=app-password
```

**📖 [Complete NPM Setup Guide →](user-guides/NPM_SETUP.md)**

## 🐳 Docker Deployment

Production-ready containerized deployment.

### Docker Prerequisites

- Docker 20.10+
- Docker Compose (optional)

### Quick Start

```bash
# Run with Docker
docker run -d \
  --name mcp-wordpress \
  -e WORDPRESS_SITE_URL=https://your-site.com \
  -e WORDPRESS_USERNAME=your-username \
  -e WORDPRESS_APP_PASSWORD="your-app-password" \
  docdyhr/mcp-wordpress:latest

# Check logs
docker logs mcp-wordpress
```

### Docker Compose

```yaml
version: "3.8"
services:
  mcp-wordpress:
    image: docdyhr/mcp-wordpress:latest
    environment:
      - WORDPRESS_SITE_URL=https://your-site.com
      - WORDPRESS_USERNAME=your-username
      - WORDPRESS_APP_PASSWORD=your-app-password
    restart: unless-stopped
    volumes:
      - ./config:/app/config
```

**📖 [Complete Docker Setup Guide →](user-guides/DOCKER_SETUP.md)**

## 🛠️ Development Setup

For contributors and custom development.

### Development Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Development Installation

```bash
# Clone repository
git clone https://github.com/docdyhr/mcp-wordpress.git
cd mcp-wordpress

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### Development Configuration

```bash
# Copy example environment
cp .env.example .env

# Configure for development
NODE_ENV=development
DEBUG=true
WORDPRESS_SITE_URL=https://your-dev-site.com
WORDPRESS_USERNAME=dev-user
WORDPRESS_APP_PASSWORD=dev-password
```

**📖 [Complete Development Guide →](developer/DEVELOPMENT.md)**

## 🔧 Configuration Options

### Environment Variables

| Variable                 | Required | Default        | Description           |
| ------------------------ | -------- | -------------- | --------------------- |
| `WORDPRESS_SITE_URL`     | Yes      | -              | WordPress site URL    |
| `WORDPRESS_USERNAME`     | Yes      | -              | WordPress username    |
| `WORDPRESS_APP_PASSWORD` | Yes      | -              | Application password  |
| `WORDPRESS_AUTH_METHOD`  | No       | `app-password` | Authentication method |
| `NODE_ENV`               | No       | `production`   | Environment mode      |
| `DEBUG`                  | No       | `false`        | Enable debug logging  |
| `DISABLE_CACHE`          | No       | `false`        | Disable caching       |

### Multi-Site Configuration

For managing multiple WordPress sites, create `mcp-wordpress.config.json`:

```json
{
  "sites": [
    {
      "id": "main-site",
      "name": "Main WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://site1.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    },
    {
      "id": "client-blog",
      "name": "Client Blog",
      "config": {
        "WORDPRESS_SITE_URL": "https://client-blog.com",
        "WORDPRESS_USERNAME": "editor",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy yyyy yyyy yyyy"
      }
    }
  ]
}
```

**📖 [Complete Configuration Guide →](CONFIGURATION.md)**

## ✅ Verification

### Test Installation

```bash
# Check connection status
npm run status

# Test basic functionality
npm run test:tools

# Run health check
npm run health
```

### Verify Claude Desktop Integration

1. Restart Claude Desktop after configuration
2. Type: "List my WordPress posts"
3. Should see your WordPress content

### Common Verification Issues

**Tools not appearing in Claude:**

- Restart Claude Desktop
- Check configuration file syntax
- Verify environment variables

**Connection failed:**

- Test WordPress REST API: `curl https://your-site.com/wp-json/wp/v2/`
- Verify Application Password format
- Check WordPress permissions

## 🆘 Troubleshooting

### Common Issues

1. **"Cannot connect to WordPress"**

   - Verify `WORDPRESS_SITE_URL` format
   - Check if WordPress REST API is enabled
   - Test manually: `curl https://your-site.com/wp-json/wp/v2/`

2. **"Authentication failed"**

   - Verify Application Password format (with spaces)
   - Check WordPress user permissions
   - Ensure Application Passwords are enabled

3. **"Tools not working in Claude"**

   - Restart Claude Desktop
   - Check configuration file location
   - Verify JSON syntax

4. **Performance issues**
   - Enable caching: remove `DISABLE_CACHE=true`
   - Check WordPress hosting performance
   - Monitor with: `npm run performance:stats`

**📖 [Complete Troubleshooting Guide →](TROUBLESHOOTING.md)**

## 🔐 Security Considerations

### WordPress Security

- Use Application Passwords (recommended)
- Create dedicated MCP user with minimal permissions
- Enable HTTPS for production
- Regular security updates

### MCP Server Security

- Keep dependencies updated
- Use environment variables for secrets
- Enable firewall rules for Docker deployments
- Monitor access logs

**📖 [Complete Security Guide →](SECURITY.md)**

## 🚀 Next Steps

After successful installation:

1. **[Explore Tools](api/README.md)** - Discover all 59 available tools
2. **[Configure Multi-Site](CONFIGURATION.md#multi-site-setup)** - Manage multiple WordPress sites
3. **[Performance Optimization](PERFORMANCE_MONITORING.md)** - Optimize for production
4. **[Integration Examples](../examples/)** - See real-world usage examples

## 🆘 Getting Help

- **[GitHub Issues](https://github.com/docdyhr/mcp-wordpress/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)** - Community help and questions
- **[Documentation](README.md)** - Complete documentation index

---

**Found an issue with this guide?**
[Edit on GitHub](https://github.com/docdyhr/mcp-wordpress/edit/main/docs/INSTALLATION.md) or
[open an issue](https://github.com/docdyhr/mcp-wordpress/issues/new).
