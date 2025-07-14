# Architecture Guide

This guide explains the system architecture and design patterns used in the MCP WordPress Server.

## 🏗️ Overall Architecture

The MCP WordPress Server follows a modular, layered architecture designed for scalability, maintainability, and
extensibility.

```text
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server Layer                        │
├─────────────────────────────────────────────────────────────┤
│                     Tool Registry                           │
├─────────────────────────────────────────────────────────────┤
│  Posts │ Pages │ Media │ Users │ Comments │ Taxonomies │... │
├─────────────────────────────────────────────────────────────┤
│                WordPress Client Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Auth Manager │ Request Manager │ Cache Manager │ Metrics   │
├─────────────────────────────────────────────────────────────┤
│                WordPress REST API                           │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Design Principles

### 1. Composition Over Inheritance

- **Manager Pattern**: Client functionality split into focused managers
- **Dependency Injection**: Tools receive client instances for testability
- **Single Responsibility**: Each class has one clear purpose

### 2. Type Safety First

- **100% TypeScript**: Complete type coverage for all APIs
- **Strict Mode**: Enabled for maximum type safety
- **Zod Validation**: Runtime validation matching compile-time types

### 3. Modular Architecture

- **Pluggable Tools**: Easy to add new WordPress management tools
- **Manager System**: Focused, replaceable components
- **Clean Interfaces**: Well-defined boundaries between layers

### 4. Performance by Design

- **Intelligent Caching**: Multi-layer caching with invalidation
- **Request Optimization**: Batching and deduplication
- **Resource Management**: Memory and connection pooling

## 🔧 Core Components

### MCP Server (`src/index.ts`)

**Purpose**: Main entry point implementing the Model Context Protocol

**Key Features**:

- Tool registration and discovery
- Request routing and handling
- Multi-site configuration support
- Error handling and logging

**Architecture Pattern**: Facade + Factory

```typescript
class MCPWordPressServer {
  private toolRegistry: ToolRegistry;
  private clients: Map<string, WordPressClient>;

  constructor(config: Config) {
    this.toolRegistry = new ToolRegistry();
    this.clients = this.initializeClients(config);
  }
}
```

### WordPress Client (`src/client/WordPressClient.ts`)

**Purpose**: Primary interface to WordPress REST API

**Architecture Pattern**: Composition + Manager Pattern

```typescript
class WordPressClient {
  private authManager: AuthenticationManager;
  private requestManager: RequestManager;
  private cacheManager: CacheManager;

  constructor(config: ClientConfig) {
    this.authManager = new AuthenticationManager(config);
    this.requestManager = new RequestManager(config);
    this.cacheManager = new CacheManager(config);
  }
}
```

**Manager Responsibilities**:

- **AuthenticationManager**: Handle all authentication methods
- **RequestManager**: HTTP operations, retries, rate limiting
- **CacheManager**: Intelligent caching with invalidation

### Tool System (`src/tools/`)

**Purpose**: WordPress management functionality exposed as MCP tools

**Architecture Pattern**: Class-based Tools with Dependency Injection

```typescript
export class PostTools {
  constructor(private client: WordPressClient) {}

  async createPost(params: CreatePostParams): Promise<PostResult> {
    return toolWrapper(this.client, "create_post", params, async () => {
      const validatedParams = createPostSchema.parse(params);
      return await this.client.posts.create(validatedParams);
    });
  }
}
```

**Tool Categories**:

- **Content Tools**: Posts, Pages, Media (18 tools)
- **User Management**: Users, Comments (13 tools)
- **Site Management**: Taxonomies, Settings, Auth (23 tools)
- **Performance**: Cache, Monitoring (10 tools)

### Performance System (`src/performance/`)

**Purpose**: Real-time performance monitoring and optimization

**Architecture Pattern**: Observer + Strategy Pattern

```typescript
class PerformanceMonitor {
  private collectors: MetricsCollector[];
  private analytics: PerformanceAnalytics;

  collect(metric: Metric): void {
    this.collectors.forEach((collector) => collector.collect(metric));
    this.analytics.analyze(metric);
  }
}
```

**Components**:

- **MetricsCollector**: Gather performance data
- **PerformanceAnalytics**: Analyze trends and patterns
- **AlertSystem**: Notify on performance degradation

### Cache System (`src/cache/`)

**Purpose**: Intelligent multi-layer caching for performance

**Architecture Pattern**: Decorator + Strategy Pattern

```typescript
class CacheManager {
  private strategies: Map<string, CacheStrategy>;

  async get<T>(key: string): Promise<T | null> {
    const strategy = this.strategies.get(this.getStrategyKey(key));
    return await strategy.get(key);
  }
}
```

**Cache Layers**:

- **Memory Cache**: Fast in-memory storage
- **Site-Specific Cache**: Isolated cache per WordPress site
- **Invalidation Logic**: Smart cache invalidation on updates

## 🔒 Security Architecture

### Input Validation Pipeline

```text
User Input → Zod Schema → Sanitization → WordPress API
           ↓              ↓              ↓
         Type Safety   SQL Injection   XSS Protection
                      Prevention
```

### Authentication Flow

```text
Client Request → Auth Manager → WordPress API
              ↓                 ↓
         Token Validation   Permission Check
```

**Security Layers**:

1. **Input Validation**: Comprehensive Zod schemas
2. **Authentication**: Multiple secure methods
3. **Authorization**: WordPress permission system
4. **Transport Security**: HTTPS enforcement
5. **Rate Limiting**: API abuse prevention

## 🚀 Request Flow

### Standard Tool Execution

```text
MCP Request → Tool Registry → Tool Class → Client Manager → WordPress API
           ↓                ↓             ↓               ↓
        Validation    Parameter       Authentication   HTTP Request
                     Processing
```

### Cached Request Flow

```text
MCP Request → Cache Check → [Cache Hit] → Cached Response
           ↓               ↓
        Cache Miss    WordPress API → Cache Store → Response
```

## 📊 Data Flow

### Configuration Loading

```text
Environment Variables → Config Validation → Client Initialization
Multi-Site Config    ↗                   ↓
                                    Tool Registration
```

### Error Handling

```text
Error Occurrence → Error Classification → User-Friendly Message
                ↓                       ↓
            Logging System         MCP Response
```

## 🧪 Testing Architecture

### Test Strategy

**Unit Tests**: Individual component testing

- Mock external dependencies
- Test business logic in isolation
- Focus on edge cases and error conditions

**Integration Tests**: Multi-component testing

- Real WordPress API connections
- End-to-end tool functionality
- Authentication method validation

**Contract Tests**: API compatibility testing

- WordPress REST API changes
- MCP protocol compliance
- Backward compatibility verification

### Test Structure

```text
tests/
├── unit/           # Component isolation tests
├── integration/    # Multi-component tests
├── security/       # Security validation tests
├── performance/    # Performance regression tests
└── property/       # Property-based tests
```

## 🔄 Build & Deployment

### Build Pipeline

```text
TypeScript Source → Compilation → Bundling → Distribution
                 ↓              ↓          ↓
               Type Check    Optimization  NPM Package
                                          Docker Image
```

### Release Process

```text
Commit → CI/CD Pipeline → Tests → Security Scan → Publishing
      ↓                  ↓       ↓              ↓
  Conventional        All Pass  Vulnerability  NPM + Docker
  Commits                       Free           + GitHub
```

## 📈 Performance Optimizations

### Caching Strategy

**Multi-Layer Caching**:

- **L1 Cache**: In-memory (fastest)
- **L2 Cache**: Site-specific (isolated)
- **L3 Cache**: Persistent (cross-session)

**Cache Invalidation**:

- **Time-based**: TTL expiration
- **Event-based**: Content update invalidation
- **Manual**: Administrative cache clearing

### Request Optimization

**Batching**: Group related requests **Deduplication**: Eliminate duplicate requests **Connection Pooling**: Reuse HTTP
connections **Compression**: Reduce payload size

## 🔮 Extensibility

### Adding New Tools

1. **Create Tool Class**: Follow existing patterns
2. **Define Parameters**: Zod schema validation
3. **Implement Logic**: Use client managers
4. **Add Tests**: Unit and integration tests
5. **Register Tool**: Add to tool registry

### Adding New Managers

1. **Extend BaseManager**: Inherit common functionality
2. **Implement Interface**: Define manager contract
3. **Add to Client**: Compose into main client
4. **Test Integration**: Verify with existing tools

### Adding New Authentication

1. **Extend AuthenticationManager**: Add new method
2. **Implement Strategy**: Handle auth flow
3. **Add Configuration**: Support new config options
4. **Test Security**: Validate security properties

## 🔍 Monitoring & Observability

### Metrics Collection

**Performance Metrics**:

- Request latency and throughput
- Cache hit rates and efficiency
- Memory usage and garbage collection

**Business Metrics**:

- Tool usage patterns
- Authentication success rates
- Error rates and types

### Logging Strategy

**Structured Logging**: JSON format for parsing **Log Levels**: DEBUG, INFO, WARN, ERROR **Contextual Information**:
Request IDs, user context **Security Logging**: Authentication events, suspicious activity

## 📚 Further Reading

- **[API Reference](API_REFERENCE.md)** - Complete technical API documentation
- **[Testing Guide](TESTING.md)** - Test suite and best practices
- **[Security Guidelines](SECURITY_DEVELOPMENT.md)** - Security best practices
- **[Performance Guide](PERFORMANCE_DEVELOPMENT.md)** - Performance optimization

---

**Understanding the architecture?** This foundation enables the system's reliability, performance, and extensibility.
Each component is designed to be testable, maintainable, and scalable.
