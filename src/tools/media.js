import { debug } from '../utils/debug.js';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

/**
 * List WordPress media items with optional filtering
 */
export const listMedia = {
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
 * Get a specific WordPress media item by ID
 */
export const getMedia = {
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
 * Upload a new media file to WordPress
 */
export const uploadMedia = {
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
      },
      date_gmt: {
        type: 'string',
        format: 'date-time',
        description: 'Upload date in UTC'
      }
    },
    required: ['file_path']
  }
};

/**
 * Update an existing WordPress media item
 */
export const updateMedia = {
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
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Upload date in ISO 8601 format'
      },
      date_gmt: {
        type: 'string',
        format: 'date-time',
        description: 'Upload date in UTC'
      }
    },
    required: ['id']
  }
};

/**
 * Delete a WordPress media item
 */
export const deleteMedia = {
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
        description: 'Whether to bypass trash and force deletion (default: false)'
      }
    },
    required: ['id']
  }
};

/**
 * Get media item sizes/thumbnails
 */
export const getMediaSizes = {
  name: 'wp_get_media_sizes',
  description: 'Get available sizes for a media item (for images)',
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

/**
 * Implementation functions for media tools
 */

export async function handleListMedia(apiClient, args) {
  try {
    debug('Listing media with args:', args);
    
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (args.page) params.append('page', args.page.toString());
    if (args.per_page) params.append('per_page', args.per_page.toString());
    
    // Add filtering parameters
    if (args.search) params.append('search', args.search);
    if (args.author) params.append('author', args.author.toString());
    if (args.parent !== undefined) params.append('parent', args.parent.toString());
    if (args.media_type) params.append('media_type', args.media_type);
    if (args.mime_type) params.append('mime_type', args.mime_type);
    if (args.orderby) params.append('orderby', args.orderby);
    if (args.order) params.append('order', args.order);
    
    const media = await apiClient.listMedia(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${media.length} media items:\n\n` + 
              media.map(item => 
                `**${item.title.rendered}** (ID: ${item.id})\n` +
                `Type: ${item.media_type} | MIME: ${item.mime_type}\n` +
                `Date: ${new Date(item.date).toLocaleDateString()}\n` +
                `URL: ${item.source_url}\n` +
                `Size: ${item.media_details?.filesize ? Math.round(item.media_details.filesize / 1024) + ' KB' : 'Unknown'}\n` +
                (item.media_details?.width && item.media_details?.height ? 
                  `Dimensions: ${item.media_details.width}x${item.media_details.height}\n` : '') +
                (item.alt_text ? `Alt Text: ${item.alt_text}\n` : '') +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error listing media:', error);
    throw new Error(`Failed to list media: ${error.message}`);
  }
}

export async function handleGetMedia(apiClient, args) {
  try {
    debug('Getting media with ID:', args.id);
    
    const media = await apiClient.getMedia(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `**${media.title.rendered}** (ID: ${media.id})\n\n` +
              `Type: ${media.media_type}\n` +
              `MIME Type: ${media.mime_type}\n` +
              `Status: ${media.status}\n` +
              `Author: ${media.author}\n` +
              `Date: ${new Date(media.date).toLocaleString()}\n` +
              `Modified: ${new Date(media.modified).toLocaleString()}\n` +
              `URL: ${media.source_url}\n` +
              `Slug: ${media.slug}\n` +
              (media.post ? `Attached to Post: ${media.post}\n` : '') +
              (media.media_details?.filesize ? `File Size: ${Math.round(media.media_details.filesize / 1024)} KB\n` : '') +
              (media.media_details?.width && media.media_details?.height ? 
                `Dimensions: ${media.media_details.width}x${media.media_details.height}\n` : '') +
              (media.alt_text ? `Alt Text: ${media.alt_text}\n` : '') +
              '\n' +
              (media.caption.rendered ? `**Caption:**\n${media.caption.rendered}\n\n` : '') +
              (media.description.rendered ? `**Description:**\n${media.description.rendered}\n\n` : '') +
              (media.media_details?.sizes ? 
                `**Available Sizes:**\n${Object.entries(media.media_details.sizes).map(([size, details]) => 
                  `- ${size}: ${details.width}x${details.height} (${details.source_url})`
                ).join('\n')}` : '')
      }]
    };
  } catch (error) {
    debug('Error getting media:', error);
    throw new Error(`Failed to get media: ${error.message}`);
  }
}

export async function handleUploadMedia(apiClient, args) {
  try {
    debug('Uploading media from path:', args.file_path);
    
    // Check if file exists
    if (!fs.existsSync(args.file_path)) {
      throw new Error(`File not found: ${args.file_path}`);
    }
    
    // Get file stats
    const stats = fs.statSync(args.file_path);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${args.file_path}`);
    }
    
    // Create form data for file upload
    const form = new FormData();
    const fileStream = fs.createReadStream(args.file_path);
    const fileName = path.basename(args.file_path);
    
    form.append('file', fileStream, fileName);
    
    // Add metadata if provided
    const title = args.title || path.parse(fileName).name;
    form.append('title', title);
    
    if (args.alt_text) form.append('alt_text', args.alt_text);
    if (args.caption) form.append('caption', args.caption);
    if (args.description) form.append('description', args.description);
    if (args.post) form.append('post', args.post.toString());
    if (args.status) form.append('status', args.status);
    if (args.author) form.append('author', args.author.toString());
    if (args.date) form.append('date', args.date);
    if (args.date_gmt) form.append('date_gmt', args.date_gmt);
    
    const media = await apiClient.uploadMedia(form);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Media uploaded successfully!\n\n` +
              `**${media.title.rendered}** (ID: ${media.id})\n` +
              `Type: ${media.media_type}\n` +
              `File Size: ${Math.round(media.media_details?.filesize / 1024) || 'Unknown'} KB\n` +
              (media.media_details?.width && media.media_details?.height ? 
                `Dimensions: ${media.media_details.width}x${media.media_details.height}\n` : '') +
              `URL: ${media.source_url}\n` +
              `Edit URL: ${media.link.replace(/\/$/, '')}/wp-admin/upload.php?item=${media.id}`
      }]
    };
  } catch (error) {
    debug('Error uploading media:', error);
    throw new Error(`Failed to upload media: ${error.message}`);
  }
}

export async function handleUpdateMedia(apiClient, args) {
  try {
    debug('Updating media with ID:', args.id);
    
    const { id, ...updateData } = args;
    const media = await apiClient.updateMedia(id, updateData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Media updated successfully!\n\n` +
              `**${media.title.rendered}** (ID: ${media.id})\n` +
              `Type: ${media.media_type}\n` +
              `Modified: ${new Date(media.modified).toLocaleString()}\n` +
              `URL: ${media.source_url}`
      }]
    };
  } catch (error) {
    debug('Error updating media:', error);
    throw new Error(`Failed to update media: ${error.message}`);
  }
}

export async function handleDeleteMedia(apiClient, args) {
  try {
    debug('Deleting media with ID:', args.id);
    
    const result = await apiClient.deleteMedia(args.id, args.force);
    
    return {
      content: [{
        type: 'text',
        text: args.force 
          ? `✅ Media permanently deleted (ID: ${args.id})`
          : `✅ Media moved to trash (ID: ${args.id})\n\nThe media file can still be restored from the WordPress admin trash.`
      }]
    };
  } catch (error) {
    debug('Error deleting media:', error);
    throw new Error(`Failed to delete media: ${error.message}`);
  }
}

export async function handleGetMediaSizes(apiClient, args) {
  try {
    debug('Getting media sizes for ID:', args.id);
    
    const media = await apiClient.getMedia(args.id);
    
    if (!media.media_details?.sizes) {
      return {
        content: [{
          type: 'text',
          text: `No size variations available for media ${args.id} (may not be an image)`
        }]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `**Available sizes for ${media.title.rendered}** (ID: ${args.id}):\n\n` +
              `**Original:** ${media.media_details.width}x${media.media_details.height}\n` +
              `URL: ${media.source_url}\n\n` +
              `**Generated Sizes:**\n` +
              Object.entries(media.media_details.sizes).map(([size, details]) => 
                `**${size}:** ${details.width}x${details.height}\n` +
                `URL: ${details.source_url}\n` +
                `File Size: ${Math.round(details.filesize / 1024)} KB`
              ).join('\n\n')
      }]
    };
  } catch (error) {
    debug('Error getting media sizes:', error);
    throw new Error(`Failed to get media sizes: ${error.message}`);
  }
}
