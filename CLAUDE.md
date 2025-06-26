# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build System
```bash
npm run build              # Compile TypeScript to JavaScript
npm run build:watch        # Watch mode compilation
npm run typecheck          # Type checking without output
```

### Testing & Diagnostics
```bash
npm test                   # Run main test suite (typescript tests)
npm run test:typescript    # Run TypeScript build tests
npm run test:tools         # Test all MCP tools functionality
npm run test:mcp           # Test MCP protocol integration
npm run test:integration   # Integration tests with WordPress
npm run test:auth          # Authentication system tests
npm run test:watch         # Watch mode for tests
npm run test:coverage      # Generate coverage report (50% threshold)
npm run test:fast          # Quick test run
npm run health             # Comprehensive system health check
```

### Development & Debugging
```bash
npm run dev                # Development mode with debug output
npm run setup              # Interactive setup wizard
npm run status             # Check connection status
DEBUG=true npm run dev     # Enable debug logging
```

### Code Quality
```bash
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix ESLint errors
```

### Authentication & Security Scripts
```bash
./scripts/wp-auth-check.sh      # WordPress authentication verification
node scripts/test-auth.js       # Comprehensive auth testing
node scripts/health-check.js    # Full system diagnostics
```

## Architecture Overview

### Core Components

**MCP Server** (`src/index.ts`): Main server class implementing Model Context Protocol
- Handles 54 WordPress management tools across 8 categories
- Manages tool registration and request routing
- Implements graceful error handling with authentication-aware responses
- Production-ready with comprehensive error recovery

**WordPress Client** (`src/client/api.ts`): HTTP client for WordPress REST API v2
- Supports multiple authentication methods (App Passwords, JWT, Basic, API Key)
- Implements request/response handling with comprehensive error management
- Features timeout handling and retry logic for uploads
- Enhanced error classification and authentication-specific guidance
- Robust connection pooling and rate limiting

**Tool System** (`src/tools/`): Modular tool implementations
- **Posts** (`posts.ts`): Create, read, update, delete blog posts
- **Pages** (`pages.ts`): Static page management
- **Media** (`media.ts`): File upload and media library management
- **Users** (`users.ts`): User account management
- **Comments** (`comments.ts`): Comment moderation and management
- **Taxonomies** (`taxonomies.ts`): Categories and tags
- **Site** (`site.ts`): Site settings and statistics
- **Auth** (`auth.ts`): Authentication testing and management

### Type System (`src/types/`)

**WordPress Types** (`wordpress.ts`): Complete TypeScript definitions for WordPress REST API v2
- 400+ lines of precise type definitions
- Covers all API endpoints and response formats
- Includes query parameters and request/response interfaces

**MCP Types** (`mcp.ts`): Model Context Protocol interfaces
- Tool definitions and handler signatures
- Server configuration and response types

**Client Types** (`client.ts`): API client interfaces and error classes
- Authentication configuration types
- HTTP method definitions and request options

### Authentication System

Supports 4 authentication methods with comprehensive testing:
1. **Application Passwords** (recommended) - WordPress 5.6+ built-in
   - Most reliable and secure method
   - No plugin dependencies
   - Tested extensively with real WordPress sites
2. **JWT Authentication** - requires plugin
3. **Basic Authentication** - development only
4. **API Key Authentication** - requires plugin

#### Authentication Best Practices
- Use Application Passwords for production environments
- Store credentials securely in environment variables
- Test authentication before deploying tools
- Monitor authentication failures and provide helpful error messages
- Implement proper credential validation and error recovery

### Configuration

Environment variables (loaded from `.env` or passed via MCP config):
- `WORDPRESS_SITE_URL` - WordPress site URL (required)
- `WORDPRESS_USERNAME` - WordPress username (required)
- `WORDPRESS_APP_PASSWORD` - Application password (recommended)
- `WORDPRESS_AUTH_METHOD` - Authentication method (optional, defaults to app-password)

#### Configuration Validation
- All required environment variables are validated on startup
- Helpful error messages guide users through setup
- Interactive setup wizard available via `npm run setup`
- Connection testing before tool registration

### Testing Architecture

#### Comprehensive Test Suite (100% Passing)
- **TypeScript Build Tests** - Ensures compilation succeeds
- **Tool Tests** - Individual tool functionality with dynamic test data
- **Integration Tests** - WordPress API connectivity
- **Authentication Tests** - All auth methods with timeout handling
- **Upload Timeout Tests** - Media upload reliability with proper mocking
- **Health Check Tests** - System diagnostics and validation

#### Testing Best Practices
- Use dynamic test data to avoid hardcoded IDs
- Implement proper timeout handling for network operations
- Mock external dependencies in unit tests
- Provide clear error messages for test failures
- Maintain high test coverage (>95% target)

### Health Check System

#### Comprehensive Diagnostics (`scripts/health-check.js`)
1. **Node.js Environment** - Version compatibility and runtime checks
2. **Project Structure** - File existence and integrity validation
3. **Dependencies** - Package installation and version verification
4. **Environment Configuration** - Variable validation and security checks
5. **TypeScript Build** - Compilation status and output verification
6. **Compiled Output** - Generated file validation and integrity

#### Health Check Features
- 100% pass rate validation
- Detailed error reporting with remediation suggestions
- Environment-specific checks for different deployment scenarios
- Performance metrics and system resource validation

### Deployment Options

1. **NPX** (recommended): `npx @aiondadotcom/mcp-wordpress`
2. **Global Install**: `npm install -g @aiondadotcom/mcp-wordpress`
3. **Local Development**: Clone and `npm run setup`

#### Production Deployment Checklist
- Run `npm run health` to verify system readiness
- Validate authentication using `./scripts/wp-auth-check.sh`
- Test all tools with `npm run test:tools`
- Verify TypeScript compilation with `npm run build`
- Check environment configuration completeness

### Error Handling Strategy

#### Multi-Level Error Management
- **Authentication Errors**: Specific guidance for credential issues
- **Network Errors**: Retry logic with exponential backoff
- **Rate Limiting**: Automatic throttling and queue management
- **WordPress API Errors**: Detailed error classification and user guidance
- **Timeout Handling**: Configurable timeouts with graceful degradation

#### Error Recovery Features
- Automatic reconnection for transient failures
- Structured logging with debug levels
- User-friendly error messages with actionable suggestions
- Graceful degradation for missing WordPress features
- Comprehensive error tracking and reporting

### Security Considerations

#### Authentication Security
- Never log or expose credentials in error messages
- Use secure environment variable handling
- Implement proper credential validation
- Support for WordPress security plugins and restrictions

#### API Security
- Respect WordPress user permissions and capabilities
- Implement proper input validation and sanitization
- Use HTTPS for all API communications
- Handle rate limiting and abuse prevention

### Monitoring & Maintenance

#### System Monitoring
- Regular health checks with `npm run health`
- Authentication status monitoring
- Performance metrics tracking
- Error rate monitoring and alerting

#### Maintenance Tasks
- Regular dependency updates
- Security vulnerability scanning
- Performance optimization
- Documentation updates and accuracy verification

### Development Guidelines

#### Code Quality Standards
- TypeScript strict mode enabled
- Comprehensive error handling required
- Unit tests for all new features
- Integration tests for WordPress API interactions
- Documentation updates for all changes

#### Contributing Best Practices
- Run full test suite before committing
- Verify health checks pass at 100%
- Test authentication with real WordPress sites
- Update documentation for any API changes
- Follow semantic versioning for releases