import axios from 'axios';

// Path to our Netlify Function proxy with Supabase credential support
const COURIER_PROXY_URL = '/.netlify/functions/db-courier-proxy';

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
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

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

// Add other courier-specific functions as needed
