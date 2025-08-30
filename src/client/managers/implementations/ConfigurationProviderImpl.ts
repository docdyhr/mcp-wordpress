/**
 * Configuration Provider Implementation
 * Provides centralized configuration management for managers
 */

import type { WordPressClientConfig } from "@/types/client.js";
import type { ConfigurationProvider } from "../interfaces/ManagerInterfaces.js";

export class ConfigurationProviderImpl implements ConfigurationProvider {
  public readonly config: WordPressClientConfig;

  constructor(config: WordPressClientConfig) {
    // Create defensive copy to prevent external mutation
    this.config = Object.freeze({ ...config });
  }

  /**
   * Get configuration value by path (dot notation)
   */
  getConfigValue<T = unknown>(path: string, defaultValue?: T): T | undefined {
    return (
      (path.split(".").reduce((obj, key) => (obj as Record<string, unknown>)?.[key], this.config as unknown) as T) ??
      defaultValue
    );
  }

  /**
   * Validate configuration completeness
   */
  validateConfiguration(): void {
    const required = ["baseUrl", "auth"];
    const missing = required.filter((field) => !this.config[field as keyof WordPressClientConfig]);

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(", ")}`);
    }
  }

  /**
   * Get timeout value with fallbacks
   */
  getTimeout(): number {
    return this.config.timeout || 30000;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return Boolean((this.config as unknown as Record<string, unknown>).debug);
  }
}
