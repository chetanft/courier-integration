import axios from 'axios';

/**
 * Makes an API call to test courier credentials and endpoints
 * @param {Object} requestConfig - The complete request configuration
 * @returns {Promise<Object>} The API response
 */
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

export const testCourierApi = async (requestConfig) => {
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

    console.log(`Making real API call to ${requestConfig.url} with intent: ${requestConfig.apiIntent}`);

    // Prepare headers
    const headers = {};

    // Add custom headers from the request config
    if (requestConfig.headers && Array.isArray(requestConfig.headers)) {
      console.log('Processing headers from request config:', requestConfig.headers);

      requestConfig.headers.forEach(header => {
        if (header.key && header.value !== undefined) {
          console.log(`Adding header: ${header.key} = ${header.value}`);
          headers[header.key] = header.value;
        }
      });
    } else {
      console.log('No headers found in request config');
    }

    // Add auth headers based on auth type
    switch (requestConfig.auth?.type) {
      case 'bearer':
        headers['Authorization'] = `${requestConfig.auth.token}`;
        break;
      case 'basic':
        headers['Authorization'] = `Basic ${btoa(`${requestConfig.auth.username}:${requestConfig.auth.password}`)}`;
        break;
      case 'api_key':
        if (requestConfig.auth.apiKeyLocation === 'header') {
          headers[requestConfig.auth.apiKeyName || 'x-api-key'] = requestConfig.auth.apiKey;
        }
        break;
    }

    // Create axios request config
    const axiosConfig = {
      method: requestConfig.method || 'GET',
      url: requestConfig.url,
      headers: {
        ...headers,
        'Content-Type': requestConfig.isFormUrlEncoded ? 'application/x-www-form-urlencoded' : 'application/json'
      },
      // Add timeout
      timeout: 30000, // 30 seconds
      // Add validateStatus to handle all status codes
      // eslint-disable-next-line no-unused-vars
      validateStatus: function (status) {
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
        axiosConfig.data = new URLSearchParams(requestConfig.body).toString();
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
      console.log('API response:', response);

      // Check if the response indicates an error
      if (response.status >= 400) {
        return {
          error: true,
          status: response.status,
          statusText: response.statusText,
          message: response.data?.message || 'API request failed',
          details: response.data,
          url: requestConfig.url,
          method: requestConfig.method,
          apiIntent: requestConfig.apiIntent,
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

      // Return a structured error response
      return {
        error: true,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        message: axiosError.message,
        details: axiosError.response?.data || {},
        url: requestConfig.url,
        method: requestConfig.method,
        apiIntent: requestConfig.apiIntent,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('General error in testCourierApi:', error);
    throw error;
  }
};

/**
 * Legacy API for backward compatibility
 * @deprecated Use the new testCourierApi with requestConfig instead
 */
export const testCourierApiLegacy = async (credentials, endpoint, payload, apiIntent) => {
  // Convert legacy parameters to new request config format
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
    auth: {
      type: authType,
      username: credentials.username,
      password: credentials.password,
      token: credentials.api_key
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
