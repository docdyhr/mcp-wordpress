/**
 * WordPress Media Tools
 * 
 * MCP tools for managing WordPress media using typed interfaces
 */

import type {
  MCPTool,
  MCPToolHandlerWithClient,
  MCPToolResponse,
  MCPSuccessResponse,
  MCPErrorResponse
} from '../types/mcp.js';
import type {
  IWordPressClient,
  WordPressMedia,
  MediaQueryParams,
  UploadMediaRequest,
  UpdateMediaRequest,
  MediaType
} from '../types/index.js';
import { debug, logError, startTimer } from '../utils/debug.js';

// Tool Input Types
interface ListMediaArgs extends MediaQueryParams {}

interface GetMediaArgs {
  id: number;
  context?: 'view' | 'embed' | 'edit';
}

interface UploadMediaArgs extends UploadMediaRequest {}

interface UpdateMediaArgs extends UpdateMediaRequest {}

interface DeleteMediaArgs {
  id: number;
  force?: boolean;
}

interface GetMediaSizesArgs {
  id: number;
}

// Helper functions
const createSuccessResponse = (text: string): MCPSuccessResponse => ({
  content: [{ type: 'text', text }],
  isError: false
});

const createErrorResponse = (error: string | Error): MCPErrorResponse => ({
  content: [{ 
    type: 'text', 
    text: typeof error === 'string' ? error : error.message 
  }],
  isError: true
});

const formatMediaInfo = (media: WordPressMedia): string => {
  const date = new Date(media.date).toLocaleDateString();
  const sizeInfo = media.media_details?.filesize 
    ? ` | Size: ${Math.round(media.media_details.filesize / 1024)} KB`
    : '';
  const dimensions = media.media_details?.width && media.media_details?.height
    ? ` | Dimensions: ${media.media_details.width}x${media.media_details.height}`
    : '';
  
  return `**${media.title.rendered}** (ID: ${media.id})\n` +
         `Type: ${media.media_type} | MIME: ${media.mime_type} | Date: ${date}${sizeInfo}${dimensions}\n` +
         `URL: ${media.source_url}\n` +
         (media.alt_text ? `Alt Text: ${media.alt_text}\n` : '') +
         '---';
};

/**
 * List WordPress media items
 */
export const listMedia: MCPTool = {
  name: 'wp_list_media',
  description: 'List WordPress media items with optional filtering and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number for pagination (default: 1)',
        minimum: 1
      },
      per_page: {
        type: 'number',
        description: 'Number of media items per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      },
      search: {
        type: 'string',
        description: 'Search term to filter media items'
      },
      author: {
        type: 'number',
        description: 'Filter media by author ID'
      },
      parent: {
        type: 'number',
        description: 'Filter media by parent post ID'
      },
      media_type: {
        type: 'string',
        enum: ['image', 'video', 'text', 'application', 'audio'],
        description: 'Filter media by type'
      },
      mime_type: {
        type: 'string',
        description: 'Filter media by MIME type (e.g., image/jpeg, video/mp4)'
      },
      orderby: {
        type: 'string',
        enum: ['date', 'id', 'include', 'title', 'slug', 'modified', 'menu_order'],
        description: 'Sort media by field (default: date)'
      },
      order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order (default: desc)'
      }
    }
  }
};

/**
 * Get a specific media item
 */
export const getMedia: MCPTool = {
  name: 'wp_get_media',
  description: 'Get a specific WordPress media item by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Media ID',
        minimum: 1
      },
      context: {
        type: 'string',
        enum: ['view', 'embed', 'edit'],
        description: 'Scope of the request (default: view)'
      }
    },
    required: ['id']
  }
};

/**
 * Upload a new media file
 */
export const uploadMedia: MCPTool = {
  name: 'wp_upload_media',
  description: 'Upload a new media file to WordPress',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to upload'
      },
      title: {
        type: 'string',
        description: 'Media title (default: filename)'
      },
      alt_text: {
        type: 'string',
        description: 'Alternative text for images'
      },
      caption: {
        type: 'string',
        description: 'Media caption'
      },
      description: {
        type: 'string',
        description: 'Media description'
      },
      post: {
        type: 'number',
        description: 'ID of the post to attach the media to'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private'],
        description: 'Media status (default: publish)'
      },
      author: {
        type: 'number',
        description: 'Author user ID'
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Upload date in ISO 8601 format'
      }
    },
    required: ['file_path']
  }
};

/**
 * Update media metadata
 */
export const updateMedia: MCPTool = {
  name: 'wp_update_media',
  description: 'Update an existing WordPress media item metadata',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Media ID',
        minimum: 1
      },
      title: {
        type: 'string',
        description: 'Media title'
      },
      alt_text: {
        type: 'string',
        description: 'Alternative text for images'
      },
      caption: {
        type: 'string',
        description: 'Media caption'
      },
      description: {
        type: 'string',
        description: 'Media description'
      },
      post: {
        type: 'number',
        description: 'ID of the post to attach the media to'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private'],
        description: 'Media status'
      },
      author: {
        type: 'number',
        description: 'Author user ID'
      }
    },
    required: ['id']
  }
};

/**
 * Delete a media item
 */
export const deleteMedia: MCPTool = {
  name: 'wp_delete_media',
  description: 'Delete a WordPress media item',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Media ID',
        minimum: 1
      },
      force: {
        type: 'boolean',
        description: 'Whether to permanently delete (true) or move to trash (false)',
        default: false
      }
    },
    required: ['id']
  }
};

/**
 * Get available media sizes
 */
export const getMediaSizes: MCPTool = {
  name: 'wp_get_media_sizes',
  description: 'Get available image sizes for a media item',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Media ID',
        minimum: 1
      }
    },
    required: ['id']
  }
};

// Tool Handlers

export const handleListMedia: MCPToolHandlerWithClient<IWordPressClient, ListMediaArgs> = async (
  client: IWordPressClient,
  args: ListMediaArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('List Media');
  
  try {
    debug.log('Listing media with args:', args);
    
    const media = await client.getMedia(args);
    
    if (media.length === 0) {
      return createSuccessResponse('Found 0 media items');
    }
    
    const mediaList = media.map(formatMediaInfo).join('\n');
    const summary = `Found ${media.length} media items:\n\n${mediaList}`;
    
    timer.endWithLog();
    return createSuccessResponse(summary);
    
  } catch (error) {
    logError(error as Error, { operation: 'list_media', args });
    timer.end();
    return createErrorResponse(`Failed to list media: ${(error as Error).message}`);
  }
};

export const handleGetMedia: MCPToolHandlerWithClient<IWordPressClient, GetMediaArgs> = async (
  client: IWordPressClient,
  args: GetMediaArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Get Media');
  
  try {
    if (!args.id) {
      return createErrorResponse('Media ID is required');
    }
    
    debug.log('Getting media with ID:', args.id);
    
    const media = await client.getMediaItem(args.id, args.context);
    
    const result = `**${media.title.rendered}** (ID: ${media.id})\n\n` +
                   `**Type:** ${media.media_type}\n` +
                   `**MIME Type:** ${media.mime_type}\n` +
                   `**Status:** ${media.status}\n` +
                   `**Author:** ${media.author}\n` +
                   `**Date:** ${new Date(media.date).toLocaleString()}\n` +
                   `**Modified:** ${new Date(media.modified).toLocaleString()}\n` +
                   `**URL:** ${media.source_url}\n` +
                   `**Slug:** ${media.slug}\n` +
                   (media.post ? `**Attached to Post:** ${media.post}\n` : '') +
                   (media.media_details?.filesize ? `**File Size:** ${Math.round(media.media_details.filesize / 1024)} KB\n` : '') +
                   (media.media_details?.width && media.media_details?.height ? 
                     `**Dimensions:** ${media.media_details.width}x${media.media_details.height}\n` : '') +
                   (media.alt_text ? `**Alt Text:** ${media.alt_text}\n` : '') +
                   '\n' +
                   (media.caption.rendered ? `**Caption:**\n${media.caption.rendered}\n\n` : '') +
                   (media.description.rendered ? `**Description:**\n${media.description.rendered}\n\n` : '') +
                   (media.media_details?.sizes ? 
                     `**Available Sizes:**\n${Object.entries(media.media_details.sizes).map(([size, details]) => 
                       `- ${size}: ${details.width}x${details.height} (${details.source_url})`
                     ).join('\n')}` : '');
    
    timer.endWithLog();
    return createSuccessResponse(result);
    
  } catch (error) {
    logError(error as Error, { operation: 'get_media', args });
    timer.end();
    return createErrorResponse(`Failed to get media: ${(error as Error).message}`);
  }
};

export const handleUploadMedia: MCPToolHandlerWithClient<IWordPressClient, UploadMediaArgs> = async (
  client: IWordPressClient,
  args: UploadMediaArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Upload Media');
  
  try {
    if (!args.file_path) {
      return createErrorResponse('File path is required');
    }
    
    debug.log('Uploading media from path:', args.file_path);
    
    const media = await client.uploadMedia(args);
    
    const result = `✅ **Media uploaded successfully!**\n\n` +
                   `**Title:** ${media.title.rendered}\n` +
                   `**ID:** ${media.id}\n` +
                   `**Type:** ${media.media_type}\n` +
                   `**MIME Type:** ${media.mime_type}\n` +
                   `**URL:** ${media.source_url}\n` +
                   `**Slug:** ${media.slug}\n` +
                   (media.media_details?.filesize ? `**File Size:** ${Math.round(media.media_details.filesize / 1024)} KB\n` : '') +
                   (media.media_details?.width && media.media_details?.height ? 
                     `**Dimensions:** ${media.media_details.width}x${media.media_details.height}\n` : '') +
                   `**Date:** ${new Date(media.date).toLocaleString()}\n\n` +
                   `The media file has been uploaded and is now available in your WordPress media library.`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
    
  } catch (error) {
    logError(error as Error, { operation: 'upload_media', args });
    timer.end();
    return createErrorResponse(`Failed to upload media: ${(error as Error).message}`);
  }
};

export const handleUpdateMedia: MCPToolHandlerWithClient<IWordPressClient, UpdateMediaArgs> = async (
  client: IWordPressClient,
  args: UpdateMediaArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Update Media');
  
  try {
    if (!args.id) {
      return createErrorResponse('Media ID is required');
    }
    
    debug.log('Updating media with ID:', args.id);
    
    const media = await client.updateMedia(args);
    
    const result = `✅ **Media updated successfully!**\n\n` +
                   `**Title:** ${media.title.rendered}\n` +
                   `**ID:** ${media.id}\n` +
                   `**Type:** ${media.media_type}\n` +
                   `**URL:** ${media.source_url}\n` +
                   `**Modified:** ${new Date(media.modified).toLocaleString()}\n\n` +
                   `The media metadata has been updated successfully.`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
    
  } catch (error) {
    logError(error as Error, { operation: 'update_media', args });
    timer.end();
    return createErrorResponse(`Failed to update media: ${(error as Error).message}`);
  }
};

export const handleDeleteMedia: MCPToolHandlerWithClient<IWordPressClient, DeleteMediaArgs> = async (
  client: IWordPressClient,
  args: DeleteMediaArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Delete Media');
  
  try {
    if (!args.id) {
      return createErrorResponse('Media ID is required');
    }
    
    debug.log('Deleting media with ID:', args.id, 'force:', args.force);
    
    const result = await client.deleteMedia(args.id, args.force);
    
    const actionText = args.force ? 'permanently deleted' : 'moved to trash';
    const responseText = `✅ **Media ${actionText} successfully!**\n\n` +
                        `**Media ID:** ${args.id}\n` +
                        (result.previous ? `**Title:** ${result.previous.title.rendered}\n` : '') +
                        `**Action:** ${actionText}\n\n` +
                        (args.force 
                          ? 'The media file has been permanently deleted and cannot be recovered.'
                          : 'The media has been moved to trash and can be restored from the WordPress admin.');
    
    timer.endWithLog();
    return createSuccessResponse(responseText);
    
  } catch (error) {
    logError(error as Error, { operation: 'delete_media', args });
    timer.end();
    return createErrorResponse(`Failed to delete media: ${(error as Error).message}`);
  }
};

export const handleGetMediaSizes: MCPToolHandlerWithClient<IWordPressClient, GetMediaSizesArgs> = async (
  client: IWordPressClient,
  args: GetMediaSizesArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Get Media Sizes');
  
  try {
    if (!args.id) {
      return createErrorResponse('Media ID is required');
    }
    
    debug.log('Getting media sizes for ID:', args.id);
    
    const media = await client.getMediaItem(args.id);
    
    if (media.media_type !== 'image' || !media.media_details?.sizes) {
      return createSuccessResponse('No image sizes available for this media item.');
    }
    
    const sizes = Object.entries(media.media_details.sizes).map(([size, details]) => 
      `**${size}:** ${details.width}x${details.height}\n` +
      `File: ${details.file}\n` +
      `URL: ${details.source_url}`
    ).join('\n\n');
    
    const result = `**Available image sizes for "${media.title.rendered}":**\n\n${sizes}`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
    
  } catch (error) {
    logError(error as Error, { operation: 'get_media_sizes', args });
    timer.end();
    return createErrorResponse(`Failed to get media sizes: ${(error as Error).message}`);
  }
};