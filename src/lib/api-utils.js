import axios from 'axios';
import { mockTestCourierApi } from './mock-data';

/**
 * Makes an API call to test courier credentials and endpoints
 * @param {Object} credentials - The courier credentials
 * @param {string} endpoint - The API endpoint to test
 * @param {Object} payload - The payload to send
 * @param {string} apiIntent - The type of API call to make
 * @param {boolean} useMock - Whether to use mock data (fallback)
 * @returns {Promise<Object>} The API response
 */
export const testCourierApi = async (credentials, endpoint, payload, apiIntent, useMock = false) => {
  // Use mock data if requested or for development/testing
  if (useMock) {
    console.log('Using mock data for API testing');
    return mockTestCourierApi(credentials, endpoint, payload, apiIntent);
  }

  try {
    console.log(`Making real API call to ${endpoint} with intent: ${apiIntent}`);

    // Prepare headers based on credentials
    const headers = {};

    if (credentials.api_key) {
      headers['Authorization'] = `Bearer ${credentials.api_key}`;
      // Some APIs use X-API-Key instead
      headers['X-API-Key'] = credentials.api_key;
    }

    if (credentials.username && credentials.password) {
      // Basic auth
      const basicAuth = btoa(`${credentials.username}:${credentials.password}`);
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    // Set common headers
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';

    let response;

    // Handle different API intents
    switch (apiIntent) {
      case 'generate_auth_token':
        // Auth token requests are typically POST with credentials in the body
        response = await axios.post(endpoint, {
          grant_type: 'client_credentials',
          client_id: credentials.username,
          client_secret: credentials.password || credentials.api_key,
          ...payload
        }, { headers });
        break;

      case 'fetch_static_config':
        // Config requests are typically GET
        response = await axios.get(endpoint, {
          headers,
          params: payload
        });
        break;

      case 'fetch_api_schema':
        // Schema requests are typically GET
        response = await axios.get(endpoint, {
          headers,
          params: payload
        });
        break;

      case 'track_shipment':
        // Tracking requests can be GET or POST depending on the courier
        // Try POST first, then fall back to GET if needed
        try {
          response = await axios.post(endpoint, payload, { headers });
        } catch (error) {
          if (error.response && error.response.status === 405) {
            // Method not allowed, try GET instead
            const trackingNumber = payload.docNo || payload.trackingNumber;
            response = await axios.get(`${endpoint}${endpoint.includes('?') ? '&' : '?'}trackingNumber=${trackingNumber}`, {
              headers
            });
          } else {
            throw error;
          }
        }
        break;

      default:
        // Default to a GET request
        response = await axios.get(endpoint, {
          headers,
          params: payload
        });
    }

    return response.data;
  } catch (error) {
    console.error('API call failed:', error);

    // Provide detailed error information
    const errorResponse = {
      error: true,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      details: error.response?.data || {},
      endpoint,
      apiIntent,
      timestamp: new Date().toISOString()
    };

    // For development, you might want to fall back to mock data
    if (process.env.NODE_ENV === 'development') {
      console.warn('Falling back to mock data in development mode');
      return {
        ...mockTestCourierApi(credentials, endpoint, payload, apiIntent),
        _warning: 'Using mock data due to API error',
        _error: errorResponse
      };
    }

    return errorResponse;
  }
};
