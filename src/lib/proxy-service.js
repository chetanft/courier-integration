/**
 * Proxy Service
 *
 * This service provides proxy functionality for making API requests
 * to external services that might have CORS restrictions.
 */

import axios from 'axios';
import { testCourierApi } from './api-utils';

/**
 * Make a direct API request without using a proxy
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Promise resolving to the response data
 */
export const directFetch = async (url, options = {}) => {
  try {
    console.log(`Making direct request to: ${url}`);

    // Create axios request config
    const requestConfig = {
      url,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.body
    };

    // Add timeout and validation options
    requestConfig.timeout = 30000; // 30 seconds
    requestConfig.validateStatus = function (status) {
      return status < 500; // Only reject if server error, we'll handle client errors
    };

    console.log('Direct fetch request config:', {
      url: requestConfig.url,
      method: requestConfig.method,
      headers: requestConfig.headers
    });

    // Make the request using axios
    const response = await axios(requestConfig);

    // Log response status
    console.log(`Direct fetch response status: ${response.status}`);

    // Return the response data
    return response.data;
  } catch (error) {
    console.error('Error making API request:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });

    // Create a more detailed error object
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url,
      isNetworkError: error.message?.includes('Network Error') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK'
    };

    console.error('Structured error details:', errorDetails);
    throw errorDetails;
  }
};

/**
 * Make an API request through our server-side proxy
 * This helps bypass CORS restrictions
 *
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Promise resolving to the response data
 */
export const proxyFetch = async (url, options = {}) => {
  try {
    console.log(`Making proxied request to: ${url}`);

    // Create request config for the proxy
    const requestConfig = {
      url,
      method: options.method || 'GET',
      apiIntent: 'fetch_courier_data',
      headers: options.headers || [],
      queryParams: options.queryParams || [],
      body: options.body || {}
    };

    // Add custom headers for better debugging
    requestConfig.headers.push({
      key: 'X-Courier-Integration-Client',
      value: 'proxy-fetch'
    });

    console.log('Proxy fetch request config:', {
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent
    });

    // Use the testCourierApi function which goes through our server-side proxy
    const response = await testCourierApi(requestConfig);

    // Log response details
    console.log('Proxy fetch response received:', {
      error: response.error,
      status: response.status,
      hasData: !!response
    });

    // Check if the response contains an error
    if (response.error) {
      console.error('Proxy fetch error details:', {
        message: response.message,
        status: response.status,
        statusText: response.statusText
      });

      throw {
        message: response.message || 'Proxy request failed',
        status: response.status,
        statusText: response.statusText,
        data: response.details
      };
    }

    return response;
  } catch (error) {
    console.error('Error making proxied request:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      statusText: error.statusText,
      data: error.data
    });

    // Create a more detailed error object
    const errorDetails = {
      message: error.message || 'Failed to make proxied request',
      code: error.code,
      status: error.status,
      statusText: error.statusText,
      data: error.data,
      url,
      isNetworkError: error.message?.includes('Network Error') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK'
    };

    console.error('Structured proxy error details:', errorDetails);
    throw errorDetails;
  }
};
