/**
 * Unified API Service
 * 
 * This service provides a centralized way to make API requests with standardized
 * authentication, error handling, and response processing. It consolidates functionality
 * from api-client.js, courier-api-service.js, and api-service-core.js.
 */

import axios from 'axios';
import _ from 'lodash';
import {
  PROXY_ENDPOINTS,
  DEFAULT_TIMEOUT,
  MAX_RESPONSE_SIZE,
  ERROR_TYPES,
  API_INTENTS,
  HTTP_METHODS,
  AUTH_TYPES,
  COMMON_DATA_FIELDS
} from './constants';

// Cache for authentication tokens to avoid unnecessary requests
const tokenCache = new Map();

/**
 * Make an API request with standardized handling
 * 
 * @param {Object} requestConfig - The request configuration
 * @returns {Promise<Object>} The API response
 */
export const makeApiRequest = async (requestConfig) => {
  try {
    // Normalize and validate request config
    const normalizedConfig = normalizeRequestConfig(requestConfig);
    
    // Apply authentication if needed
    const configWithAuth = await applyAuthentication(normalizedConfig);
    
    // Make the request through proxy
    const response = await makeProxyRequest(configWithAuth);
    
    // Check if response is too large and needs processing
    if (exceedsMaxSize(response)) {
      console.warn('Response exceeds maximum size, truncating...');
      return processLargeResponse(response);
    }
    
    return response;
  } catch (error) {
    // Create standardized error response
    const errorResponse = createErrorResponse(error, requestConfig);
    throw errorResponse;
  }
};

/**
 * Normalize request configuration
 * 
 * @param {Object} config - The request configuration
 * @returns {Object} Normalized configuration
 */
export const normalizeRequestConfig = (config) => {
  // Ensure required fields exist
  const normalized = {
    url: config.url || '',
    method: config.method || HTTP_METHODS.GET,
    headers: config.headers || [],
    queryParams: config.queryParams || [],
    body: config.body || {},
    auth: config.auth || { type: AUTH_TYPES.NONE },
    apiIntent: config.apiIntent || API_INTENTS.GENERIC_REQUEST,
    timeout: config.timeout || DEFAULT_TIMEOUT
  };
  
  // Validate URL
  if (!normalized.url) {
    throw new Error('URL is required');
  }
  
  // Convert headers to array format if they're in object format
  if (!Array.isArray(normalized.headers) && typeof normalized.headers === 'object') {
    normalized.headers = Object.entries(normalized.headers).map(([key, value]) => ({
      key,
      value: String(value)
    }));
  }
  
  // Convert query params to array format if they're in object format
  if (!Array.isArray(normalized.queryParams) && typeof normalized.queryParams === 'object') {
    normalized.queryParams = Object.entries(normalized.queryParams).map(([key, value]) => ({
      key,
      value: String(value)
    }));
  }
  
  // Check for duplicate query parameters in the URL
  if (normalized.queryParams && normalized.queryParams.length > 0) {
    try {
      const urlObj = new URL(normalized.url);
      const existingParams = new Set(urlObj.searchParams.keys());
      
      // Filter out query parameters that already exist in the URL
      normalized.queryParams = normalized.queryParams.filter(param => 
        !existingParams.has(param.key)
      );
      
      console.log('After filtering for duplicates, using query parameters:', normalized.queryParams);
    } catch (urlError) {
      console.warn('Error parsing URL to check for duplicate parameters:', urlError);
    }
  }
  
  return normalized;
};

/**
 * Apply authentication to request config
 * 
 * @param {Object} config - The request configuration
 * @returns {Promise<Object>} Configuration with authentication applied
 */
export const applyAuthentication = async (config) => {
  const { auth } = config;
  const updatedConfig = { ...config };
  
  if (!auth || auth.type === AUTH_TYPES.NONE) {
    return updatedConfig;
  }
  
  try {
    // Handle different auth types
    switch (auth.type) {
      case AUTH_TYPES.BASIC:
        // Add Basic Auth header if not already present
        if (auth.username) {
          const hasAuthHeader = config.headers.some(h => 
            h.key.toLowerCase() === 'authorization' && 
            h.value.toLowerCase().startsWith('basic ')
          );
          
          if (!hasAuthHeader) {
            const credentials = `${auth.username}:${auth.password || ''}`;
            const base64Credentials = btoa(credentials);
            updatedConfig.headers = [
              ...updatedConfig.headers,
              {
                key: 'Authorization',
                value: `Basic ${base64Credentials}`
              }
            ];
          }
        }
        break;
        
      case AUTH_TYPES.BEARER:
      case AUTH_TYPES.JWT:
        // If token is not provided but we have token generation info, generate token
        if (!auth.token && auth.tokenEndpoint) {
          const token = await getAuthToken(auth);
          
          if (token) {
            updatedConfig.headers = [
              ...updatedConfig.headers,
              {
                key: 'Authorization',
                value: `Bearer ${token}`
              }
            ];
            
            // Also add to the auth object for reference
            updatedConfig.auth = {
              ...updatedConfig.auth,
              token
            };
          }
        } 
        // Add Bearer token header if not already present and token is available
        else if (auth.token) {
          const hasAuthHeader = config.headers.some(h => 
            h.key.toLowerCase() === 'authorization' && 
            h.value.toLowerCase().startsWith('bearer ')
          );
          
          if (!hasAuthHeader) {
            updatedConfig.headers = [
              ...updatedConfig.headers,
              {
                key: 'Authorization',
                value: `Bearer ${auth.token}`
              }
            ];
          }
        }
        break;
        
      case AUTH_TYPES.API_KEY:
        // Add API key header if not already present
        if (auth.apiKey) {
          const apiKeyName = auth.apiKeyName || 'X-API-Key';
          const hasApiKeyHeader = config.headers.some(h => 
            h.key.toLowerCase() === apiKeyName.toLowerCase()
          );
          
          if (!hasApiKeyHeader) {
            updatedConfig.headers = [
              ...updatedConfig.headers,
              {
                key: apiKeyName,
                value: auth.apiKey
              }
            ];
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error applying authentication:', error);
    // Continue without auth rather than failing
  }
  
  return updatedConfig;
};

/**
 * Get or generate an authentication token
 * 
 * @param {Object} authConfig - Authentication configuration
 * @returns {Promise<string|null>} The authentication token or null
 */
export const getAuthToken = async (authConfig) => {
  // Generate cache key based on auth config
  const cacheKey = generateCacheKey(authConfig);
  
  // Check if token is in cache and not expired
  if (tokenCache.has(cacheKey)) {
    const cachedToken = tokenCache.get(cacheKey);
    if (cachedToken.expiresAt > Date.now()) {
      console.log('Using cached token');
      return cachedToken.token;
    }
    console.log('Cached token expired, generating new token');
    tokenCache.delete(cacheKey);
  }
  
  // If no token endpoint is provided, return null
  if (!authConfig.tokenEndpoint) {
    console.warn('No token endpoint provided in auth config');
    return null;
  }
  
  try {
    // Create request config for token generation
    const tokenRequestConfig = {
      url: authConfig.tokenEndpoint,
      method: authConfig.tokenMethod || HTTP_METHODS.POST,
      headers: authConfig.tokenHeaders || [],
      body: authConfig.tokenBody || {},
      apiIntent: API_INTENTS.GENERATE_AUTH_TOKEN
    };
    
    // Make the token request
    const response = await makeProxyRequest(tokenRequestConfig);
    
    if (response.error) {
      console.error('Failed to generate auth token:', response);
      return null;
    }
    
    // Extract token from response using the provided path
    const tokenPath = authConfig.tokenPath || 'access_token';
    const token = _.get(response, tokenPath);
    
    if (!token) {
      console.error(`Token not found at path: ${tokenPath}`, response);
      return null;
    }
    
    // Extract expiration time if available
    let expiresIn = authConfig.expiresIn || _.get(response, 'expires_in') || 3600; // Default 1 hour
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    // Cache the token
    tokenCache.set(cacheKey, {
      token,
      expiresAt
    });
    
    return token;
  } catch (error) {
    console.error('Error generating auth token:', error);
    return null;
  }
};

/**
 * Generate a cache key for auth token caching
 * 
 * @param {Object} authConfig - Authentication configuration
 * @returns {string} Cache key
 */
const generateCacheKey = (authConfig) => {
  const { tokenEndpoint, tokenBody, username } = authConfig;
  
  // Create a simple hash based on endpoint and credentials
  const baseKey = `${tokenEndpoint}:${JSON.stringify(tokenBody)}:${username || ''}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < baseKey.length; i++) {
    const char = baseKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `auth_token_${hash}`;
};

/**
 * Make a request through proxy
 * 
 * @param {Object} config - The request configuration
 * @returns {Promise<Object>} The API response
 */
export const makeProxyRequest = async (config) => {
  // Try each proxy endpoint until one works
  let lastError = null;
  
  for (const endpoint of Object.values(PROXY_ENDPOINTS)) {
    try {
      console.log(`Attempting request via proxy endpoint: ${endpoint}`);
      
      const response = await axios.post(endpoint, config, {
        timeout: config.timeout || DEFAULT_TIMEOUT,
        maxContentLength: MAX_RESPONSE_SIZE,
        maxBodyLength: MAX_RESPONSE_SIZE
      });
      
      // Check if the response indicates an error
      if (response.data && response.data.error) {
        console.warn('Proxy returned an error response:', response.data);
        return response.data; // Return the error response from the proxy
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error with proxy endpoint ${endpoint}:`, error.message);
      lastError = error;
      // Continue to the next endpoint
    }
  }
  
  // If all proxies failed, throw the last error
  throw lastError || new Error('All proxy endpoints failed');
};

/**
 * Create standardized error response
 * 
 * @param {Object} error - The error object
 * @param {Object} requestConfig - The original request configuration
 * @returns {Object} Standardized error response
 */
export const createErrorResponse = (error, requestConfig = {}) => {
  // Create a sanitized version of the request config for logging
  const sanitizedConfig = { ...requestConfig };
  if (sanitizedConfig.auth) {
    if (sanitizedConfig.auth.password) sanitizedConfig.auth.password = '[REDACTED]';
    if (sanitizedConfig.auth.token) sanitizedConfig.auth.token = '[REDACTED]';
    if (sanitizedConfig.auth.apiKey) sanitizedConfig.auth.apiKey = '[REDACTED]';
  }

  // Determine error type
  let errorType = ERROR_TYPES.UNKNOWN;
  
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    errorType = ERROR_TYPES.TIMEOUT;
  } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
    errorType = ERROR_TYPES.NETWORK;
  } else if (error.response?.status === 401 || error.response?.status === 403) {
    errorType = ERROR_TYPES.AUTH;
  } else if (error.response?.status >= 500) {
    errorType = ERROR_TYPES.SERVER;
  } else if (error.response?.status >= 400) {
    errorType = ERROR_TYPES.CLIENT;
  }

  // Base error response
  const errorResponse = {
    error: true,
    errorType,
    status: error.status || error.response?.status,
    statusText: error.statusText || error.response?.statusText,
    message: error.message || 'An unknown error occurred',
    timestamp: new Date().toISOString(),
    requestDetails: {
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent
    }
  };

  // Add additional details if available
  if (error.response?.data) {
    errorResponse.details = error.response.data;
  }

  return errorResponse;
};

/**
 * Check if a response exceeds the size limit
 * 
 * @param {Object} response - The API response
 * @returns {boolean} True if the response exceeds the size limit
 */
export const exceedsMaxSize = (response) => {
  try {
    const jsonString = JSON.stringify(response);
    const size = new Blob([jsonString]).size;
    return size > MAX_RESPONSE_SIZE;
  } catch (error) {
    console.error('Error checking response size:', error);
    return true; // Assume it's too large if we can't check
  }
};

/**
 * Process a large response to fit within size limits
 * 
 * @param {Object} response - The API response
 * @returns {Object} Processed response
 */
export const processLargeResponse = (response) => {
  try {
    // If response is an array, return a truncated version
    if (Array.isArray(response)) {
      return {
        _truncated: true,
        _originalSize: response.length,
        _originalType: 'array',
        message: `Response was truncated from ${response.length} items to 100 items due to size limitations`,
        data: response.slice(0, 100)
      };
    }
    
    // If response has a data array, truncate it
    for (const field of COMMON_DATA_FIELDS) {
      if (response[field] && Array.isArray(response[field])) {
        const truncated = { ...response };
        truncated[field] = truncated[field].slice(0, 100);
        
        return {
          _truncated: true,
          _originalSize: response[field].length,
          _originalType: 'object',
          _truncatedField: field,
          message: `Field "${field}" was truncated from ${response[field].length} items to 100 items due to size limitations`,
          data: truncated
        };
      }
    }
    
    // If we can't intelligently truncate, return a simplified response
    return {
      _truncated: true,
      _originalType: typeof response,
      message: 'Response was too large and has been truncated',
      summary: typeof response === 'object' ? Object.keys(response) : 'Non-object response'
    };
  } catch (error) {
    console.error('Error processing large response:', error);
    return {
      _truncated: true,
      _error: true,
      message: 'Failed to process large response',
      error: error.message
    };
  }
};

/**
 * Extract data from a common response format
 * 
 * @param {Object} response - The API response
 * @returns {Object} The extracted data
 */
export const extractResponseData = (response) => {
  if (!response) {
    return null;
  }
  
  // If response is already an array, return it
  if (Array.isArray(response)) {
    return response;
  }
  
  // Check common fields for data
  for (const field of COMMON_DATA_FIELDS) {
    if (response[field]) {
      return response[field];
    }
  }
  
  // If no common fields found, return the whole response
  return response;
};

// Helper function for making a courier-specific API request
export const makeCourierApiRequest = async (courierConfig, endpointConfig) => {
  // Merge courier auth with endpoint config
  const config = {
    ...endpointConfig,
    auth: {
      ...courierConfig.auth,
      ...endpointConfig.auth
    }
  };
  
  // Make the API request
  const response = await makeApiRequest(config);
  
  // Process response if needed
  return response;
};

// Export the main functions
export default {
  makeApiRequest,
  makeCourierApiRequest,
  normalizeRequestConfig,
  applyAuthentication,
  getAuthToken,
  makeProxyRequest,
  createErrorResponse,
  exceedsMaxSize,
  processLargeResponse,
  extractResponseData
};
