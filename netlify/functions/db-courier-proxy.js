/* eslint-disable no-undef */
const axios = require('axios');
// Import credential utilities
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get courier credentials from Supabase
 */
const getCourierCredentials = async (courier) => {
  try {
    // First find the courier by name
    const { data: courierData, error: courierError } = await supabase
      .from('couriers')
      .select('id')
      .ilike('name', courier)
      .single();

    if (courierError) throw courierError;
    
    // Then get credentials by courier ID
    const { data, error } = await supabase
      .from('courier_credentials')
      .select('credentials')
      .eq('courier_id', courierData.id)
      .single();

    if (error) throw error;
    return { success: true, credentials: data.credentials };
  } catch (error) {
    console.error('Error getting courier credentials:', error);
    return { success: false, error };
  }
};

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
        // Use Buffer.from for base64 encoding in Node.js (instead of btoa which is browser-only)
        headers['Authorization'] = `Basic ${Buffer.from(`${requestConfig.auth.username}:${requestConfig.auth.password}`).toString('base64')}`;
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

    // Process credentials from Supabase if needed
    if (requestConfig.auth && requestConfig.courier) {
      if (requestConfig.auth.useDbCredentials) {
        // Get credentials from Supabase based on courier name
        const result = await getCourierCredentials(requestConfig.courier);
        
        if (!result.success) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: true,
              message: `Credentials not found for courier '${requestConfig.courier}'`,
              timestamp: new Date().toISOString()
            })
          };
        }
        
        // Use the credentials from Supabase
        const credentials = result.credentials;
        
        switch (requestConfig.auth.type) {
          case 'basic':
            requestConfig.auth.username = credentials.username;
            requestConfig.auth.password = credentials.password;
            break;
          case 'api_key':
            requestConfig.auth.apiKey = credentials.apiKey;
            break;
          case 'bearer':
            if (!requestConfig.auth.token) {
              requestConfig.auth.token = credentials.token;
            }
            break;
          case 'jwt_auth':
            // Set JWT-specific configs from credentials
            Object.assign(requestConfig.auth, credentials.jwt || {});
            break;
        }
      }
      // Fallback to environment variables if specified
      else if (requestConfig.auth.useEnvCredentials) {
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
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        message: `Error in courier-proxy: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 