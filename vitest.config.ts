import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Environment
    environment: 'node',
    
    // Pool options - use forks for tests that need process.chdir
    pool: 'forks',
    
    // Test file patterns - equivalent to Jest testMatch
    include: [
      'tests/**/*.test.js',
      'tests/**/*.spec.js'
    ],
    
    // Exclude problematic tests (same as Jest testPathIgnorePatterns)
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'tests/cache/CacheInvalidation.test.js',
      'tests/server/ToolRegistry.test.js',
      'tests/typescript-build.test.js',
      'tests/tools/**/*.test.js',
      'tests/client/**/*.test.js',
      'tests/utils/validation.test.js',
      'tests/utils/logger.test.js',
      'tests/performance/MetricsCollector.test.js'
    ],
    
    // Global test configuration
    globals: true,
    
    // Timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Test behavior
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    
    // Setup files
    setupFiles: ['./tests/vitest.setup.ts'],
    
    // Coverage configuration - equivalent to Jest coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'html', 'json', 'cobertura'],
      reportOnFailure: true,
      reportsDirectory: 'coverage',
      
      // Coverage inclusion/exclusion patterns
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/types/**',
        'src/**/index.ts',
        'tests/**',
        'docs/**',
        'dist/**',
        'node_modules/**'
      ],
      
      // Coverage thresholds - same as Jest
      thresholds: {
        global: {
          branches: 30,
          functions: 35,
          lines: 40,
          statements: 38
        }
      }
    },
    
    // Performance and debugging
    isolate: true,
    poolOptions: {
      forks: {
        singleFork: false
      }
    },
    
    // Reporter configuration
    reporter: ['verbose'],
    
    // Global variables for compatibility
    define: {
      '__EXECUTION_CONTEXT__': '"vitest"'
    }
  },
  
  // TypeScript and module resolution
  resolve: {
    alias: {
      // Support .js imports for TypeScript files
      '^(\\.{1,2}/.*)\\.js$': '$1'
    }
  },
  
  // ESBuild configuration for TypeScript
  esbuild: {
    target: 'es2022'
  }
});