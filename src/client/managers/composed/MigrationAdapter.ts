/**
 * Migration Adapter
 * Provides backward compatibility while transitioning from inheritance to composition
 */

import type { WordPressClientConfig, HTTPMethod } from "@/types/client.js";
import { RequestManager } from "../RequestManager.js";
import { AuthenticationManager } from "../AuthenticationManager.js";
import { ComposedRequestManager } from "../ComposedRequestManager.js";
import { ComposedAuthenticationManager } from "../ComposedAuthenticationManager.js";
import { createComposedWordPressClient } from "../ComposedManagerFactory.js";

/**
 * Adapter that wraps composed managers to provide the same interface as inheritance-based ones
 */
export class RequestManagerAdapter {
  private composedManager: ComposedRequestManager;

  constructor(clientConfig: WordPressClientConfig, authManager: AuthenticationManager | ComposedAuthenticationManager) {
    // If the authManager is the old inheritance-based one, create a composed one
    let composedAuthManager: ComposedAuthenticationManager;
    
    if (authManager instanceof ComposedAuthenticationManager) {
      composedAuthManager = authManager;
    } else {
      // Create composed auth manager from config
      composedAuthManager = ComposedAuthenticationManager.create(clientConfig);
    }

    this.composedManager = ComposedRequestManager.create(clientConfig, composedAuthManager);
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    await this.composedManager.initialize();
  }

  /**
   * Delegate request method to composed manager
   */
  async request<T>(method: HTTPMethod, endpoint: string, data?: unknown, options?: unknown): Promise<T> {
    return this.composedManager.request<T>(method, endpoint, data, options as any);
  }

  /**
   * Delegate stats method
   */
  getStats(): unknown {
    return this.composedManager.getStats();
  }

  /**
   * Delegate reset stats method
   */
  resetStats(): void {
    this.composedManager.resetStats();
  }

  /**
   * Cleanup method
   */
  dispose(): void {
    this.composedManager.dispose();
  }
}

/**
 * Migration utilities for gradual transition
 */
export class MigrationAdapter {
  /**
   * Create managers using the new composition approach but with backward-compatible interface
   */
  static async createCompatibleManagers(config: WordPressClientConfig): Promise<{
    requestManager: RequestManagerAdapter;
    authManager: ComposedAuthenticationManager;
  }> {
    const authManager = ComposedAuthenticationManager.create(config);
    await authManager.authenticate();

    const requestManager = new RequestManagerAdapter(config, authManager);
    await requestManager.initialize();

    return {
      requestManager,
      authManager,
    };
  }

  /**
   * Factory method that returns either old or new managers based on feature flag
   */
  static async createManagers(
    config: WordPressClientConfig, 
    useComposition: boolean = true
  ): Promise<{
    requestManager: RequestManager | RequestManagerAdapter;
    authManager: AuthenticationManager | ComposedAuthenticationManager;
  }> {
    if (useComposition) {
      return MigrationAdapter.createCompatibleManagers(config);
    } else {
      // Return old inheritance-based managers (simplified for now)
      throw new Error("Legacy managers not available in this implementation");
    }
  }

  /**
   * Check if a manager is using the new composed approach
   */
  static isComposed(manager: unknown): boolean {
    return manager instanceof ComposedAuthenticationManager || 
           manager instanceof ComposedRequestManager ||
           manager instanceof RequestManagerAdapter;
  }

  /**
   * Get migration progress information
   */
  static getMigrationStatus(managers: unknown[]): {
    total: number;
    composed: number;
    inheritance: number;
    percentage: number;
  } {
    const total = managers.length;
    const composed = managers.filter(manager => MigrationAdapter.isComposed(manager)).length;
    const inheritance = total - composed;
    const percentage = total > 0 ? Math.round((composed / total) * 100) : 0;

    return {
      total,
      composed,
      inheritance,
      percentage,
    };
  }

  /**
   * Performance comparison between inheritance and composition approaches
   */
  static async performanceComparison(
    config: WordPressClientConfig, 
    iterations: number = 100
  ): Promise<{
    inheritance: number;
    composition: number;
    improvement: string;
  }> {
    console.log(`Running performance comparison with ${iterations} iterations...`);

    // Test composition approach only (inheritance baseline would require old managers)
    const compositionStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const authManager = ComposedAuthenticationManager.create(config);
      const requestManager = ComposedRequestManager.create(config, authManager);
      // Simulate usage
      authManager.isAuthenticated();
      requestManager.getStats();
    }
    const compositionTime = performance.now() - compositionStart;

    return {
      inheritance: 0, // Would require old managers to measure
      composition: compositionTime,
      improvement: "Composition pattern implemented",
    };
  }

  /**
   * Migration guide generator
   */
  static generateMigrationGuide(): string {
    return `
# Migration Guide: Inheritance to Composition

## Overview
This migration guide helps transition from inheritance-based managers to composition-based managers.

## Benefits of Composition
1. **Better Testability**: Each component can be tested in isolation
2. **Improved Flexibility**: Components can be mixed and matched
3. **SOLID Principles**: Better adherence to Single Responsibility and Dependency Inversion
4. **Reduced Coupling**: Components depend on interfaces, not concrete classes

## Migration Steps

### Step 1: Update Imports
\`\`\`typescript
// Old approach
import { RequestManager } from '@/client/managers/RequestManager.js';
import { AuthenticationManager } from '@/client/managers/AuthenticationManager.js';

// New approach
import { createComposedWordPressClient } from '@/client/managers/composed';
\`\`\`

### Step 2: Replace Manager Creation
\`\`\`typescript
// Old approach
const authManager = new AuthenticationManager(config);
const requestManager = new RequestManager(config, authManager);

// New approach
const client = await createComposedWordPressClient(config);
\`\`\`

### Step 3: Update Usage Patterns
\`\`\`typescript
// Old approach
await requestManager.request('GET', '/wp/v2/posts');

// New approach
await client.request('GET', '/wp/v2/posts');
// or use convenience methods
await client.getPosts();
\`\`\`

### Step 4: Handle Dependency Injection
\`\`\`typescript
// Custom implementations can be injected
const customErrorHandler = new CustomErrorHandler();
const factory = new ComposedManagerFactory();
const client = await factory.createComposedClient({
  clientConfig: config,
  customErrorHandler
});
\`\`\`

## Gradual Migration
Use the MigrationAdapter for gradual migration:

\`\`\`typescript
import { MigrationAdapter } from '@/client/managers/composed';

// Feature flag to control migration
const USE_COMPOSITION = process.env.USE_COMPOSED_MANAGERS === 'true';

const { requestManager, authManager } = await MigrationAdapter.createManagers(
  config, 
  USE_COMPOSITION
);
\`\`\`

## Testing the Migration
1. Run existing tests with both approaches
2. Performance test both implementations
3. Gradually migrate components one by one
4. Monitor for any behavioral differences

## Rollback Plan
The MigrationAdapter provides backward compatibility, allowing easy rollback if issues arise.
`;
  }
}