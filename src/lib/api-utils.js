import axios from 'axios';
import { testCourierApi as mockTestCourierApi } from './mock-data';

/**
 * Makes an API call to test courier credentials and endpoints
 * @param {Object} credentials - The courier credentials
 * @param {string} endpoint - The API endpoint to test
 * @param {Object} payload - The payload to send
 * @returns {Promise<Object>} The API response
 */
export const testCourierApi = async (credentials, endpoint, payload) => {
  // Use mock API for testing without real API calls
  return mockTestCourierApi(credentials, endpoint, payload);

  // Uncomment the code below to use real API calls
  /*
  try {
    // Handle authentication if needed
    let token = null;
    if (credentials.auth_endpoint) {
      token = await getAuthToken(credentials);
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add any additional headers from credentials
    if (credentials.headers) {
      Object.keys(credentials.headers).forEach(key => {
        headers[key] = credentials.headers[key];
      });
    }

    // Make the API call
    const response = await axios({
      method: credentials.method || 'GET',
      url: endpoint,
      headers,
      data: payload,
      timeout: 10000, // 10 seconds timeout
    });

    return response.data;
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
  */
};

/**
 * Gets an authentication token from the courier's auth endpoint
 * @param {Object} credentials - The courier credentials
 * @returns {Promise<string>} The authentication token
 */
const getAuthToken = async (credentials) => {
  try {
    // Prepare auth headers
    const headers = {
      'Content-Type': credentials.auth_content_type || 'application/json',
    };

    // Add basic auth if username and password are provided
    if (credentials.username && credentials.password) {
      const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    // Add any additional headers for auth
    if (credentials.auth_headers) {
      Object.keys(credentials.auth_headers).forEach(key => {
        headers[key] = credentials.auth_headers[key];
      });
    }

    // Make the auth API call
    const response = await axios({
      method: credentials.auth_method || 'POST',
      url: credentials.auth_endpoint,
      headers,
      data: credentials.auth_payload || {},
      timeout: 5000, // 5 seconds timeout for auth
    });

    // Extract token from response based on the token_path
    if (credentials.token_path) {
      const parts = credentials.token_path.split('.');
      let token = response.data;

      for (const part of parts) {
        if (token && token[part] !== undefined) {
          token = token[part];
        } else {
          throw new Error('Token not found in response');
        }
      }

      return token;
    }

    // Default to access_token if no token_path is provided
    return response.data.access_token || response.data.token;
  } catch (error) {
    console.error('Auth token retrieval failed:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
};
