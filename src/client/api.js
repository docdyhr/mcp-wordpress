/**
 * WordPress API Client
 * Handles all REST API communication with WordPress
 */

import fetch from 'node-fetch';
import { debug } from '../utils/debug.js';

export class WordPressClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.WORDPRESS_SITE_URL;
    this.timeout = options.timeout || parseInt(process.env.WORDPRESS_TIMEOUT) || 30000;
    this.maxRetries = options.maxRetries || parseInt(process.env.WORDPRESS_MAX_RETRIES) || 3;
    
    // Authentication configuration
    this.auth = options.auth || this.getAuthFromEnv();

    // Rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.requestInterval = 60000 / (parseInt(process.env.RATE_LIMIT) || 60); // ms between requests
    
    // Initialize authentication
    this.authenticated = false;
    this.jwtToken = null;
    
    // Validate configuration
    this.validateConfig();
  }

  getAuthFromEnv() {
    // Try Application Password first
    if (process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
      return {
        method: 'application_password',
        username: process.env.WORDPRESS_USERNAME,
        password: process.env.WORDPRESS_APP_PASSWORD
      };
    }
    
    // Try JWT
    if (process.env.WORDPRESS_JWT_SECRET && process.env.WORDPRESS_JWT_USERNAME && process.env.WORDPRESS_JWT_PASSWORD) {
      return {
        method: 'jwt',
        secret: process.env.WORDPRESS_JWT_SECRET,
        username: process.env.WORDPRESS_JWT_USERNAME,
        password: process.env.WORDPRESS_JWT_PASSWORD
      };
    }
    
    // Try OAuth
    if (process.env.WORDPRESS_OAUTH_CLIENT_ID && process.env.WORDPRESS_OAUTH_CLIENT_SECRET) {
      return {
        method: 'oauth',
        clientId: process.env.WORDPRESS_OAUTH_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_OAUTH_CLIENT_SECRET
      };
    }
    
    // Try Cookie
    if (process.env.WORDPRESS_COOKIE_NONCE) {
      return {
        method: 'cookie',
        nonce: process.env.WORDPRESS_COOKIE_NONCE
      };
    }
    
    // Default to application password method
    return {
      method: 'application_password',
      username: process.env.WORDPRESS_USERNAME,
      password: process.env.WORDPRESS_APP_PASSWORD
    };
  }

  validateConfig() {
    if (!this.baseUrl) {
      throw new Error('WordPress site URL is required');
    }

    // Ensure URL doesn't end with slash and add API path
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
    this.apiUrl = `${this.baseUrl}/wp-json/wp/v2`;
    
    debug(`WordPress API Client initialized for: ${this.apiUrl}`);
  }

  /**
   * Add authentication headers to request
   */
  addAuthHeaders(headers) {
    const method = this.auth.method?.toLowerCase();
    
    switch (method) {
      case 'application_password':
      case 'basic':
        if (this.auth.username && this.auth.password) {
          const credentials = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
        
      case 'jwt':
        if (this.jwtToken) {
          headers['Authorization'] = `Bearer ${this.jwtToken}`;
        }
        break;
        
      case 'cookie':
        if (this.auth.nonce) {
          headers['X-WP-Nonce'] = this.auth.nonce;
        }
        break;
        
      case 'api_key':
        if (this.auth.key) {
          headers['X-API-Key'] = this.auth.key;
          if (this.auth.apiSecret) {
            headers['X-API-Secret'] = this.auth.apiSecret;
          }
        }
        break;
    }
  }

  /**
   * Authenticate with WordPress
   */
  async authenticate() {
    const method = this.auth.method?.toLowerCase();
    
    switch (method) {
      case 'application_password':
      case 'basic':
        return await this.authenticateWithBasic();
      case 'jwt':
        return await this.authenticateWithJWT();
      case 'cookie':
        return await this.authenticateWithCookie();
      case 'api_key':
        // API key auth doesn't require separate authentication step
        this.authenticated = true;
        return true;
      default:
        throw new Error(`Unsupported authentication method: ${method}`);
    }
  }

  /**
   * Authenticate using Basic/Application Password
   */
  async authenticateWithBasic() {
    if (!this.auth.username || !this.auth.password) {
      throw new Error('Username and password are required for basic authentication');
    }

    try {
      // Test authentication by getting current user
      const response = await this.request('GET', 'users/me');
      this.authenticated = true;
      debug('Basic/Application Password authentication successful');
      return response;
    } catch (error) {
      throw new Error(`Basic authentication failed: ${error.message}`);
    }
  }

  /**
   * Authenticate using JWT
   */
  async authenticateWithJWT() {
    if (!this.auth.secret || !this.auth.username || !this.auth.password) {
      throw new Error('JWT secret, username, and password are required for JWT authentication');
    }

    try {
      const response = await fetch(`${this.baseUrl}/wp-json/jwt-auth/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.auth.username,
          password: this.auth.password
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.jwtToken = data.token;
      debug('JWT authentication successful');
      return data;
    } catch (error) {
      throw new Error(`JWT authentication failed: ${error.message}`);
    }
  }

  /**
   * Authenticate using Cookie
   */
  async authenticateWithCookie() {
    if (!this.auth.nonce) {
      throw new Error('Nonce is required for cookie authentication');
    }
    debug('Cookie authentication configured');
  }

  /**
   * Make authenticated request to WordPress REST API
   */
  async request(method, endpoint, data = null, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}/${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-WordPress/1.0.0',
      ...options.headers
    };

    // Add authentication headers
    this.addAuthHeaders(headers);

    const fetchOptions = {
      method,
      headers,
      timeout: this.timeout,
      ...options
    };

    // Add body for POST/PUT/PATCH requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      if (data instanceof FormData || (data && typeof data.append === 'function')) {
        // For FormData, don't set Content-Type (let fetch set it with boundary)
        delete headers['Content-Type'];
        fetchOptions.body = data;
      } else if (typeof data === 'string') {
        fetchOptions.body = data;
      } else {
        fetchOptions.body = JSON.stringify(data);
      }
    }

    // Rate limiting
    await this.rateLimit();

    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        debug(`API Request: ${method} ${url}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
        
        const response = await fetch(url, fetchOptions);
        
        // Handle different response types
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage;
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
          } catch {
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }

        // Parse response
        const responseText = await response.text();
        if (!responseText) {
          return null;
        }

        try {
          return JSON.parse(responseText);
        } catch {
          return responseText;
        }

      } catch (error) {
        lastError = error;
        debug(`Request failed (attempt ${attempt + 1}): ${error.message}`);
        
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
          break;
        }
        
        if (attempt < this.maxRetries - 1) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw new Error(`Request failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Rate limiting helper
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      const delay = this.requestInterval - timeSinceLastRequest;
      await this.delay(delay);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods for common endpoints

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return await this.request('GET', url);
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return await this.request('POST', endpoint, data);
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return await this.request('PUT', endpoint, data);
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return await this.request('DELETE', endpoint);
  }

  /**
   * Upload media file
   */
  async uploadMedia(formData) {
    // Handle FormData object from media upload handler
    return await this.request('POST', 'media', formData, {
      headers: {
        // Let FormData set its own Content-Type with boundary
        'Content-Type': undefined
      }
    });
  }

  /**
   * Update media item
   */
  async updateMedia(id, data) {
    return await this.request('POST', `media/${id}`, data);
  }
}
