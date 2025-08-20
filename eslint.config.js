import js from "@eslint/js";
import nodePlugin from "eslint-plugin-node";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        global: "writable",
      },
    },
    plugins: {
      node: nodePlugin,
    },
    rules: {
      // General rules
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": "error",
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "comma-dangle": ["error", "always-multiline"],
      // indent: ["error", 2, { SwitchCase: 1 }], // Disabled in favor of prettier
      "linebreak-style": ["error", "unix"],
      "eol-last": ["error", "always"],

      // ES6+ rules
      "prefer-const": "error",
      "no-var": "error",
      "arrow-spacing": "error",
      "template-curly-spacing": "error",

      // Node.js specific
      "node/no-unsupported-features/es-syntax": "off",
      "node/no-missing-import": "off",
    },
  },
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-undef": "off", // TypeScript handles this
      "no-case-declarations": "off",
      "no-useless-escape": "off",
      // TypeScript specific rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.test.js", "**/*.spec.js", "tests/**/*.js", "**/*.test.ts", "**/*.spec.ts", "**/__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        // Vitest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        jest: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      // Vitest/testing best practices (without Jest plugin)
      "no-console": "off", // Allow console in tests
      "@typescript-eslint/no-explicit-any": "off", // Allow any in tests
    },
  },
  {
    files: [
      "src/utils/logger.ts",
      "src/utils/debug.ts",
      "src/utils/error.ts",
      "src/dxt-entry.cjs",
      "scripts/**/*.js",
      "scripts/**/*.cjs",
    ],
    rules: {
      "no-console": "off", // Logger utility, debug, error handlers and scripts need console access
    },
  },
  {
    files: ["evaluations/**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        global: "writable",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: ["node_modules/", "coverage/", "dist/", ".env*", "bin/"],
  },
  prettierConfig,
];
