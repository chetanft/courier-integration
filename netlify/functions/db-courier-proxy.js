/* eslint-disable no-undef */
const axios = require('axios');
// Import credential utilities
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client if credentials are available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Only create the client if both URL and key are available
let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully');
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
  }
} else {
  console.warn('Supabase credentials missing, database features will be unavailable');
  console.log('Available environment variables:', Object.keys(process.env).filter(key =>
    key.includes('SUPABASE') || key.includes('VITE_SUPABASE')
  ));
}

/**
 * Get courier credentials from Supabase
 */
const getCourierCredentials = async (courier) => {
  // If Supabase client is not available, return error
  if (!supabase) {
    console.warn('Supabase client not available, cannot get credentials from database');
    return {
      success: false,
      error: new Error('Database connection not available. Please provide credentials directly.')
    };
  }

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
 * Checks if a hostname resolves to a private IP address
 * @param {string} hostname - The hostname to check
 * @returns {boolean} - True if it's a private IP, false otherwise
 */
const isPrivateIP = (hostname) => {
  try {
    // Check if it's already an IP address
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipRegex);

    if (match) {
      const octets = match.slice(1).map(Number);

      // Check for private IP ranges
      // 10.0.0.0 - 10.255.255.255
      if (octets[0] === 10) return true;

      // 172.16.0.0 - 172.31.255.255
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;

      // 192.168.0.0 - 192.168.255.255
      if (octets[0] === 192 && octets[1] === 168) return true;

      // 127.0.0.0 - 127.255.255.255 (localhost)
      if (octets[0] === 127) return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking if IP is private:', error);
    return false;
  }
};

/**
 * Tests if a URL is reachable
 * @param {string} url - The URL to test
 * @returns {Promise<Object>} - Result of the test
 */
const testUrlReachability = async (url) => {
  try {
    console.log(`Testing reachability of URL: ${url}`);

    // Create a simple HEAD request to test the URL
    const response = await axios({
      method: 'HEAD',
      url: url,
      timeout: 5000, // Short timeout for quick testing
      validateStatus: () => true // Accept any status code
    });

    console.log(`URL test result: ${url} - Status: ${response.status}`);

    return {
      success: response.status < 500, // Consider it a success if not a server error
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error(`URL test failed for ${url}:`, error.message);

    return {
      success: false,
      error: error.message,
      code: error.code,
      isNetworkError: error.code === 'ENOTFOUND' ||
                      error.code === 'ECONNREFUSED' ||
                      error.code === 'ETIMEDOUT' ||
                      error.code === 'ECONNRESET'
    };
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
    // Get token outside the switch to avoid lexical declaration error
    const token = requestConfig.auth?.token || '';

    switch (requestConfig.auth?.type) {
      case 'bearer':
        // Make sure we include 'Bearer ' prefix if it's not already there
        if (token && !token.startsWith('Bearer ')) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          headers['Authorization'] = token;
        }
        break;
      case 'basic':
        // Use Buffer.from for base64 encoding in Node.js (instead of btoa which is browser-only)
        headers['Authorization'] = `Basic ${Buffer.from(`${requestConfig.auth.username}:${requestConfig.auth.password}`).toString('base64')}`;
        break;
      case 'api_key':
        if (requestConfig.auth.apiKeyLocation === 'header') {
          headers[requestConfig.auth.apiKeyName || 'x-api-key'] = requestConfig.auth.apiKey;
        } else {
          // If no location specified, default to x-api-key header
          headers['x-api-key'] = requestConfig.auth.apiKey;
        }
        break;
    }

    // Special handling for Safexpress which needs both Authorization and x-api-key
    if ((requestConfig.url && requestConfig.url.includes('safexpress')) ||
        (requestConfig.courier === 'safexpress')) {
      console.log('Detected Safexpress API, ensuring both auth headers are present');

      // Make sure we have x-api-key header
      if (requestConfig.auth?.apiKey && !headers['x-api-key']) {
        headers['x-api-key'] = requestConfig.auth.apiKey;
      }
    }

    // Ensure URL is properly formatted
    let url = requestConfig.url;
    if (url) {
      // Make sure URL has a protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.log('URL does not have a protocol, adding https://');
        url = 'https://' + url;
      }

      // Trim any whitespace
      url = url.trim();

      console.log('Formatted URL:', url);

      // Check if the URL is pointing to a private IP address
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        if (isPrivateIP(hostname)) {
          console.error('URL points to a private IP address which Netlify functions cannot access:', hostname);
          return {
            error: true,
            status: 502,
            statusText: 'Bad Gateway',
            message: 'Cannot connect to private IP address',
            details: {
              url: url,
              hostname: hostname,
              suggestion: "Netlify functions cannot access private IP addresses or localhost. Please use a public API endpoint."
            },
            timestamp: new Date().toISOString()
          };
        }
      } catch (urlError) {
        console.error('Error parsing URL:', urlError);
      }

      // Test if the URL is reachable
      const urlTest = await testUrlReachability(url);
      if (!urlTest.success) {
        console.error('URL reachability test failed:', urlTest);

        // If it's a network error, provide a more helpful error message
        if (urlTest.isNetworkError) {
          return {
            error: true,
            status: 502,
            statusText: 'Bad Gateway',
            message: `Cannot connect to API server: ${urlTest.error}`,
            details: {
              url: url,
              errorCode: urlTest.code,
              errorMessage: urlTest.error,
              suggestion: "Please verify the API URL is correct and the server is accessible from Netlify's functions."
            },
            timestamp: new Date().toISOString()
          };
        }
      } else {
        console.log('URL reachability test passed:', urlTest);
      }
    } else {
      console.error('No URL provided in request config');
      throw new Error('No URL provided in request config');
    }

    // Create axios request config
    const axiosConfig = {
      method: requestConfig.method || 'GET',
      url: url,
      headers: {
        ...headers,
        'Content-Type': requestConfig.isFormUrlEncoded ? 'application/x-www-form-urlencoded' : 'application/json'
      },
      // Add timeout - use custom timeout if provided, otherwise default to 30 seconds
      timeout: requestConfig.timeout || 30000,
      // Add validateStatus to handle all status codes
      validateStatus: function () {
        return true; // Don't reject any status codes, we'll handle them in our code
      },
      // Add proxy configuration if provided
      ...(requestConfig.proxy ? { proxy: requestConfig.proxy } : {}),
      // Add max redirects
      maxRedirects: requestConfig.maxRedirects || 5,
      // Add retry configuration
      ...(requestConfig.retry ? {
        retry: requestConfig.retry,
        retryDelay: requestConfig.retryDelay || 1000
      } : {})
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

    // Add filter options to limit response size if provided
    if (requestConfig.filterOptions) {
      const filterParams = new URLSearchParams();

      // Add pagination parameters if they exist
      if (requestConfig.filterOptions.limit) {
        // Different APIs use different parameter names for pagination
        // Try common ones
        filterParams.append('limit', requestConfig.filterOptions.limit);
        filterParams.append('per_page', requestConfig.filterOptions.limit);
        filterParams.append('pageSize', requestConfig.filterOptions.limit);
      }

      // Add size parameter if it exists (required by some APIs along with page)
      if (requestConfig.filterOptions.size) {
        filterParams.append('size', requestConfig.filterOptions.size);
      }

      if (requestConfig.filterOptions.page) {
        filterParams.append('page', requestConfig.filterOptions.page);
        filterParams.append('offset', (requestConfig.filterOptions.page - 1) *
                                     (requestConfig.filterOptions.limit || 10));
      }

      // Add fields parameter if it exists
      if (requestConfig.filterOptions.fields) {
        // Different APIs use different parameter names for field filtering
        filterParams.append('fields', requestConfig.filterOptions.fields);
        filterParams.append('select', requestConfig.filterOptions.fields);
        filterParams.append('_fields', requestConfig.filterOptions.fields);
      }

      // Add the filter params to the URL
      if (filterParams.toString()) {
        const separator = axiosConfig.url.includes('?') ? '&' : '?';
        axiosConfig.url = `${axiosConfig.url}${separator}${filterParams.toString()}`;
        console.log('Added filter parameters to URL:', filterParams.toString());
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

          // Special handling for Safexpress
          if (requestConfig.url.includes('safexpress') || requestConfig.courier === 'safexpress') {
            console.log('Detected Safexpress API, adding special parameters');
            axiosConfig.data = {
              ...axiosConfig.data,
              docNo: requestConfig.testDocket,
              docType: "WB"  // Add docType for Safexpress
            };

            // Ensure we have the x-api-key header for Safexpress
            if (requestConfig.auth?.apiKey && !headers['x-api-key']) {
              headers['x-api-key'] = requestConfig.auth.apiKey;
            }
          } else {
            // Generic handling for other couriers
            axiosConfig.data = {
              ...axiosConfig.data,
              docNo: requestConfig.testDocket,
              trackingNumber: requestConfig.testDocket
            };
          }
        }
        break;
    }

    // Make the request
    console.log('Making request with config:', axiosConfig);
    console.log('Headers being sent:', axiosConfig.headers);

    try {
      console.log('Making API request with config:', {
        method: axiosConfig.method,
        url: axiosConfig.url,
        headers: Object.keys(axiosConfig.headers),
        hasData: !!axiosConfig.data
      });

      const response = await axios(axiosConfig);
      console.log('API response status:', response.status);
      console.log('API response headers:', response.headers);

      // Check response size to avoid Netlify's 6MB limit
      const responseSize = JSON.stringify(response.data).length;
      console.log('API response size (bytes):', responseSize);

      // If response is too large (over 5.5MB to be safe), return an error
      const MAX_SAFE_RESPONSE_SIZE = 5.5 * 1024 * 1024; // 5.5MB
      if (responseSize > MAX_SAFE_RESPONSE_SIZE) {
        console.error('API response too large:', responseSize, 'bytes');
        return {
          error: true,
          status: 502,
          statusText: 'Response Too Large',
          message: 'API response exceeds Netlify Function size limit',
          details: {
            errorType: 'Function.ResponseSizeTooLarge',
            errorMessage: `Response payload size (${responseSize} bytes) exceeded maximum allowed payload size (6291556 bytes).`,
            responseSize: responseSize,
            maxSize: 6291556,
            suggestion: 'Use filtering or pagination to reduce the response size'
          },
          url: axiosConfig.url,
          method: axiosConfig.method,
          apiIntent: requestConfig.apiIntent,
          timestamp: new Date().toISOString()
        };
      }

      // Check if the response indicates an error
      if (response.status >= 400) {
        console.error('API returned error status:', response.status);
        console.error('API error response:', response.data);

        return {
          error: true,
          status: response.status,
          statusText: response.statusText,
          message: response.data?.message || 'API request failed',
          details: response.data,
          url: axiosConfig.url,
          method: axiosConfig.method,
          apiIntent: requestConfig.apiIntent,
          timestamp: new Date().toISOString()
        };
      }

      return response.data;
    } catch (axiosError) {
      console.error('Axios error details:', {
        message: axiosError.message,
        code: axiosError.code,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        responseData: axiosError.response?.data,
        requestUrl: axiosError.config?.url
      });

      // Return a structured error response
      return {
        error: true,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        message: axiosError.message,
        details: axiosError.response?.data || {},
        url: axiosConfig.url,
        method: axiosConfig.method,
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
    let requestConfig;
    try {
      requestConfig = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Invalid request body. Expected JSON.',
          details: parseError.message,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Validate required fields
    if (!requestConfig.url) {
      console.error('Missing URL in request config');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'URL is required in request config',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Process credentials from Supabase if needed
    if (requestConfig.auth && requestConfig.courier) {
      if (requestConfig.auth.useDbCredentials) {
        // Check if we're dealing with Safexpress and have direct credentials in the request
        const isSafexpress = requestConfig.courier.toLowerCase() === 'safexpress' ||
                            (requestConfig.url && requestConfig.url.toLowerCase().includes('safexpress'));

        // For Safexpress, we can use the provided credentials directly if available
        if (isSafexpress && requestConfig.auth.token && requestConfig.auth.apiKey) {
          console.log('Using provided Safexpress credentials directly');
          // No need to fetch from database, credentials are already provided
        } else {
          // Get credentials from Supabase based on courier name
          const result = await getCourierCredentials(requestConfig.courier);

          if (!result.success) {
            // If database lookup failed but we have direct credentials, continue anyway
            if ((requestConfig.auth.token || requestConfig.auth.apiKey ||
                (requestConfig.auth.username && requestConfig.auth.password))) {
              console.log('Database lookup failed but using provided credentials');
            } else {
              return {
                statusCode: 404,
                body: JSON.stringify({
                  error: true,
                  message: `Credentials not found for courier '${requestConfig.courier}': ${result.error.message}`,
                  timestamp: new Date().toISOString()
                })
              };
            }
          } else {
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

    // Determine if this is a network error
    const isNetworkError = error.code === 'ENOTFOUND' ||
                          error.code === 'ECONNREFUSED' ||
                          error.code === 'ETIMEDOUT' ||
                          error.code === 'ECONNRESET' ||
                          error.message.includes('getaddrinfo') ||
                          error.message.includes('connect ETIMEDOUT') ||
                          error.message.includes('network timeout') ||
                          error.message.includes('network error');

    // Determine appropriate status code
    const statusCode = isNetworkError ? 502 : 500;

    // Get more detailed information for network errors
    let networkDetails = {};
    if (isNetworkError) {
      networkDetails = {
        errorCode: error.code,
        host: error.hostname || error.host || (error.config && new URL(error.config.url).hostname),
        port: error.port,
        syscall: error.syscall
      };
    }

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