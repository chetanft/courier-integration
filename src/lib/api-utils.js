import axios from 'axios';

// Path to our Netlify Function proxy with Supabase credential support
const COURIER_PROXY_URL = '/.netlify/functions/db-courier-proxy';

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' ||
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

/**
 * Generic function to make courier API requests through our proxy
 * @param {string} courier - Courier identifier (e.g., 'safexpress')
 * @param {string} endpoint - Endpoint identifier (e.g., 'track_shipment')
 * @param {object} data - Request payload
 * @returns {Promise} API response
 */
export const makeCourierRequest = async (courier, endpoint, data) => {
  try {
    const response = await axios({
      method: 'POST',
      url: COURIER_PROXY_URL,
      data: {
        courier,
        endpoint,
        data
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error making ${courier} API request:`, error);
    throw error;
  }
};

/**
 * Track a shipment using the specified courier
 * @param {string} courier - Courier identifier
 * @param {string} trackingNumber - Shipment tracking number
 * @returns {Promise} Tracking information
 */
export const trackShipment = async (courier, trackingNumber) => {
  return makeCourierRequest(courier, 'track_shipment', { trackingNumber });
};

/**
 * Makes an API call to test courier credentials and endpoints through our proxy
 * @param {Object} requestConfig - The complete request configuration
 * @returns {Promise<Object>} The API response
 */
export const testCourierApi = async (requestConfig) => {
  try {
    console.log(`Sending request to proxy for ${requestConfig.url}`);

    // Ensure URL is properly formatted
    if (requestConfig.url) {
      // Make sure URL has a protocol
      if (!requestConfig.url.startsWith('http://') && !requestConfig.url.startsWith('https://')) {
        console.log('URL does not have a protocol, adding https://');
        requestConfig.url = 'https://' + requestConfig.url;
      }

      // Trim any whitespace
      requestConfig.url = requestConfig.url.trim();

      console.log('Formatted URL:', requestConfig.url);

      // Check if the URL is a private IP or localhost
      try {
        const urlObj = new URL(requestConfig.url);
        const hostname = urlObj.hostname;

        // Check for localhost or private IPs
        if (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)) {

          console.error('URL points to a private IP or localhost which Netlify functions cannot access:', hostname);
          return {
            error: true,
            status: 502,
            statusText: 'Bad Gateway',
            message: 'Cannot connect to private IP address or localhost',
            details: {
              url: requestConfig.url,
              hostname: hostname,
              suggestion: "Netlify functions cannot access private IP addresses or localhost. Please use a public API endpoint."
            },
            timestamp: new Date().toISOString()
          };
        }
      } catch (urlError) {
        console.error('Error parsing URL:', urlError);
      }
    }

    // Set flag to use database credentials if not explicitly provided
    if (requestConfig.auth && !requestConfig.auth.username && !requestConfig.auth.apiKey && !requestConfig.auth.token) {
      requestConfig.auth.useDbCredentials = true;
    }

    // Add timeout if not already set
    if (!requestConfig.timeout) {
      requestConfig.timeout = 30000; // 30 seconds default timeout
    }

    // Add retry configuration if not already set
    if (!requestConfig.retry) {
      requestConfig.retry = 2; // Default to 2 retries
      requestConfig.retryDelay = 1000; // 1 second between retries
    }

    // Log the full request config for debugging (excluding sensitive data)
    const debugConfig = { ...requestConfig };
    if (debugConfig.auth) {
      // Redact sensitive information
      if (debugConfig.auth.password) debugConfig.auth.password = '***REDACTED***';
      if (debugConfig.auth.token) debugConfig.auth.token = '***REDACTED***';
      if (debugConfig.auth.apiKey) debugConfig.auth.apiKey = '***REDACTED***';
    }
    console.log('Sending request config to proxy:', debugConfig);

    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development' ||
                 window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';

    // In development mode, return a mock response for auth token generation
    if (isDev && requestConfig.apiIntent === 'generate_auth_token') {
      console.log('Development mode detected. Returning mock auth token response.');
      return {
        access_token: 'mock_dev_token_' + Date.now(),
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'all',
        dev_mode: true
      };
    }

    // Make API call through our Netlify proxy
    const response = await axios.post(COURIER_PROXY_URL, requestConfig);

    // Check if the response indicates an error
    if (response.data && response.data.error) {
      console.error('API proxy returned an error:', response.data);

      // If it's a 502 Bad Gateway error, provide a more helpful message
      if (response.data.status === 502) {
        const details = response.data.details || {};
        const networkDetails = response.data.networkDetails || {};

        // Create a user-friendly error message
        let errorMessage = 'Cannot connect to the API server. ';

        if (networkDetails.errorCode === 'ENOTFOUND') {
          errorMessage += 'The hostname could not be resolved. Please check if the URL is correct.';
        } else if (networkDetails.errorCode === 'ECONNREFUSED') {
          errorMessage += 'The connection was refused. The server might be down or not accepting connections.';
        } else if (networkDetails.errorCode === 'ETIMEDOUT') {
          errorMessage += 'The connection timed out. The server might be slow or unreachable.';
        } else {
          errorMessage += response.data.message || 'Please check if the API server is running and accessible.';
        }

        return {
          error: true,
          status: 502,
          statusText: 'Bad Gateway',
          message: errorMessage,
          details: {
            ...details,
            networkDetails,
            url: requestConfig.url,
            suggestion: "Please verify the API URL is correct and the server is accessible from Netlify's functions."
          },
          timestamp: new Date().toISOString()
        };
      }
    }

    // Return the response data, which comes pre-formatted from our proxy
    return response.data;
  } catch (error) {
    console.error('Error calling courier API via proxy:', error);
    console.error('Error details:', error);

    // Check if this is a 404 error for the Netlify function (common in development)
    if (error.response?.status === 404 &&
        error.config?.url?.includes('/.netlify/functions/')) {
      console.warn('Netlify function not found. This is expected in development environment.');

      return {
        error: true,
        status: 404,
        statusText: 'Not Found',
        message: 'Netlify function not available in development environment',
        details: {
          suggestion: 'This feature requires deployment to Netlify to work properly. In development mode, this functionality is limited.'
        },
        timestamp: new Date().toISOString()
      };
    }

    // Check if this is an authentication error (401 Unauthorized)
    const isAuthError = error.response?.status === 401 ||
                       (error.response?.data?.error &&
                        (error.response?.data?.message?.toLowerCase().includes('unauthorized') ||
                         error.response?.data?.message?.toLowerCase().includes('token expired') ||
                         error.response?.data?.message?.toLowerCase().includes('invalid token')));

    // If it's an auth error and we have JWT auth config, try to refresh the token
    if (isAuthError &&
        requestConfig.auth?.type === 'bearer' &&
        requestConfig.auth?.jwtAuthEndpoint) {

      try {
        console.log('Detected expired token. Attempting to refresh...');

        // Refresh the token
        const newToken = await refreshAuthToken(requestConfig.auth);

        // Update the token in the request config
        requestConfig.auth.token = newToken;

        console.log('Token refreshed successfully. Retrying the original request...');

        // Retry the original request with the new token
        return testCourierApi(requestConfig);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // Continue with the original error
      }
    }

    // Check if it's a network error
    const isNetworkError = error.code === 'ECONNABORTED' ||
                          error.message.includes('timeout') ||
                          error.message.includes('Network Error');

    // Create a user-friendly error message
    let errorMessage = error.message;
    if (isNetworkError) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'The request timed out. The API server might be slow or unreachable.';
      } else {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
    }

    // Return a structured error response
    return {
      error: true,
      status: error.response?.status,
      statusText: error.response?.statusText || error.message,
      message: errorMessage,
      details: error.response?.data || {},
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent,
      isNetworkError,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Legacy API for backward compatibility
 * @deprecated Use the new testCourierApi with requestConfig instead
 */
export const testCourierApiLegacy = async (credentials, endpoint, payload, apiIntent) => {
  // Try to determine courier from endpoint
  let courier = '';
  if (endpoint.includes('safexpress')) {
    courier = 'safexpress';
  } else if (endpoint.includes('delhivery')) {
    courier = 'delhivery';
  }
  // Add more courier detections as needed

  // Determine auth type
  let authType = 'none';
  if (credentials.api_key) {
    // Check if it's a JWT token (has 2 dots for header.payload.signature)
    if (typeof credentials.api_key === 'string' && credentials.api_key.split('.').length === 3) {
      authType = 'jwt';
    } else {
      authType = 'bearer';
    }
  } else if (credentials.username && credentials.password) {
    authType = 'basic';
  }

  const requestConfig = {
    url: endpoint,
    method: apiIntent === 'generate_auth_token' || apiIntent === 'track_shipment' ? 'POST' : 'GET',
    apiIntent,
    courier, // Add courier identifier for credential lookup
    auth: {
      type: authType,
      // If credentials are provided, use them
      username: credentials.username,
      password: credentials.password,
      token: credentials.api_key,
      // If no credentials, get from database
      useDbCredentials: !credentials.username && !credentials.password && !credentials.api_key
    },
    body: payload,
    headers: []
  };

  // Add test docket for tracking
  if (apiIntent === 'track_shipment' && payload?.docNo) {
    requestConfig.testDocket = payload.docNo;
  }

  return testCourierApi(requestConfig);
};

/**
 * Specific function for testing Safexpress API
 * @param {string} trackingNumber - The tracking number to test
 * @param {string} authToken - The authorization token
 * @param {string} apiKey - The x-api-key value
 * @returns {Promise<Object>} The API response
 */
export const testSafexpressApi = async (trackingNumber, authToken, apiKey) => {
  const requestConfig = {
    url: 'https://apigateway.safexpress.com/wbtrack/SafexWaybillTracking/webresources/safex_customer/tracking',
    method: 'POST',
    apiIntent: 'track_shipment',
    courier: 'safexpress',
    auth: {
      type: 'bearer',
      token: authToken,
      apiKey: apiKey
    },
    body: {
      docNo: trackingNumber,
      docType: 'WB'
    },
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ]
  };

  return testCourierApi(requestConfig);
};

/**
 * Refreshes an authentication token using the provided configuration
 * @param {Object} authConfig - The authentication configuration
 * @param {string} authConfig.jwtAuthEndpoint - The endpoint to request a new token
 * @param {string} authConfig.jwtAuthMethod - The HTTP method to use (default: POST)
 * @param {Array} authConfig.jwtAuthHeaders - Headers to include in the request
 * @param {Object} authConfig.jwtAuthBody - Body to include in the request
 * @param {string} authConfig.jwtTokenPath - Path to the token in the response
 * @returns {Promise<string>} The refreshed token
 */
export const refreshAuthToken = async (authConfig) => {
  try {
    console.log('Refreshing authentication token...');

    // Validate required fields
    if (!authConfig.jwtAuthEndpoint) {
      throw new Error('Auth endpoint URL is required for token refresh');
    }

    // Define possible proxy endpoints to try
    const proxyEndpoints = [
      '/.netlify/functions/db-courier-proxy',  // Primary endpoint
      '/.netlify/functions/courier-proxy',     // Fallback endpoint
      '/.netlify/functions/api-proxy'          // Another fallback
    ];

    let response = null;
    let lastError = null;

    // Try each endpoint until one works
    for (const endpoint of proxyEndpoints) {
      try {
        console.log(`Attempting to refresh token using proxy endpoint: ${endpoint}`);

        // Create a request to the proxy
        response = await axios.post(endpoint, {
          url: authConfig.jwtAuthEndpoint,
          method: authConfig.jwtAuthMethod || 'POST',
          headers: authConfig.jwtAuthHeaders || [],
          body: authConfig.jwtAuthBody || {},
          apiIntent: 'generate_auth_token'
        });

        console.log(`Token refresh success with endpoint ${endpoint}`);
        break;
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error.message);
        lastError = error;
        // Continue to the next endpoint
      }
    }

    // If all proxies failed
    if (!response) {
      throw new Error(`Token refresh failed across all proxy endpoints: ${lastError?.message}`);
    }

    // Process the response
    if (response.data.error) {
      throw new Error(response.data.message || 'Failed to refresh token');
    }

    // Extract the token using the provided path
    const tokenPath = authConfig.jwtTokenPath || 'access_token';
    let token = response.data;

    // Use lodash-style get for nested paths
    const pathParts = tokenPath.split('.');
    for (const part of pathParts) {
      if (token && typeof token === 'object' && part in token) {
        token = token[part];
      } else {
        throw new Error(`Token path "${tokenPath}" not found in response`);
      }
    }

    if (!token || typeof token !== 'string') {
      throw new Error(`Token not found in response using path "${tokenPath}"`);
    }

    console.log('Token refreshed successfully');
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

// Add other courier-specific functions as needed
