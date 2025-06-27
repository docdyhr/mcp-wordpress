# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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