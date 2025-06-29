# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.3] - 2025-06-29

### Fixed
- **Code Quality**: Resolved all ESLint violations (105 errors eliminated)
- **Unused Variables**: Removed unused imports and variables across codebase
  - Fixed unused `debug` and `http` imports in auth.ts
  - Fixed unused `path` and `WordPressMedia` imports in media.ts
  - Fixed unused `TClient` type parameter in mcp.ts
  - Fixed unused variables in test files and shell scripts
- **Test Output**: Suppressed excessive console logging during tests
  - Reduced test noise by conditionally disabling info logs in test environment
  - Improved test readability and performance
- **Error Handling**: Fixed conditional expect in Jest tests
- **Shell Scripts**: Fixed unused variable warning in wp-auth-check.sh

### Technical Debt Resolution
- ✅ **Linting Issues**: All 105 ESLint errors resolved
- ✅ **Code Cleanup**: Removed all unused imports and variables
- ✅ **Test Quality**: Improved test assertions and reduced console noise
- ✅ **Shell Script Quality**: Fixed shellcheck warnings

### Code Quality Improvements
- **ESLint Configuration**: Fixed quote consistency and trailing comma issues
- **Type Safety**: Addressed unused type parameters with proper prefixing
- **Test Architecture**: Improved conditional expect patterns
- **Logging Strategy**: Implemented environment-aware logging

## [1.1.2] - 2025-06-29

### Added
- **Modular Manager Architecture**: Introduced BaseManager, AuthenticationManager, and RequestManager classes
- **Standardized Error Handling**: Created toolWrapper utilities for consistent error handling across tools
- **Comprehensive Documentation**: Added detailed REFACTORING.md with technical debt analysis
- **Performance Optimizations**: Request queuing, retry logic, and intelligent rate limiting
- **Backward Compatibility Layer**: Complete API compatibility maintained during refactoring

### Changed
- **Major Refactoring**: Reduced api.ts from 1043 lines to 59 lines (94% reduction)
- **Architecture Pattern**: Migrated from monolithic client to composition-based manager pattern
- **Error Handling**: Standardized error handling reducing duplication from 30% to 5%
- **Code Organization**: Created managers/ directory structure for better modularity
- **Performance**: Improved memory usage and reduced object allocation in hot paths

### Fixed
- **Technical Debt**: Addressed major technical debt items identified in TODO.md
- **Code Quality**: Eliminated repetitive try-catch blocks across 49 tool methods
- **Dependencies**: Removed unused `open` import from auth.ts
- **Missing Dependencies**: Added @jest/globals for proper test execution

### Performance
- **Memory Optimization**: Reduced object creation in hot code paths
- **Request Management**: Intelligent retry logic with exponential backoff
- **Error Processing**: Pre-compiled error patterns for faster categorization
- **Garbage Collection**: Better memory allocation patterns

### Technical Debt Resolution
- ✅ Split large API client class (1043 lines) into focused managers
- ✅ Eliminated repetitive error handling (49 identical try-catch blocks)
- ✅ Implemented proper abstraction layers with composition pattern  
- ✅ Standardized validation and error response formatting
- ✅ Improved code maintainability and testability

### Migration
- **Zero Breaking Changes**: All existing APIs continue to work unchanged
- **Re-export Strategy**: api.ts now re-exports modular components for compatibility
- **Developer Experience**: New modular structure enables better unit testing
- **Future-Proof**: Foundation set for additional managers (Media, Content, User)

## [1.1.1] - 2025-06-29

### Added
- Complete test suite with 100% pass rate
- New integration test script (`test-integration.js`)
- Comprehensive error handling for undefined roles arrays
- Jest dependency for proper test running
- Multi-site support in all test scripts

### Changed
- Updated package version to 1.1.1
- Enhanced test architecture to support class-based tools
- Improved authentication test coverage
- Updated TypeScript build tests for new class exports

### Fixed
- **Critical**: Fixed authentication quote handling in `.env` files
- **Critical**: Fixed bash script environment variable parsing for spaces
- **Critical**: Fixed `roles.join()` undefined errors in auth and user tools
- **Critical**: Fixed MCP test script server import paths
- **Critical**: Fixed `failureCount` undefined variable in auth tests
- Tool test failures by adding proper site parameter support
- Test script environment variable name mismatches
- Updated non-existent tool names in test scripts

### Testing
- **100% Test Success Rate**: All 41 TypeScript tests passing
- **100% Tool Success Rate**: All 14 tool tests passing  
- **100% Auth Success Rate**: Application password and JWT authentication working
- Fixed TypeScript build tests for class-based architecture
- Added proper multi-site configuration to tool tests
- Enhanced error handling in user and authentication tools

### Security
- Fixed credential exposure in environment variable handling
- Enhanced bash script security for password parsing
- Improved error messages to prevent credential leakage

## [1.1.0-fixes] - Previous Unreleased Changes

### Added
- Comprehensive error handling utilities with specific error categorization
- Three new test suites for improved coverage:
  - Error handling validation tests
  - Configuration loading tests  
  - Tool validation and schema tests
- Enhanced ESLint configuration with TypeScript support
- Technical debt analysis and resolution documentation

### Changed
- Updated dependencies:
  - `@modelcontextprotocol/sdk` to latest version (1.13.2)
  - `dotenv` to latest version (16.6.1)
  - Added missing ESLint dependencies for proper linting
- Improved error utility functions with better error categorization
- Enhanced tool validation with consistent parameter checking

### Fixed
- ESLint configuration issues - now properly supports TypeScript files
- Missing development dependencies for linting and code quality
- Inconsistent error handling patterns across tool classes

### Security
- Removed Datadog workflow file as identified in security review
- Added critical security warnings about credential management
- Enhanced documentation standards requiring dummy data in examples

### Documentation
- Added comprehensive `MIGRATION_GUIDE.md` for breaking changes
- Enhanced `CLAUDE.md` with multi-site configuration details
- Updated Claude Desktop setup to use placeholder data
- Documented new class-based tool architecture
- Added technical debt analysis and resolution guidelines

## [1.1.0] - 2025-06-27

### Added
- Multi-site support with `mcp-wordpress.config.json` configuration
- Class-based tool architecture (54 tools across 8 categories)
- Comprehensive authentication system with 4 methods
- Enhanced error handling and validation

### Changed
- Refactored from function-based to class-based tool implementations
- Improved type safety with comprehensive TypeScript definitions
- Enhanced configuration management with fallback support

### Security
- Application Password authentication recommended
- Proper credential management with `.gitignore` exclusions

## [1.0.0] - 2025-06-26

### Added
- Initial release of MCP WordPress server
- 54 WordPress management tools
- Support for Posts, Pages, Media, Users, Comments, Taxonomies, Site, and Auth
- WordPress REST API v2 integration
- TypeScript support with comprehensive type definitions
- Jest testing framework setup
- Production-ready authentication