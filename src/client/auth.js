/**
 * WordPress Authentication Handler
 * Manages different authentication methods for WordPress REST API
 */

import { logger } from '../utils/debug.js';
import open from 'open';
import http from 'http';
import { URL } from 'url';

export class WordPressAuth {
  constructor(client) {
    this.client = client;
    this.authType = client.auth.type;
  }

  /**
   * Handle authentication based on type
   */
  async authenticate() {
    switch (this.authType) {
      case 'application_password':
        return await this.handleAppPasswordAuth();
      case 'jwt':
        return await this.handleJWTAuth();
      case 'oauth':
        return await this.handleOAuthAuth();
      case 'cookie':
        return await this.handleCookieAuth();
      default:
        throw new Error(`Unsupported authentication type: ${this.authType}`);
    }
  }

  /**
   * Handle Application Password authentication
   */
  async handleAppPasswordAuth() {
    const { username, appPassword } = this.client.auth;
    
    if (!username || !appPassword) {
      throw new Error(
        'Application Password authentication requires WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD. ' +
        'Visit your WordPress admin → Users → Profile → Application Passwords to create one.'
      );
    }

    // Test the credentials
    try {
      const user = await this.client.getCurrentUser();
      logger.log(`Authenticated as ${user.name} (${user.username})`);
      return {
        type: 'application_password',
        user,
        authenticated: true
      };
    } catch (error) {
      throw new Error(
        `Application Password authentication failed: ${error.message}. ` +
        'Please check your username and application password.'
      );
    }
  }

  /**
   * Handle JWT authentication
   */
  async handleJWTAuth() {
    const { username, password, jwtToken } = this.client.auth;

    // If we already have a token, verify it
    if (jwtToken) {
      try {
        const user = await this.client.getCurrentUser();
        logger.log(`JWT token valid for user ${user.name}`);
        return {
          type: 'jwt',
          token: jwtToken,
          user,
          authenticated: true
        };
      } catch (error) {
        logger.warn('Existing JWT token is invalid, requesting new token');
      }
    }

    // Request new JWT token
    if (!username || !password) {
      throw new Error(
        'JWT authentication requires WORDPRESS_JWT_USERNAME and WORDPRESS_JWT_PASSWORD. ' +
        'Make sure the JWT Authentication plugin is installed and configured.'
      );
    }

    try {
      const response = await fetch(`${this.client.siteUrl}/wp-json/jwt-auth/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'JWT authentication failed');
      }

      const tokenData = await response.json();
      this.client.auth.jwtToken = tokenData.token;

      logger.log(`JWT authentication successful for ${tokenData.user_display_name}`);
      return {
        type: 'jwt',
        token: tokenData.token,
        user: tokenData,
        authenticated: true
      };
    } catch (error) {
      throw new Error(
        `JWT authentication failed: ${error.message}. ` +
        'Make sure the JWT Authentication plugin is installed and your credentials are correct.'
      );
    }
  }

  /**
   * Handle OAuth authentication
   */
  async handleOAuthAuth() {
    const { 
      WORDPRESS_OAUTH_CLIENT_ID: clientId,
      WORDPRESS_OAUTH_CLIENT_SECRET: clientSecret,
      WORDPRESS_OAUTH_REDIRECT_URI: redirectUri
    } = process.env;

    if (!clientId || !clientSecret) {
      throw new Error(
        'OAuth authentication requires WORDPRESS_OAUTH_CLIENT_ID and WORDPRESS_OAUTH_CLIENT_SECRET. ' +
        'Make sure the OAuth plugin is installed and configured.'
      );
    }

    const callbackUrl = redirectUri || 'http://localhost:8080/callback';
    const state = this.generateState();
    
    // Build authorization URL
    const authUrl = new URL(`${this.client.siteUrl}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'read write');

    return new Promise((resolve, reject) => {
      // Create callback server
      const server = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url, callbackUrl);
          const code = url.searchParams.get('code');
          const returnedState = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            throw new Error(`OAuth error: ${error}`);
          }

          if (returnedState !== state) {
            throw new Error('OAuth state mismatch - possible CSRF attack');
          }

          if (!code) {
            throw new Error('No authorization code received');
          }

          // Exchange code for access token
          const tokenResponse = await fetch(`${this.client.siteUrl}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: callbackUrl,
              code
            })
          });

          if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${tokenResponse.status}`);
          }

          const tokenData = await tokenResponse.json();
          this.client.auth.oauthToken = tokenData.access_token;

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>✅ Authentication Successful</h1>
                <p>You can close this window and return to your application.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);

          server.close();
          
          logger.log('OAuth authentication successful');
          resolve({
            type: 'oauth',
            token: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            authenticated: true
          });

        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>❌ Authentication Failed</h1>
                <p>${error.message}</p>
              </body>
            </html>
          `);
          server.close();
          reject(error);
        }
      });

      server.listen(8080, () => {
        logger.log(`Opening browser for OAuth authentication: ${authUrl}`);
        open(authUrl.toString()).catch(error => {
          logger.warn('Failed to open browser automatically:', error.message);
          logger.log(`Please open this URL manually: ${authUrl}`);
        });
      });

      server.on('error', (error) => {
        reject(new Error(`OAuth callback server error: ${error.message}`));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth authentication timed out'));
      }, 300000);
    });
  }

  /**
   * Handle Cookie authentication
   */
  async handleCookieAuth() {
    const { nonce } = this.client.auth;
    
    if (!nonce) {
      throw new Error(
        'Cookie authentication requires WORDPRESS_COOKIE_NONCE. ' +
        'This is typically used for same-origin requests from a logged-in session.'
      );
    }

    // For cookie authentication, we just verify the nonce is working
    try {
      const user = await this.client.getCurrentUser();
      logger.log(`Cookie authentication successful for ${user.name}`);
      return {
        type: 'cookie',
        nonce,
        user,
        authenticated: true
      };
    } catch (error) {
      throw new Error(
        `Cookie authentication failed: ${error.message}. ` +
        'Make sure you have a valid WordPress session and correct nonce.'
      );
    }
  }

  /**
   * Generate a random state for OAuth
   */
  generateState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Refresh authentication if possible
   */
  async refreshAuth() {
    switch (this.authType) {
      case 'jwt':
        return await this.handleJWTAuth();
      case 'oauth':
        return await this.refreshOAuthToken();
      case 'application_password':
      case 'cookie':
        // These don't need refreshing
        return await this.authenticate();
      default:
        throw new Error(`Cannot refresh authentication for type: ${this.authType}`);
    }
  }

  /**
   * Refresh OAuth token
   */
  async refreshOAuthToken() {
    // Implementation would depend on the OAuth plugin used
    throw new Error('OAuth token refresh not yet implemented');
  }

  /**
   * Check if authentication is valid
   */
  async isAuthenticated() {
    try {
      await this.client.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get authentication status
   */
  async getAuthStatus() {
    try {
      const user = await this.client.getCurrentUser();
      return {
        authenticated: true,
        type: this.authType,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          roles: user.roles
        }
      };
    } catch (error) {
      return {
        authenticated: false,
        type: this.authType,
        error: error.message
      };
    }
  }
}
