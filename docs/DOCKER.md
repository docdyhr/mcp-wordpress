# Docker Deployment Guide (Legacy)

![Docker](https://img.shields.io/badge/Docker-ready-blue)
![Version](https://img.shields.io/badge/version-1.2.0-green)
![Security](https://img.shields.io/badge/security-hardened-brightgreen)

> **📖 New Users**: For Claude Desktop MCP integration, see the **[Docker Setup Guide](user-guides/DOCKER_SETUP.md)** instead.

This guide covers advanced Docker deployment scenarios for production and development environments.

## 🚀 Quick Start

### Option 1: Docker Hub (Recommended)

```bash
# Production deployment (NOT for Claude Desktop MCP)
docker run -d \
  --name mcp-wordpress \
  --restart unless-stopped \
  -e WORDPRESS_SITE_URL=https://your-site.com \
  -e WORDPRESS_USERNAME=your-username \
  -e WORDPRESS_APP_PASSWORD=your-app-password \
  docdyhr/mcp-wordpress:latest
```

**⚠️ Claude Desktop Users**: Do NOT use `-d` flag with Claude Desktop. See [Docker Setup Guide](user-guides/DOCKER_SETUP.md) for MCP integration.

### Option 2: Docker Compose

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/docdyhr/mcp-wordpress/main/docker-compose.yml

# Configure environment variables (see below)
# Start the service
docker-compose up -d
```

### Option 3: Build from Source

```bash
# Clone the repository
git clone https://github.com/docdyhr/mcp-wordpress.git
cd mcp-wordpress

# Build the image
docker build -t mcp-wordpress .

# Run the container
docker run -d --name mcp-wordpress mcp-wordpress
```

## 📋 Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `WORDPRESS_SITE_URL` | ✅ | WordPress site URL | `https://example.com` |
| `WORDPRESS_USERNAME` | ✅ | WordPress username | `admin` |
| `WORDPRESS_APP_PASSWORD` | ✅ | Application password | `xxxx xxxx xxxx xxxx xxxx xxxx` |
| `WORDPRESS_AUTH_METHOD` | ❌ | Authentication method | `app-password` (default) |
| `NODE_ENV` | ❌ | Environment mode | `production` |
| `DEBUG` | ❌ | Enable debug logging | `false` |
| `DISABLE_CACHE` | ❌ | Disable caching system | `false` |

### Multi-Site Configuration

For multi-site setups, mount a configuration file:

```bash
docker run -d \
  --name mcp-wordpress \
  -v ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
  docdyhr/mcp-wordpress:latest
```

**⚠️ Mount Path**: Use `/app/mcp-wordpress.config.json` (not `/app/config/`).

**Example `mcp-wordpress.config.json`:**
```json
{
  \"sites\": [
    {
      \"id\": \"site1\",
      \"name\": \"Production Site\",
      \"config\": {
        \"WORDPRESS_SITE_URL\": \"https://site1.com\",
        \"WORDPRESS_USERNAME\": \"admin\",
        \"WORDPRESS_APP_PASSWORD\": \"xxxx xxxx xxxx xxxx xxxx xxxx\"
      }
    },
    {
      \"id\": \"site2\",
      \"name\": \"Staging Site\",
      \"config\": {
        \"WORDPRESS_SITE_URL\": \"https://staging.site2.com\",
        \"WORDPRESS_USERNAME\": \"staging-user\",
        \"WORDPRESS_APP_PASSWORD\": \"yyyy yyyy yyyy yyyy yyyy yyyy\"
      }
    }
  ]
}
```

## 🐳 Docker Compose

### Basic Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mcp-wordpress:
    image: docdyhr/mcp-wordpress:latest
    container_name: mcp-wordpress
    restart: unless-stopped
    environment:
      - WORDPRESS_SITE_URL=https://your-site.com
      - WORDPRESS_USERNAME=your-username
      - WORDPRESS_APP_PASSWORD=your-app-password
      - NODE_ENV=production
    volumes:
      # Optional: Mount config for multi-site
      - ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro
      # Optional: Persist logs
      - ./logs:/app/logs
      # Optional: Persist cache
      - ./cache:/app/cache
    healthcheck:
      test: [\"CMD\", \"node\", \"dist/index.js\", \"--health-check\"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Development Environment

For local development with WordPress and database:

```bash
# Start with development profile
docker-compose up --profile dev

# This includes:
# - MCP WordPress Server
# - WordPress instance (http://localhost:8080)
# - MySQL database
```

## 🏗️ Production Deployment

### Docker Swarm

```yaml
version: '3.8'

services:
  mcp-wordpress:
    image: docdyhr/mcp-wordpress:latest
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    environment:
      - NODE_ENV=production
    secrets:
      - wordpress_config
    networks:
      - mcp-network

secrets:
  wordpress_config:
    external: true

networks:
  mcp-network:
    driver: overlay
```

### Kubernetes

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-wordpress
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-wordpress
  template:
    metadata:
      labels:
        app: mcp-wordpress
    spec:
      containers:
      - name: mcp-wordpress
        image: docdyhr/mcp-wordpress:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: \"production\"
        - name: WORDPRESS_SITE_URL
          valueFrom:
            secretKeyRef:
              name: wordpress-secrets
              key: site-url
        - name: WORDPRESS_USERNAME
          valueFrom:
            secretKeyRef:
              name: wordpress-secrets
              key: username
        - name: WORDPRESS_APP_PASSWORD
          valueFrom:
            secretKeyRef:
              name: wordpress-secrets
              key: app-password
        resources:
          requests:
            memory: \"256Mi\"
            cpu: \"250m\"
          limits:
            memory: \"512Mi\"
            cpu: \"500m\"
        livenessProbe:
          exec:
            command:
            - node
            - dist/index.js
            - --health-check
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          exec:
            command:
            - node
            - dist/index.js
            - --health-check
          initialDelaySeconds: 10
          periodSeconds: 10
```

## 🔧 Management Commands

### Container Management

```bash
# View logs
docker logs -f mcp-wordpress

# Check health status
docker inspect --format='{{.State.Health.Status}}' mcp-wordpress

# Execute commands inside container
docker exec -it mcp-wordpress /bin/sh

# Update to latest version
docker pull docdyhr/mcp-wordpress:latest
docker stop mcp-wordpress
docker rm mcp-wordpress
# Run with new image...
```

### Docker Compose Management

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f mcp-wordpress

# Stop services
docker-compose down

# Update images
docker-compose pull
docker-compose up -d

# View service status
docker-compose ps
```

## 📊 Monitoring

### Health Checks

The container includes built-in health checks:

```bash
# Check health status
docker inspect mcp-wordpress | jq '.[0].State.Health'

# View health check logs
docker inspect mcp-wordpress | jq '.[0].State.Health.Log'
```

### Performance Monitoring

Access performance monitoring tools inside the container:

```bash
# Get performance stats
docker exec mcp-wordpress node -e \"
const { PerformanceMonitor } = require('./dist/performance/PerformanceMonitor.js');
const monitor = new PerformanceMonitor();
console.log(JSON.stringify(monitor.getCurrentMetrics(), null, 2));
\"
```

### Log Management

```bash
# View container logs
docker logs mcp-wordpress

# Follow logs in real-time
docker logs -f mcp-wordpress

# Limit log output
docker logs --tail 100 mcp-wordpress

# Export logs
docker logs mcp-wordpress > mcp-wordpress.log
```

## 🔒 Security

### Security Best Practices

1. **Non-Root User**: Container runs as non-root user `mcp` (UID 1001)
2. **Minimal Base Image**: Uses Alpine Linux for smaller attack surface
3. **Secrets Management**: Use Docker secrets or environment variables securely
4. **Network Security**: Use custom networks for container isolation
5. **Resource Limits**: Set memory and CPU limits

### Secrets Management

**Using Docker Secrets:**
```bash
# Create secrets
echo \"https://your-site.com\" | docker secret create wordpress_url -
echo \"your-username\" | docker secret create wordpress_user -
echo \"your-app-password\" | docker secret create wordpress_password -

# Use in compose file
version: '3.8'
services:
  mcp-wordpress:
    image: docdyhr/mcp-wordpress:latest
    secrets:
      - wordpress_url
      - wordpress_user
      - wordpress_password
    environment:
      - WORDPRESS_SITE_URL_FILE=/run/secrets/wordpress_url
      - WORDPRESS_USERNAME_FILE=/run/secrets/wordpress_user
      - WORDPRESS_APP_PASSWORD_FILE=/run/secrets/wordpress_password

secrets:
  wordpress_url:
    external: true
  wordpress_user:
    external: true
  wordpress_password:
    external: true
```

### Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 3000/tcp  # If exposing HTTP endpoint
ufw deny 3000/tcp from any to any  # Block external access if not needed
```

## 🛠️ Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs for errors
docker logs mcp-wordpress

# Verify environment variables
docker exec mcp-wordpress env | grep WORDPRESS

# Test configuration
docker exec mcp-wordpress node dist/index.js --test-config
```

#### Authentication Problems
```bash
# Test WordPress connection
docker exec mcp-wordpress node -e \"
const client = require('./dist/client/api.js');
// Test authentication...
\"

# Check credentials
docker exec mcp-wordpress printenv | grep WORDPRESS
```

#### Performance Issues
```bash
# Check resource usage
docker stats mcp-wordpress

# Monitor performance metrics
docker exec mcp-wordpress node -e \"
// Access performance monitoring tools...
\"
```

### Debug Mode

```bash
# Run with debug logging
docker run -e DEBUG=true docdyhr/mcp-wordpress:latest

# Or with compose
environment:
  - DEBUG=true
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [MCP WordPress Server Documentation](../README.md)
- [Performance Monitoring Guide](./PERFORMANCE.md)
- [Caching Guide](./CACHING.md)

## 🤝 Support

- **GitHub Issues**: [Report problems](https://github.com/docdyhr/mcp-wordpress/issues)
- **Discussions**: [Ask questions](https://github.com/docdyhr/mcp-wordpress/discussions)
- **Documentation**: [Browse guides](https://github.com/docdyhr/mcp-wordpress/tree/main/docs)

---

**🐳 Docker deployment made simple with comprehensive security and monitoring!**