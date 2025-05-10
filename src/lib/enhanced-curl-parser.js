/**
 * Enhanced cURL Parser
 *
 * This module provides improved parsing of cURL commands with better error handling,
 * validation, and support for complex commands.
 */

/**
 * Parse a cURL command string into a structured request object
 * @param {string} curlString - The cURL command to parse
 * @returns {Object} The parsed request object
 * @throws {Error} If the curl command is invalid or cannot be parsed
 */
export const parseCurl = (curlString) => {
  try {
    if (!curlString || !curlString.trim().startsWith('curl')) {
      throw new Error('Invalid cURL command, must start with "curl"');
    }

    // Normalize the cURL command
    const normalizedCurl = normalizeCurlCommand(curlString);

    // Initialize the request object with default values
    const parsed = {
      method: 'GET',
      url: '',
      headers: [],
      body: null,
      queryParams: [],
      auth: {
        type: 'none',
        username: '',
        password: '',
        token: ''
      }
    };

    // Extract URL with regex
    const urlMatch = normalizedCurl.match(/curl\s+['"]?([^'">\s]+)['"]?/);
    if (urlMatch && urlMatch[1]) {
      parsed.url = urlMatch[1];

      // Ensure URL has protocol
      if (!parsed.url.startsWith('http://') && !parsed.url.startsWith('https://')) {
        parsed.url = 'https://' + parsed.url;
      }
    }

    // Extract method with regex
    const methodMatch = normalizedCurl.match(/-X\s+([A-Z]+)/);
    if (methodMatch && methodMatch[1]) {
      parsed.method = methodMatch[1];
    }

    // Extract headers with regex
    const headerMatches = [...normalizedCurl.matchAll(/-H\s+['"]([^'"]+)['"]/g)];
    for (const match of headerMatches) {
      if (match[1] && match[1].includes(':')) {
        const [key, ...valueParts] = match[1].split(':');
        const value = valueParts.join(':').trim();

        parsed.headers.push({ key: key.trim(), value });

        // Check for auth headers
        if (key.trim().toLowerCase() === 'authorization') {
          if (value.toLowerCase().startsWith('basic ')) {
            parsed.auth.type = 'basic';
            try {
              const credentials = atob(value.substring(6).trim());
              const [username, password] = credentials.split(':');
              parsed.auth.username = username || '';
              parsed.auth.password = password || '';
            } catch (error) {
              console.warn('Failed to decode Basic auth');
            }
          } else if (value.toLowerCase().startsWith('bearer ')) {
            const token = value.substring(7).trim();
            parsed.auth.type = token.split('.').length === 3 ? 'jwt' : 'bearer';
            parsed.auth.token = token;
          }
        }
      }
    }

    // Extract data with regex
    const dataMatch = normalizedCurl.match(/-d\s+['"](.+?)['"]/);
    if (dataMatch && dataMatch[1]) {
      try {
        parsed.body = JSON.parse(dataMatch[1]);
      } catch (error) {
        parsed.body = dataMatch[1];
      }

      // If method is still GET, change to POST when data is present
      if (parsed.method === 'GET') {
        parsed.method = 'POST';
      }
    }

    // Extract user and password (basic auth)
    const userMatch = normalizedCurl.match(/-u\s+['"](.+?)['"]/);
    if (userMatch && userMatch[1]) {
      parsed.auth.type = 'basic';
      const authStr = userMatch[1];
      const colonIndex = authStr.indexOf(':');

      if (colonIndex > 0) {
        parsed.auth.username = authStr.substring(0, colonIndex);
        parsed.auth.password = authStr.substring(colonIndex + 1);
      } else {
        parsed.auth.username = authStr;
      }
    }

    // Add validation
    if (!parsed.url) {
      throw new Error('No URL found in cURL command');
    }

    // Extract query parameters from URL
    try {
      const urlObj = new URL(parsed.url);
      if (urlObj.search) {
        const searchParams = urlObj.searchParams;
        parsed.queryParams = Array.from(searchParams.entries()).map(([key, value]) => ({
          key,
          value
        }));
      }
    } catch (urlError) {
      console.warn('Error processing URL:', urlError.message);
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing cURL command:', error);
    throw new Error(`Failed to parse cURL command: ${error.message}`);
  }
};

/**
 * Normalize a cURL command for easier parsing
 * @param {string} curlString - The cURL command to normalize
 * @returns {string} Normalized cURL command
 */
const normalizeCurlCommand = (curlString) => {
  return curlString
    .replace(/\\\n/g, ' ')  // Replace line continuations
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .replace(/-H\s+([^"'])/g, '-H "$1')  // Fix unquoted headers
    .replace(/-d\s+([^"'])/g, '-d "$1')  // Fix unquoted data
    .trim();
};

/**
 * Validate a parsed cURL result
 * @param {Object} parsed - The parsed cURL result
 * @returns {Object} Validation result
 */
export const validateCurlParse = (parsed) => {
  const issues = [];

  if (!parsed.url) issues.push('Missing URL');
  if (!parsed.method) issues.push('Missing HTTP method');

  // Check for common auth issues
  if (parsed.auth.type === 'basic' && (!parsed.auth.username || !parsed.auth.password)) {
    issues.push('Incomplete Basic auth credentials');
  }

  if ((parsed.auth.type === 'bearer' || parsed.auth.type === 'jwt') && !parsed.auth.token) {
    issues.push('Missing token for Bearer/JWT auth');
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Convert a request object to a cURL command
 * @param {Object} request - The request object
 * @returns {string} The cURL command
 */
export const toCurl = (request) => {
  if (!request || !request.url) {
    return 'curl';
  }

  // Start with the basic curl command
  let curl = `curl -X ${request.method || 'GET'} "${request.url}"`;

  // Add headers
  if (request.headers && Array.isArray(request.headers) && request.headers.length > 0) {
    for (const header of request.headers) {
      if (header.key && header.value) {
        // Escape quotes in header values
        const escapedValue = header.value.replace(/"/g, '\\"');
        curl += ` -H "${header.key}: ${escapedValue}"`;
      }
    }
  }

  // Add auth if not already in headers
  if (request.auth && request.auth.type !== 'none') {
    const hasAuthHeader = request.headers && request.headers.some(
      h => h.key.toLowerCase() === 'authorization'
    );

    if (!hasAuthHeader) {
      if (request.auth.type === 'basic' && request.auth.username) {
        if (request.auth.password) {
          curl += ` -u "${request.auth.username}:${request.auth.password}"`;
        } else {
          curl += ` -u "${request.auth.username}"`;
        }
      } else if ((request.auth.type === 'bearer' || request.auth.type === 'jwt') && request.auth.token) {
        curl += ` -H "Authorization: Bearer ${request.auth.token}"`;
      } else if (request.auth.type === 'apikey' && request.auth.token) {
        // For API key auth, add as a header (common convention)
        curl += ` -H "X-API-Key: ${request.auth.token}"`;
      }
    }
  }

  // Add body if present
  if (request.body) {
    let bodyStr = '';

    if (typeof request.body === 'object') {
      bodyStr = JSON.stringify(request.body);
    } else {
      bodyStr = request.body.toString();
    }

    if (bodyStr) {
      curl += ` -d '${bodyStr}'`;
    }
  }

  return curl;
};
