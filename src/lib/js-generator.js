/**
 * Generates a JavaScript configuration file for a courier based on the mappings
 * @param {Object} courier - The courier object
 * @param {Array} mappings - Array of field mappings
 * @returns {string} Generated JavaScript code
 */
export const generateJsConfig = (courier, mappings) => {
  // Group mappings by API type
  const mappingsByType = mappings.reduce((acc, mapping) => {
    if (!acc[mapping.api_type]) {
      acc[mapping.api_type] = [];
    }
    acc[mapping.api_type].push(mapping);
    return acc;
  }, {});

  const courierName = courier.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Start building the JS file
  let jsCode = `const axios = require('axios');
const { ConfigAccessor } = require('@freighttiger/app');

/**
 * Helper function to refresh an authentication token
 * @param {Object} authConfig - The authentication configuration
 * @returns {Promise<string>} The refreshed token
 */
async function refreshAuthToken(authConfig) {
  try {
    console.log('Refreshing authentication token...');

    // Make the token request
    const response = await axios({
      method: authConfig.method || 'POST',
      url: authConfig.endpoint,
      headers: authConfig.headers || {},
      data: authConfig.body || {}
    });

    // Extract the token using the provided path
    const tokenPath = authConfig.tokenPath || 'access_token';
    const pathParts = tokenPath.split('.');

    let token = response.data;
    for (const part of pathParts) {
      if (token && typeof token === 'object' && part in token) {
        token = token[part];
      } else {
        throw new Error(\`Token path "\${tokenPath}" not found in response\`);
      }
    }

    if (!token || typeof token !== 'string') {
      throw new Error(\`Token not found in response using path "\${tokenPath}"\`);
    }

    console.log('Token refreshed successfully');
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

const ${courierName}Mapping = {
`;

  // Add token generation request if auth type is jwt_auth
  if (courier.auth_type === 'jwt_auth' && courier.auth_endpoint) {
    try {
      // Parse the stored JWT auth configuration
      const jwtConfig = courier.username ? JSON.parse(courier.username) : null;

      if (jwtConfig && jwtConfig.endpoint) {
        jsCode += `  "generate_token_request": {
    "url": ConfigAccessor.getConfig("third_party_url", "${courierName}_auth") || "${jwtConfig.endpoint}",
    "method": "${jwtConfig.method || 'POST'}",
    "headers": ${JSON.stringify(jwtConfig.headers || [], null, 6).replace(/\n/g, '\n    ')},
    "body": ${JSON.stringify(jwtConfig.body || {}, null, 6).replace(/\n/g, '\n    ')},
    "tokenPath": "${jwtConfig.tokenPath || 'access_token'}"
  },
`;
      }
    } catch (e) {
      console.error('Error parsing JWT config:', e);
    }
  }

  // Add each API type mapping
  Object.keys(mappingsByType).forEach(apiType => {
    const typeMappings = mappingsByType[apiType];

    // Response mapping
    jsCode += `  "${apiType}_response": {
    "is_success": (payload) => payload?.shipment?.result === "success",
    "tracking_provider": "${courier.name.toLowerCase()}",`;

    // Add field mappings
    typeMappings.forEach(mapping => {
      jsCode += `
    "${mapping.tms_field}": (payload) => ${generatePathAccessor(mapping.api_field)},`;
    });

    jsCode += `
    "timestamp": () => Date.now()
  },
`;
  });

  // Add token refresh handler if auth type is jwt_auth
  if (courier.auth_type === 'jwt_auth' && courier.auth_endpoint) {
    jsCode += `  "handle_token_refresh": async (error) => {
    // Check if this is an authentication error (401 Unauthorized)
    const isAuthError = error.response?.status === 401 ||
                       (error.response?.data?.error &&
                        (error.response?.data?.message?.toLowerCase().includes('unauthorized') ||
                         error.response?.data?.message?.toLowerCase().includes('token expired') ||
                         error.response?.data?.message?.toLowerCase().includes('invalid token')));

    if (isAuthError) {
      try {
        console.log('Detected expired token. Attempting to refresh...');

        // Get token generation config
        const authConfig = ${courierName}Mapping.generate_token_request;

        if (!authConfig) {
          console.error('No token generation configuration found');
          return null;
        }

        // Refresh the token
        const newToken = await refreshAuthToken(authConfig);
        console.log('Token refreshed successfully');

        return newToken;
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return null;
      }
    }

    return null;
  },
`;
  }

  // Close the object and export
  jsCode += `};

module.exports = ${courierName}Mapping;`;

  return jsCode;
};

/**
 * Generates code to access a value at a specific path
 * @param {string} path - The field path
 * @returns {string} JavaScript code to access the value
 */
const generatePathAccessor = (path) => {
  if (!path) return 'null';
  return path.includes('[]')
    ? `payload?.${path.replace('[]', '?.[0]')}`
    : `payload?.${path}`;
};
