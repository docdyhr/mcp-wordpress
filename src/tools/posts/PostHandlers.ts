/**
 * WordPress Posts Handler Implementation
 *
 * Implements all handler methods for WordPress post management tools.
 * This module contains the business logic for post operations including
 * validation, API interaction, and response formatting.
 */

import { WordPressClient } from "@/client/api.js";
import { CreatePostRequest, PostQueryParams, UpdatePostRequest, WordPressPost } from "@/types/wordpress.js";
import { getErrorMessage } from "@/utils/error.js";
import { ErrorHandlers } from "@/utils/enhancedError.js";
import { validateId, validatePaginationParams, validatePostParams } from "@/utils/validation.js";
import { sanitizeHtml } from "@/utils/validation/security.js";
import { WordPressDataStreamer, StreamingUtils, StreamingResult } from "@/utils/streaming.js";

/**
 * Handles listing WordPress posts with advanced filtering and pagination
 */
export async function handleListPosts(
  client: WordPressClient,
  params: PostQueryParams,
): Promise<WordPressPost[] | string> {
  try {
    // Enhanced input validation and sanitization
    const paginationValidated = validatePaginationParams({
      page: params.page,
      per_page: params.per_page,
      offset: params.offset,
    });

    const sanitizedParams = {
      ...params,
      ...paginationValidated,
    };

    // Validate and sanitize search term
    if (sanitizedParams.search) {
      sanitizedParams.search = sanitizedParams.search.trim();
      if (sanitizedParams.search.length === 0) {
        delete sanitizedParams.search;
      }
    }

    // Validate category and tag IDs if provided
    if (sanitizedParams.categories) {
      sanitizedParams.categories = sanitizedParams.categories.map((id) => validateId(id, "category ID"));
    }

    if (sanitizedParams.tags) {
      sanitizedParams.tags = sanitizedParams.tags.map((id) => validateId(id, "tag ID"));
    }

    // Validate status parameter
    if (sanitizedParams.status) {
      const validStatuses = ["publish", "future", "draft", "pending", "private"];
      const statusesToCheck = Array.isArray(sanitizedParams.status) ? sanitizedParams.status : [sanitizedParams.status];

      for (const statusToCheck of statusesToCheck) {
        if (!validStatuses.includes(statusToCheck)) {
          throw ErrorHandlers.validationError("status", statusToCheck, "one of: " + validStatuses.join(", "));
        }
      }
    }

    // Performance optimization: set reasonable defaults
    if (!sanitizedParams.per_page) {
      sanitizedParams.per_page = 10; // Default to 10 posts for better performance
    }

    const posts = await client.getPosts(sanitizedParams);
    if (posts.length === 0) {
      const searchInfo = sanitizedParams.search ? ` matching "${sanitizedParams.search}"` : "";
      const statusInfo = sanitizedParams.status ? ` with status "${sanitizedParams.status}"` : "";
      return `No posts found${searchInfo}${statusInfo}. Try adjusting your search criteria or check if posts exist.`;
    }

    // Use streaming for large result sets (>50 posts)
    if (posts.length > 50) {
      const streamResults: StreamingResult<unknown>[] = [];

      for await (const result of WordPressDataStreamer.streamPosts(posts, {
        includeAuthor: true,
        includeCategories: true,
        includeTags: true,
        batchSize: 20,
      })) {
        streamResults.push(result);
      }

      return StreamingUtils.formatStreamingResponse(streamResults, "posts");
    }

    // Add comprehensive site context information
    const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "Unknown site";
    const totalPosts = posts.length;
    const statusCounts = posts.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Enhanced metadata
    const metadata = [
      `📊 **Posts Summary**: ${totalPosts} total`,
      `📝 **Status Breakdown**: ${Object.entries(statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(", ")}`,
      `🌐 **Source**: ${siteUrl}`,
      `📅 **Retrieved**: ${new Date().toLocaleString()}`,
      ...(params.search ? [`🔍 **Search Term**: "${params.search}"`] : []),
      ...(params.categories ? [`📁 **Categories**: ${params.categories.join(", ")}`] : []),
      ...(params.tags ? [`🏷️ **Tags**: ${params.tags.join(", ")}`] : []),
    ];

    // Fetch additional metadata for enhanced responses
    const authorIds = [...new Set(posts.map((p) => p.author).filter(Boolean))];
    const categoryIds = [...new Set(posts.flatMap((p) => p.categories || []))];
    const tagIds = [...new Set(posts.flatMap((p) => p.tags || []))];

    // Fetch authors, categories, and tags in parallel for better performance
    const [authors, categories, tags] = await Promise.all([
      authorIds.length > 0
        ? Promise.all(
            authorIds.map(async (id) => {
              try {
                const user = await client.getUser(id);
                return { id, name: user.name || user.username || `User ${id}` };
              } catch {
                return { id, name: `User ${id}` };
              }
            }),
          )
        : [],
      categoryIds.length > 0
        ? Promise.all(
            categoryIds.map(async (id) => {
              try {
                const category = await client.getCategory(id);
                return { id, name: category.name || `Category ${id}` };
              } catch {
                return { id, name: `Category ${id}` };
              }
            }),
          )
        : [],
      tagIds.length > 0
        ? Promise.all(
            tagIds.map(async (id) => {
              try {
                const tag = await client.getTag(id);
                return { id, name: tag.name || `Tag ${id}` };
              } catch {
                return { id, name: `Tag ${id}` };
              }
            }),
          )
        : [],
    ]);

    // Create lookup maps for performance
    const authorMap = new Map(authors.map((a) => [a.id, a.name]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));

    const content =
      metadata.join("\n") +
      "\n\n" +
      posts
        .map((p) => {
          const date = new Date(p.date);
          const formattedDate = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const excerpt = p.excerpt?.rendered ? sanitizeHtml(p.excerpt.rendered).substring(0, 80) + "..." : "";

          // Enhanced metadata
          const authorName = authorMap.get(p.author) || `User ${p.author}`;
          const postCategories = (p.categories || []).map((id) => categoryMap.get(id) || `Category ${id}`);
          const postTags = (p.tags || []).map((id) => tagMap.get(id) || `Tag ${id}`);

          let postInfo = `- ID ${p.id}: **${p.title.rendered}** (${p.status})\n`;
          postInfo += `  👤 Author: ${authorName}\n`;
          postInfo += `  📅 Published: ${formattedDate}\n`;
          if (postCategories.length > 0) {
            postInfo += `  📁 Categories: ${postCategories.join(", ")}\n`;
          }
          if (postTags.length > 0) {
            postInfo += `  🏷️ Tags: ${postTags.join(", ")}\n`;
          }
          if (excerpt) {
            postInfo += `  📝 Excerpt: ${excerpt}\n`;
          }
          postInfo += `  🔗 Link: ${p.link}`;

          return postInfo;
        })
        .join("\n\n");

    // Add pagination guidance for large result sets
    let finalContent = content;
    if (posts.length >= (sanitizedParams.per_page || 10)) {
      finalContent += `\n\n📄 **Pagination Tip**: Use \`per_page\` parameter to control results (max 100). Current: ${sanitizedParams.per_page || 10}`;
    }

    return finalContent;
  } catch (_error) {
    throw new Error(`Failed to list posts: ${getErrorMessage(_error)}`);
  }
}

/**
 * Handles retrieving a single WordPress post by ID
 */
export async function handleGetPost(client: WordPressClient, params: { id: number }): Promise<WordPressPost | string> {
  try {
    const postId = validateId(params.id, "post ID");
    const post = await client.getPost(postId);

    // Get additional metadata for comprehensive response
    const [author, categories, tags] = await Promise.all([
      // Get author information
      post.author
        ? client.getUser(post.author).catch(() => ({ name: `User ${post.author}`, username: `user${post.author}` }))
        : null,
      // Get categories
      post.categories && post.categories.length > 0
        ? Promise.all(post.categories.map((id) => client.getCategory(id).catch(() => ({ id, name: `Category ${id}` }))))
        : [],
      // Get tags
      post.tags && post.tags.length > 0
        ? Promise.all(post.tags.map((id) => client.getTag(id).catch(() => ({ id, name: `Tag ${id}` }))))
        : [],
    ]);

    // Format post content
    const date = new Date(post.date);
    const modifiedDate = new Date(post.modified);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedModified = modifiedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const content = post.content?.rendered || "";
    const excerpt = post.excerpt?.rendered ? sanitizeHtml(post.excerpt.rendered).trim() : "";
    const wordCount = sanitizeHtml(content).split(/\s+/).filter(Boolean).length;

    // Build comprehensive response
    let response = `# ${post.title.rendered}\n\n`;
    response += `**Post ID**: ${post.id}\n`;
    response += `**Status**: ${post.status}\n`;
    response += `**Author**: ${author?.name || author?.username || `User ${post.author}`}\n`;
    response += `**Published**: ${formattedDate}\n`;
    response += `**Modified**: ${formattedModified}\n`;

    if (categories.length > 0) {
      response += `**Categories**: ${categories.map((c) => c.name).join(", ")}\n`;
    }

    if (tags.length > 0) {
      response += `**Tags**: ${tags.map((t) => t.name).join(", ")}\n`;
    }

    response += `**Word Count**: ${wordCount}\n`;
    response += `**Link**: ${post.link}\n`;

    if (excerpt) {
      response += `\n## Excerpt\n${excerpt}\n`;
    }

    if (content) {
      response += `\n## Content\n${content}\n`;
    }

    // Add management links and metadata
    const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "";
    if (siteUrl) {
      response += `\n## Management\n`;
      response += `- **Edit**: ${siteUrl}/wp-admin/post.php?post=${post.id}&action=edit\n`;
      response += `- **Preview**: ${siteUrl}/?p=${post.id}&preview=true\n`;
    }

    return response;
  } catch (_error) {
    if (_error instanceof Error && _error.message.includes("404")) {
      return `Post with ID ${params.id} not found. Please verify the ID and try again.`;
    }
    throw new Error(`Failed to get post: ${getErrorMessage(_error)}`);
  }
}

/**
 * Handles creating a new WordPress post
 */
export async function handleCreatePost(
  client: WordPressClient,
  params: CreatePostRequest,
): Promise<WordPressPost | string> {
  try {
    validatePostParams(params);
    const post = await client.createPost(params);

    // Build success response with management links
    let response = `✅ **Post Created Successfully**\n\n`;
    response += `**Title**: ${post.title.rendered}\n`;
    response += `**ID**: ${post.id}\n`;
    response += `**Status**: ${post.status}\n`;
    response += `**Link**: ${post.link}\n`;

    // Add management links
    const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "";
    if (siteUrl) {
      response += `\n**Management**:\n`;
      response += `- Edit: ${siteUrl}/wp-admin/post.php?post=${post.id}&action=edit\n`;
      if (post.status === "publish") {
        response += `- View: ${post.link}\n`;
      } else {
        response += `- Preview: ${siteUrl}/?p=${post.id}&preview=true\n`;
      }
    }

    return response;
  } catch (_error) {
    throw new Error(`Failed to create post: ${getErrorMessage(_error)}`);
  }
}

/**
 * Handles updating an existing WordPress post
 */
export async function handleUpdatePost(
  client: WordPressClient,
  params: UpdatePostRequest & { id: number },
): Promise<WordPressPost | string> {
  try {
    const postId = validateId(params.id, "post ID");

    // Get original post to show what changed
    const originalPost = await client.getPost(postId);

    const { id: _id, ...updateData } = params;
    validatePostParams(updateData);

    const updatedPost = await client.updatePost({ id: postId, ...updateData });

    // Build change summary
    let response = `✅ **Post Updated Successfully**\n\n`;
    response += `**Title**: ${updatedPost.title.rendered}\n`;
    response += `**ID**: ${updatedPost.id}\n`;
    response += `**Status**: ${updatedPost.status}\n`;
    response += `**Modified**: ${new Date(updatedPost.modified).toLocaleString()}\n`;

    // Show what changed
    const changes: string[] = [];
    if (params.title && originalPost.title.rendered !== updatedPost.title.rendered) {
      changes.push(`Title: "${originalPost.title.rendered}" → "${updatedPost.title.rendered}"`);
    }
    if (params.status && originalPost.status !== updatedPost.status) {
      changes.push(`Status: "${originalPost.status}" → "${updatedPost.status}"`);
    }
    if (params.content && originalPost.content?.rendered !== updatedPost.content?.rendered) {
      changes.push("Content updated");
    }
    if (params.excerpt && originalPost.excerpt?.rendered !== updatedPost.excerpt?.rendered) {
      changes.push("Excerpt updated");
    }

    if (changes.length > 0) {
      response += `\n**Changes Made**:\n${changes.map((c) => `- ${c}`).join("\n")}\n`;
    }

    response += `\n**Link**: ${updatedPost.link}`;

    return response;
  } catch (_error) {
    if (_error instanceof Error && _error.message.includes("404")) {
      return `Post with ID ${params.id} not found. Please verify the ID and try again.`;
    }
    throw new Error(`Failed to update post: ${getErrorMessage(_error)}`);
  }
}

/**
 * Handles deleting a WordPress post
 */
export async function handleDeletePost(
  client: WordPressClient,
  params: { id: number; force?: boolean },
): Promise<{ deleted: boolean; previous?: WordPressPost } | string> {
  try {
    const postId = validateId(params.id, "post ID");
    const result = await client.deletePost(postId, params.force);

    if (result.deleted) {
      const action = params.force ? "permanently deleted" : "moved to trash";
      let response = `✅ **Post ${action} successfully**\n\n`;

      if (result.previous) {
        response += `**Title**: ${result.previous.title.rendered}\n`;
        response += `**ID**: ${result.previous.id}\n`;
      }

      if (!params.force) {
        response += `\n**Note**: Post moved to trash. Use \`force=true\` to permanently delete.`;
      }

      return response;
    } else {
      return `Failed to delete post with ID ${params.id}. It may not exist or you may not have permission.`;
    }
  } catch (_error) {
    if (_error instanceof Error && _error.message.includes("404")) {
      return `Post with ID ${params.id} not found. Please verify the ID and try again.`;
    }
    throw new Error(`Failed to delete post: ${getErrorMessage(_error)}`);
  }
}

/**
 * Handles retrieving post revisions
 */
export async function handleGetPostRevisions(
  client: WordPressClient,
  params: { id: number },
): Promise<WordPressPost[] | string> {
  try {
    const postId = validateId(params.id, "post ID");
    const revisions = await client.getPostRevisions(postId);

    if (revisions.length === 0) {
      return `No revisions found for post ${params.id}. This may be because revisions are disabled or the post has no revision history.`;
    }

    let response = `📚 **Post Revisions** (${revisions.length} total)\n\n`;

    revisions.forEach((revision, index) => {
      const date = new Date(revision.date);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      response += `**Revision ${index + 1}**\n`;
      response += `- ID: ${revision.id}\n`;
      response += `- Date: ${formattedDate}\n`;
      response += `- Title: ${revision.title.rendered}\n`;
      if (index < revisions.length - 1) response += "\n";
    });

    return response;
  } catch (_error) {
    if (_error instanceof Error && _error.message.includes("404")) {
      return `Post with ID ${params.id} not found. Please verify the ID and try again.`;
    }
    throw new Error(`Failed to get post revisions: ${getErrorMessage(_error)}`);
  }
}
