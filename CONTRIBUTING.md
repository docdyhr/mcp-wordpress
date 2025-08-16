# Contributing to MCP WordPress Server

Welcome to the MCP WordPress Server project! This document provides comprehensive guidelines for contributing to
this WordPress Model Context Protocol (MCP) server implementation.

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Code Quality Standards](#-code-quality-standards)
- [Testing Requirements](#-testing-requirements)
- [Coverage Standards](#-coverage-standards)
- [TypeScript Guidelines](#-typescript-guidelines)
- [Logging Guidelines](#-logging-guidelines)
- [Security Guidelines](#-security-guidelines)
- [Performance Guidelines](#-performance-guidelines)
- [Documentation Standards](#-documentation-standards)
- [Pull Request Process](#-pull-request-process)

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **TypeScript**: Version 5.0 or higher
- **WordPress**: Access to a WordPress site for testing
- **Git**: Version 2.30 or higher

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/docdyhr/mcp-wordpress.git
cd mcp-wordpress

# Install dependencies
npm ci

# Set up configuration
cp .env.example .env
# Edit .env with your WordPress credentials

# Run initial health check
npm run health
```

### Development Environment

```bash
# Start development mode
npm run dev

# Run tests in watch mode
npm run test:watch

# Enable debug logging
DEBUG=true npm run dev
```

## 🔄 Development Workflow

### Branch Strategy

We follow a **feature branch workflow** with strict branch protection on `main`:

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Work on your feature
# Make atomic commits with conventional commit messages

# Push and create PR
git push -u origin feature/your-feature-name
gh pr create --title "feat: description" --body "Detailed description"
```

### Commit Message Standards

We use **Conventional Commits** for automated versioning and changelog generation:

```bash
# Format: type(scope): description
feat(tools): add new WordPress custom fields tool
fix(auth): resolve app password authentication issue
chore(deps): update dependencies to latest versions
docs(readme): improve installation instructions
test(posts): add comprehensive post tool unit tests
```

**Types:**

- `feat`: New features
- `fix`: Bug fixes
- `chore`: Maintenance tasks
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `security`: Security improvements

## 🏗️ Code Quality Standards

### ESLint Configuration

We maintain **strict ESLint compliance**:

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Ensure zero violations before committing
```

**Key Rules:**

- No unused variables (use `_` prefix for intentionally unused)
- Strict TypeScript types (no `any` types allowed)
- Consistent import/export patterns
- Proper error handling requirements

### Code Formatting

We use **Prettier** for consistent code formatting:

```bash
# Format all code
npm run format

# Automatic formatting on commit via husky hooks
```

## ✅ Testing Requirements

### Test Categories

All contributions must include tests based on the following hierarchy:

#### 1. Unit Tests (Required)

- **Coverage Target**: ≥50% for new components
- **Focus**: Individual functions, classes, and modules
- **Location**: `tests/unit/`

```typescript
// Example unit test structure
describe('WordPressClient', () => {
  describe('authentication', () => {
    it('should authenticate with app password', async () => {
      // Test implementation
    });
    
    it('should handle authentication failures gracefully', async () => {
      // Test implementation
    });
  });
});
```

#### 2. Integration Tests (Required for API changes)

- **Focus**: Component interactions and API integrations
- **Location**: `tests/integration/`
- **WordPress Integration**: Use mock/live dual-mode testing

#### 3. Security Tests (Required for security-related changes)

- **Coverage**: 40/40 tests must pass
- **Focus**: Input validation, SQL injection prevention, XSS protection
- **Location**: `tests/security/`

#### 4. Performance Tests (Required for performance-related changes)

- **Coverage**: 8/8 tests must pass
- **Focus**: Response times, memory usage, cache efficiency
- **Location**: `tests/performance/`

### Test Execution

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:security
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

### Test Writing Standards

```typescript
// Use descriptive test names
it('should create post with featured media and return management links', async () => {
  // Arrange
  const postData = {
    title: 'Test Post',
    content: '<p>Test content</p>',
    featured_media: 42
  };
  
  // Act
  const result = await postTool.createPost(postData);
  
  // Assert
  expect(result.id).toBeDefined();
  expect(result.featured_media).toBe(42);
  expect(result._links.self).toBeDefined();
});

// Test error conditions
it('should throw validation error for missing required title', async () => {
  await expect(postTool.createPost({})).rejects.toThrow(/title.*required/i);
});

// Test edge cases
it('should handle empty post content gracefully', async () => {
  const result = await postTool.createPost({ title: 'Test', content: '' });
  expect(result.content.rendered).toBe('');
});
```

## 📊 Coverage Standards

### Coverage Thresholds

We enforce **incremental coverage improvement** to maintain code quality:

#### Global Thresholds (Minimum)

```json
{
  "lines": 30,
  "branches": 25,
  "functions": 28,
  "statements": 29
}
```

#### Incremental Coverage Rule

- **No regression allowed**: Coverage cannot decrease by >1% in any metric
- **New code target**: ≥50% coverage for new components
- **Improvement goal**: Gradual increase toward 80% total coverage

#### Component-Specific Requirements

**High-Priority Components** (≥50% coverage required):

- `src/client/` - WordPress API client
- `src/tools/` - MCP tool implementations
- `src/security/` - Security utilities
- `src/utils/` - Core utilities

**Moderate-Priority Components** (≥30% coverage):

- `src/config/` - Configuration management
- `src/cache/` - Caching system
- `src/server/` - MCP server implementation

### Coverage Validation

```bash
# Check coverage
npm run test:coverage

# Validate coverage thresholds
npm run coverage:check

# Generate detailed coverage report
npm run coverage:report
```

## 📘 TypeScript Guidelines

### Type Safety Requirements

We enforce **strict TypeScript compliance** with zero tolerance for type violations:

#### Prohibited Patterns

```typescript
// ❌ NEVER use explicit 'any'
function badFunction(data: any): any {
  return data.whatever;
}

// ❌ NEVER bypass type checking
const result = (data as any).someProperty;

// ❌ NEVER ignore TypeScript errors
// @ts-ignore
const unsafeOperation = riskyFunction();
```

#### Required Patterns

```typescript
// ✅ Define proper interfaces
interface WordPressPost {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  status: 'publish' | 'draft' | 'pending' | 'private';
  featured_media?: number | undefined;
}

// ✅ Use proper type guards
function isWordPressPost(obj: unknown): obj is WordPressPost {
  return typeof obj === 'object' && 
         obj !== null &&
         'id' in obj &&
         'title' in obj;
}

// ✅ Handle optional properties correctly
interface ToolParams {
  title: string;
  content?: string | undefined; // Explicit undefined for exactOptionalPropertyTypes
}
```

#### Type Definition Standards

- **All exports**: Must have explicit type definitions
- **Function parameters**: Must be properly typed
- **Return types**: Must be explicitly declared
- **Error types**: Must extend proper error classes

```typescript
// ✅ Proper function typing
export async function createPost(
  params: CreatePostParams
): Promise<WordPressPost> {
  // Implementation
}

// ✅ Proper error typing
export class WordPressApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'WordPressApiError';
  }
}
```

## 📝 Logging Guidelines

### Structured Logging Requirements

We use **centralized structured logging** for all components:

#### Required Logger Usage

```typescript
// ✅ ALWAYS use LoggerFactory
import { LoggerFactory } from '../utils/logger.js';

// Create component-specific loggers
const apiLogger = LoggerFactory.api('site1');
const toolLogger = LoggerFactory.tool('wp_create_post', 'site2');
const cacheLogger = LoggerFactory.cache();
const securityLogger = LoggerFactory.security();
```

#### Prohibited Logging Patterns

```typescript
// ❌ NEVER use console.log directly
console.log('Debug info:', data);

// ❌ NEVER use generic console methods
console.error('Error occurred');
console.warn('Warning message');

// ❌ NEVER log sensitive data without sanitization
logger.info('User credentials', { username, password });
```

#### Required Logging Patterns

```typescript
// ✅ Use appropriate log levels
logger.debug('Processing request', { endpoint: '/wp/v2/posts' });
logger.info('Post created successfully', { postId: 123, title: 'Post Title' });
logger.warn('Cache miss detected', { key: 'posts:123', reason: 'expired' });
logger.error('API request failed', { statusCode: 401, endpoint: '/wp/v2/posts' });

// ✅ Use timing for performance monitoring
const result = await logger.time('Database query', async () => {
  return await database.query(sql);
});

// ✅ Sensitive data is automatically sanitized
logger.info('Authentication attempt', {
  username: 'testuser',
  password: 'secret123', // Automatically becomes [REDACTED:9chars]
  token: 'abc123def'      // Automatically becomes [REDACTED:9chars]
});

// ✅ Use contextual logging
const requestLogger = logger.child({ requestId: uuid(), userId: 'user123' });
requestLogger.info('Processing user request');
```

#### Log Level Guidelines

- **trace**: Detailed debugging (disabled in production)
- **debug**: Development debugging (disabled in production)
- **info**: General operational information
- **warn**: Warning conditions that don't stop operation
- **error**: Error conditions that may stop operation
- **fatal**: Critical errors that stop the application

## 🔒 Security Guidelines

### Security Requirements

All code must follow **defensive security practices**:

#### Input Validation

```typescript
// ✅ Validate all inputs
function validatePostData(data: unknown): CreatePostParams {
  const schema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().optional(),
    status: z.enum(['publish', 'draft', 'pending', 'private']).optional()
  });
  
  return schema.parse(data);
}

// ✅ Sanitize HTML content
import { sanitizeHtml } from '../security/sanitization.js';

const safeContent = sanitizeHtml(userContent, {
  allowedTags: ['p', 'br', 'strong', 'em'],
  allowedAttributes: {}
});
```

#### Authentication Security

```typescript
// ✅ Secure credential handling
class AuthenticationManager {
  private credentials: Map<string, SiteCredentials> = new Map();
  
  setCredentials(siteId: string, credentials: SiteCredentials): void {
    // Credentials are never logged
    this.logger.info('Credentials updated', { siteId });
    this.credentials.set(siteId, credentials);
  }
}

// ✅ Secure API communication
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'MCP-WordPress/2.4.0',
    'Content-Type': 'application/json'
  },
  // Always use HTTPS in production
});
```

#### SQL Injection Prevention

```typescript
// ✅ Use parameterized queries
const query = `
  SELECT * FROM posts 
  WHERE status = ? AND author_id = ?
`;
const results = await db.query(query, [status, authorId]);

// ❌ NEVER use string concatenation
const badQuery = `SELECT * FROM posts WHERE status = '${status}'`;
```

### Required Security Tests

All security-related changes must include:

1. **Input validation tests**
2. **XSS prevention tests**
3. **SQL injection prevention tests**
4. **Authentication bypass tests**
5. **Authorization tests**

## ⚡ Performance Guidelines

### Performance Requirements

Code must meet **performance standards**:

#### Response Time Targets

- **API calls**: <500ms average
- **Cache operations**: <50ms
- **Tool execution**: <2000ms
- **Database queries**: <200ms

#### Memory Usage Guidelines

- **Memory leaks**: Zero tolerance
- **Memory usage**: <80% of available memory
- **Cache size**: Configurable limits with LRU eviction

#### Performance Testing

```typescript
// ✅ Include performance tests for critical paths
describe('Performance Tests', () => {
  it('should create post within 2 seconds', async () => {
    const start = Date.now();
    await postTool.createPost(testData);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(2000);
  });
  
  it('should handle 100 concurrent requests', async () => {
    const promises = Array(100).fill(null).map(() => 
      postTool.listPosts({ per_page: 10 })
    );
    
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});
```

## 📚 Documentation Standards

### Code Documentation

- **JSDoc comments**: Required for all public APIs
- **Type annotations**: Required for all exports
- **Usage examples**: Required for tools and utilities

```typescript
/**
 * Creates a new WordPress post with comprehensive validation
 * 
 * @param params - Post creation parameters
 * @param params.title - Post title (required)
 * @param params.content - Post content in HTML format
 * @param params.status - Publishing status
 * @returns Promise resolving to created post with metadata
 * 
 * @example
 * ```typescript
 * const post = await createPost({
 *   title: 'My New Post',
 *   content: '<p>Hello World!</p>',
 *   status: 'publish'
 * });
 * console.log(`Created post with ID: ${post.id}`);
 * ```
 */
export async function createPost(params: CreatePostParams): Promise<WordPressPost> {
  // Implementation
}
```

### README Updates

- Update feature lists for new capabilities
- Add usage examples for new tools
- Update installation instructions if needed

## 🔄 Pull Request Process

### PR Requirements Checklist

Before submitting a pull request, ensure:

#### Code Quality

- [ ] All tests pass (`npm test`)
- [ ] ESLint compliance (`npm run lint`)
- [ ] TypeScript compilation (`npm run build`)
- [ ] Code formatted (`npm run format`)

#### Testing

- [ ] Unit tests for new functionality (≥50% coverage)
- [ ] Integration tests for API changes
- [ ] Security tests for security-related changes
- [ ] Performance tests for performance-related changes

#### Coverage

- [ ] No coverage regression (>1% decrease)
- [ ] New code meets coverage targets
- [ ] Coverage report generated (`npm run test:coverage`)

#### Documentation

- [ ] JSDoc comments for public APIs
- [ ] README updated if needed
- [ ] CLAUDE.md updated for significant changes
- [ ] Commit messages follow conventional format

### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Security tests added/updated (if applicable)
- [ ] Performance tests added/updated (if applicable)
- [ ] All tests pass

## Coverage
- [ ] Coverage maintained or improved
- [ ] New code meets ≥50% coverage target
- [ ] No regression in coverage metrics

## Security
- [ ] Input validation implemented
- [ ] No sensitive data exposed in logs
- [ ] Authentication/authorization properly handled
- [ ] Security tests pass

## Performance
- [ ] Performance impact assessed
- [ ] No memory leaks introduced
- [ ] Response times within targets
- [ ] Performance tests pass (if applicable)

## Documentation
- [ ] Code documented with JSDoc
- [ ] README updated (if applicable)
- [ ] Usage examples provided
```

### Review Process

1. **Automated Checks**: All CI/CD checks must pass
2. **Code Review**: At least one maintainer review required
3. **Security Review**: Required for security-related changes
4. **Performance Review**: Required for performance-related changes
5. **Merge**: Squash and merge after approval

### Branch Protection

The `main` branch has strict protection rules:

- ✅ Pull requests required
- ✅ Status checks must pass
- ✅ No direct pushes allowed
- ✅ No merge commits allowed
- ✅ Branch must be up to date

## 🆘 Getting Help

### Resources

- **Documentation**: [Project README](README.md)
- **Development Guide**: [CLAUDE.md](CLAUDE.md)
- **Testing Guide**: [TESTING_GUIDELINES.md](TESTING_GUIDELINES.md)
- **Coverage Strategy**: [COVERAGE_STRATEGY.md](COVERAGE_STRATEGY.md)

### Support Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community discussion
- **Code Review**: Through pull request comments

### Common Issues

- **TypeScript errors**: Check `exactOptionalPropertyTypes` compliance
- **Test failures**: Ensure proper mocking and async handling
- **Coverage issues**: Add tests for uncovered branches
- **Linting errors**: Run `npm run lint:fix` for auto-fixes

---

## 🎯 Summary

This project maintains **high standards** for code quality, testing, and security.
By following these guidelines, you help ensure that the MCP WordPress Server remains:

- ✅ **Reliable**: Comprehensive testing and quality gates
- ✅ **Secure**: Defense-in-depth security practices
- ✅ **Performant**: Optimized for speed and efficiency
- ✅ **Maintainable**: Clean, well-documented, type-safe code
- ✅ **Professional**: Industry-standard development practices

**Thank you for contributing to making WordPress management better for everyone!** 🚀
