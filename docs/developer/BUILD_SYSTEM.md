# Build System Guide

Complete guide to the TypeScript compilation and build process for the MCP WordPress Server.

## 🏗️ Build Architecture

The project uses a modern TypeScript build system with optimization for both development and production environments.

### Build Pipeline

```text
TypeScript Source → Compilation → Bundling → Distribution
                 ↓              ↓          ↓
               Type Check    Optimization  NPM Package
                                          Docker Image
```

## 🔧 Build Configuration

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Build Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "build:production": "tsc --project tsconfig.prod.json",
    "typecheck": "tsc --noEmit",
    "prebuild": "npm run clean",
    "postbuild": "npm run copy-assets",
    "clean": "rimraf dist",
    "copy-assets": "copyfiles -u 1 src/**/*.json dist/"
  }
}
```

## 🚀 Build Commands

### Development Build

```bash
# Standard development build
npm run build

# Watch mode for continuous development
npm run build:watch

# Type checking only (fast)
npm run typecheck
```

### Production Build

```bash
# Optimized production build
npm run build:production

# Clean build (removes existing dist/)
npm run clean && npm run build

# Full verification build
npm run typecheck && npm run build && npm test
```

### Build Analysis

```bash
# Check build output
ls -la dist/

# Analyze bundle size
npm run build && du -sh dist/*

# Check TypeScript compilation
npm run typecheck -- --listFiles
```

## 📁 Output Structure

### Build Artifacts

```text
dist/
├── index.js              # Main entry point
├── index.d.ts            # Type definitions
├── server.js             # Server compatibility layer
├── types/                # Type definitions
│   ├── wordpress.d.ts
│   ├── mcp.d.ts
│   └── client.d.ts
├── client/               # WordPress client
│   ├── WordPressClient.js
│   ├── api.js
│   └── managers/
├── tools/                # MCP tools
│   ├── posts.js
│   ├── pages.js
│   └── ...
├── cache/                # Cache system
├── performance/          # Performance monitoring
├── security/             # Security utilities
└── utils/                # Shared utilities
```

### Source Map Support

- **Source Maps**: Enabled for debugging
- **Declaration Maps**: TypeScript declaration source maps
- **Inline Sources**: Source content embedded in maps

## 🔍 Build Optimization

### TypeScript Compiler Options

```typescript
// Performance optimizations
{
  "compilerOptions": {
    "incremental": true,                 // Faster rebuilds
    "tsBuildInfoFile": ".tsbuildinfo",   // Build cache
    "skipLibCheck": true,                // Skip type checking of .d.ts files
    "removeComments": true,              // Smaller output (production)
    "importHelpers": true,               // Reduce code duplication
    "target": "ES2020"                   // Modern JavaScript features
  }
}
```

### Build Performance

**Incremental Builds**:

- TypeScript build cache enabled
- Faster subsequent builds
- Watch mode optimization

**Parallel Processing**:

- Type checking and compilation separated
- Concurrent build steps where possible

## 🐳 Docker Build

### Dockerfile Build Process

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build:production

# Production image
FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Docker Build Commands

```bash
# Build Docker image
docker build -t mcp-wordpress .

# Build with specific tag
docker build -t mcp-wordpress:latest .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t mcp-wordpress .
```

## 📦 Package Build

### NPM Package Preparation

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/", "src/", "README.md", "LICENSE"],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Package Build Process

```bash
# Prepare package for publishing
npm run build:production
npm run test
npm pack

# Verify package contents
tar -tzf mcp-wordpress-*.tgz
```

## 🔧 Development Workflow

### Hot Reload Development

```bash
# Start development with hot reload
npm run build:watch &
npm run dev

# Alternative: Use nodemon for automatic restart
npm install -g nodemon
nodemon --watch dist --exec "npm run dev"
```

### IDE Integration

**VS Code Configuration** (`.vscode/tasks.json`):

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "typescript",
      "tsconfig": "tsconfig.json",
      "option": "watch",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

### Build Debugging

```bash
# Debug TypeScript compilation
npm run typecheck -- --verbose

# Show compilation details
npm run build -- --listFiles --listEmittedFiles

# Check for unused exports
npm run build -- --noUnusedLocals --noUnusedParameters
```

## 🧪 Build Testing

### Build Verification

```bash
# Verify clean build
npm run clean
npm run build
npm test

# Test built package
npm pack
npm install -g mcp-wordpress-*.tgz
mcp-wordpress --version
```

### Build Performance Testing

```bash
# Measure build time
time npm run build

# Profile TypeScript compilation
npm run build -- --generateTrace trace.json

# Analyze build performance
npm install -g @typescript/analyze-trace
analyze-trace trace.json
```

## 📊 Build Monitoring

### Build Metrics

**Key Performance Indicators**:

- **Build Time**: < 30 seconds for full build
- **Incremental Build**: < 5 seconds
- **Bundle Size**: < 10MB uncompressed
- **Type Check Time**: < 15 seconds

### CI/CD Integration

```yaml
# GitHub Actions build job
build:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "npm"
    - run: npm ci
    - run: npm run typecheck
    - run: npm run build
    - run: npm test
    - uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: dist/
```

## 🔍 Troubleshooting

### Common Build Issues

**TypeScript Compilation Errors**:

```bash
# Clear TypeScript cache
rm .tsbuildinfo

# Check for type conflicts
npm run typecheck -- --strict
```

**Memory Issues**:

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**Module Resolution Issues**:

```bash
# Check module resolution
npm run typecheck -- --traceResolution > resolution.log

# Verify imports
npm run build -- --listFiles | grep "error"
```

### Build Optimization

**Slow Builds**:

1. Enable incremental compilation
2. Use `skipLibCheck: true`
3. Reduce `include` patterns
4. Use project references for large codebases

**Large Bundle Size**:

1. Enable `removeComments: true`
2. Use tree shaking
3. Split into multiple packages
4. Analyze bundle with tools

## 📚 Build Tools

### Additional Tools

```bash
# TypeScript Language Service
npm install -g typescript

# Build analysis
npm install -g source-map-explorer

# Bundle analyzer
npm install -g webpack-bundle-analyzer
```

### IDE Extensions

**Recommended VS Code Extensions**:

- TypeScript Hero
- TypeScript Error Translator
- TypeScript Importer
- Path Intellisense

## 📈 Performance Optimization

### Build Speed Optimization

**Configuration Tuning**:

```json
{
  "compilerOptions": {
    "skipLibCheck": true, // Skip node_modules type checking
    "incremental": true, // Enable incremental builds
    "composite": true, // Enable project references
    "declaration": false, // Disable for dev builds
    "sourceMap": false // Disable for production builds
  }
}
```

### Resource Optimization

**Memory Management**:

- Use `--max-old-space-size` for large projects
- Monitor build memory usage
- Optimize TypeScript configuration

**CPU Optimization**:

- Parallel type checking
- Incremental builds
- Build caching strategies

## 📚 Further Reading

- **[Development Setup](DEVELOPMENT_SETUP.md)** - Local development environment
- **[Release Process](RELEASE_PROCESS.md)** - Automated release pipeline
- **[CI/CD Pipeline](CI_CD_PIPELINE.md)** - GitHub Actions workflows
- **[Architecture Guide](ARCHITECTURE.md)** - System design and patterns

---

**Optimizing your build?** This build system is designed for both development speed and production efficiency. Each
configuration option is tuned for optimal performance.
