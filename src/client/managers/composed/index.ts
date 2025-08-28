/**
 * Composed Managers Export
 * 
 * This module provides composition-based alternatives to the inheritance-based managers.
 * The composed managers offer better testability, flexibility, and adherence to SOLID principles.
 * 
 * Usage:
 * ```typescript
 * import { createComposedWordPressClient } from '@/client/managers/composed';
 * 
 * const client = await createComposedWordPressClient(config);
 * const posts = await client.getPosts();
 * ```
 */

// Interfaces
export type {
  ConfigurationProvider,
  ErrorHandler,
  ParameterValidator,
  AuthenticationProvider,
  RequestHandler,
  BaseManagerContract,
  ComposedManager,
  ManagerFactory,
  ManagerCompositionConfig
} from "../interfaces/ManagerInterfaces.js";

// Implementations
export { ConfigurationProviderImpl } from "../implementations/ConfigurationProviderImpl.js";
export { ErrorHandlerImpl } from "../implementations/ErrorHandlerImpl.js";
export { ParameterValidatorImpl } from "../implementations/ParameterValidatorImpl.js";

// Composed Managers
export { ComposedAuthenticationManager } from "../ComposedAuthenticationManager.js";
export { ComposedRequestManager } from "../ComposedRequestManager.js";

// Factory and Client
export { 
  ComposedManagerFactory,
  ComposedWordPressClient,
  createComposedWordPressClient,
  type ComposedWordPressClientDependencies
} from "../ComposedManagerFactory.js";

// Migration utilities (for gradual migration from inheritance to composition)
export { MigrationAdapter } from "./MigrationAdapter.js";