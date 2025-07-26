# Docker Production Deployment Examples

Complete configuration examples for deploying MCP WordPress in production environments using Docker.

## Basic Production Setup

### Dockerfile (Production)

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    ca-certificates \
    && update-ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p cache logs && chown -R nextjs:nodejs cache logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  mcp-wordpress:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: mcp-wordpress-prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - WORDPRESS_SITE_URL=${WORDPRESS_SITE_URL}
      - WORDPRESS_USERNAME=${WORDPRESS_USERNAME}
      - WORDPRESS_APP_PASSWORD=${WORDPRESS_APP_PASSWORD}
      - CACHE_ENABLED=true
      - CACHE_TTL=600
      - SECURITY_MONITORING=true
      - LOG_LEVEL=info
    volumes:
      - ./cache:/app/cache
      - ./logs:/app/logs
      - ./config:/app/config:ro
    networks:
      - mcp-network
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1)
          })",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  mcp-network:
    driver: bridge

volumes:
  cache-data:
  logs-data:
```

### Environment Configuration

**.env.production**

```bash
# Production Environment Configuration
NODE_ENV=production

# WordPress Configuration
WORDPRESS_SITE_URL=https://your-production-site.com
WORDPRESS_USERNAME=api-user
WORDPRESS_APP_PASSWORD=secure-production-password

# Performance Settings
CACHE_ENABLED=true
CACHE_TTL=600
CACHE_MAX_ITEMS=1000
CACHE_MAX_MEMORY_MB=200

# Security Settings
SECURITY_MONITORING=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/app/logs/mcp-wordpress.log

# Monitoring
PERFORMANCE_MONITORING=true
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true

# Timeouts
API_TIMEOUT=15000
CONNECTION_TIMEOUT=10000
```

## Load Balanced Setup

### Docker Compose with Load Balancer

```yaml
# docker-compose.loadbalanced.yml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    container_name: mcp-nginx-lb
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - mcp-wordpress-1
      - mcp-wordpress-2
    networks:
      - mcp-network
    restart: unless-stopped

  mcp-wordpress-1:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: mcp-wordpress-1
    environment:
      - NODE_ENV=production
      - SERVER_ID=server-1
      - WORDPRESS_SITE_URL=${WORDPRESS_SITE_URL}
      - WORDPRESS_USERNAME=${WORDPRESS_USERNAME}
      - WORDPRESS_APP_PASSWORD=${WORDPRESS_APP_PASSWORD}
      - CACHE_ENABLED=true
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./cache:/app/cache
      - ./logs:/app/logs
    networks:
      - mcp-network
    depends_on:
      - redis
    restart: unless-stopped

  mcp-wordpress-2:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: mcp-wordpress-2
    environment:
      - NODE_ENV=production
      - SERVER_ID=server-2
      - WORDPRESS_SITE_URL=${WORDPRESS_SITE_URL}
      - WORDPRESS_USERNAME=${WORDPRESS_USERNAME}
      - WORDPRESS_APP_PASSWORD=${WORDPRESS_APP_PASSWORD}
      - CACHE_ENABLED=true
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./cache:/app/cache
      - ./logs:/app/logs
    networks:
      - mcp-network
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:alpine
    container_name: mcp-redis
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - mcp-network
    restart: unless-stopped

networks:
  mcp-network:
    driver: bridge

volumes:
  redis-data:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream mcp-backend {
        server mcp-wordpress-1:3000;
        server mcp-wordpress-2:3000;

        # Health checks
        keepalive 32;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Rate limiting
        limit_req zone=api burst=20 nodelay;

        location / {
            proxy_pass http://mcp-backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location /health {
            proxy_pass http://mcp-backend/health;
            access_log off;
        }
    }
}
```

## Multi-Site Production Setup

### Multi-Site Docker Compose

```yaml
# docker-compose.multisite.yml
version: "3.8"

services:
  mcp-wordpress:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: mcp-wordpress-multisite
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro
      - ./cache:/app/cache
      - ./logs:/app/logs
    networks:
      - mcp-network
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 512M

networks:
  mcp-network:
    driver: bridge
```

### Multi-Site Configuration

```json
{
  "sites": [
    {
      "id": "main-production",
      "name": "Main Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://main.company.com",
        "WORDPRESS_USERNAME": "api-admin",
        "WORDPRESS_APP_PASSWORD": "secure-main-password",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "600",
        "SECURITY_MONITORING": "true",
        "PERFORMANCE_MONITORING": "true"
      }
    },
    {
      "id": "blog-production",
      "name": "Blog Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://blog.company.com",
        "WORDPRESS_USERNAME": "blog-editor",
        "WORDPRESS_APP_PASSWORD": "secure-blog-password",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "300"
      }
    },
    {
      "id": "shop-production",
      "name": "E-commerce Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://shop.company.com",
        "WORDPRESS_USERNAME": "shop-manager",
        "WORDPRESS_APP_PASSWORD": "secure-shop-password",
        "CACHE_ENABLED": "true",
        "RATE_LIMIT_ENABLED": "true"
      }
    }
  ]
}
```

## Kubernetes Deployment

### Kubernetes Manifests

**Namespace**

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-wordpress
```

**ConfigMap**

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-wordpress-config
  namespace: mcp-wordpress
data:
  NODE_ENV: "production"
  CACHE_ENABLED: "true"
  CACHE_TTL: "600"
  SECURITY_MONITORING: "true"
  LOG_LEVEL: "info"
```

**Secret**

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-wordpress-secret
  namespace: mcp-wordpress
type: Opaque
data:
  WORDPRESS_SITE_URL: <base64-encoded-url>
  WORDPRESS_USERNAME: <base64-encoded-username>
  WORDPRESS_APP_PASSWORD: <base64-encoded-password>
```

**Deployment**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-wordpress
  namespace: mcp-wordpress
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
          envFrom:
            - configMapRef:
                name: mcp-wordpress-config
            - secretRef:
                name: mcp-wordpress-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: cache-volume
              mountPath: /app/cache
            - name: logs-volume
              mountPath: /app/logs
      volumes:
        - name: cache-volume
          emptyDir: {}
        - name: logs-volume
          emptyDir: {}
```

**Service**

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-wordpress-service
  namespace: mcp-wordpress
spec:
  selector:
    app: mcp-wordpress
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

**Ingress**

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-wordpress-ingress
  namespace: mcp-wordpress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "10"
spec:
  tls:
    - hosts:
        - api.company.com
      secretName: mcp-wordpress-tls
  rules:
    - host: api.company.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mcp-wordpress-service
                port:
                  number: 80
```

## Monitoring and Logging

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "mcp-wordpress"
    static_configs:
      - targets: ["mcp-wordpress:3000"]
    metrics_path: /metrics
    scrape_interval: 30s
```

### Docker Compose with Monitoring

```yaml
# docker-compose.monitoring.yml
version: "3.8"

services:
  mcp-wordpress:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: mcp-wordpress
    environment:
      - NODE_ENV=production
      - METRICS_ENABLED=true
      - PROMETHEUS_ENABLED=true
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  grafana-data:
```

### Logging Configuration

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /app/logs/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]

setup.kibana:
  host: "kibana:5601"
```

## Backup and Recovery

### Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration
docker cp mcp-wordpress:/app/mcp-wordpress.config.json $BACKUP_DIR/config_$DATE.json

# Backup cache data
docker cp mcp-wordpress:/app/cache $BACKUP_DIR/cache_$DATE

# Backup logs
docker cp mcp-wordpress:/app/logs $BACKUP_DIR/logs_$DATE

# Create archive
tar -czf $BACKUP_DIR/mcp-wordpress-backup_$DATE.tar.gz \
    $BACKUP_DIR/config_$DATE.json \
    $BACKUP_DIR/cache_$DATE \
    $BACKUP_DIR/logs_$DATE

# Cleanup
rm -rf $BACKUP_DIR/config_$DATE.json $BACKUP_DIR/cache_$DATE $BACKUP_DIR/logs_$DATE

echo "Backup completed: mcp-wordpress-backup_$DATE.tar.gz"
```

### Recovery Script

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
RESTORE_DIR="/restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Extract backup
mkdir -p $RESTORE_DIR
tar -xzf $BACKUP_FILE -C $RESTORE_DIR

# Restore configuration
docker cp $RESTORE_DIR/config_*.json mcp-wordpress:/app/mcp-wordpress.config.json

# Restore cache
docker cp $RESTORE_DIR/cache_* mcp-wordpress:/app/cache

# Restart container
docker restart mcp-wordpress

echo "Restore completed from $BACKUP_FILE"
```

## Security Hardening

### Security-Enhanced Dockerfile

```dockerfile
FROM node:20-alpine AS production

# Install security updates and tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    dumb-init \
    && update-ca-certificates

# Create non-root user with minimal permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set security-focused work directory
WORKDIR /app

# Copy application with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Create directories with restricted permissions
RUN mkdir -p cache logs && \
    chown -R nextjs:nodejs cache logs && \
    chmod 750 cache logs

# Remove unnecessary packages and clean up
RUN apk del --purge \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Set security labels
LABEL security.scan="true" \
      security.vulnerability-scan="true"

USER nextjs

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Security Policies

```yaml
# security-policy.yaml
apiVersion: v1
kind: Pod
metadata:
  name: mcp-wordpress-secure
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
  containers:
    - name: mcp-wordpress
      image: docdyhr/mcp-wordpress:latest
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      volumeMounts:
        - name: tmp-volume
          mountPath: /tmp
        - name: cache-volume
          mountPath: /app/cache
        - name: logs-volume
          mountPath: /app/logs
  volumes:
    - name: tmp-volume
      emptyDir: {}
    - name: cache-volume
      emptyDir: {}
    - name: logs-volume
      emptyDir: {}
```

This comprehensive Docker production setup provides scalable, secure, and monitored deployment options for MCP WordPress
in production environments.
