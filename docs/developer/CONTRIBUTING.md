# Contributing Guidelines

Welcome to the MCP WordPress Server project! This guide will help you get started with contributing to our codebase.

## 🤝 Getting Started

### Prerequisites

- **Node.js 18+** - Required for development
- **TypeScript 5+** - Primary development language
- **Git** - Version control
- **Docker** - For testing environment (optional)
- **WordPress Site** - For testing (or use our Docker environment)

### Quick Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/mcp-wordpress.git
cd mcp-wordpress

# Install dependencies
npm ci

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## 🚀 Development Workflow

### 1. Create a Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Your Changes

Follow our coding standards and architectural patterns:

- **TypeScript**: Use strict typing and interfaces
- **Class-based Architecture**: Follow existing tool patterns
- **Error Handling**: Implement comprehensive error handling
- **Testing**: Write tests for new functionality
- **Documentation**: Update relevant documentation

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:security

# Check code quality
npm run lint
npm run typecheck

# Test performance
npm run test:performance
```

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Examples of good commit messages
git commit -m "feat: add new WordPress plugin management tool"
git commit -m "fix: resolve authentication header issue in POST requests"
git commit -m "docs: update API documentation for media tools"
git commit -m "test: add performance tests for cache system"
git commit -m "refactor: improve error handling in request manager"
```

**Commit Types**:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `test`: Test additions or improvements
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `style`: Code style/formatting
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create pull request through GitHub interface
```

## 📋 Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Strict typing with interfaces
interface CreatePostParams {
  title: string;
  content?: string;
  status?: PostStatus;
  site?: string;
}

async function createPost(params: CreatePostParams): Promise<PostResult> {
  const validatedParams = createPostSchema.parse(params);
  return await this.client.posts.create(validatedParams);
}

// ❌ Bad: Any types and loose typing
async function createPost(params: any): Promise<any> {
  return await this.client.posts.create(params);
}
```

### Class-based Tool Pattern

```typescript
// ✅ Good: Follow established tool pattern
export class PostTools {
  constructor(private client: WordPressClient) {}

  async createPost(params: CreatePostParams): Promise<PostResult> {
    return toolWrapper(this.client, "create_post", params, async () => {
      const validatedParams = createPostSchema.parse(params);
      return await this.client.posts.create(validatedParams);
    });
  }
}

// ❌ Bad: Function-based approach
export function createPost(client: WordPressClient, params: any) {
  // Not following established patterns
}
```

### Error Handling

```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await this.client.posts.create(params);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof WordPressAPIError) {
    throw new Error(`WordPress API error: ${error.message}`);
  }
  throw new Error(`Failed to create post: ${error.message}`);
}

// ❌ Bad: No error handling
const result = await this.client.posts.create(params);
return result;
```

### Multi-Site Support

```typescript
// ✅ Good: Multi-site parameter support
async function listPosts(params: ListPostsParams): Promise<PostListResult> {
  const client = this.getClientForSite(params.site);
  return await client.posts.list(params);
}

// ❌ Bad: No multi-site support
async function listPosts(params: any) {
  return await this.client.posts.list(params);
}
```

## 🧪 Testing Guidelines

### Write Comprehensive Tests

```typescript
// ✅ Good: Comprehensive test coverage
describe("PostTools", () => {
  describe("createPost", () => {
    test("should create post with valid parameters", async () => {
      const params = {
        title: "Test Post",
        content: "Test content",
        status: "publish" as PostStatus,
      };

      const result = await postTools.createPost(params);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Test Post");
    });

    test("should handle invalid parameters", async () => {
      const params = { title: "" }; // Invalid empty title

      await expect(postTools.createPost(params)).rejects.toThrow();
    });

    test("should handle API errors gracefully", async () => {
      mockClient.posts.create.mockRejectedValue(new Error("API Error"));

      await expect(postTools.createPost(validParams)).rejects.toThrow("API Error");
    });
  });
});
```

### Test Categories to Include

1. **Unit Tests**: Test individual functions/methods
2. **Integration Tests**: Test with real WordPress API
3. **Security Tests**: Test input validation and security
4. **Performance Tests**: Test response times and resource usage
5. **Edge Cases**: Test boundary conditions and error scenarios

### Test Best Practices

- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies appropriately
- Include performance assertions where relevant
- Test multi-site functionality

## 🔒 Security Guidelines

### Input Validation

```typescript
// ✅ Good: Comprehensive input validation
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  status: z.enum(["draft", "publish", "private", "pending"]).optional(),
  author: z.number().positive().optional(),
  site: z.string().optional(),
});

// Always validate before processing
const validatedParams = createPostSchema.parse(params);
```

### Authentication Security

```typescript
// ✅ Good: Secure authentication headers
getAuthHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${this.sanitizeToken(this.token)}`,
    'Content-Type': 'application/json'
  };
}

// ❌ Bad: Exposing sensitive information
getAuthHeaders(): Record<string, string> {
  console.log('Using token:', this.token); // Don't log tokens!
  return { 'Authorization': `Bearer ${this.token}` };
}
```

### Security Checklist

- [ ] All user inputs are validated with Zod schemas
- [ ] No sensitive information is logged or exposed
- [ ] Authentication tokens are handled securely
- [ ] Rate limiting is implemented where appropriate
- [ ] Error messages don't reveal sensitive information
- [ ] HTTPS is enforced for all API calls

## 📚 Documentation Standards

### Code Documentation

````typescript
/**
 * Creates a new WordPress post with the specified parameters.
 *
 * @param params - The post creation parameters
 * @param params.title - The post title (required)
 * @param params.content - The post content (optional)
 * @param params.status - The post status (optional, defaults to 'draft')
 * @param params.site - The target site ID for multi-site setups (optional)
 * @returns Promise resolving to the created post information
 * @throws {Error} When post creation fails or parameters are invalid
 *
 * @example
 * ```typescript
 * const post = await postTools.createPost({
 *   title: 'My New Post',
 *   content: 'This is the post content',
 *   status: 'publish'
 * });
 * ```
 */
async createPost(params: CreatePostParams): Promise<PostResult> {
  // Implementation
}
````

### Update Documentation

When adding new features or making changes:

1. **Update CLAUDE.md** - Add new commands or architectural changes
2. **Update API Documentation** - Document new tools and parameters
3. **Update README.md** - Update user-facing information if needed
4. **Add Usage Examples** - Provide practical examples

## 🐛 Issue Guidelines

### Bug Reports

When reporting bugs, include:

- **Environment**: OS, Node.js version, package version
- **WordPress Version**: WordPress version and setup
- **Steps to Reproduce**: Clear steps to reproduce the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Error Messages**: Full error messages and stack traces
- **Configuration**: Relevant configuration (anonymized)

### Feature Requests

When requesting features:

- **Use Case**: Describe the problem you're trying to solve
- **Proposed Solution**: Your suggested approach
- **Alternatives**: Other approaches you've considered
- **Additional Context**: Any other relevant information

## 🎯 Pull Request Guidelines

### PR Description Template

```markdown
## Description

Brief description of the changes made.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security improvement

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Security tests added/updated
- [ ] All tests pass locally
- [ ] Performance tests pass (if applicable)

## Checklist

- [ ] Code follows the established patterns
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No breaking changes or breaking changes are documented
- [ ] Security considerations addressed
```

### Code Review Process

1. **Automated Checks**: All CI/CD checks must pass
2. **Manual Review**: Code review by maintainers
3. **Security Review**: Security implications assessed
4. **Performance Review**: Performance impact evaluated
5. **Documentation Review**: Documentation completeness checked

## 🚀 Release Process

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major Version** (`1.0.0 → 2.0.0`): Breaking changes
- **Minor Version** (`1.0.0 → 1.1.0`): New features (backward compatible)
- **Patch Version** (`1.0.0 → 1.0.1`): Bug fixes (backward compatible)

### Release Workflow

1. **Development**: Features developed in feature branches
2. **Testing**: Comprehensive testing on staging environment
3. **Merge**: Merge to main branch triggers automated release
4. **Publish**: Automated publishing to NPM and Docker Hub
5. **Verification**: Automated verification of published packages

## 🏆 Recognition

### Contributors

We recognize contributions through:

- **GitHub Contributors**: Listed in repository contributors
- **Release Notes**: Significant contributions mentioned in release notes
- **Documentation**: Contributors credited in documentation
- **Community**: Recognition in community discussions

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Please read it to understand the expected behavior in our community.

## 📞 Getting Help

### Development Support

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community support
- **Documentation**: Check existing documentation first
- **Code Examples**: Look at existing code for patterns

### Resources

- **WordPress REST API**: [Official Documentation](https://developer.wordpress.org/rest-api/)
- **Model Context Protocol**: [MCP Specification](https://modelcontextprotocol.io/)
- **TypeScript**: [Official Handbook](https://www.typescriptlang.org/docs/)
- **Jest Testing**: [Official Documentation](https://jestjs.io/docs/getting-started)

## 📈 Development Roadmap

### Current Focus

- **Performance Optimization**: Enhance caching and request optimization
- **Security Enhancements**: Advanced security features and validation
- **Tool Expansion**: Additional WordPress management tools
- **Documentation**: Comprehensive user and developer documentation

### Future Plans

- **Plugin Architecture**: Extensible plugin system
- **GUI Management**: Web-based management interface
- **Advanced Analytics**: Enhanced performance and usage analytics
- **Multi-Platform Support**: Support for additional CMS platforms

## 📚 Further Reading

- **[Architecture Guide](ARCHITECTURE.md)** - System design and patterns
- **[API Reference](API_REFERENCE.md)** - Complete technical API documentation
- **[Testing Guide](TESTING.md)** - Test suite and best practices
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Local development environment

---

**Ready to contribute?** Thank you for your interest in improving the MCP WordPress Server! Every contribution, no
matter how small, helps make this project better for everyone. 🚀
