/**
 * Core API Service
 *
 * This service provides centralized API functionality for the courier integration platform.
 * It handles authentication, request/response processing, and error handling.
 */

import axios from 'axios';
import { getNestedValue } from './utils';
import {
  PROXY_ENDPOINTS,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY,
  ERROR_TYPES
} from './constants';

/**
 * Determine the type of error from an API response or error object
 * @param {Object} error - The error object
 * @returns {string} The error type
 */
export const determineErrorType = (error) => {
  // Check for network errors
  if (error.code === 'ECONNABORTED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      (error.message && error.message.includes('Network Error'))) {
    return ERROR_TYPES.NETWORK;
  }

  // Check for authentication errors
  if (error.status === 401 || error.status === 403 ||
      (error.message && (
        error.message.toLowerCase().includes('unauthorized') ||
        error.message.toLowerCase().includes('forbidden') ||
        error.message.toLowerCase().includes('token expired') ||
        error.message.toLowerCase().includes('invalid token')
      ))) {
    return ERROR_TYPES.AUTH;
  }

  // Check for response size errors
  if (error.details?.errorType === 'Function.ResponseSizeTooLarge' ||
      error.details?.message?.includes('payload size exceeded') ||
      error.message?.includes('payload size exceeded')) {
    return ERROR_TYPES.RESPONSE_SIZE;
  }

  // Check for timeout errors
  if (error.code === 'ECONNABORTED' ||
      (error.message && error.message.includes('timeout'))) {
    return ERROR_TYPES.TIMEOUT;
  }

  // Check for server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return ERROR_TYPES.SERVER;
  }

  // Check for client errors (4xx)
  if (error.status >= 400 && error.status < 500) {
    return ERROR_TYPES.CLIENT;
  }

  // Default to unknown error
  return ERROR_TYPES.UNKNOWN;
};

/**
 * Create a standardized error response object
 * @param {Object} error - The error object
 * @param {Object} requestConfig - The original request configuration
 * @returns {Object} Standardized error response
 */
export const createErrorResponse = (error, requestConfig = {}) => {
  const errorType = determineErrorType(error);
  const timestamp = new Date().toISOString();

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
    errorType,
    status: error.status || error.response?.status,
    statusText: error.statusText || error.response?.statusText,
    message: error.message || 'An unknown error occurred',
    timestamp,
    requestDetails: {
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent
    }
  };

  // Add error-type specific details
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      errorResponse.message = getNetworkErrorMessage(error);
      errorResponse.details = {
        code: error.code,
        hostname: error.hostname || new URL(requestConfig.url).hostname,
        suggestion: 'Check your internet connection and ensure the API server is accessible.'
      };
      break;

    case ERROR_TYPES.AUTH:
      errorResponse.message = 'Authentication failed. Please check your credentials.';
      errorResponse.details = {
        originalMessage: error.message,
        suggestion: 'Verify your API key, token, or username/password.'
      };
      break;

    case ERROR_TYPES.RESPONSE_SIZE:
      errorResponse.message = 'The API response is too large (exceeds 6MB limit).';
      errorResponse.details = {
        suggestion: 'Use pagination or filtering to reduce the response size.'
      };
      break;

    default:
      errorResponse.details = error.details || error.response?.data || {};
  }

  return errorResponse;
};

/**
 * Get a user-friendly message for network errors
 * @param {Object} error - The network error
 * @returns {string} User-friendly error message
 */
const getNetworkErrorMessage = (error) => {
  if (error.code === 'ENOTFOUND') {
    return `The hostname "${error.hostname || 'unknown'}" could not be resolved. Please check if the URL is correct.`;
  }
  if (error.code === 'ECONNREFUSED') {
    return 'The connection was refused. The server might be down or not accepting connections.';
  }
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return 'The connection timed out. The server might be slow or unreachable.';
  }
  return 'Network error occurred. Please check your internet connection and try again.';
};

/**
 * Make an API request through one of our proxy endpoints
 * @param {Object} requestConfig - The request configuration
 * @returns {Promise<Object>} The API response
 */
export const makeProxyRequest = async (requestConfig) => {
  // Validate and normalize the request configuration
  const normalizedConfig = normalizeRequestConfig(requestConfig);

  // Try each proxy endpoint until one works
  let lastError = null;

  for (const endpoint of Object.values(PROXY_ENDPOINTS)) {
    try {
      console.log(`Attempting request via proxy endpoint: ${endpoint}`);
      const response = await axios.post(endpoint, normalizedConfig);

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
 * Normalize and validate a request configuration
 * @param {Object} config - The request configuration
 * @returns {Object} Normalized configuration
 */
const normalizeRequestConfig = (config) => {
  const normalized = { ...config };

  // Ensure URL has a protocol
  if (normalized.url && !normalized.url.startsWith('http://') && !normalized.url.startsWith('https://')) {
    normalized.url = 'https://' + normalized.url;
  }

  // Add default timeout if not set
  if (!normalized.timeout) {
    normalized.timeout = DEFAULT_TIMEOUT;
  }

  // Add default retry configuration if not set
  if (!normalized.retry) {
    normalized.retry = DEFAULT_RETRIES;
    normalized.retryDelay = DEFAULT_RETRY_DELAY;
  }

  return normalized;
};

/**
 * Extract a value from a response using a path string
 * @param {Object} response - The response object
 * @param {string} path - The path to the value (e.g., 'data.token')
 * @returns {*} The extracted value
 */
export const extractFromResponse = (response, path) => {
  return getNestedValue(response, path);
};

/**
 * Check if a response is paginated and needs additional requests
 * @param {Object} response - The API response
 * @returns {boolean} True if the response is paginated
 */
export const isPaginatedResponse = (response) => {
  // Check common pagination patterns
  return !!(
    (response.pagination && (response.pagination.next_page || response.pagination.hasMore)) ||
    (response.meta && response.meta.pagination && (response.meta.pagination.next || response.meta.pagination.hasMore)) ||
    response.next_page_url ||
    response.next_page ||
    response.hasMore ||
    response.has_more
  );
};

/**
 * Get the next page URL or parameters from a paginated response
 * @param {Object} response - The API response
 * @returns {Object|null} Next page information or null if not found
 */
export const getNextPageInfo = (response) => {
  if (!isPaginatedResponse(response)) {
    return null;
  }

  // Handle different pagination formats
  if (response.next_page_url) {
    return { url: response.next_page_url };
  }

  if (response.pagination && response.pagination.next_page) {
    return { page: response.pagination.next_page };
  }

  if (response.meta && response.meta.pagination && response.meta.pagination.next) {
    return { url: response.meta.pagination.next };
  }

  // Default to null if we can't determine the next page
  return null;
};
