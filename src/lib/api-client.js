/**
 * Centralized API Client Service
 * 
 * This service provides a unified way to make API requests with standardized
 * authentication, error handling, and response processing.
 */

import axios from 'axios';
import { PROXY_ENDPOINTS } from './constants';

// Maximum response size in bytes (slightly under 6MB to be safe)
const MAX_RESPONSE_SIZE = 5.5 * 1024 * 1024;

/**
 * Make an API request with standardized handling
 * @param {Object} requestConfig - The request configuration
 * @returns {Promise<Object>} The API response
 */
export const makeApiRequest = async (requestConfig) => {
  try {
    // Normalize and validate request config
    const normalizedConfig = normalizeRequestConfig(requestConfig);
    
    // Apply authentication
    const configWithAuth = applyAuthentication(normalizedConfig);
    
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
 * @param {Object} config - The request configuration
 * @returns {Object} Normalized configuration
 */
export const normalizeRequestConfig = (config) => {
  // Ensure required fields exist
  const normalized = {
    url: config.url || '',
    method: config.method || 'GET',
    headers: config.headers || [],
    queryParams: config.queryParams || [],
    body: config.body || {},
    auth: config.auth || { type: 'none' },
    apiIntent: config.apiIntent || 'generic_request'
  };
  
  // Validate URL
  if (!normalized.url) {
    throw new Error('URL is required');
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
 * @param {Object} config - The request configuration
 * @returns {Object} Configuration with authentication applied
 */
export const applyAuthentication = (config) => {
  const { auth } = config;
  const updatedConfig = { ...config };
  
  // Handle different auth types
  switch (auth.type) {
    case 'basic':
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
      
    case 'bearer':
    case 'jwt':
      // Add Bearer token header if not already present
      if (auth.token) {
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
      
    case 'apikey':
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
  
  return updatedConfig;
};

/**
 * Make request through proxy
 * @param {Object} config - The request configuration
 * @returns {Promise<Object>} The API response
 */
export const makeProxyRequest = async (config) => {
  // Try each proxy endpoint until one works
  let lastError = null;
  
  for (const endpoint of Object.values(PROXY_ENDPOINTS)) {
    try {
      console.log(`Attempting request via proxy endpoint: ${endpoint}`);
      const response = await axios.post(endpoint, config);
      
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

  // Base error response
  const errorResponse = {
    error: true,
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
 * @param {Object} response - The API response
 * @returns {Object} Processed response
 */
export const processLargeResponse = (response) => {
  // This is a simplified implementation
  // A more comprehensive version would intelligently truncate the response
  return {
    _truncated: true,
    _originalSize: JSON.stringify(response).length,
    message: 'Response was truncated due to size limitations',
    data: 'Response data is too large to display'
  };
};
