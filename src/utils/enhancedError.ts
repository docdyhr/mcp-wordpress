import { getErrorMessage } from "./error.js";

export interface ErrorContext {
  operation: string;
  parameters?: Record<string, any>;
  suggestions?: string[];
  troubleshooting?: string[];
}

/**
 * Enhanced error handling with helpful messages and suggestions
 */
export class EnhancedError extends Error {
  public suggestions: string[];
  public troubleshooting: string[];
  public context: ErrorContext;

  constructor(message: string, context: ErrorContext) {
    super(message);
    this.name = "EnhancedError";
    this.context = context;
    this.suggestions = context.suggestions || [];
    this.troubleshooting = context.troubleshooting || [];
  }

  /**
   * Format error message with suggestions
   */
  toString(): string {
    let message = `❌ ${this.message}`;

    if (this.suggestions.length > 0) {
      message += `\n\n💡 **Suggestions:**\n`;
      this.suggestions.forEach((suggestion) => {
        message += `• ${suggestion}\n`;
      });
    }

    if (this.troubleshooting.length > 0) {
      message += `\n🔧 **Troubleshooting:**\n`;
      this.troubleshooting.forEach((step) => {
        message += `• ${step}\n`;
      });
    }

    return message;
  }
}

/**
 * Common error handlers with context-aware suggestions
 */
export class ErrorHandlers {
  /**
   * Handle post not found errors
   */
  static postNotFound(postId: number, originalError: any): EnhancedError {
    const errorMessage = getErrorMessage(originalError);

    return new EnhancedError(`Post with ID ${postId} not found`, {
      operation: "get_post",
      parameters: { postId },
      suggestions: [
        "Check if the post ID is correct",
        "Verify the post exists and is published",
        "Try listing posts first with wp_list_posts to see available posts",
        "Check if you have permission to view this post",
      ],
      troubleshooting: [
        "Use wp_list_posts to see all available posts",
        "Check the post status - it might be draft, private, or trashed",
        "Verify your user permissions for viewing posts",
        `Original error: ${errorMessage}`,
      ],
    });
  }

  /**
   * Handle authentication errors
   */
  static authenticationFailed(originalError: any): EnhancedError {
    const errorMessage = getErrorMessage(originalError);

    return new EnhancedError("Authentication failed", {
      operation: "authenticate",
      suggestions: [
        "Check your WordPress credentials (username and app password)",
        "Verify the WordPress site URL is correct",
        "Ensure application passwords are enabled on your WordPress site",
        "Try regenerating your application password",
      ],
      troubleshooting: [
        "Go to your WordPress admin → Users → Profile → Application Passwords",
        "Create a new application password with a descriptive name",
        "Make sure the WordPress site URL ends with wp-json/wp/v2",
        "Check if your site has any security plugins blocking REST API",
        `Original error: ${errorMessage}`,
      ],
    });
  }

  /**
   * Handle site parameter missing errors
   */
  static siteParameterMissing(availableSites: string[]): EnhancedError {
    return new EnhancedError("Multiple sites configured - site parameter required", {
      operation: "site_selection",
      suggestions: [
        "Add --site parameter to specify which site to use",
        `Available sites: ${availableSites.join(", ")}`,
        'Example: wp_list_posts --site="your-site-id"',
      ],
      troubleshooting: [
        "Check your mcp-wordpress.config.json for configured sites",
        "Use the site ID from your configuration file",
        "Site IDs are defined in the 'id' field of each site config",
      ],
    });
  }

  /**
   * Handle site not found errors
   */
  static siteNotFound(siteId: string, availableSites: string[]): EnhancedError {
    return new EnhancedError(`Site with ID '${siteId}' not found`, {
      operation: "site_selection",
      parameters: { siteId },
      suggestions: [
        `Available sites: ${availableSites.join(", ")}`,
        "Check the spelling of the site ID",
        "Verify the site is configured in mcp-wordpress.config.json",
      ],
      troubleshooting: [
        "Open mcp-wordpress.config.json to see configured sites",
        "Check the 'id' field for each site configuration",
        "Ensure the site ID matches exactly (case-sensitive)",
      ],
    });
  }

  /**
   * Handle permission errors
   */
  static permissionDenied(operation: string, originalError: any): EnhancedError {
    const errorMessage = getErrorMessage(originalError);

    return new EnhancedError(`Permission denied for ${operation}`, {
      operation,
      suggestions: [
        "Check if your user has the required permissions",
        "Verify you're logged in with the correct user account",
        "Contact your WordPress administrator for permission changes",
      ],
      troubleshooting: [
        "Check your user role in WordPress admin → Users",
        "Verify the required capabilities for this operation",
        "Try using an administrator account",
        `Original error: ${errorMessage}`,
      ],
    });
  }

  /**
   * Handle network/connection errors
   */
  static connectionError(originalError: any): EnhancedError {
    const errorMessage = getErrorMessage(originalError);

    return new EnhancedError("Failed to connect to WordPress site", {
      operation: "connection",
      suggestions: [
        "Check your internet connection",
        "Verify the WordPress site URL is correct and accessible",
        "Check if the site is temporarily down",
      ],
      troubleshooting: [
        "Try accessing the site in your browser",
        "Check if the REST API is enabled: visit yoursite.com/wp-json/",
        "Verify there are no firewall or security plugins blocking access",
        `Original error: ${errorMessage}`,
      ],
    });
  }

  /**
   * Handle validation errors
   */
  static validationError(field: string, value: any, expectedType: string): EnhancedError {
    return new EnhancedError(`Invalid ${field}: expected ${expectedType}, got ${typeof value}`, {
      operation: "validation",
      parameters: { field, value, expectedType },
      suggestions: [
        `Provide a valid ${expectedType} for ${field}`,
        "Check the parameter format and type",
        "Refer to the tool documentation for correct parameter format",
      ],
      troubleshooting: [
        "Review the tool's parameter requirements",
        "Check for typos in parameter names",
        "Ensure parameter values match the expected type",
      ],
    });
  }

  /**
   * Handle rate limiting errors
   */
  static rateLimitExceeded(originalError: any): EnhancedError {
    const errorMessage = getErrorMessage(originalError);

    return new EnhancedError("Rate limit exceeded", {
      operation: "rate_limit",
      suggestions: [
        "Wait a few minutes before trying again",
        "Reduce the frequency of requests",
        "Use pagination for large operations",
      ],
      troubleshooting: [
        "Check your WordPress hosting plan limits",
        "Consider upgrading your hosting plan for higher limits",
        "Implement delays between requests",
        `Original error: ${errorMessage}`,
      ],
    });
  }

  /**
   * Generic error handler with basic suggestions
   */
  static generic(operation: string, originalError: any): EnhancedError {
    const errorMessage = getErrorMessage(originalError);

    return new EnhancedError(`Failed to ${operation}`, {
      operation,
      suggestions: [
        "Check your WordPress credentials and permissions",
        "Verify the site is accessible and functioning",
        "Try the operation again after a brief wait",
      ],
      troubleshooting: [
        "Test your connection with a simpler operation first",
        "Check WordPress admin for any issues",
        "Review the WordPress error logs",
        `Original error: ${errorMessage}`,
      ],
    });
  }
}
