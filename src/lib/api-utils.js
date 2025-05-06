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
      requestConfig.headers.forEach(header => {
        if (header.key && header.value) {
          headers[header.key] = header.value;
        }
      });
    }

    // Add authentication headers if not already set
    if (requestConfig.auth) {
      const hasAuthHeader = Object.keys(headers).some(
        key => key.toLowerCase() === 'authorization'
      );

      if (!hasAuthHeader) {
        // Handle different authentication types
        switch (requestConfig.auth.type) {
          case 'basic':
            if (requestConfig.auth.username) {
              const basicAuth = btoa(`${requestConfig.auth.username}:${requestConfig.auth.password || ''}`);
              headers['Authorization'] = `Basic ${basicAuth}`;
            }
            break;

          case 'bearer':
            if (requestConfig.auth.token) {
              headers['Authorization'] = `Bearer ${requestConfig.auth.token}`;
            }
            break;

          case 'jwt':
            if (requestConfig.auth.token) {
              headers['Authorization'] = `Bearer ${requestConfig.auth.token}`;
            }
            break;

          case 'jwt_auth':
            // For JWT Token Auth, we'll handle token acquisition before making the main request
            // This will be handled in a separate function
            console.log('JWT Token Auth will be handled separately');
            break;

          case 'oauth':
            // For OAuth, we'll handle token acquisition in the special handling section
            // We'll need to make a separate request to get the token first
            console.log('OAuth authentication will be handled separately');
            break;

          case 'apikey':
            if (requestConfig.auth.apiKey) {
              if (requestConfig.auth.apiKeyLocation === 'header') {
                // Add API key as a header
                headers[requestConfig.auth.apiKeyName || 'X-API-Key'] = requestConfig.auth.apiKey;
              } else if (requestConfig.auth.apiKeyLocation === 'query') {
                // API key as query parameter will be handled when building the URL
                // We'll store it for now and add it to params later
                if (!requestConfig.queryParams) {
                  requestConfig.queryParams = [];
                }
                requestConfig.queryParams.push({
                  key: requestConfig.auth.apiKeyName || 'api_key',
                  value: requestConfig.auth.apiKey
                });
              }
            }
            break;
        }
      }
    }

    // Set default content type if not specified
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Set default accept if not specified
    if (!headers['Accept'] && !headers['accept']) {
      headers['Accept'] = 'application/json';
    }

    // Prepare query parameters
    const params = {};
    if (requestConfig.queryParams && Array.isArray(requestConfig.queryParams)) {
      requestConfig.queryParams.forEach(param => {
        if (param.key && param.value !== undefined) {
          params[param.key] = param.value;
        }
      });
    }

    // Create axios request config
    const axiosConfig = {
      method: requestConfig.method || 'GET',
      url: requestConfig.url,
      headers,
      params: Object.keys(params).length > 0 ? params : undefined
    };

    // Add request body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(axiosConfig.method.toUpperCase()) && requestConfig.body) {
      axiosConfig.data = requestConfig.body;
    }

    // Special handling for API intents
    if (requestConfig.apiIntent) {
      switch (requestConfig.apiIntent) {
        case 'generate_auth_token':
          // For auth token requests, we might need to add standard OAuth fields
          if (axiosConfig.method.toUpperCase() === 'POST' && typeof axiosConfig.data === 'object') {
            axiosConfig.data = {
              grant_type: 'client_credentials',
              ...axiosConfig.data
            };

            // Add client credentials based on auth type
            if (requestConfig.auth?.type === 'basic') {
              axiosConfig.data.client_id = requestConfig.auth.username;
              axiosConfig.data.client_secret = requestConfig.auth.password;
            } else if (requestConfig.auth?.type === 'oauth') {
              axiosConfig.data.client_id = requestConfig.auth.clientId;
              axiosConfig.data.client_secret = requestConfig.auth.clientSecret;

              // Add scope if provided
              if (requestConfig.auth.scope) {
                axiosConfig.data.scope = requestConfig.auth.scope;
              }

              // Override URL if token endpoint is provided
              if (requestConfig.auth.tokenEndpoint) {
                axiosConfig.url = requestConfig.auth.tokenEndpoint;
              }
            }
          }
          break;

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
              trackingNumber: requestConfig.testDocket,
              docNo: requestConfig.testDocket
            };
          }
          break;
      }
    }

    // Make the request
    console.log('Making request with config:', axiosConfig);
    const response = await axios(axiosConfig);

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
      url: requestConfig.url,
      method: requestConfig.method,
      apiIntent: requestConfig.apiIntent,
      timestamp: new Date().toISOString()
    };

    // Return the error response without falling back to mock data
    return errorResponse;
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
