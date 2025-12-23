# Deprecation Guide

This document tracks deprecated APIs and provides migration guidance for the MCP WordPress project.

## Deprecation Policy

- **Deprecation Notice**: APIs are marked with `@deprecated` JSDoc tag
- **Warning Period**: Deprecated APIs remain functional for at least 2 minor versions
- **Removal Timeline**: Removal is announced in CHANGELOG.md before the breaking release

## Currently Deprecated APIs

### 1. Legacy Import Modules

#### `src/tools/posts.ts` (Re-export Module)

**Status**: Deprecated since v2.10.0 | **Removal**: v3.0.0

**Reason**: Refactored to modular structure for better maintainability.

**Migration**:

```typescript
// Before (deprecated)
import PostTools from "./tools/posts.js";
import { handleCreatePost } from "./tools/posts.js";

// After (recommended)
import { PostTools } from "./tools/posts/index.js";
import { handleCreatePost } from "./tools/posts/PostHandlers.js";
```

**Note**: The legacy import still works and will continue to work until v3.0.0.

---

#### `src/utils/validation.ts` (Re-export Module)

**Status**: Deprecated since v2.8.0 | **Removal**: v3.0.0

**Reason**: Refactored to modular structure with focused validation modules.

**Migration**:

```typescript
// Before (deprecated)
import { validateId, sanitizeHtml, RateLimiter } from "./utils/validation.js";

// After (recommended) - Import from specific modules
import { validateId } from "./utils/validation/core.js";
import { sanitizeHtml } from "./utils/validation/security.js";
import { RateLimiter } from "./utils/validation/rate-limiter.js";

// Or use the new index (also acceptable)
import { validateId, sanitizeHtml, RateLimiter } from "./utils/validation/index.js";
```

**Available Modules**:

| Module                       | Exports                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `validation/core.js`         | `validateId`, `validateString`, `validateArray`                               |
| `validation/security.js`     | `validateFilePath`, `validateFileSize`, `validateMimeType`, `sanitizeHtml`    |
| `validation/network.js`      | `validateUrl`, `validateEmail`, `validateUsername`                            |
| `validation/wordpress.js`    | `validatePostStatus`, `validateSearchQuery`, `validatePaginationParams`, etc. |
| `validation/rate-limiter.js` | `RateLimiter`, `authRateLimiter`                                              |

---

#### `src/tools/performance.ts` (Re-export Module)

**Status**: Deprecated since v2.12.0 | **Removal**: v3.0.0

**Reason**: Refactored to modular structure for better maintainability.

**Migration**:

```typescript
// Before (deprecated)
import PerformanceTools from "./tools/performance.js";

// After (recommended)
import { PerformanceTools } from "./tools/performance/index.js";
import { calculateHealthStatus, formatUptime } from "./tools/performance/PerformanceHelpers.js";
```

---

### 2. Internal Method Deprecations

#### `VersionManager.loadVersionSync()` (Private Method)

**Status**: Deprecated since v2.5.0 | **Removal**: v3.0.0

**Reason**: Async initialization provides better performance.

**Migration**:

```typescript
// Before (deprecated pattern)
const version = VersionManager.getInstance().getVersion(); // May load sync

// After (recommended)
const manager = VersionManager.getInstance();
await manager.initialize(); // Async load
const version = manager.getVersion(); // Uses cached value
```

---

## Upcoming Deprecations (v2.13.0)

The following items are candidates for deprecation in future releases:

### Legacy Alias Exports

Located in `src/utils/validation.ts`:

- `validateWordPressId` → Use `validateId` from `validation/core.js`
- `validatePostData` → Use `validatePostParams` from `validation/wordpress.js`
- `cleanHtml` → Use `sanitizeHtml` from `validation/security.js`

---

## Removed APIs

### v2.0.0 (Breaking Release)

| Removed                      | Replacement                    |
| ---------------------------- | ------------------------------ |
| `WordPressClient.connect()`  | `WordPressClient.initialize()` |
| `config.getEnv()`            | `config().app`                 |

---

## Migration Assistance

If you need help migrating from deprecated APIs:

1. Check this document for migration examples
2. Review the CHANGELOG.md for version-specific changes
3. Run `npm run lint` to catch deprecated import warnings
4. Open an issue on GitHub for migration questions

## Version Support Matrix

| Version  | Status        | Deprecations Active | End of Support   |
| -------- | ------------- | ------------------- | ---------------- |
| v2.12.x  | Current       | Yes                 | -                |
| v2.11.x  | Maintained    | Yes                 | v2.14.0 release  |
| v2.10.x  | Security Only | Yes                 | v2.13.0 release  |
| v2.9.x   | End of Life   | N/A                 | Ended            |
| v3.0.0   | Planned       | Removed             | -                |

---

*Last updated: December 2024*
