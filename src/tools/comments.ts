/**
 * WordPress Comments Tools
 */

import type { MCPTool, MCPToolHandlerWithClient } from '../types/mcp.js';
import type { IWordPressClient, WordPressComment, CommentQueryParams, CreateCommentRequest, UpdateCommentRequest } from '../types/index.js';
import { startTimer } from '../utils/debug.js';

interface ListCommentsArgs extends CommentQueryParams {}
interface GetCommentArgs { id: number; context?: 'view' | 'embed' | 'edit'; }
interface CreateCommentArgs extends CreateCommentRequest {}
interface UpdateCommentArgs extends UpdateCommentRequest {}
interface DeleteCommentArgs { id: number; force?: boolean; }
interface ApproveCommentArgs { id: number; }
interface SpamCommentArgs { id: number; }

const createSuccessResponse = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: false as const });
const createErrorResponse = (error: string | Error) => ({ content: [{ type: 'text' as const, text: typeof error === 'string' ? error : error.message }], isError: true as const });

export const listComments: MCPTool = {
  name: 'wp_list_comments',
  description: 'List WordPress comments with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      post: { type: 'array', items: { type: 'number' }, description: 'Filter by post IDs' },
      status: { type: 'string', description: 'Comment status filter' },
      author_email: { type: 'string', description: 'Filter by author email' }
    }
  }
};

export const getComment: MCPTool = {
  name: 'wp_get_comment',
  description: 'Get a specific WordPress comment by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Comment ID', minimum: 1 },
      context: { type: 'string', enum: ['view', 'embed', 'edit'] }
    },
    required: ['id']
  }
};

export const createComment: MCPTool = {
  name: 'wp_create_comment',
  description: 'Create a new WordPress comment',
  inputSchema: {
    type: 'object',
    properties: {
      post: { type: 'number', description: 'Post ID', minimum: 1 },
      content: { type: 'string', description: 'Comment content in HTML format (WordPress-compatible HTML markup is preferred)' },
      author_name: { type: 'string', description: 'Author name' },
      author_email: { type: 'string', description: 'Author email' },
      parent: { type: 'number', description: 'Parent comment ID' }
    },
    required: ['post', 'content']
  }
};

export const updateComment: MCPTool = {
  name: 'wp_update_comment',
  description: 'Update an existing WordPress comment',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Comment ID', minimum: 1 },
      content: { type: 'string', description: 'Comment content in HTML format (WordPress-compatible HTML markup is preferred)' },
      status: { type: 'string', enum: ['approved', 'unapproved', 'spam'] }
    },
    required: ['id']
  }
};

export const deleteComment: MCPTool = {
  name: 'wp_delete_comment',
  description: 'Delete a WordPress comment',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Comment ID', minimum: 1 },
      force: { type: 'boolean', description: 'Force permanent deletion' }
    },
    required: ['id']
  }
};

export const approveComment: MCPTool = {
  name: 'wp_approve_comment',
  description: 'Approve a WordPress comment',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Comment ID', minimum: 1 }
    },
    required: ['id']
  }
};

export const spamComment: MCPTool = {
  name: 'wp_spam_comment',
  description: 'Mark a WordPress comment as spam',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Comment ID', minimum: 1 }
    },
    required: ['id']
  }
};

export const handleListComments: MCPToolHandlerWithClient<IWordPressClient, ListCommentsArgs> = async (client, args) => {
  const timer = startTimer('List Comments');
  try {
    const comments = await client.getComments(args);
    const commentsList = comments.map(c => 
      `**${c.author_name}** on Post ${c.post}\nStatus: ${c.status}\nDate: ${new Date(c.date).toLocaleDateString()}\nContent: ${c.content.rendered.substring(0, 100)}...`
    ).join('\n\n');
    timer.endWithLog();
    return createSuccessResponse(`Found ${comments.length} comments:\n\n${commentsList}`);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to list comments: ${(error as Error).message}`);
  }
};

export const handleGetComment: MCPToolHandlerWithClient<IWordPressClient, GetCommentArgs> = async (client, args) => {
  const timer = startTimer('Get Comment');
  try {
    const comment = await client.getComment(args.id, args.context);
    const result = `**Comment by ${comment.author_name}** (ID: ${comment.id})\n` +
                   `Post: ${comment.post}\nStatus: ${comment.status}\nDate: ${new Date(comment.date).toLocaleString()}\n` +
                   `Content: ${comment.content.rendered}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get comment: ${(error as Error).message}`);
  }
};

export const handleCreateComment: MCPToolHandlerWithClient<IWordPressClient, CreateCommentArgs> = async (client, args) => {
  const timer = startTimer('Create Comment');
  try {
    const comment = await client.createComment(args);
    const result = `✅ Comment created successfully!\nID: ${comment.id}\nAuthor: ${comment.author_name}\nPost: ${comment.post}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to create comment: ${(error as Error).message}`);
  }
};

export const handleUpdateComment: MCPToolHandlerWithClient<IWordPressClient, UpdateCommentArgs> = async (client, args) => {
  const timer = startTimer('Update Comment');
  try {
    const comment = await client.updateComment(args);
    const result = `✅ Comment updated successfully!\nID: ${comment.id}\nStatus: ${comment.status}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to update comment: ${(error as Error).message}`);
  }
};

export const handleDeleteComment: MCPToolHandlerWithClient<IWordPressClient, DeleteCommentArgs> = async (client, args) => {
  const timer = startTimer('Delete Comment');
  try {
    await client.deleteComment(args.id, args.force);
    const action = args.force ? 'permanently deleted' : 'moved to trash';
    const result = `✅ Comment ${action} successfully!\nComment ID: ${args.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to delete comment: ${(error as Error).message}`);
  }
};

export const handleApproveComment: MCPToolHandlerWithClient<IWordPressClient, ApproveCommentArgs> = async (client, args) => {
  const timer = startTimer('Approve Comment');
  try {
    const comment = await client.approveComment(args.id);
    const result = `✅ Comment approved successfully!\nID: ${comment.id}\nAuthor: ${comment.author_name}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to approve comment: ${(error as Error).message}`);
  }
};

export const handleSpamComment: MCPToolHandlerWithClient<IWordPressClient, SpamCommentArgs> = async (client, args) => {
  const timer = startTimer('Spam Comment');
  try {
    const comment = await client.spamComment(args.id);
    const result = `✅ Comment marked as spam successfully!\nID: ${comment.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to mark comment as spam: ${(error as Error).message}`);
  }
};