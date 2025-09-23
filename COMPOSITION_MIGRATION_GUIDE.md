# Composition Pattern Migration Guide

## Overview

This document provides comprehensive guidance for migrating from inheritance-based architecture to the new composition
pattern implemented in MCP WordPress v2.6.4+.

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Architecture Comparison](#architecture-comparison)
- [Migration Strategy](#migration-strategy)
- [Implementation Examples](#implementation-examples)
- [Testing Patterns](#testing-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Best Practices](#best-practices)

## Why Migrate?

### Problems with Inheritance

The previous inheritance-based architecture suffered from several issues:

- **Tight Coupling**: Classes were tightly coupled through inheritance chains
- **Testing Difficulties**: Hard to mock specific behaviors without mocking entire parent classes
- **Ripple Effects**: Changes to base classes affected all subclasses
- **Limited Flexibility**: Behavior was fixed at compile time
- **SOLID Violations**: Mixed responsibilities violated Single Responsibility Principle

### Benefits of Composition

The new composition pattern provides:

- **Loose Coupling**: Components depend only on interfaces, not implementations
- **Easy Testing**: Mock individual behaviors using dependency injection
- **Isolated Changes**: Modifications affect only specific implementations
- **Runtime Flexibility**: Swap behaviors dynamically
- **SOLID Compliance**: Clear separation of concerns
- **Enhanced Reusability**: Components can be reused across different contexts

## Architecture Comparison

### Before: Inheritance-Based

```typescript
// ❌ Old Pattern - Removed in v2.6.4
class RequestManager extends BaseManager {
  constructor(config: WordPressClientConfig) {
    super(config); // Inherits all base functionality
    this.timeout = config.timeout || 30000;
    this.retries = config.maxRetries || 3;
  }

  async request(method: HTTPMethod, endpoint: string): Promise<unknown> {
    // Mixed concerns in single method:
    this.validateMethod(method); // Validation logic
    const auth = this.getAuthHeaders(); // Authentication logic

    try {
      const response = await this.makeHttpRequest(method, endpoint, auth);
      this.logSuccess(`${method} ${endpoint}`); // Logging logic
      return response;
    } catch (error) {
      this.handleError(error, `${method} ${endpoint}`); // Error handling logic
    }
  }

  // All behaviors inherited from BaseManager
  protected validateMethod(method: string): void {
    /* inherited */
  }
  protected getAuthHeaders(): Record<string, string> {
    /* inherited */
  }
  protected handleError(error: unknown, operation: string): never {
    /* inherited */
  }
  protected logSuccess(operation: string): void {
    /* inherited */
  }
}
```

**Problems:**

- All behaviors are inherited, creating tight coupling
- Testing requires mocking the entire BaseManager
- Changes to BaseManager affect all subclasses
- Cannot swap individual behaviors at runtime

### After: Composition-Based

```typescript
// ✅ New Pattern - v2.6.4+
export class ComposedRequestManager implements RequestHandler {
  constructor(
    private dependencies: {
      configProvider: ConfigurationProvider;
      errorHandler: ErrorHandler;
      validator: ParameterValidator;
      authProvider: AuthenticationProvider;
    },
  ) {
    // Dependencies injected, not inherited
  }

  async request<T>(method: HTTPMethod, endpoint: string, data?: unknown): Promise<T> {
    // Each concern handled by dedicated dependency
    this.dependencies.validator.validateString(method, "method", { required: true });
    const authHeaders = this.dependencies.authProvider.getAuthHeaders();

    try {
      const response = await this.makeHttpRequest(method, endpoint, data, authHeaders);
      this.dependencies.errorHandler.logSuccess(`${method} ${endpoint}`);
      return response;
    } catch (error) {
      this.dependencies.errorHandler.handleError(error, `${method} ${endpoint}`);
    }
  }
}
```

**Benefits:**

- Each behavior is a separate, mockable dependency
- Changes to validation don't affect authentication
- Can swap error handlers without changing core logic
- Clear separation of concerns

## Migration Strategy

### Phase 1: Interface Definition

Start by defining behavioral interfaces for each concern:

```typescript
// Define what each component should do, not how
export interface ConfigurationProvider {
  readonly config: WordPressClientConfig;
  getConfigValue<T>(path: string, defaultValue?: T): T | undefined;
  getTimeout(): number;
  isDebugEnabled(): boolean;
  validateConfiguration(): void;
}

export interface ErrorHandler {
  handleError(error: unknown, operation: string): never;
  logSuccess(operation: string, details?: unknown): void;
}

export interface ParameterValidator {
  validateRequired(params: Record<string, unknown>, required: string[]): void;
  validateString(value: unknown, name: string, options?: ValidationOptions): string;
  validateNumber(value: unknown, name: string): number;
  validateWordPressId(id: unknown): number;
}

export interface AuthenticationProvider {
  authenticate(): Promise<boolean>;
  isAuthenticated(): boolean;
  getAuthHeaders(): Record<string, string>;
  handleAuthFailure(error: unknown): Promise<boolean>;
  getAuthStatus(): AuthStatus;
}
```

### Phase 2: Implementation Classes

Create concrete implementations of each interface:

```typescript
export class ConfigurationProviderImpl implements ConfigurationProvider {
  constructor(public readonly config: WordPressClientConfig) {}

  getConfigValue<T>(path: string, defaultValue?: T): T | undefined {
    return path.split(".").reduce((obj, key) => obj?.[key], this.config) ?? defaultValue;
  }

  getTimeout(): number {
    return this.config.timeout || 30000;
  }

  isDebugEnabled(): boolean {
    return process.env.NODE_ENV === "development" || process.env.DEBUG === "true";
  }

  validateConfiguration(): void {
    if (!this.config.baseUrl) {
      throw new Error("Missing required configuration: baseUrl");
    }
    if (!this.config.auth) {
      throw new Error("Missing required configuration: auth");
    }
  }
}

export class ErrorHandlerImpl implements ErrorHandler {
  constructor(private configProvider: ConfigurationProvider) {}

  handleError(error: unknown, operation: string): never {
    const context = { operation, isDebug: this.configProvider.isDebugEnabled() };

    if (error instanceof WordPressAPIError) {
      throw this.formatWordPressError(error, context);
    }

    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      throw new Error(`Connection failed during ${operation}. Please check your WordPress site URL.`);
    }

    throw new Error(`Unknown error during ${operation}: ${String(error)}`);
  }

  logSuccess(operation: string, details?: unknown): void {
    if (this.configProvider.isDebugEnabled()) {
      debug.log(`✓ ${operation}`, details);
    }
  }
}
```

### Phase 3: Composed Manager

Create the new manager using dependency injection:

```typescript
export class ComposedRequestManager implements RequestHandler {
  private stats: ClientStats;
  private initialized: boolean = false;

  constructor(private dependencies: ComposedRequestManagerDependencies) {
    this.stats = this.initializeStats();
  }

  // Factory method for convenient creation
  static create(clientConfig: WordPressClientConfig, authProvider: AuthenticationProvider): ComposedRequestManager {
    const configProvider = new ConfigurationProviderImpl(clientConfig);
    const errorHandler = new ErrorHandlerImpl(configProvider);
    const validator = new ParameterValidatorImpl();

    return new ComposedRequestManager({
      configProvider,
      errorHandler,
      validator,
      authProvider,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.dependencies.configProvider.validateConfiguration();
    await this.dependencies.authProvider.authenticate();
    this.initialized = true;
  }

  async request<T>(method: HTTPMethod, endpoint: string, data?: unknown): Promise<T> {
    this.ensureInitialized();
    this.stats.totalRequests++;

    try {
      // Use injected dependencies
      this.dependencies.validator.validateString(method, "method", { required: true });
      this.dependencies.validator.validateString(endpoint, "endpoint", { required: true });

      const response = await this.makeRequestWithRetry(method, endpoint, data);

      this.stats.successfulRequests++;
      this.dependencies.errorHandler.logSuccess(`${method} ${endpoint}`);

      return response;
    } catch (error) {
      this.stats.failedRequests++;
      this.dependencies.errorHandler.handleError(error, `${method} ${endpoint}`);
    }
  }
}
```

### Phase 4: Factory Pattern

Simplify object creation with a factory:

```typescript
export class ComposedManagerFactory {
  createConfigurationProvider(config: WordPressClientConfig): ConfigurationProvider {
    return new ConfigurationProviderImpl(config);
  }

  createErrorHandler(configProvider: ConfigurationProvider): ErrorHandler {
    return new ErrorHandlerImpl(configProvider);
  }

  createParameterValidator(): ParameterValidator {
    return new ParameterValidatorImpl();
  }

  createAuthenticationProvider(config: WordPressClientConfig): AuthenticationProvider {
    return ComposedAuthenticationManager.create(config);
  }

  async createComposedClient(options: ComposedClientOptions): Promise<ComposedWordPressClient> {
    const configProvider = this.createConfigurationProvider(options.clientConfig);
    const errorHandler = this.createErrorHandler(configProvider);
    const validator = this.createParameterValidator();

    // Create and initialize authentication
    const authManager = new ComposedAuthenticationManager({
      configProvider,
      errorHandler,
      validator,
    });
    await authManager.authenticate();

    // Create request manager
    const requestManager = new ComposedRequestManager({
      configProvider,
      errorHandler,
      validator,
      authProvider: authManager,
    });
    await requestManager.initialize();

    return new ComposedWordPressClient(authManager, requestManager, options.clientConfig);
  }
}

// Convenient factory function
export async function createComposedWordPressClient(config: WordPressClientConfig): Promise<ComposedWordPressClient> {
  const factory = new ComposedManagerFactory();
  return await factory.createComposedClient({ clientConfig: config });
}
```

## Implementation Examples

### Authentication Migration

**Before (Inheritance):**

```typescript
class AuthenticationManager extends BaseManager {
  constructor(config: WordPressClientConfig) {
    super(config);
    this.authMethod = this.detectAuthMethod();
  }

  async authenticate(): Promise<boolean> {
    // Method detection and validation mixed with authentication logic
    switch (this.authMethod) {
      case "jwt":
        return this.authenticateJWT();
      case "app-password":
        return this.authenticateAppPassword();
    }
  }
}
```

**After (Composition):**

```typescript
export class ComposedAuthenticationManager implements AuthenticationProvider {
  constructor(private dependencies: AuthenticationDependencies) {
    this.authMethod = this.getAuthMethodFromConfig();
    this.validateAuthConfiguration(); // Use injected validator
  }

  async authenticate(): Promise<boolean> {
    try {
      this.lastAuthAttempt = new Date();

      switch (this.authMethod) {
        case "app-password":
          return await this.authenticateAppPassword();
        case "jwt":
          return await this.authenticateJWT();
        case "basic":
          return await this.authenticateBasic();
        case "api-key":
          return await this.authenticateApiKey();
        default:
          throw new AuthenticationError(`Unsupported method: ${this.authMethod}`, this.authMethod);
      }
    } catch (error) {
      this.isAuth = false;
      this.dependencies.errorHandler.handleError(error, "authentication");
    }
  }

  private validateAuthConfiguration(): void {
    // Use injected validator instead of inherited method
    const authConfig = this.dependencies.configProvider.config.auth;

    if (!authConfig) {
      throw new AuthenticationError("No authentication configuration provided", this.authMethod);
    }

    switch (this.authMethod) {
      case "app-password":
        this.dependencies.validator.validateRequired(authConfig, ["username", "appPassword"]);
        break;
      case "jwt":
        this.dependencies.validator.validateRequired(authConfig, ["username", "password"]);
        break;
    }
  }
}
```

## Testing Patterns

### Inheritance Testing (Difficult)

```typescript
// ❌ Old way - had to mock entire base class
describe("RequestManager", () => {
  let manager: RequestManager;
  let mockBaseManager: Partial<BaseManager>;

  beforeEach(() => {
    // Need to mock all inherited behaviors
    mockBaseManager = {
      validateMethod: vi.fn(),
      getAuthHeaders: vi.fn().mockReturnValue({}),
      handleError: vi.fn(),
      logSuccess: vi.fn(),
      config: mockConfig,
      // ... many more inherited methods
    };

    manager = new RequestManager(mockConfig);
    // Complex setup to override inherited methods
    Object.assign(manager, mockBaseManager);
  });

  it("should make request", async () => {
    // Test is brittle and tests too many things at once
    await manager.request("GET", "/endpoint");

    expect(mockBaseManager.validateMethod).toHaveBeenCalled();
    expect(mockBaseManager.getAuthHeaders).toHaveBeenCalled();
    // Hard to test individual behaviors in isolation
  });
});
```

### Composition Testing (Easy)

```typescript
// ✅ New way - mock only what you need
describe("ComposedRequestManager", () => {
  let requestManager: ComposedRequestManager;
  let mockAuthProvider: vi.Mocked<AuthenticationProvider>;
  let mockErrorHandler: vi.Mocked<ErrorHandler>;
  let mockValidator: vi.Mocked<ParameterValidator>;

  beforeEach(() => {
    // Mock only specific behaviors being tested
    mockAuthProvider = {
      authenticate: vi.fn().mockResolvedValue(true),
      isAuthenticated: vi.fn().mockReturnValue(true),
      getAuthHeaders: vi.fn().mockReturnValue({ Authorization: "Bearer token" }),
      handleAuthFailure: vi.fn().mockResolvedValue(true),
      getAuthStatus: vi.fn().mockReturnValue({ isAuthenticated: true, method: "jwt" }),
    };

    mockErrorHandler = {
      handleError: vi.fn().mockImplementation((error) => {
        throw error;
      }),
      logSuccess: vi.fn(),
    };

    mockValidator = {
      validateString: vi.fn().mockImplementation((value) => value as string),
      validateRequired: vi.fn(),
      validateNumber: vi.fn().mockImplementation((value) => Number(value)),
      validateWordPressId: vi.fn().mockImplementation((id) => Number(id)),
    };

    requestManager = new ComposedRequestManager({
      configProvider: mockConfigProvider,
      errorHandler: mockErrorHandler,
      validator: mockValidator,
      authProvider: mockAuthProvider,
    });
  });

  // Test individual behaviors in isolation
  it("should validate method parameter", async () => {
    global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

    await requestManager.request("GET", "/wp/v2/posts");

    expect(mockValidator.validateString).toHaveBeenCalledWith("GET", "method", { required: true });
  });

  it("should use authentication headers", async () => {
    global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

    await requestManager.request("GET", "/wp/v2/posts");

    expect(mockAuthProvider.getAuthHeaders).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("should handle errors via error handler", async () => {
    const testError = new Error("Test error");
    global.fetch = vi.fn().mockRejectedValue(testError);

    await requestManager.request("GET", "/wp/v2/posts");

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(testError, "GET /wp/v2/posts");
  });
});
```

## Common Pitfalls

### 1. Over-Abstracting

**❌ Don't create interfaces for everything:**

```typescript
// Unnecessary abstraction
interface StringProcessor {
  processString(input: string): string;
}

class UpperCaseProcessor implements StringProcessor {
  processString(input: string): string {
    return input.toUpperCase();
  }
}
```

**✅ Create interfaces for behavioral contracts:**

```typescript
// Meaningful abstraction
interface ErrorHandler {
  handleError(error: unknown, operation: string): never;
  logSuccess(operation: string, details?: unknown): void;
}
```

### 2. Constructor Injection Overload

**❌ Too many dependencies:**

```typescript
class OverComplexManager {
  constructor(
    private dep1: Dependency1,
    private dep2: Dependency2,
    private dep3: Dependency3,
    private dep4: Dependency4,
    private dep5: Dependency5,
    private dep6: Dependency6,
    // ... 10+ dependencies
  ) {}
}
```

**✅ Group related dependencies:**

```typescript
interface ManagerDependencies {
  configProvider: ConfigurationProvider;
  errorHandler: ErrorHandler;
  validator: ParameterValidator;
  authProvider: AuthenticationProvider;
}

class WellDesignedManager {
  constructor(private dependencies: ManagerDependencies) {}
}
```

### 3. Leaky Abstractions

**❌ Interface exposes implementation details:**

```typescript
interface BadAbstraction {
  authenticateWithJWT(): Promise<boolean>;
  authenticateWithAppPassword(): Promise<boolean>;
  authenticateWithBasic(): Promise<boolean>;
  // Exposes all authentication methods
}
```

**✅ Interface hides implementation details:**

```typescript
interface AuthenticationProvider {
  authenticate(): Promise<boolean>;
  isAuthenticated(): boolean;
  getAuthHeaders(): Record<string, string>;
  // Implementation method is hidden
}
```

### 4. Circular Dependencies

**❌ Components depend on each other:**

```typescript
class ComponentA {
  constructor(private componentB: ComponentB) {}
}

class ComponentB {
  constructor(private componentA: ComponentA) {}
  // Circular dependency!
}
```

**✅ Use events or mediator pattern:**

```typescript
interface EventEmitter {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
}

class ComponentA {
  constructor(private eventEmitter: EventEmitter) {}

  doSomething() {
    this.eventEmitter.emit("componentA.action", { data: "test" });
  }
}

class ComponentB {
  constructor(private eventEmitter: EventEmitter) {
    this.eventEmitter.on("componentA.action", this.handleComponentAAction);
  }
}
```

## Best Practices

### 1. Interface Segregation

Keep interfaces focused on single responsibilities:

```typescript
// ✅ Good - focused interfaces
interface ConfigurationReader {
  getConfigValue<T>(path: string, defaultValue?: T): T | undefined;
}

interface ConfigurationValidator {
  validateConfiguration(): void;
}

// ❌ Bad - kitchen sink interface
interface ConfigurationEverything {
  getConfigValue<T>(path: string): T;
  validateConfiguration(): void;
  saveConfiguration(config: unknown): void;
  reloadConfiguration(): void;
  // ... 10+ more methods
}
```

### 2. Dependency Injection

Inject dependencies, don't create them:

```typescript
// ✅ Good - dependencies injected
class ComposedManager {
  constructor(private dependencies: ManagerDependencies) {}
}

// ❌ Bad - creates own dependencies
class BadManager {
  private errorHandler: ErrorHandler;

  constructor(config: Config) {
    this.errorHandler = new ErrorHandlerImpl(config); // Hard-coded dependency
  }
}
```

### 3. Factory Methods

Use factories to simplify complex object creation:

```typescript
// ✅ Simple creation
const client = await ComposedManagerFactory.createComposedClient({ clientConfig });

// Instead of complex manual setup
const configProvider = new ConfigurationProviderImpl(clientConfig);
const errorHandler = new ErrorHandlerImpl(configProvider);
const validator = new ParameterValidatorImpl();
const authManager = new ComposedAuthenticationManager({
  configProvider,
  errorHandler,
  validator,
});
await authManager.authenticate();
// ... many more steps
```

### 4. Test-Driven Development

Write tests first to drive interface design:

```typescript
// Test drives interface design
describe("RequestHandler", () => {
  it("should make HTTP requests", async () => {
    const requestHandler = new ComposedRequestManager(mockDependencies);

    const result = await requestHandler.request("GET", "/wp/v2/posts");

    expect(result).toBeDefined();
  });
});

// Interface emerges from test requirements
interface RequestHandler {
  request<T>(method: HTTPMethod, endpoint: string, data?: unknown): Promise<T>;
}
```

### 5. Composition Root

Create objects in a single location (composition root):

```typescript
// ✅ All composition happens in factory
export class ComposedManagerFactory {
  async createComposedClient(options: ComposedClientOptions): Promise<ComposedWordPressClient> {
    // Single place where all dependencies are wired together
    const configProvider = new ConfigurationProviderImpl(options.clientConfig);
    const errorHandler = new ErrorHandlerImpl(configProvider);
    const validator = new ParameterValidatorImpl();

    const authManager = new ComposedAuthenticationManager({
      configProvider,
      errorHandler,
      validator,
    });

    const requestManager = new ComposedRequestManager({
      configProvider,
      errorHandler,
      validator,
      authProvider: authManager,
    });

    return new ComposedWordPressClient(authManager, requestManager, options.clientConfig);
  }
}
```

## Migration Checklist

- [ ] **Identify Behaviors**: List all behaviors in your current inheritance hierarchy
- [ ] **Define Interfaces**: Create focused interfaces for each behavior
- [ ] **Implement Interfaces**: Create concrete implementations
- [ ] **Create Composed Class**: Build new class using dependency injection
- [ ] **Add Factory Method**: Provide convenient creation method
- [ ] **Write Tests**: Create comprehensive test suite with mocks
- [ ] **Update Usage**: Replace old inheritance-based usage
- [ ] **Remove Old Code**: Clean up inheritance-based implementation

## Conclusion

The migration from inheritance to composition provides significant benefits in terms of testability, maintainability,
and flexibility. While it requires more initial setup, the long-term benefits far outweigh the costs.

The composition pattern implemented in MCP WordPress v2.6.4+ demonstrates these benefits with:

- **463 tests** covering composed managers with 100% success rate
- **Easy mocking** of individual behaviors
- **Clear separation** of concerns
- **Runtime flexibility** for different environments
- **Full SOLID compliance** throughout the architecture

Use this guide as a reference when implementing composition patterns in your own WordPress tools or when contributing to
the MCP WordPress project.
