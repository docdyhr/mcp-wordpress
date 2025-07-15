import { EvalFunction, grade } from 'mcp-evals';
import { openai } from 'mcp-evals/models';

/**
 * Critical WordPress MCP Tools Evaluations
 * These evaluations test the most important tools with comprehensive scenarios
 */

// Helper function to create consistent evaluation structure
const createEval = (
  name: string,
  description: string,
  prompt: string,
  expectedTools: string[],
  successCriteria: string[]
): EvalFunction => ({
  name,
  description,
  run: async () => {
    const systemPrompt = `
You are evaluating an MCP server's WordPress tools. 
Expected tools to be used: ${expectedTools.join(', ')}
Success criteria:
${successCriteria.map(c => `- ${c}`).join('\n')}

Evaluate the response based on:
1. Accuracy (1-5): Did it use the correct tools and perform the task accurately?
2. Completeness (1-5): Did it fully complete the requested task?
3. Relevance (1-5): Was the response relevant to the request?
4. Clarity (1-5): Was the output clear and well-structured?
5. Reasoning (1-5): Did it handle edge cases and potential errors well?

Provide an overall_comments field explaining your scores.
`;

    const result = await grade(
      openai("gpt-4o", { temperature: 0.3 }),
      prompt,
      {
        systemPrompt,
        responseFormat: {
          type: "json_object",
          schema: {
            accuracy: "number",
            completeness: "number",
            relevance: "number",
            clarity: "number",
            reasoning: "number",
            overall_comments: "string"
          }
        }
      }
    );

    return JSON.parse(result);
  }
});

// Critical Post Management Evaluations
export const postCreationWithSEO = createEval(
  'post_creation_with_seo',
  'Test comprehensive post creation with SEO optimization',
  'Create a detailed blog post about "WordPress Security Best Practices" with proper formatting, categories, tags, and SEO metadata',
  ['wp_create_post', 'wp_create_category', 'wp_create_tag'],
  [
    'Creates post with appropriate title and content',
    'Adds relevant categories and tags',
    'Includes SEO-friendly formatting',
    'Handles metadata properly'
  ]
);

export const bulkPostManagement = createEval(
  'bulk_post_management',
  'Test bulk operations on multiple posts',
  'Find all draft posts from the last 6 months and update their status to published if they have more than 500 words',
  ['wp_list_posts', 'wp_get_post', 'wp_update_post'],
  [
    'Correctly filters posts by status and date',
    'Evaluates word count accurately',
    'Updates only qualifying posts',
    'Reports summary of changes'
  ]
);

// Critical Media Operations
export const mediaUploadWithOptimization = createEval(
  'media_upload_optimization',
  'Test media upload with metadata and optimization',
  'Upload a new image for a blog post header, set appropriate alt text, title, and caption for SEO',
  ['wp_upload_media', 'wp_update_media'],
  [
    'Uploads media successfully',
    'Sets all metadata fields',
    'Provides SEO-friendly descriptions',
    'Returns media URL and ID'
  ]
);

export const mediaCleanup = createEval(
  'media_cleanup',
  'Test identification and cleanup of unused media',
  'Find all unattached media files older than 3 months and create a cleanup report',
  ['wp_list_media', 'wp_get_media'],
  [
    'Identifies unattached media correctly',
    'Filters by date appropriately',
    'Calculates total space usage',
    'Provides actionable cleanup plan'
  ]
);

// Critical User Management
export const userRoleManagement = createEval(
  'user_role_management',
  'Test user creation and role assignment',
  'Create a new contributor user and then upgrade them to author after verification',
  ['wp_create_user', 'wp_get_user', 'wp_update_user'],
  [
    'Creates user with initial role',
    'Verifies user creation',
    'Updates role correctly',
    'Handles permissions properly'
  ]
);

export const userAudit = createEval(
  'user_security_audit',
  'Test user security audit capabilities',
  'List all administrator users and check for any that haven\'t logged in recently or have weak usernames',
  ['wp_list_users', 'wp_get_user'],
  [
    'Filters administrators correctly',
    'Identifies security concerns',
    'Provides security recommendations',
    'Handles user data sensitively'
  ]
);

// Critical Comment Management
export const commentModerationWorkflow = createEval(
  'comment_moderation_workflow',
  'Test complete comment moderation workflow',
  'Review all pending comments, approve legitimate ones, mark obvious spam, and delete any with prohibited content',
  ['wp_list_comments', 'wp_approve_comment', 'wp_spam_comment', 'wp_delete_comment'],
  [
    'Identifies all pending comments',
    'Makes appropriate moderation decisions',
    'Handles different comment types',
    'Provides moderation summary'
  ]
);

// Critical Site Management
export const siteHealthCheck = createEval(
  'site_health_check',
  'Test comprehensive site health evaluation',
  'Perform a complete site health check including performance metrics, cache status, and identify any issues',
  ['wp_get_site_settings', 'wp_performance_stats', 'wp_cache_stats', 'wp_performance_alerts'],
  [
    'Retrieves all relevant metrics',
    'Identifies performance issues',
    'Checks cache effectiveness',
    'Provides actionable recommendations'
  ]
);

// Critical Authentication Tests
export const authenticationVerification = createEval(
  'auth_verification',
  'Test authentication and permission verification',
  'Verify current authentication status, check what permissions I have, and test if I can perform admin operations',
  ['wp_test_auth', 'wp_get_current_user', 'wp_get_auth_status'],
  [
    'Confirms authentication works',
    'Lists user capabilities',
    'Identifies permission limitations',
    'Handles auth errors gracefully'
  ]
);

// Complex Workflow Evaluations
export const contentPublishingPipeline = createEval(
  'content_publishing_pipeline',
  'Test complete content publishing workflow',
  'Create a new blog post with images, assign categories and tags, and schedule it for publication tomorrow',
  ['wp_create_post', 'wp_upload_media', 'wp_create_category', 'wp_create_tag', 'wp_update_post'],
  [
    'Creates post with all elements',
    'Uploads and attaches media',
    'Sets taxonomies correctly',
    'Schedules publication properly'
  ]
);

export const siteMaintenanceWorkflow = createEval(
  'site_maintenance_workflow',
  'Test comprehensive site maintenance tasks',
  'Perform site maintenance: clear cache, check for large media files, review user permissions, and generate a maintenance report',
  ['wp_cache_clear', 'wp_list_media', 'wp_list_users', 'wp_performance_stats'],
  [
    'Completes all maintenance tasks',
    'Identifies potential issues',
    'Generates comprehensive report',
    'Provides maintenance recommendations'
  ]
);

// Error Handling Evaluations
export const errorRecovery = createEval(
  'error_recovery',
  'Test error handling and recovery',
  'Try to update a non-existent post, then handle the error appropriately and suggest alternatives',
  ['wp_update_post', 'wp_list_posts'],
  [
    'Handles 404 error gracefully',
    'Provides meaningful error message',
    'Suggests alternative actions',
    'Recovers and continues operation'
  ]
);

export const permissionHandling = createEval(
  'permission_handling',
  'Test permission denial handling',
  'Attempt to perform an admin-only operation and handle permission denial appropriately',
  ['wp_update_site_settings'],
  [
    'Recognizes permission error',
    'Explains permission requirements',
    'Suggests appropriate alternatives',
    'Maintains system stability'
  ]
);

// Performance Evaluations
export const highVolumeOperations = createEval(
  'high_volume_operations',
  'Test handling of high-volume operations',
  'List the 100 most recent posts with their metadata and generate a summary report',
  ['wp_list_posts', 'wp_get_post'],
  [
    'Handles pagination correctly',
    'Manages API rate limits',
    'Completes operation efficiently',
    'Provides accurate summary'
  ]
);

export const cacheEffectiveness = createEval(
  'cache_effectiveness',
  'Test cache performance and optimization',
  'Check cache statistics, warm the cache for critical endpoints, and verify performance improvement',
  ['wp_cache_stats', 'wp_cache_warm', 'wp_performance_stats'],
  [
    'Retrieves accurate cache stats',
    'Warms cache appropriately',
    'Measures performance impact',
    'Optimizes cache configuration'
  ]
);

// Export all evaluations
export const criticalEvaluations = [
  postCreationWithSEO,
  bulkPostManagement,
  mediaUploadWithOptimization,
  mediaCleanup,
  userRoleManagement,
  userAudit,
  commentModerationWorkflow,
  siteHealthCheck,
  authenticationVerification,
  contentPublishingPipeline,
  siteMaintenanceWorkflow,
  errorRecovery,
  permissionHandling,
  highVolumeOperations,
  cacheEffectiveness
];

// Default export for the evaluation runner
export default criticalEvaluations;