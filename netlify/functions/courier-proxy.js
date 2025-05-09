const axios = require('axios');
const { courierConfigs, validateCourierConfig } = require('../../src/config/courier-config');

/**
 * Fetches a JWT token from the specified endpoint
 * @param {Object} jwtConfig - The JWT configuration
 * @returns {Promise<string>} The JWT token
 */
const fetchJwtToken = async (jwtConfig) => {
  try {
    console.log('Fetching JWT token from:', jwtConfig.jwtAuthEndpoint);

    // Prepare headers for JWT auth request
    const headers = {};

    // Add custom headers
    if (jwtConfig.jwtAuthHeaders && Array.isArray(jwtConfig.jwtAuthHeaders)) {
      jwtConfig.jwtAuthHeaders.forEach(header => {
        if (header.key && header.value) {
          headers[header.key] = header.value;
        }
      });
    }

    // Set default content type if not specified
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Create axios request config
    const axiosConfig = {
      method: jwtConfig.jwtAuthMethod || 'POST',
      url: jwtConfig.jwtAuthEndpoint,
      headers
    };

    // Add request body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(axiosConfig.method.toUpperCase()) && jwtConfig.jwtAuthBody) {
      axiosConfig.data = jwtConfig.jwtAuthBody;
    }

    console.log('Making JWT auth request with config:', axiosConfig);
    const response = await axios(axiosConfig);

    // Extract token from response using the specified path
    const tokenPath = jwtConfig.jwtTokenPath || 'access_token';
    const pathParts = tokenPath.split('.');

    let token = response.data;
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

    console.log('JWT token fetched successfully');
    return token;
  } catch (error) {
    console.error('Error fetching JWT token:', error);
    throw error;
  }
};

/**
 * Makes an API call to courier endpoint
 * @param {Object} requestConfig - The complete request configuration
 * @returns {Promise<Object>} The API response
 */
const makeCourierApiCall = async (requestConfig) => {
  try {
    // Handle JWT Token Auth
    if (requestConfig.auth?.type === 'jwt_auth') {
      try {
        console.log('JWT Token Auth detected, fetching token first');
        const token = await fetchJwtToken(requestConfig.auth);

        // Store the token in the request config
        requestConfig.auth.token = token;

        // Change auth type to 'bearer' for the main request
        requestConfig.auth.type = 'bearer';

        console.log('JWT token fetched and stored for main request');
      } catch (error) {
        console.error('Error fetching JWT token:', error);
        return {
          error: true,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: `Failed to fetch JWT token: ${error.message}`,
          details: error.response?.data || {},
          timestamp: new Date().toISOString()
        };
      }
    }

    console.log(`Making API call to ${requestConfig.url} with intent: ${requestConfig.apiIntent}`);

    // Prepare headers
    const headers = {};

    // Add custom headers from the request config
    if (requestConfig.headers && Array.isArray(requestConfig.headers)) {
      console.log('Processing headers from request config:', requestConfig.headers);

      requestConfig.headers.forEach(header => {
        if (header.key && header.value !== undefined) {
          console.log(`Adding header: ${header.key} = ${typeof header.value === 'string' ? header.value : String(header.value)}`);
          headers[header.key] = typeof header.value === 'string' ? header.value : String(header.value);
        }
      });
    } else {
      console.log('No headers found in request config');
    }

    // Add auth headers based on auth type
    switch (requestConfig.auth?.type) {
      case 'bearer':
        // Check if the token already starts with 'Bearer ' prefix
        const token = requestConfig.auth.token;
        if (token) {
          headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        } else {
          console.warn('Bearer token is missing or undefined');
        }
        break;
      case 'basic':
        // Use Buffer.from for base64 encoding in Node.js (instead of btoa which is browser-only)
        headers['Authorization'] = `Basic ${Buffer.from(`${requestConfig.auth.username}:${requestConfig.auth.password}`).toString('base64')}`;
        break;
      case 'api_key':
        if (requestConfig.auth.apiKeyLocation === 'header') {
          headers[requestConfig.auth.apiKeyName || 'x-api-key'] = requestConfig.auth.apiKey;
        }
        break;
    }

    // Create axios request config with sanitized headers
    const sanitizedHeaders = {};

    // Process headers to ensure they're all strings
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        sanitizedHeaders[key] = String(value);
      }
    }

    // Add content type header
    sanitizedHeaders['Content-Type'] = requestConfig.isFormUrlEncoded ? 'application/x-www-form-urlencoded' : 'application/json';

    const axiosConfig = {
      method: requestConfig.method || 'GET',
      url: requestConfig.url,
      headers: sanitizedHeaders,
      // Add timeout
      timeout: 30000, // 30 seconds
      // Add validateStatus to handle all status codes
      validateStatus: function () {
        return true; // Don't reject any status codes, we'll handle them in our code
      }
    };

    // Handle query parameters
    if (requestConfig.queryParams && Array.isArray(requestConfig.queryParams)) {
      const params = new URLSearchParams();
      requestConfig.queryParams.forEach(param => {
        if (param.key && param.value !== undefined) {
          params.append(param.key, param.value);
        }
      });
      if (params.toString()) {
        const separator = requestConfig.url.includes('?') ? '&' : '?';
        axiosConfig.url = `${requestConfig.url}${separator}${params.toString()}`;
      }
    }

    // Handle request body
    if (['POST', 'PUT', 'PATCH'].includes(axiosConfig.method.toUpperCase())) {
      if (requestConfig.isFormUrlEncoded) {
        const params = new URLSearchParams();
        Object.entries(requestConfig.body || {}).forEach(([key, value]) => {
          params.append(key, value);
        });
        axiosConfig.data = params.toString();
      } else {
        axiosConfig.data = requestConfig.body;
      }
    }

    // Special handling for different API intents
    switch (requestConfig.apiIntent) {
      case 'track_shipment':
        // For tracking, add the tracking number to the URL if it's a GET request
        // and the tracking number is in the body
        if (axiosConfig.method.toUpperCase() === 'GET' &&
            requestConfig.testDocket &&
            !requestConfig.url.includes(requestConfig.testDocket)) {

          const separator = requestConfig.url.includes('?') ? '&' : '?';
          axiosConfig.url = `${requestConfig.url}${separator}trackingNumber=${requestConfig.testDocket}`;
        }

        // For POST requests, ensure the tracking number is in the body
        if (axiosConfig.method.toUpperCase() === 'POST' &&
            requestConfig.testDocket &&
            typeof axiosConfig.data === 'object') {

          axiosConfig.data = {
            ...axiosConfig.data,
            docNo: requestConfig.testDocket,
            docType: "WB"  // Add docType for Safexpress
          };
        }
        break;
    }

    // Make the request
    console.log('Making request with config:', axiosConfig);
    console.log('Headers being sent:', axiosConfig.headers);

    try {
      const response = await axios(axiosConfig);
      console.log('API response:', response.status);

      // Check if the response indicates an error
      if (response.status >= 400) {
        // Create a more descriptive error message
        let errorMessage = response.data?.message || 'API request failed';

        // Add status code to the message if available
        if (response.status) {
          errorMessage = `API request failed with status ${response.status} (${response.statusText || 'Unknown Error'})`;
        }

        // Add more context based on status code
        if (response.status === 401 || response.status === 403) {
          errorMessage += ': Authentication failed or insufficient permissions';
        } else if (response.status === 404) {
          errorMessage += ': Endpoint not found';
        } else if (response.status === 500) {
          errorMessage += ': Server error occurred';
        } else if (response.status === 502 || response.status === 503 || response.status === 504) {
          errorMessage += ': Server unavailable or gateway error';
        }

        return {
          error: true,
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          details: response.data,
          url: requestConfig.url,
          method: requestConfig.method,
          apiIntent: requestConfig.apiIntent,
          isNetworkError: false,
          timestamp: new Date().toISOString()
        };
      }

      return response.data;
    } catch (axiosError) {
      console.error('Axios error details:', {
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response,
        request: axiosError.request,
        config: axiosError.config
      });

      // Determine if this is a network error
      const isNetworkError = axiosError.code === 'ECONNABORTED' ||
                            axiosError.code === 'ENOTFOUND' ||
                            axiosError.code === 'ECONNREFUSED' ||
                            axiosError.code === 'ETIMEDOUT' ||
                            axiosError.message.includes('Network Error');

      // Create a more descriptive error message
      let errorMessage = axiosError.message;

      // Add more context based on error code
      if (isNetworkError) {
        if (axiosError.code === 'ENOTFOUND') {
          errorMessage = `Cannot resolve hostname: ${new URL(requestConfig.url).hostname}. Please check if the URL is correct.`;
        } else if (axiosError.code === 'ECONNREFUSED') {
          errorMessage = `Connection refused to ${new URL(requestConfig.url).hostname}. The server might be down or not accepting connections.`;
        } else if (axiosError.code === 'ETIMEDOUT') {
          errorMessage = `Connection timed out to ${new URL(requestConfig.url).hostname}. The server might be slow or unreachable.`;
        } else if (axiosError.code === 'ECONNABORTED') {
          errorMessage = `Request aborted due to timeout. The server might be slow to respond.`;
        } else {
          errorMessage = `Network error connecting to ${requestConfig.url}. Please check your internet connection and API server accessibility.`;
        }
      } else if (axiosError.response) {
        // We have a response with an error status
        errorMessage = `API request failed with status ${axiosError.response.status} (${axiosError.response.statusText || 'Unknown Error'})`;

        // Add more context based on status code
        if (axiosError.response.status === 401 || axiosError.response.status === 403) {
          errorMessage += ': Authentication failed or insufficient permissions';
        } else if (axiosError.response.status === 404) {
          errorMessage += ': Endpoint not found';
        } else if (axiosError.response.status === 500) {
          errorMessage += ': Server error occurred';
        }
      }

      // Return a structured error response
      return {
        error: true,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        message: errorMessage,
        details: axiosError.response?.data || {},
        url: requestConfig.url,
        method: requestConfig.method,
        apiIntent: requestConfig.apiIntent,
        isNetworkError,
        code: axiosError.code,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('General error in makeCourierApiCall:', error);
    throw error;
  }
};

/**
 * Netlify Function to proxy courier API requests
 */
exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the request body
    const requestConfig = JSON.parse(event.body);

    // Process environment variables if using them for credentials
    if (requestConfig.auth) {
      // Load credentials from environment variables if requested
      if (requestConfig.auth.useEnvCredentials && requestConfig.courier) {
        const courier = requestConfig.courier.toUpperCase();

        switch (requestConfig.auth.type) {
          case 'basic':
            requestConfig.auth.username = process.env[`${courier}_USERNAME`];
            requestConfig.auth.password = process.env[`${courier}_PASSWORD`];
            break;
          case 'api_key':
            requestConfig.auth.apiKey = process.env[`${courier}_API_KEY`];
            break;
          case 'bearer':
            if (!requestConfig.auth.token) {
              requestConfig.auth.token = process.env[`${courier}_TOKEN`];
            }
            break;
        }
      }
    }

    // Make the courier API call
    const response = await makeCourierApiCall(requestConfig);

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in courier-proxy:', error);

    // Check if this is a network error
    const isNetworkError = error.code === 'ECONNABORTED' ||
                          error.code === 'ENOTFOUND' ||
                          error.code === 'ECONNREFUSED' ||
                          error.code === 'ETIMEDOUT' ||
                          (error.message && error.message.includes('Network Error'));

    // Extract network details if available
    const networkDetails = isNetworkError ? {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      address: error.address,
      port: error.port
    } : undefined;

    // Determine appropriate status code
    const statusCode = error.response?.status || (isNetworkError ? 502 : 500);

    return {
      statusCode: statusCode,
      body: JSON.stringify({
        error: true,
        message: `Error in courier-proxy: ${error.message}`,
        code: error.code,
        type: isNetworkError ? 'NETWORK_ERROR' : 'SERVER_ERROR',
        url: error.config?.url,
        networkDetails: isNetworkError ? networkDetails : undefined,
        axiosDetails: error.isAxiosError ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        } : undefined,
        timestamp: new Date().toISOString()
      })
    };
  }
};