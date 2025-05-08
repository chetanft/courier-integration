/**
 * Development environment mock for the Netlify function db-courier-proxy
 * This file provides a mock implementation for local development
 */
import axios from 'axios';

/**
 * Mock implementation of the Netlify function for development environment
 * @param {Object} requestConfig - The request configuration
 * @returns {Promise<Object>} - The response object
 */
export const mockCourierProxy = async (requestConfig) => {
  console.log('DEVELOPMENT MODE: Using mock courier proxy');
  console.log('Request config:', requestConfig);

  try {
    // For development, we'll make the direct API call without going through Netlify
    const axiosConfig = {
      method: requestConfig.method || 'GET',
      url: requestConfig.url,
      headers: {},
      data: requestConfig.body
    };

    // Add headers if provided
    if (requestConfig.headers && Array.isArray(requestConfig.headers)) {
      requestConfig.headers.forEach(header => {
        if (header.key && header.value) {
          axiosConfig.headers[header.key] = header.value;
        }
      });
    }

    // Add auth if provided
    if (requestConfig.auth) {
      switch (requestConfig.auth.type) {
        case 'basic':
          if (requestConfig.auth.username) {
            axiosConfig.auth = {
              username: requestConfig.auth.username,
              password: requestConfig.auth.password || ''
            };
          }
          break;
        case 'bearer':
          if (requestConfig.auth.token) {
            axiosConfig.headers['Authorization'] = `Bearer ${requestConfig.auth.token}`;
          }
          break;
        case 'api_key':
          if (requestConfig.auth.apiKey) {
            axiosConfig.headers['X-API-Key'] = requestConfig.auth.apiKey;
          }
          break;
      }
    }

    console.log('Making direct API request with config:', {
      method: axiosConfig.method,
      url: axiosConfig.url,
      headers: Object.keys(axiosConfig.headers),
      hasData: !!axiosConfig.data
    });

    // Make the direct API call
    const response = await axios(axiosConfig);
    
    console.log('API response status:', response.status);
    
    return response.data;
  } catch (error) {
    console.error('Error in mock courier proxy:', error);
    
    // Return a structured error response similar to the Netlify function
    return {
      error: true,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      details: error.response?.data || {},
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent,
      timestamp: new Date().toISOString()
    };
  }
};
