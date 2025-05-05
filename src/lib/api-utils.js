import { testCourierApi as mockTestCourierApi } from './mock-data';

/**
 * Makes an API call to test courier credentials and endpoints
 * @param {Object} credentials - The courier credentials
 * @param {string} endpoint - The API endpoint to test
 * @param {Object} payload - The payload to send
 * @returns {Promise<Object>} The API response
 */
export const testCourierApi = async (credentials, endpoint, payload) => {
  // Use mock API for testing
  return mockTestCourierApi(credentials, endpoint, payload);
};
