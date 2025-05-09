import { makeCourierRequest as makeCourierRequestNew } from './courier-api-service-new';
import { trackShipment as trackShipmentNew, makeCustomRequest } from './courier-api-client';
// These imports are used in the deprecated functions that are kept for backward compatibility
// eslint-disable-next-line no-unused-vars
import { isPrivateUrl, redactSensitiveInfo } from './utils';
import {
  PROXY_ENDPOINTS,
  IS_DEVELOPMENT,
  API_INTENTS,
  HTTP_METHODS,
  ERROR_TYPES,
  AUTH_TYPES
} from './constants';

// Path to our primary Netlify Function proxy
const COURIER_PROXY_URL = PROXY_ENDPOINTS.PRIMARY;

/**
 * Generic function to make courier API requests through our proxy
 * @param {string} courier - Courier identifier (e.g., 'safexpress')
 * @param {string} endpoint - Endpoint identifier (e.g., 'track_shipment')
 * @param {object} data - Request payload
 * @returns {Promise} API response
 */
export const makeCourierRequest = async (courier, endpoint, data) => {
  try {
    // Use the new implementation
    return await makeCustomRequest({
      courier,
      endpoint,
      method: 'POST',
      body: data
    });
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
  // Use the new implementation
  return trackShipmentNew({
    courier,
    trackingNumber
  });
};

/**
 * Makes an API call to test courier credentials and endpoints through our proxy
 * @param {Object} requestConfig - The complete request configuration
 * @returns {Promise<Object>} The API response
 */
export const testCourierApi = async (requestConfig) => {
  try {
    console.log(`Sending request to proxy for ${requestConfig.url}`);

    // Use the new implementation
    return await makeCourierRequestNew(requestConfig);
  } catch (error) {
    console.error('Error calling courier API via proxy:', error);

    // Return a structured error response
    return {
      error: true,
      status: error.status || error.response?.status,
      statusText: error.statusText || error.response?.statusText || error.message,
      message: error.message || 'An unknown error occurred',
      details: error.details || error.response?.data || {},
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent,
      errorType: error.errorType || 'UNKNOWN_ERROR',
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
  let authType = AUTH_TYPES.NONE;
  if (credentials.api_key) {
    // Check if it's a JWT token (has 2 dots for header.payload.signature)
    if (typeof credentials.api_key === 'string' && credentials.api_key.split('.').length === 3) {
      authType = AUTH_TYPES.JWT;
    } else {
      authType = AUTH_TYPES.BEARER;
    }
  } else if (credentials.username && credentials.password) {
    authType = AUTH_TYPES.BASIC;
  }

  const requestConfig = {
    url: endpoint,
    method: apiIntent === API_INTENTS.GENERATE_AUTH_TOKEN || apiIntent === API_INTENTS.TRACK_SHIPMENT
      ? HTTP_METHODS.POST
      : HTTP_METHODS.GET,
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
  if (apiIntent === API_INTENTS.TRACK_SHIPMENT && payload?.docNo) {
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
    method: HTTP_METHODS.POST,
    apiIntent: API_INTENTS.TRACK_SHIPMENT,
    courier: 'safexpress',
    auth: {
      type: AUTH_TYPES.BEARER,
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
 * @deprecated Use refreshAuthToken from auth-service.js instead
 * This function is kept for backward compatibility and redirects to the new implementation
 */
export const refreshAuthToken = async (authConfig) => {
  console.warn('Using deprecated refreshAuthToken from api-utils.js. Please update to use auth-service.js');

  // Import the refreshAuthToken function from auth-service.js
  const { refreshAuthToken: newRefreshAuthToken } = await import('./auth-service');

  // Call the new implementation
  return newRefreshAuthToken(authConfig);
};
