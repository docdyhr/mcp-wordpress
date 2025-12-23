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
  ManagerCompositionConfig,
} from "@/client/managers/interfaces/ManagerInterfaces.js";

// Implementations
export { ConfigurationProviderImpl } from "@/client/managers/implementations/ConfigurationProviderImpl.js";
export { ErrorHandlerImpl } from "@/client/managers/implementations/ErrorHandlerImpl.js";
export { ParameterValidatorImpl } from "@/client/managers/implementations/ParameterValidatorImpl.js";

// Composed Managers
export { ComposedAuthenticationManager } from "@/client/managers/ComposedAuthenticationManager.js";
export { ComposedRequestManager } from "@/client/managers/ComposedRequestManager.js";

// Factory and Client
export {
  ComposedManagerFactory,
  ComposedWordPressClient,
  createComposedWordPressClient,
  type ComposedWordPressClientDependencies,
} from "@/client/managers/ComposedManagerFactory.js";

// Migration utilities (for gradual migration from inheritance to composition)
export { MigrationAdapter } from "./MigrationAdapter.js";
