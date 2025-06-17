import js from '@eslint/js';
import nodePlugin from 'eslint-plugin-node';
import jestPlugin from 'eslint-plugin-jest';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        global: 'writable'
      }
    },
    plugins: {
      node: nodePlugin,
    },
    rules: {
      // General rules
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'comma-dangle': ['error', 'never'],
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'eol-last': ['error', 'always'],
      
      // ES6+ rules
      'prefer-const': 'error',
      'no-var': 'error',
      'arrow-spacing': 'error',
      'template-curly-spacing': 'error',
      
      // Node.js specific
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-import': 'off'
    }
  },
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
    plugins: {
      jest: jestPlugin
    },
    languageOptions: {
      globals: {
        ...jestPlugin.environments.globals.globals,
        jest: 'readonly'
      }
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      'jest/prefer-expect-assertions': 'off',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error'
    }
  },
  {
    ignores: ['node_modules/', 'coverage/', 'dist/', '.env*']
  }
];
