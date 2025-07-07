# Developer Documentation

This directory contains comprehensive documentation for developers contributing to the MCP WordPress Server project.

## 📋 Developer Guides

### Getting Started
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Local development environment setup
- **[Architecture Overview](ARCHITECTURE.md)** - System architecture and design patterns
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project

### Technical Reference
- **[API Reference](API_REFERENCE.md)** - Complete technical API documentation
- **[Testing Guide](TESTING.md)** - Test suite, CI/CD, and testing best practices
- **[Performance Guide](PERFORMANCE_DEVELOPMENT.md)** - Performance optimization and monitoring

### Build & Deployment
- **[Build System](BUILD_SYSTEM.md)** - TypeScript compilation and build process
- **[Release Process](RELEASE_PROCESS.md)** - Semantic versioning and automated releases
- **[CI/CD Pipeline](CI_CD_PIPELINE.md)** - GitHub Actions workflows and automation

### Maintenance & Operations
- **[Maintenance Guide](MAINTENANCE.md)** - Ongoing maintenance and updates
- **[Migration Guide](MIGRATION_GUIDE.md)** - Breaking changes and migration paths
- **[Security Guidelines](SECURITY_DEVELOPMENT.md)** - Security best practices for development

## 🏗️ Project Structure

```
mcp-wordpress/
├── src/                     # TypeScript source code
│   ├── index.ts            # Main MCP server entry point
│   ├── server.ts           # Server compatibility layer
│   ├── types/              # TypeScript type definitions
│   ├── client/             # WordPress API client (modular architecture)
│   ├── tools/              # MCP tool implementations (class-based)
│   ├── cache/              # Intelligent caching system
│   ├── performance/        # Performance monitoring system
│   ├── security/           # Security validation and utilities
│   ├── docs/               # Documentation generation system
│   └── utils/              # Shared utility functions
├── dist/                   # Compiled JavaScript output
├── tests/                  # Comprehensive test suite
├── scripts/                # Build, test, and utility scripts
├── docs/                   # Documentation
│   ├── user-guides/        # User-focused setup guides
│   ├── developer/          # Developer documentation (this directory)
│   ├── api/                # Auto-generated API documentation
│   └── security/           # Security documentation
└── .github/workflows/      # CI/CD automation
```

## 🔧 Development Environment

### Prerequisites
- **Node.js 18+** - Runtime environment
- **TypeScript 5+** - Primary development language
- **Docker** - For containerization and testing
- **Git** - Version control

### Quick Setup
```bash
# Clone the repository
git clone https://github.com/docdyhr/mcp-wordpress.git
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

### Development Commands
```bash
# Build and compilation
npm run build              # Compile TypeScript
npm run build:watch        # Watch mode compilation
npm run typecheck          # Type checking only

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode testing
npm run test:coverage      # Generate coverage report
npm run test:security      # Security tests only

# Code quality
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix linting errors
npm run format             # Prettier formatting

# Development
npm run dev                # Development mode with debug output
npm run status             # Check connection status
```

## 🧪 Testing Infrastructure

### Test Categories
- **Unit Tests** - Individual component testing
- **Integration Tests** - WordPress API integration
- **Security Tests** - Vulnerability and penetration testing
- **Performance Tests** - Regression detection and benchmarking
- **Contract Tests** - API contract validation
- **Property-Based Tests** - Generative testing with edge cases

### Current Test Status ✅
- **Main Test Suite**: 207/207 passed (100%)
- **Security Tests**: 40/40 passed (100%)
- **Performance Tests**: 8/8 passed (100%)
- **CI/CD Pipeline**: Fully functional

## 🏛️ Architecture Highlights

### Modular Client Architecture
- **Manager Pattern** - Composition over inheritance
- **Authentication Manager** - Multiple auth method support
- **Request Manager** - HTTP operations with retry logic
- **Cache Manager** - Multi-layer caching system

### Tool System
- **Class-Based Tools** - Consistent tool implementation pattern
- **Type-Safe Parameters** - Comprehensive Zod validation
- **Error Handling** - Standardized error patterns
- **Multi-Site Support** - Site-specific tool execution

### Performance Systems
- **Intelligent Caching** - 50-70% performance improvement
- **Real-Time Monitoring** - Comprehensive metrics collection
- **Performance Analytics** - Trend analysis and optimization
- **Benchmark Comparisons** - Industry standard comparisons

## 📚 Documentation System

### Auto-Generated Documentation
- **Tool Documentation** - Extracted from TypeScript definitions
- **OpenAPI Specification** - Machine-readable API spec
- **Markdown Generation** - User-friendly documentation
- **CI/CD Integration** - Automatic updates on code changes

### Documentation Standards
- **JSDoc Comments** - Comprehensive code documentation
- **Type Annotations** - Complete TypeScript typing
- **Usage Examples** - Practical implementation examples
- **Error Scenarios** - Error handling documentation

## 🔒 Security Framework

### Security Measures
- **Input Validation** - Comprehensive Zod schema validation
- **Authentication Security** - Multiple secure auth methods
- **Rate Limiting** - API abuse prevention
- **Error Sanitization** - Secure error handling
- **HTTPS Enforcement** - Secure communication

### Security Testing
- **Penetration Tests** - Automated vulnerability testing
- **Input Validation Tests** - Edge case and injection testing
- **Authentication Tests** - Security validation for all auth methods
- **Rate Limiting Tests** - DoS protection validation

## 🚀 Release & Publishing

### Automated Release Pipeline
- **Semantic Versioning** - Conventional commit-based versioning
- **Multi-Platform Publishing** - NPM and Docker Hub
- **Security Scanning** - Automated vulnerability detection
- **Performance Validation** - Regression testing before release

### Distribution Channels
- **NPM Package** - Node.js package manager
- **Docker Images** - Multi-architecture container images
- **GitHub Releases** - Source code and release notes

## 🤝 Contributing

### Development Workflow
1. **Fork & Clone** - Create your development environment
2. **Feature Branch** - Create feature branches from main
3. **Development** - Implement changes with tests
4. **Testing** - Ensure all tests pass
5. **Documentation** - Update relevant documentation
6. **Pull Request** - Submit for review

### Code Standards
- **TypeScript** - Strict mode with comprehensive typing
- **ESLint** - Consistent code style and best practices
- **Prettier** - Automated code formatting
- **Jest** - Comprehensive test coverage
- **Conventional Commits** - Semantic commit messages

### Review Process
- **Automated Testing** - CI/CD pipeline validation
- **Security Scanning** - Automated vulnerability detection
- **Performance Testing** - Regression detection
- **Code Review** - Manual review process
- **Documentation Review** - Documentation completeness check

## 📞 Getting Help

### Development Support
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Development questions and community
- **Security Issues** - Responsible disclosure process

### Resources
- **WordPress REST API** - Official WordPress API documentation
- **Model Context Protocol** - MCP specification and guidelines
- **TypeScript Handbook** - TypeScript language reference

---

**Ready to contribute?** Start with the [Development Setup](DEVELOPMENT_SETUP.md) guide and join our community of contributors!