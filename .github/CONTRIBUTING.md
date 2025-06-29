# Contributing to MCP WordPress

Thank you for your interest in contributing to MCP WordPress! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/your-username/mcp-wordpress.git`
3. **Install dependencies**: `npm install`
4. **Run tests**: `npm test`
5. **Create a branch**: `git checkout -b feature/your-feature-name`

## 📋 Development Guidelines

### Code Style

- Follow the existing TypeScript/JavaScript style
- Use ESLint configuration: `npm run lint`
- Add type definitions for all functions
- Write meaningful commit messages

### Testing

- Write tests for new features
- Ensure all tests pass: `npm test`
- Test tools functionality: `npm run test:tools`
- Run health checks: `npm run health`

### Documentation

- Update relevant documentation
- Add JSDoc comments for new functions
- Update CLAUDE.md for architectural changes
- Include examples in documentation

## 🐛 Reporting Bugs

1. **Search existing issues** first
2. **Use the bug report template**
3. **Provide reproduction steps**
4. **Include environment details**

## ✨ Suggesting Features

1. **Check existing feature requests**
2. **Use the feature request template**
3. **Describe the use case clearly**
4. **Consider backward compatibility**

## 🔧 Development Setup

### Prerequisites

- Node.js 18+ 
- NPM 8+
- WordPress site for testing (optional)

### Local Development

```bash
# Clone and setup
git clone https://github.com/your-username/mcp-wordpress.git
cd mcp-wordpress
npm install

# Build and test
npm run build
npm test

# Run development mode
npm run dev
```

### Testing with WordPress

1. Create `.env` file with WordPress credentials
2. Or use `mcp-wordpress.config.json` for multi-site testing
3. Run integration tests: `npm run test:integration`

## 📦 Architecture Overview

### Core Components

- **MCP Server** (`src/index.ts`): Main server implementation
- **WordPress Client** (`src/client/`): Modular HTTP client
- **Tools** (`src/tools/`): 54 WordPress management tools
- **Types** (`src/types/`): TypeScript definitions

### Adding New Tools

1. **Create tool class** in appropriate category file
2. **Add to tool registry** in `src/tools/index.ts`
3. **Write tests** following existing patterns
4. **Update documentation**

Example tool structure:
```typescript
export class NewTool {
  constructor(private client: WordPressClient) {}
  
  async newMethod(params: ToolParams): Promise<ToolResult> {
    // Implementation
  }
}
```

## 🧪 Testing Guidelines

### Test Types

- **Unit Tests**: Individual component testing
- **Integration Tests**: WordPress API interaction
- **Tool Tests**: Complete tool functionality
- **Build Tests**: TypeScript compilation

### Running Tests

```bash
npm test                    # Main test suite
npm run test:tools         # Tool functionality
npm run test:integration   # WordPress integration
npm run test:auth         # Authentication
npm run health            # System health
```

### Writing Tests

- Follow existing test patterns
- Use descriptive test names
- Mock external dependencies
- Test error conditions

## 📝 Commit Guidelines

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

### Examples

```
feat(tools): add new wp_backup_site tool
fix(auth): resolve JWT token expiration issue
docs(readme): update installation instructions
```

## 🔄 Pull Request Process

1. **Create feature branch** from `main`
2. **Make your changes** following guidelines
3. **Write/update tests** as needed
4. **Update documentation** if required
5. **Run full test suite**
6. **Submit pull request** using template

### PR Requirements

- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (unless discussed)
- [ ] Code style follows project conventions
- [ ] Commit messages are clear

## 🚀 Release Process

### Version Management

- Use semantic versioning (semver)
- Update `package.json` version
- Update `CHANGELOG.md`
- Create GitHub release

### Automated Publishing

- GitHub releases trigger NPM publishing
- CI/CD runs full test suite
- Documentation is automatically updated

## 🔒 Security Guidelines

### Sensitive Information

- Never commit credentials or API keys
- Use environment variables for sensitive data
- Exclude sensitive files in `.gitignore`
- Review changes for accidental exposure

### Vulnerability Reporting

For security vulnerabilities:
1. **Do NOT** create public issues
2. Email maintainer directly
3. Provide detailed reproduction steps
4. Allow time for fix before disclosure

## 📚 Resources

### Documentation

- [README.md](../README.md) - Main documentation
- [CLAUDE.md](../CLAUDE.md) - Architecture and development guide
- [docs/](../docs/) - Comprehensive documentation

### Development Tools

- [GitHub Actions](../.github/workflows/) - CI/CD workflows
- [ESLint Config](../eslint.config.js) - Code style rules
- [TypeScript Config](../tsconfig.json) - Type checking

### Community

- [GitHub Issues](https://github.com/AiondaDotCom/mcp-wordpress/issues) - Bug reports and features
- [GitHub Discussions](https://github.com/AiondaDotCom/mcp-wordpress/discussions) - Questions and ideas

## 🙏 Recognition

Contributors are recognized in:
- `CHANGELOG.md` for significant contributions
- GitHub contributor graph
- Release notes for feature contributions

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

- Check existing [documentation](../docs/)
- Search [issues and discussions](https://github.com/AiondaDotCom/mcp-wordpress/issues)
- Create a [question issue](https://github.com/AiondaDotCom/mcp-wordpress/issues/new/choose)

Thank you for contributing to MCP WordPress! 🎉