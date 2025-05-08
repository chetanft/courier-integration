/**
 * Enhanced JS Generator for Courier Integration
 *
 * This module generates JavaScript configuration files for courier integrations
 * with support for multiple APIs and advanced authentication handling.
 */

/**
 * Generates a JavaScript configuration file for a courier based on the mappings
 * @param {Object} courier - The courier object
 * @param {Array} mappings - Array of field mappings
 * @returns {string} Generated JavaScript code
 */
export const generateJsConfig = (courier, mappings) => {
  // Group mappings by API type/label
  const mappingsByType = mappings.reduce((acc, mapping) => {
    const key = mapping.api_label ?
      mapping.api_label.toLowerCase().replace(/[^a-z0-9]/g, '_') :
      mapping.api_type || 'track_shipment';

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(mapping);
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

/**
 * Helper function to apply transformations to field values
 * @param {*} value - The value to transform
 * @param {string} transform - The transformation to apply
 * @returns {*} The transformed value
 */
function applyTransform(value, transform) {
  if (value === null || value === undefined) return null;

  switch (transform) {
    case 'toString':
      return String(value);
    case 'toNumber':
      return Number(value);
    case 'toDate':
      return new Date(value).toISOString();
    case 'toLowerCase':
      return typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
    case 'toUpperCase':
      return typeof value === 'string' ? value.toUpperCase() : String(value).toUpperCase();
    default:
      return value;
  }
}

const ${courierName}Mapping = {
`;

  // Add token generation request if auth type is not 'none'
  if (courier.auth_type !== 'none' && courier.auth_type !== 'basic') {
    jsCode += `  "generate_token_request": {
    "endpoint": ConfigAccessor.getConfig("third_party_url", "${courierName}_auth") || "${courier.auth_endpoint || ''}",
    "method": "${courier.auth_method || 'POST'}",
    "headers": ${JSON.stringify(courier.auth_headers || [], null, 6).replace(/\n/g, '\n    ')},
    "body": ${JSON.stringify(courier.auth_body || {}, null, 6).replace(/\n/g, '\n    ')},
    "tokenPath": "${courier.auth_token_path || 'access_token'}"
  },
`;
  }

  // Add API request configurations
  const apiConfigs = {};
  mappings.forEach(mapping => {
    const apiLabel = mapping.api_label ?
      mapping.api_label.toLowerCase().replace(/[^a-z0-9]/g, '_') :
      mapping.api_type || 'track_shipment';

    if (!apiConfigs[apiLabel] && mapping.api_index !== undefined) {
      apiConfigs[apiLabel] = {
        index: mapping.api_index,
        label: mapping.api_label || apiLabel,
        url: courier.apis?.[mapping.api_index]?.url || '',
        method: courier.apis?.[mapping.api_index]?.method || 'GET',
        headers: courier.apis?.[mapping.api_index]?.headers || [],
        body: courier.apis?.[mapping.api_index]?.body || {},
        rootDataPath: courier.apis?.[mapping.api_index]?.rootDataPath || ''
      };
    }
  });

  // Add API request configurations
  Object.keys(apiConfigs).forEach(apiLabel => {
    const config = apiConfigs[apiLabel];

    jsCode += `  "${apiLabel}_request": {
    "url": ConfigAccessor.getConfig("third_party_url", "${courierName}_${apiLabel}") || "${config.url}",
    "method": "${config.method}",
    "headers": ${JSON.stringify(config.headers || [], null, 6).replace(/\n/g, '\n    ')},
    "body": ${JSON.stringify(config.body || {}, null, 6).replace(/\n/g, '\n    ')},
    "rootDataPath": "${config.rootDataPath}"
  },
`;
  });

  // Add each API type mapping
  Object.keys(mappingsByType).forEach(apiType => {
    const typeMappings = mappingsByType[apiType];

    // Response mapping
    jsCode += `  "${apiType}_response": {
    "is_success": (payload) => payload?.status === 200 || payload?.result === "success",
    "tracking_provider": "${courier.name.toLowerCase()}",`;

    // Add field mappings
    typeMappings.forEach(mapping => {
      // Add transformation if specified
      const transform = mapping.transform && mapping.transform !== 'none'
        ? `applyTransform(${generatePathAccessor(mapping.api_field)}, "${mapping.transform}")`
        : generatePathAccessor(mapping.api_field);

      jsCode += `
    "${mapping.tms_field}": (payload) => ${transform},`;
    });

    jsCode += `
    "timestamp": () => Date.now()
  },
`;
  });

  // Add token refresh handler if auth type is not 'none'
  if (courier.auth_type !== 'none' && courier.auth_type !== 'basic') {
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

  // Handle root data path if specified
  if (path.startsWith('rootData.')) {
    const actualPath = path.substring(9); // Remove 'rootData.'
    return actualPath.includes('[]')
      ? `getNestedValue(payload, "${actualPath.replace('[]', '[0]')}")`
      : `getNestedValue(payload, "${actualPath}")`;
  }

  return path.includes('[]')
    ? `payload?.${path.replace('[]', '?.[0]')}`
    : `payload?.${path}`;
};

/**
 * Helper function to get a nested value from an object using a path string
 * @param {Object} obj - The object to extract from
 * @param {string} path - The path to the value
 * @returns {*} The value at the path or null if not found
 */
// eslint-disable-next-line no-unused-vars
const getNestedValue = (obj, path) => {
  if (!obj || !path) return null;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // Handle array access
    if (part.includes('[') && part.includes(']')) {
      const arrayName = part.substring(0, part.indexOf('['));
      const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

      if (!current[arrayName] || !Array.isArray(current[arrayName]) || index >= current[arrayName].length) {
        return null;
      }

      current = current[arrayName][index];
    } else {
      if (current === null || current === undefined || typeof current !== 'object' || !(part in current)) {
        return null;
      }

      current = current[part];
    }
  }

  return current;
};
