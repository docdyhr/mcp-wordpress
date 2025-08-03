# Blue-Green Deployment Guide

This guide explains how to use the blue-green deployment system for zero-downtime deployments of the MCP WordPress server.

## 🚀 Quick Start

### Initialize Deployment Configuration

```bash
npm run deploy:blue-green:init
```

This creates a `deployment.config.json` file with default settings.

### Deploy New Version

```bash
npm run deploy:blue-green
```

This will:
1. Build a new Docker image
2. Deploy to the inactive environment (blue or green)
3. Run health checks and performance validation
4. Switch traffic to the new environment
5. Monitor the deployment for 5 minutes
6. Clean up the old environment

### Check Deployment Status

```bash
npm run deploy:blue-green:status  
```

### Manual Rollback (if needed)

```bash
npm run deploy:blue-green:rollback "Emergency rollback reason"
```

## 🏗️ Architecture

The blue-green deployment system consists of:

- **Blue Environment**: Running on port 3001
- **Green Environment**: Running on port 3002  
- **Nginx Load Balancer**: Routes traffic between environments
- **Redis**: Shared cache and session store
- **Monitoring**: Prometheus + Grafana for observability

## 📋 Configuration

### Deployment Configuration (`deployment.config.json`)

```json
{
  "environments": {
    "production": {
      "load_balancer": {
        "type": "nginx",
        "config_path": "/etc/nginx/conf.d/mcp-wordpress.conf",
        "reload_command": "nginx -s reload"
      },
      "blue": {
        "port": 3001,
        "health_url": "http://localhost:3001/health",
        "container_name": "mcp-wordpress-blue",
        "image_tag": "blue"
      },
      "green": {
        "port": 3002,
        "health_url": "http://localhost:3002/health", 
        "container_name": "mcp-wordpress-green",
        "image_tag": "green"
      }
    }
  },
  "monitoring": {
    "performance_thresholds": {
      "response_time_ms": 2000,
      "error_rate_percent": 5
    }
  },
  "rollback": {
    "auto_rollback": true,
    "monitoring_duration": 300
  }
}
```

## 🐳 Docker Compose Setup

Use the provided `docker-compose.blue-green.yml` for a complete setup:

```bash
docker-compose -f docker-compose.blue-green.yml up -d
```

This starts:
- Nginx load balancer (port 3000)
- Blue and green environments (ports 3001, 3002)
- Redis cache
- Prometheus monitoring (port 9090)
- Grafana dashboard (port 3001)

## 🔧 Manual Operations

### Deploy Specific Version

```bash
./scripts/blue-green-deploy.sh deploy v2.4.3
```

### Switch Traffic Manually

```bash
./scripts/blue-green-deploy.sh switch blue   # Switch to blue
./scripts/blue-green-deploy.sh switch green  # Switch to green
```

### Clean Up Environment

```bash
./scripts/blue-green-deploy.sh cleanup blue   # Clean up blue environment
./scripts/blue-green-deploy.sh cleanup green  # Clean up green environment
```

## 📊 Monitoring

### Health Checks

Each deployment includes:
- Application health endpoint validation
- Performance threshold checks
- Error rate monitoring
- Resource usage validation

### Automatic Rollback Triggers

- Health check failures
- Performance degradation (response time > 2s)
- Error rate spikes (> 5%)
- Resource exhaustion

### Monitoring Dashboard

Access Grafana at `http://localhost:3001` (admin/admin123) to view:
- Deployment status
- Performance metrics
- Error rates
- Resource usage

## 🚨 Troubleshooting

### Deployment Fails

1. Check Docker container logs:
   ```bash
   docker logs mcp-wordpress-blue
   docker logs mcp-wordpress-green
   ```

2. Verify health endpoints:
   ```bash
   curl http://localhost:3001/health  # Blue
   curl http://localhost:3002/health  # Green
   ```

3. Check nginx configuration:
   ```bash
   docker exec mcp-wordpress-lb nginx -t
   ```

### Rollback Issues

If automatic rollback fails:

1. Manual rollback using existing rollback script:
   ```bash
   ./scripts/rollback-deployment.sh rollback
   ```

2. Emergency manual switch:
   ```bash
   ./scripts/blue-green-deploy.sh switch [blue|green]
   ```

### Performance Issues

1. Check resource usage:
   ```bash
   docker stats mcp-wordpress-blue mcp-wordpress-green
   ```

2. Analyze response times:
   ```bash
   curl -w "%{time_total}" http://localhost:3000/health
   ```

## 🔒 Security Considerations

- All containers run as non-root users
- Network isolation via Docker networks
- Nginx security headers enabled
- Rate limiting configured
- SSL/TLS termination support

## 📈 Best Practices

1. **Always test deployments** in a staging environment first
2. **Monitor metrics** for at least 5 minutes post-deployment
3. **Keep previous version running** until new version is stable
4. **Use semantic versioning** for deployments
5. **Have rollback plan** ready before deployment
6. **Backup configurations** before major changes

## 🔄 Integration with CI/CD

### GitHub Actions Integration

```yaml
- name: Blue-Green Deployment
  run: |
    npm run deploy:blue-green:init
    npm run deploy:blue-green
  env:
    DEPLOYMENT_VERSION: ${{ github.sha }}
```

### Automated Deployment Pipeline

The system integrates with:
- Automated testing before deployment
- Contract validation
- Performance benchmarking
- Automated rollback on failure

## 📚 Additional Resources

- [Load Balancer Configuration](nginx/conf.d/mcp-wordpress.conf)
- [Monitoring Setup](monitoring/prometheus.yml)
- [Docker Compose Reference](docker-compose.blue-green.yml)
- [Rollback Documentation](../scripts/rollback-deployment.sh)