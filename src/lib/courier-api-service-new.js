/**
 * Courier API Service
 *
 * This service provides a centralized interface for making API requests to courier services.
 * It handles authentication, request/response processing, and error handling.
 */

import { makeProxyRequest, createErrorResponse, isPaginatedResponse, getNextPageInfo } from './api-service-core';
import { generateAuthToken, getCachedToken, isTokenValid } from './auth-service';
// eslint-disable-next-line no-unused-vars
import { refreshAuthToken } from './auth-service';
import { redactSensitiveInfo, exceedsMaxSize, isPrivateUrl } from './utils';
import { MAX_RESPONSE_SIZE, ERROR_TYPES } from './constants';

/**
 * Make a courier API request
 *
 * @param {Object} requestConfig - Request configuration
 * @param {string} requestConfig.url - API endpoint URL
 * @param {string} requestConfig.method - HTTP method (default: GET)
 * @param {Array} requestConfig.headers - Request headers
 * @param {Object} requestConfig.body - Request body
 * @param {string} requestConfig.apiIntent - API intent (e.g., 'track_shipment')
 * @param {string} requestConfig.courier - Courier identifier for credential lookup
 * @param {Object} requestConfig.auth - Authentication configuration
 * @param {boolean} requestConfig.pagination - Whether to handle pagination
 * @returns {Promise<Object>} API response
 */
export const makeCourierRequest = async (requestConfig) => {
  try {
    console.log('Making courier API request:', redactSensitiveInfo({
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent,
      courier: requestConfig.courier,
      hasAuth: !!requestConfig.auth,
      hasBody: !!requestConfig.body
    }));

    // Validate URL
    if (!requestConfig.url) {
      throw new Error('URL is required');
    }

    // Check for private URLs that Netlify functions can't access
    if (isPrivateUrl(requestConfig.url)) {
      return {
        error: true,
        errorType: ERROR_TYPES.NETWORK,
        status: 502,
        statusText: 'Bad Gateway',
        message: 'Cannot connect to private IP address or localhost',
        details: {
          url: requestConfig.url,
          suggestion: "Netlify functions cannot access private IP addresses or localhost. Please use a public API endpoint."
        },
        timestamp: new Date().toISOString()
      };
    }

    // Handle authentication
    if (requestConfig.auth) {
      await handleAuthentication(requestConfig);
    }

    // Make the API request
    const response = await makeProxyRequest(requestConfig);

    // Check for response size issues
    if (exceedsMaxSize(response, MAX_RESPONSE_SIZE)) {
      return {
        error: true,
        errorType: ERROR_TYPES.RESPONSE_SIZE,
        message: 'API response exceeds maximum size limit (5MB)',
        details: {
          suggestion: 'Use pagination or filtering to reduce the response size',
          approximateSize: `${Math.round(exceedsMaxSize(response) / (1024 * 1024))}MB`
        },
        timestamp: new Date().toISOString()
      };
    }

    // Handle pagination if requested
    if (requestConfig.pagination && isPaginatedResponse(response)) {
      return handlePagination(requestConfig, response);
    }

    return response;
  } catch (error) {
    console.error('Error making courier API request:', error);
    return createErrorResponse(error, requestConfig);
  }
};

/**
 * Handle authentication for a request
 *
 * @param {Object} requestConfig - Request configuration
 * @returns {Promise<void>}
 */
const handleAuthentication = async (requestConfig) => {
  const auth = requestConfig.auth;

  // Skip if no auth config
  if (!auth || auth.type === 'none') {
    return;
  }

  // Check for cached token if courier is specified
  if (requestConfig.courier && (auth.type === 'bearer' || auth.type === 'jwt')) {
    const cachedToken = getCachedToken(requestConfig.courier);

    if (cachedToken && isTokenValid(cachedToken.token)) {
      console.log(`Using cached ${cachedToken.type} token for ${requestConfig.courier}`);

      // Add token to auth config
      auth.token = cachedToken.token;

      // Add Authorization header if not already present
      const hasAuthHeader = requestConfig.headers?.some(h => h.key.toLowerCase() === 'authorization');

      if (!hasAuthHeader) {
        requestConfig.headers = requestConfig.headers || [];
        requestConfig.headers.push({
          key: 'Authorization',
          value: `Bearer ${cachedToken.token}`
        });
      }

      return;
    }
  }

  // Handle different auth types
  switch (auth.type) {
    case 'basic':
      // Add Basic auth header if credentials are provided
      if (auth.username) {
        const credentials = `${auth.username}:${auth.password || ''}`;
        const base64Credentials = btoa(credentials);

        // Add Authorization header if not already present
        const hasAuthHeader = requestConfig.headers?.some(h => h.key.toLowerCase() === 'authorization');

        if (!hasAuthHeader) {
          requestConfig.headers = requestConfig.headers || [];
          requestConfig.headers.push({
            key: 'Authorization',
            value: `Basic ${base64Credentials}`
          });
        }
      }
      break;

    case 'bearer':
    case 'jwt':
      // If token is provided, use it
      if (auth.token) {
        // Add Authorization header if not already present
        const hasAuthHeader = requestConfig.headers?.some(h => h.key.toLowerCase() === 'authorization');

        if (!hasAuthHeader) {
          requestConfig.headers = requestConfig.headers || [];
          requestConfig.headers.push({
            key: 'Authorization',
            value: `Bearer ${auth.token}`
          });
        }
      }
      // If JWT auth endpoint is provided, generate a token
      else if (auth.jwtAuthEndpoint) {
        try {
          const tokenResult = await generateAuthToken({
            url: auth.jwtAuthEndpoint,
            method: auth.jwtAuthMethod || 'POST',
            headers: auth.jwtAuthHeaders || [],
            body: auth.jwtAuthBody || {},
            tokenPath: auth.jwtTokenPath || 'access_token',
            courier: requestConfig.courier
          });

          // Add token to auth config
          auth.token = tokenResult.token;

          // Add Authorization header if not already present
          const hasAuthHeader = requestConfig.headers?.some(h => h.key.toLowerCase() === 'authorization');

          if (!hasAuthHeader) {
            requestConfig.headers = requestConfig.headers || [];
            requestConfig.headers.push({
              key: 'Authorization',
              value: `Bearer ${tokenResult.token}`
            });
          }
        } catch (error) {
          console.error('Error generating JWT token:', error);
          throw error;
        }
      }
      break;

    case 'api_key':
      // Add API key header if provided
      if (auth.token) {
        // Determine header name based on courier or use default
        let headerName = 'X-API-Key';

        if (requestConfig.courier === 'safexpress') {
          headerName = 'x-api-key';
        }

        // Add API key header if not already present
        const hasApiKeyHeader = requestConfig.headers?.some(h => h.key.toLowerCase() === headerName.toLowerCase());

        if (!hasApiKeyHeader) {
          requestConfig.headers = requestConfig.headers || [];
          requestConfig.headers.push({
            key: headerName,
            value: auth.token
          });
        }
      }
      break;
  }
};

/**
 * Handle paginated responses
 *
 * @param {Object} requestConfig - Original request configuration
 * @param {Object} initialResponse - Initial API response
 * @returns {Promise<Object>} Combined response from all pages
 */
const handlePagination = async (requestConfig, initialResponse) => {
  // Start with the initial response
  let combinedResponse = { ...initialResponse };
  let currentResponse = initialResponse;
  let pageCount = 1;

  // Maximum number of pages to fetch (to prevent infinite loops)
  const maxPages = requestConfig.maxPages || 5;

  // Continue fetching pages until there are no more or we reach the limit
  while (pageCount < maxPages) {
    // Get next page info
    const nextPageInfo = getNextPageInfo(currentResponse);

    if (!nextPageInfo) {
      break;
    }

    console.log(`Fetching page ${pageCount + 1}...`);

    // Create a new request config for the next page
    const nextPageConfig = { ...requestConfig };

    // Update URL or parameters based on pagination style
    if (nextPageInfo.url) {
      nextPageConfig.url = nextPageInfo.url;
    } else if (nextPageInfo.page) {
      // Add or update page parameter
      nextPageConfig.body = { ...nextPageConfig.body, page: nextPageInfo.page };
    }

    // Make the request for the next page
    const nextPageResponse = await makeProxyRequest(nextPageConfig);

    // Check for errors
    if (nextPageResponse.error) {
      console.error('Error fetching next page:', nextPageResponse);
      break;
    }

    // Merge the responses based on the data structure
    mergeResponses(combinedResponse, nextPageResponse);

    // Update current response for the next iteration
    currentResponse = nextPageResponse;
    pageCount++;

    // Check if the combined response is getting too large
    if (exceedsMaxSize(combinedResponse, MAX_RESPONSE_SIZE)) {
      console.warn('Combined response size exceeds limit, stopping pagination');

      // Add a warning to the response
      combinedResponse.pagination_warning = 'Response size limit reached, not all pages were fetched';
      break;
    }
  }

  // Add pagination metadata
  combinedResponse.pagination_meta = {
    total_pages_fetched: pageCount,
    max_pages: maxPages,
    complete: pageCount < maxPages && !getNextPageInfo(currentResponse)
  };

  return combinedResponse;
};

/**
 * Merge paginated responses
 *
 * @param {Object} target - Target response object to merge into
 * @param {Object} source - Source response object to merge from
 */
const mergeResponses = (target, source) => {
  // Common data field names in API responses
  const dataFields = ['data', 'items', 'results', 'content', 'records', 'couriers'];

  // Find the data field in both responses
  let targetDataField = null;
  let sourceDataField = null;

  for (const field of dataFields) {
    if (Array.isArray(target[field])) {
      targetDataField = field;
    }
    if (Array.isArray(source[field])) {
      sourceDataField = field;
    }
  }

  // If we found data arrays in both responses, merge them
  if (targetDataField && sourceDataField) {
    target[targetDataField] = [...target[targetDataField], ...source[sourceDataField]];
  } else {
    // If we can't find matching data fields, just add a new field with the source data
    target.additional_pages = target.additional_pages || [];
    target.additional_pages.push(source);
  }
};
