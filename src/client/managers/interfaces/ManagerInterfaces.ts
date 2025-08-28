/**
 * Manager Interface Definitions
 * Defines contracts for manager behaviors to enable composition over inheritance
 */

import type { WordPressClientConfig } from "@/types/client.js";

/**
 * Core configuration management interface
 */
export interface ConfigurationProvider {
  readonly config: WordPressClientConfig;
  
  /**
   * Get configuration value by path
   */
  getConfigValue<T>(path: string, defaultValue?: T): T | undefined;
}

/**
 * Error handling interface for managers
 */
export interface ErrorHandler {
  /**
   * Handle and transform errors with context
   */
  handleError(error: unknown, operation: string): never;

  /**
   * Log successful operations
   */
  logSuccess(operation: string, details?: unknown): void;
}

/**
 * Parameter validation interface
 */
export interface ParameterValidator {
  /**
   * Validate required parameters are present
   */
  validateRequired(params: Record<string, unknown>, requiredFields: string[]): void;

  /**
   * Validate parameter types and formats
   */
  validateParameters<T>(params: unknown, schema?: unknown): T;

  /**
   * Validate string parameters
   */
  validateString(value: unknown, fieldName: string, options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }): string;

  /**
   * Validate WordPress ID parameters
   */
  validateWordPressId(value: unknown, fieldName?: string): number;
}

/**
 * Base manager contract combining common behaviors
 */
export interface BaseManagerContract extends ConfigurationProvider, ErrorHandler, ParameterValidator {}

/**
 * Request management interface
 */
export interface RequestHandler {
  /**
   * Execute HTTP request with full request lifecycle management
   */
  request<T>(method: string, endpoint: string, data?: unknown, options?: unknown): Promise<T>;

  /**
   * Get request statistics
   */
  getStats(): unknown;

  /**
   * Reset statistics
   */
  resetStats(): void;
}

/**
 * Authentication management interface
 */
export interface AuthenticationProvider {
  /**
   * Authenticate with the configured method
   */
  authenticate(): Promise<boolean>;

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get authentication headers for requests
   */
  getAuthHeaders(): Record<string, string>;

  /**
   * Handle authentication failure
   */
  handleAuthFailure(error: unknown): Promise<boolean>;
}

/**
 * Manager factory interface for dependency injection
 */
export interface ManagerFactory {
  /**
   * Create configuration provider
   */
  createConfigurationProvider(config: WordPressClientConfig): ConfigurationProvider;

  /**
   * Create error handler
   */
  createErrorHandler(config: WordPressClientConfig): ErrorHandler;

  /**
   * Create parameter validator
   */
  createParameterValidator(): ParameterValidator;

  /**
   * Create request handler
   */
  createRequestHandler(config: WordPressClientConfig, authProvider: AuthenticationProvider): RequestHandler;

  /**
   * Create authentication provider
   */
  createAuthenticationProvider(config: WordPressClientConfig): AuthenticationProvider;
}

/**
 * Configuration for manager composition
 */
export interface ManagerCompositionConfig {
  /** WordPress client configuration */
  clientConfig: WordPressClientConfig;
  
  /** Optional custom implementations */
  customErrorHandler?: ErrorHandler;
  customValidator?: ParameterValidator;
  customAuthProvider?: AuthenticationProvider;
}

/**
 * Composed manager that uses composition instead of inheritance
 */
export interface ComposedManager extends BaseManagerContract, RequestHandler, AuthenticationProvider {
  /**
   * Initialize the composed manager
   */
  initialize(): Promise<void>;

  /**
   * Cleanup resources
   */
  dispose(): void;
}