/**
 * Composed Manager Factory
 * Factory for creating managers using composition instead of inheritance
 */

import type { WordPressClientConfig } from "@/types/client.js";
import type { 
  ManagerFactory, 
  ConfigurationProvider,
  ErrorHandler,
  ParameterValidator,
  AuthenticationProvider,
  RequestHandler,
  ManagerCompositionConfig
} from "./interfaces/ManagerInterfaces.js";

import { ConfigurationProviderImpl } from "./implementations/ConfigurationProviderImpl.js";
import { ErrorHandlerImpl } from "./implementations/ErrorHandlerImpl.js";
import { ParameterValidatorImpl } from "./implementations/ParameterValidatorImpl.js";
import { ComposedAuthenticationManager } from "./ComposedAuthenticationManager.js";
import { ComposedRequestManager } from "./ComposedRequestManager.js";

export class ComposedManagerFactory implements ManagerFactory {
  /**
   * Create configuration provider
   */
  createConfigurationProvider(config: WordPressClientConfig): ConfigurationProvider {
    return new ConfigurationProviderImpl(config);
  }

  /**
   * Create error handler
   */
  createErrorHandler(config: WordPressClientConfig): ErrorHandler {
    const configProvider = this.createConfigurationProvider(config);
    return new ErrorHandlerImpl(configProvider);
  }

  /**
   * Create parameter validator
   */
  createParameterValidator(): ParameterValidator {
    return new ParameterValidatorImpl();
  }

  /**
   * Create authentication provider
   */
  createAuthenticationProvider(config: WordPressClientConfig): AuthenticationProvider {
    return ComposedAuthenticationManager.create(config);
  }

  /**
   * Create request handler
   */
  createRequestHandler(config: WordPressClientConfig, authProvider: AuthenticationProvider): RequestHandler {
    return ComposedRequestManager.create(config, authProvider);
  }

  /**
   * Create a complete composed client with all managers
   */
  async createComposedClient(config: ManagerCompositionConfig): Promise<ComposedWordPressClient> {
    const configProvider = this.createConfigurationProvider(config.clientConfig);
    const errorHandler = config.customErrorHandler || this.createErrorHandler(config.clientConfig);
    const validator = config.customValidator || this.createParameterValidator();
    const authProvider = config.customAuthProvider || this.createAuthenticationProvider(config.clientConfig);
    
    // Initialize authentication
    await authProvider.authenticate();
    
    const requestHandler = this.createRequestHandler(config.clientConfig, authProvider);
    
    return new ComposedWordPressClient({
      configProvider,
      errorHandler,
      validator,
      authProvider,
      requestHandler,
    });
  }
}

/**
 * Complete Composed WordPress Client
 * Demonstrates how to combine all composed managers
 */
export interface ComposedWordPressClientDependencies {
  configProvider: ConfigurationProvider;
  errorHandler: ErrorHandler;
  validator: ParameterValidator;
  authProvider: AuthenticationProvider;
  requestHandler: RequestHandler;
}

export class ComposedWordPressClient {
  private initialized: boolean = false;

  constructor(private dependencies: ComposedWordPressClientDependencies) {}

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize all components
      await this.dependencies.authProvider.authenticate();
      
      if ('initialize' in this.dependencies.requestHandler && typeof this.dependencies.requestHandler.initialize === 'function') {
        await (this.dependencies.requestHandler as any).initialize();
      }

      this.initialized = true;
      this.dependencies.errorHandler.logSuccess("client initialization");
    } catch (error) {
      this.dependencies.errorHandler.handleError(error, "client initialization");
    }
  }

  /**
   * Make HTTP requests (delegates to request manager)
   */
  async request<T>(method: string, endpoint: string, data?: unknown, options?: unknown): Promise<T> {
    this.ensureInitialized();
    return this.dependencies.requestHandler.request<T>(method, endpoint, data, options);
  }

  /**
   * Get client configuration
   */
  get config(): WordPressClientConfig {
    return this.dependencies.configProvider.config;
  }

  /**
   * Check authentication status
   */
  isAuthenticated(): boolean {
    return this.dependencies.authProvider.isAuthenticated();
  }

  /**
   * Get request statistics
   */
  getStats(): unknown {
    return this.dependencies.requestHandler.getStats();
  }

  /**
   * WordPress-specific convenience methods
   */
  
  /**
   * Get posts
   */
  async getPosts(params?: unknown): Promise<unknown[]> {
    return this.request("GET", "/wp/v2/posts", params);
  }

  /**
   * Get single post
   */
  async getPost(id: number): Promise<unknown> {
    this.dependencies.validator.validateWordPressId(id, "post ID");
    return this.request("GET", `/wp/v2/posts/${id}`);
  }

  /**
   * Create post
   */
  async createPost(postData: unknown): Promise<unknown> {
    this.dependencies.validator.validateRequired(postData as Record<string, unknown>, ["title", "content"]);
    return this.request("POST", "/wp/v2/posts", postData);
  }

  /**
   * Update post
   */
  async updatePost(id: number, postData: unknown): Promise<unknown> {
    this.dependencies.validator.validateWordPressId(id, "post ID");
    return this.request("PUT", `/wp/v2/posts/${id}`, postData);
  }

  /**
   * Delete post
   */
  async deletePost(id: number, force: boolean = false): Promise<unknown> {
    this.dependencies.validator.validateWordPressId(id, "post ID");
    const params = force ? { force: true } : {};
    return this.request("DELETE", `/wp/v2/posts/${id}`, params);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if ('dispose' in this.dependencies.requestHandler && typeof this.dependencies.requestHandler.dispose === 'function') {
      (this.dependencies.requestHandler as any).dispose();
    }
    this.initialized = false;
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("ComposedWordPressClient not initialized. Call initialize() first.");
    }
  }
}

/**
 * Convenience factory function
 */
export async function createComposedWordPressClient(config: WordPressClientConfig): Promise<ComposedWordPressClient> {
  const factory = new ComposedManagerFactory();
  const client = await factory.createComposedClient({ clientConfig: config });
  await client.initialize();
  return client;
}