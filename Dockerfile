# Multi-stage build for optimal size and security
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code and configuration files
COPY src ./src
COPY tsconfig.json tsconfig.build.json ./

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy necessary files
COPY bin ./bin
COPY README.md LICENSE ./

# Create config directory for volume mounting
RUN mkdir -p /app/config && chown -R mcp:nodejs /app

# Switch to non-root user
USER mcp

# Expose MCP server port (if needed for HTTP mode)
EXPOSE 3000

# Environment variables with defaults
ENV NODE_ENV=production
ENV NODE_OPTIONS="--experimental-vm-modules"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node dist/index.js --health-check || exit 1

# Default command
CMD ["node", "dist/index.js"]

# Metadata (labels will be set dynamically by build process)
LABEL org.opencontainers.image.title="MCP WordPress Server"
LABEL org.opencontainers.image.description="Model Context Protocol server for WordPress management with 59 tools, performance monitoring, intelligent caching, and auto-generated documentation"
LABEL org.opencontainers.image.url="https://github.com/docdyhr/mcp-wordpress"
LABEL org.opencontainers.image.source="https://github.com/docdyhr/mcp-wordpress"
LABEL org.opencontainers.image.authors="Thomas Dyhr"
LABEL org.opencontainers.image.licenses="MIT"