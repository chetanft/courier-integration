/**
 * Authentication Service
 *
 * This service provides centralized authentication functionality for the courier integration platform.
 * It handles token generation, storage, validation, and refresh.
 */

import { getNestedValue, redactSensitiveInfo } from './utils';
import { makeProxyRequest, createErrorResponse } from './api-service-core';
import { ERROR_TYPES, API_INTENTS } from './constants';

// In-memory token cache
// Note: This is cleared on page refresh. For persistence, consider using localStorage
// with appropriate security measures or a more robust state management solution.
const tokenCache = new Map();

/**
 * Generate an authentication token
 *
 * @param {Object} authConfig - Authentication configuration
 * @param {string} authConfig.url - Authentication endpoint URL
 * @param {string} authConfig.method - HTTP method (default: POST)
 * @param {Array} authConfig.headers - Request headers
 * @param {Object} authConfig.body - Request body
 * @param {string} authConfig.tokenPath - Path to the token in the response
 * @param {string} authConfig.courier - Courier identifier for caching
 * @returns {Promise<Object>} Authentication result with token and metadata
 */
export const generateAuthToken = async (authConfig) => {
  try {
    // Validate required fields
    if (!authConfig.url) {
      throw new Error('Authentication endpoint URL is required');
    }

    console.log('Generating authentication token...');
    console.log('Auth config:', redactSensitiveInfo(authConfig));

    // Make the authentication request
    const requestConfig = {
      url: authConfig.url,
      method: authConfig.method || 'POST',
      headers: authConfig.headers || [],
      body: authConfig.body || {},
      apiIntent: API_INTENTS.GENERATE_AUTH_TOKEN
    };

    const response = await makeProxyRequest(requestConfig);

    // Check for errors in the response
    if (response.error) {
      console.error('Error generating token:', response);
      throw response;
    }

    // Extract the token using the provided path
    const tokenPath = authConfig.tokenPath || 'access_token';
    const token = getNestedValue(response, tokenPath);

    if (!token) {
      throw new Error(`Token not found in response using path "${tokenPath}"`);
    }

    // Determine token type (JWT or regular bearer token)
    const isJwt = typeof token === 'string' && token.split('.').length === 3;

    // Extract expiration time if it's a JWT
    let expiresAt = null;
    if (isJwt) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000);
        }
      } catch (error) {
        console.warn('Failed to parse JWT payload:', error);
      }
    }

    // Create token metadata
    const tokenMetadata = {
      token,
      type: isJwt ? 'jwt' : 'bearer',
      generatedAt: new Date(),
      expiresAt,
      courier: authConfig.courier
    };

    // Cache the token if courier is provided
    if (authConfig.courier) {
      tokenCache.set(authConfig.courier, tokenMetadata);
    }

    console.log('Token generated successfully');
    return {
      ...tokenMetadata,
      fullResponse: response
    };
  } catch (error) {
    console.error('Error generating authentication token:', error);
    throw createErrorResponse(error, { url: authConfig.url, method: authConfig.method || 'POST' });
  }
};

/**
 * Get a cached token for a courier
 *
 * @param {string} courier - Courier identifier
 * @returns {Object|null} Token metadata or null if not found
 */
export const getCachedToken = (courier) => {
  if (!courier) return null;

  const tokenMetadata = tokenCache.get(courier);
  if (!tokenMetadata) return null;

  // Check if token is expired
  if (tokenMetadata.expiresAt && new Date() > tokenMetadata.expiresAt) {
    console.log(`Token for ${courier} is expired`);
    return null;
  }

  return tokenMetadata;
};

/**
 * Refresh an authentication token
 *
 * @param {Object} authConfig - Authentication configuration
 * @returns {Promise<string>} The refreshed token
 */
export const refreshAuthToken = async (authConfig) => {
  try {
    console.log('Refreshing authentication token...');

    // Validate required fields
    if (!authConfig.jwtAuthEndpoint) {
      throw new Error('Auth endpoint URL is required for token refresh');
    }

    // Make the authentication request
    const requestConfig = {
      url: authConfig.jwtAuthEndpoint,
      method: authConfig.jwtAuthMethod || 'POST',
      headers: authConfig.jwtAuthHeaders || [],
      body: authConfig.jwtAuthBody || {},
      apiIntent: API_INTENTS.GENERATE_AUTH_TOKEN
    };

    const response = await makeProxyRequest(requestConfig);

    // Check for errors in the response
    if (response.error) {
      console.error('Error refreshing token:', response);
      throw response;
    }

    // Extract the token using the provided path
    const tokenPath = authConfig.jwtTokenPath || 'access_token';
    const token = getNestedValue(response, tokenPath);

    if (!token) {
      throw new Error(`Token not found in response using path "${tokenPath}"`);
    }

    // Update the token cache if courier is provided
    if (authConfig.courier) {
      const isJwt = typeof token === 'string' && token.split('.').length === 3;

      // Extract expiration time if it's a JWT
      let expiresAt = null;
      if (isJwt) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp) {
            expiresAt = new Date(payload.exp * 1000);
          }
        } catch (error) {
          console.warn('Failed to parse JWT payload:', error);
        }
      }

      // Update token cache
      tokenCache.set(authConfig.courier, {
        token,
        type: isJwt ? 'jwt' : 'bearer',
        generatedAt: new Date(),
        expiresAt,
        courier: authConfig.courier
      });
    }

    console.log('Token refreshed successfully');
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw createErrorResponse(error, {
      url: authConfig.jwtAuthEndpoint,
      method: authConfig.jwtAuthMethod || 'POST'
    });
  }
};

/**
 * Clear the token cache for a specific courier or all couriers
 *
 * @param {string} [courier] - Courier identifier (if omitted, clears all tokens)
 */
export const clearTokenCache = (courier) => {
  if (courier) {
    tokenCache.delete(courier);
    console.log(`Token cache cleared for ${courier}`);
  } else {
    tokenCache.clear();
    console.log('All token caches cleared');
  }
};

/**
 * Check if a token is valid and not expired
 *
 * @param {string} token - The token to validate
 * @returns {boolean} True if the token is valid
 */
export const isTokenValid = (token) => {
  if (!token) return false;

  // Check if it's a JWT
  if (token.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Check expiration
      if (payload.exp) {
        const expirationDate = new Date(payload.exp * 1000);
        return expirationDate > new Date();
      }
    } catch (error) {
      console.warn('Failed to parse JWT payload:', error);
      return false;
    }
  }

  // For non-JWT tokens, we can't determine validity, so assume it's valid
  return true;
};
