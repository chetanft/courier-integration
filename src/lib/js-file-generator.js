/**
 * JS File Generator
 *
 * This module generates JS files from API responses and field mappings.
 */

/**
 * Generate a JS file from API responses and field mappings
 * @param {Object} responses - API responses from all steps
 * @param {Object} options - Generation options
 * @returns {Object} Generated JS file content
 */
export const generateJsFile = (responses, options = {}) => {
  const {
    courierName,
    clientName,
    fieldMappings = {}
  } = options;

  try {
    // Extract authentication details
    const authConfig = extractAuthConfig(responses);

    // Extract all API endpoints from responses
    const apiEndpoints = extractAllApiEndpoints(responses);

    // Generate the JS file content
    let jsContent = `/**
 * Courier Integration for ${courierName}
 * Client: ${clientName}
 * Generated: ${new Date().toISOString()}
 */

// Configuration
const config = {
  courier: "${courierName}",
  client: "${clientName}",
`;

    // Add authentication configuration
    if (authConfig) {
      jsContent += `  auth: ${JSON.stringify(authConfig, null, 2)},\n`;
    }

    // Add all API endpoints
    if (Object.keys(apiEndpoints).length > 0) {
      jsContent += `  endpoints: ${JSON.stringify(apiEndpoints, null, 2)},\n`;
    }

    // Add field mappings for all API types
    if (Object.keys(fieldMappings).length > 0) {
      jsContent += `  // Field mappings from API response to FT fields
  fieldMappings: ${JSON.stringify(fieldMappings, null, 2)},\n`;
    }

    jsContent += `};

// Helper functions
`;

    // Add authentication functions if needed
    if (authConfig) {
      jsContent += generateAuthFunctions(authConfig);
    }

    // Generate functions for each API type
    for (const apiType in apiEndpoints) {
      jsContent += generateApiFunctions(
        apiType,
        apiEndpoints[apiType],
        fieldMappings[apiType] || {}
      );
    }

    // Add utility functions
    jsContent += generateUtilityFunctions();

    // Add export statement with all function names
    jsContent += `
// Export the module
module.exports = {
  config,
  ${authConfig ? 'getAuthToken,' : ''}
  ${Object.keys(apiEndpoints).map(apiType => `${camelCase(apiType)},`).join('\n  ')}
};
`;

    return {
      success: true,
      content: jsContent,
      size: new Blob([jsContent]).size
    };
  } catch (error) {
    console.error('Error generating JS file:', error);
    return {
      success: false,
      error: error.message,
      content: `// Error generating JS file: ${error.message}`
    };
  }
};

/**
 * Extract authentication configuration from responses
 * @param {Object} responses - API responses
 * @returns {Object|null} Authentication configuration
 */
const extractAuthConfig = (responses) => {
  // Look for auth token response
  const authResponse = responses.authResponse || responses.step_0;

  if (!authResponse) {
    return null;
  }

  // Determine auth type
  let authType = 'none';
  let authConfig = {};

  if (authResponse.token || authResponse.access_token) {
    authType = 'bearer';
    authConfig = {
      type: authType,
      tokenUrl: responses.authEndpoint || '',
      tokenPath: authResponse.token ? 'token' : 'access_token'
    };
  } else if (authResponse.api_key) {
    authType = 'apikey';
    authConfig = {
      type: authType,
      headerName: 'X-API-Key'
    };
  } else if (authResponse.username && authResponse.password) {
    authType = 'basic';
    authConfig = {
      type: authType,
      username: '[USERNAME]', // Placeholder for security
      password: '[PASSWORD]'  // Placeholder for security
    };
  }

  return authConfig;
};

/**
 * Extract all API endpoints from responses
 * @param {Object} responses - API responses
 * @returns {Object} API endpoints by type
 */
const extractAllApiEndpoints = (responses) => {
  const endpoints = {};

  // Loop through all responses to find API endpoints
  for (const key in responses) {
    // Skip auth response and field mappings
    if (key === 'authResponse' || key === 'fieldMappings') {
      continue;
    }

    // If it's a step response with an API URL
    if (key.startsWith('step_') && responses[key]?.url) {
      // Extract API type from the step configuration
      const apiType = responses[key].apiIntent || key.replace('step_', 'api_');
      endpoints[apiType] = responses[key].url;
    }
  }

  return endpoints;
};

/**
 * Generate authentication functions
 * @param {Object} authConfig - Authentication configuration
 * @returns {string} Generated functions
 */
const generateAuthFunctions = (authConfig) => {
  let authFunctions = `
/**
 * Get authentication token for API requests
 * @returns {Promise<string>} The authentication token
 */
async function getAuthToken() {
`;

  switch (authConfig.type) {
    case 'bearer':
      authFunctions += `  try {
    const response = await fetch('${authConfig.tokenUrl}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Add your auth credentials here
        username: process.env.COURIER_USERNAME,
        password: process.env.COURIER_PASSWORD
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(\`Failed to get auth token: \${data.message || response.statusText}\`);
    }

    return data.${authConfig.tokenPath};
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
`;
      break;

    case 'apikey':
      authFunctions += `  // API key authentication is handled directly in the request headers
  return process.env.COURIER_API_KEY;
`;
      break;

    case 'basic':
      authFunctions += `  // Basic authentication is handled directly in the request headers
  return 'Basic ' + Buffer.from(\`\${process.env.COURIER_USERNAME}:\${process.env.COURIER_PASSWORD}\`).toString('base64');
`;
      break;

    default:
      authFunctions += `  // No authentication required
  return null;
`;
  }

  authFunctions += `}
`;

  return authFunctions;
};

/**
 * Generate functions for a specific API type
 * @param {string} apiType - The API type (e.g., 'tracking', 'epod')
 * @param {string} apiEndpoint - The API endpoint
 * @param {Object} apiFieldMappings - Field mappings for this API type
 * @returns {string} Generated functions
 */
const generateApiFunctions = (apiType, apiEndpoint, apiFieldMappings) => {
  // Convert API type to camelCase for function name
  const functionName = camelCase(apiType);

  // Generate the main function
  let functions = `
/**
 * ${formatApiTypeName(apiType)} function
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} The API response
 */
async function ${functionName}(params = {}) {
  try {
    // Get authentication token if needed
    const token = await getAuthToken();

    // Make the API request
    const response = await fetch(config.endpoints['${apiType}'], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? \`Bearer \${token}\` : undefined
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(\`${formatApiTypeName(apiType)} request failed: \${data.message || response.statusText}\`);
    }

    // Map the response using field mappings
    return map${pascalCase(apiType)}Response(data);
  } catch (error) {
    console.error('Error in ${functionName}:', error);
    throw error;
  }
}

/**
 * Map the ${apiType} response using field mappings
 * @param {Object} response - The raw API response
 * @returns {Object} The mapped response
 */
function map${pascalCase(apiType)}Response(response) {
  // Use the field mappings from config
  const mappings = config.fieldMappings['${apiType}'] || {};

  // Create the mapped response object
  const result = {};

  // Apply each field mapping
  for (const ftField in mappings) {
    const apiField = mappings[ftField];
    result[ftField] = getNestedValue(response, apiField);
  }

  return result;
}
`;

  return functions;
};

/**
 * Generate utility functions
 * @returns {string} Generated utility functions
 */
const generateUtilityFunctions = () => {
  return `
/**
 * Get a nested value from an object using a path string
 * @param {Object} obj - The object to get the value from
 * @param {string} path - The path to the value (e.g., 'data.results.0.name')
 * @param {*} defaultValue - The default value to return if the path doesn't exist
 * @returns {*} The value at the path or the default value
 */
function getNestedValue(obj, path, defaultValue = null) {
  if (!obj || !path) {
    return defaultValue;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // Handle array notation (e.g., "items[0]")
    const arrayMatch = part.match(/^([^\\[]+)\\[(\\d+)\\]$/);

    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);

      if (!current[arrayName] || !Array.isArray(current[arrayName])) {
        return defaultValue;
      }

      if (index >= current[arrayName].length) {
        return defaultValue;
      }

      current = current[arrayName][index];
    } else {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }

      current = current[part];
    }
  }

  return current !== undefined ? current : defaultValue;
}
`;
};

/**
 * Format API type name for documentation
 * @param {string} apiType - The API type
 * @returns {string} Formatted API type name
 */
const formatApiTypeName = (apiType) => {
  return apiType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Convert string to camelCase
 * @param {string} str - The string to convert
 * @returns {string} camelCase string
 */
const camelCase = (str) => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^[A-Z]/, c => c.toLowerCase());
};

/**
 * Convert string to PascalCase
 * @param {string} str - The string to convert
 * @returns {string} PascalCase string
 */
const pascalCase = (str) => {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};
