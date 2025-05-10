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
    // Log the raw cURL command for debugging (without sensitive data)
    console.log('Parsing cURL command:', curlString.substring(0, 50) + '...');

    if (!curlString || !curlString.trim().startsWith('curl')) {
      throw new Error('Invalid cURL command, must start with "curl"');
    }

    // Normalize the cURL command
    const normalizedCurl = normalizeCurlCommand(curlString);
    console.log('Normalized cURL command:', normalizedCurl.substring(0, 50) + '...');

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

    // Extract URL - using a more robust approach
    let url = '';

    // First try to extract URL using regex for quoted URLs
    const quotedUrlMatch = normalizedCurl.match(/(?:"|')(https?:\/\/[^'"]+)(?:"|')/);
    if (quotedUrlMatch && quotedUrlMatch[1]) {
      url = quotedUrlMatch[1];
      console.log('Found quoted URL:', url);
    } else {
      // If no quoted URL found, try the traditional approach
      const parts = normalizedCurl.split(/\s+/);

      // Find the last part that looks like a URL (not starting with - and containing a dot or slash)
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].replace(/^['"]|['"]$/g, ''); // Remove quotes
        if (!part.startsWith('-') && (part.includes('.') || part.includes('/'))) {
          url = part;
          console.log('Found URL from parts:', url);
          break;
        }
      }
    }

    if (url) {
      parsed.url = url;
      console.log('Using URL:', parsed.url);

      // Ensure URL has protocol
      if (!parsed.url.startsWith('http://') && !parsed.url.startsWith('https://')) {
        parsed.url = 'https://' + parsed.url;
        console.log('Added protocol to URL:', parsed.url);
      }
    } else {
      throw new Error('No URL found in cURL command');
    }

    // Extract method with regex - handle both -X and --request formats
    const shortMethodMatch = normalizedCurl.match(/-X\s+([A-Z]+)/);
    const longMethodMatch = normalizedCurl.match(/--request\s+([A-Z]+)/);

    // Use the first match found
    if (shortMethodMatch && shortMethodMatch[1]) {
      parsed.method = shortMethodMatch[1];
      console.log('Extracted method from short form:', parsed.method);
    } else if (longMethodMatch && longMethodMatch[1]) {
      parsed.method = longMethodMatch[1];
      console.log('Extracted method from long form:', parsed.method);
    }

    // Extract headers with regex - handle both -H and --header formats
    const shortHeaderMatches = [...normalizedCurl.matchAll(/-H\s+['"]([^'"]+)['"]/g)];
    const longHeaderMatches = [...normalizedCurl.matchAll(/--header\s+['"]([^'"]+)['"]/g)];

    // Combine both types of header matches
    const headerMatches = [...shortHeaderMatches, ...longHeaderMatches];
    console.log('Found header matches:', headerMatches.length);

    for (const match of headerMatches) {
      if (match[1] && match[1].includes(':')) {
        const [key, ...valueParts] = match[1].split(':');
        const value = valueParts.join(':').trim();

        console.log('Extracted header:', key.trim(), value);
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
            } catch (_error) {
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

    // Extract data with regex - handle both short (-d) and long (--data) forms
    // Also handle both single and double quotes
    const shortDataMatch = normalizedCurl.match(/-d\s+(['"])(.+?)\1/);
    const longDataMatch = normalizedCurl.match(/--data\s+(['"])(.+?)\1/);

    // Use the first match found
    const dataMatch = shortDataMatch || longDataMatch;

    if (dataMatch && dataMatch[2]) {
      console.log('Found data in curl command:', dataMatch[2].substring(0, 30) + '...');

      try {
        parsed.body = JSON.parse(dataMatch[2]);
        console.log('Successfully parsed body as JSON');
      } catch (_error) {
        // If JSON parsing fails, try to clean up the string
        try {
          // Replace escaped quotes
          const cleanJson = dataMatch[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
          parsed.body = JSON.parse(cleanJson);
          console.log('Successfully parsed body as JSON after cleaning');
        } catch (_jsonError) {
          // If all parsing fails, just use the string
          console.log('Failed to parse body as JSON, using as string');
          parsed.body = dataMatch[2];
        }
      }

      // If method is still GET, change to POST when data is present
      if (parsed.method === 'GET') {
        parsed.method = 'POST';
        console.log('Changed method to POST because data is present');
      }
    }

    // Extract user and password (basic auth) - handle both -u and --user formats
    const shortUserMatch = normalizedCurl.match(/-u\s+['"](.+?)['"]/);
    const longUserMatch = normalizedCurl.match(/--user\s+['"](.+?)['"]/);

    // Use the first match found
    const userMatch = shortUserMatch || longUserMatch;

    if (userMatch && userMatch[1]) {
      parsed.auth.type = 'basic';
      const authStr = userMatch[1];
      const colonIndex = authStr.indexOf(':');

      if (colonIndex > 0) {
        parsed.auth.username = authStr.substring(0, colonIndex);
        parsed.auth.password = authStr.substring(colonIndex + 1);
        console.log('Extracted username and password for basic auth');
      } else {
        parsed.auth.username = authStr;
        console.log('Extracted username for basic auth (no password)');
      }
    }

    // Add validation
    if (!parsed.url) {
      throw new Error('No URL found in cURL command');
    }

    // Extract query parameters from URL - with enhanced error handling
    try {
      console.log('Attempting to extract query parameters from URL:', parsed.url);

      // Handle URL encoding issues
      let processedUrl = parsed.url;

      // Fix common URL encoding issues
      if (processedUrl.includes(' ')) {
        processedUrl = processedUrl.replace(/ /g, '%20');
        console.log('Fixed spaces in URL:', processedUrl);
      }

      // Handle unencoded ampersands in query parameters
      const questionMarkIndex = processedUrl.indexOf('?');
      if (questionMarkIndex > 0) {
        const baseUrl = processedUrl.substring(0, questionMarkIndex + 1);
        let queryString = processedUrl.substring(questionMarkIndex + 1);

        // Check if we need to encode ampersands
        if (queryString.includes('&') && !queryString.includes('%26')) {
          // Only encode ampersands that are not between quotes
          const parts = [];
          let inQuotes = false;
          let currentPart = '';

          for (let i = 0; i < queryString.length; i++) {
            const char = queryString[i];

            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
              currentPart += char;
            } else if (char === '&' && !inQuotes) {
              parts.push(currentPart);
              currentPart = '';
            } else {
              currentPart += char;
            }
          }

          if (currentPart) {
            parts.push(currentPart);
          }

          queryString = parts.join('&');
          processedUrl = baseUrl + queryString;
          console.log('Fixed query string:', processedUrl);
        }
      }

      const urlObj = new URL(processedUrl);
      if (urlObj.search) {
        const searchParams = urlObj.searchParams;
        parsed.queryParams = Array.from(searchParams.entries()).map(([key, value]) => ({
          key,
          value
        }));

        console.log('Successfully extracted query parameters:', parsed.queryParams);
      } else {
        console.log('No query parameters found in URL');
      }

      // Keep the original URL but store the processed one for reference
      parsed.processedUrl = urlObj.toString();
    } catch (urlError) {
      console.warn('Error processing URL:', urlError.message);

      // Fallback method for extracting query parameters if URL parsing fails
      try {
        console.log('Using fallback method to extract query parameters');
        const questionMarkIndex = parsed.url.indexOf('?');
        if (questionMarkIndex > 0) {
          const queryString = parsed.url.substring(questionMarkIndex + 1);
          console.log('Query string:', queryString);

          // Handle more complex query strings
          const params = [];
          let currentParam = '';
          let inQuotes = false;

          for (let i = 0; i < queryString.length; i++) {
            const char = queryString[i];

            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
              currentParam += char;
            } else if (char === '&' && !inQuotes) {
              if (currentParam) {
                params.push(currentParam);
                currentParam = '';
              }
            } else {
              currentParam += char;
            }
          }

          if (currentParam) {
            params.push(currentParam);
          }

          console.log('Parsed params:', params);

          parsed.queryParams = params.map(param => {
            try {
              const equalsIndex = param.indexOf('=');
              if (equalsIndex > 0) {
                const key = param.substring(0, equalsIndex);
                const value = param.substring(equalsIndex + 1);
                return {
                  key: decodeURIComponent(key),
                  value: decodeURIComponent(value || '')
                };
              } else {
                return {
                  key: decodeURIComponent(param),
                  value: ''
                };
              }
            } catch (decodeError) {
              console.warn('Error decoding parameter:', param, decodeError);
              return {
                key: param,
                value: ''
              };
            }
          });

          console.log('Fallback extracted query parameters:', parsed.queryParams);
        } else {
          console.log('No query parameters found in URL using fallback method');
        }
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
      }
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
  // First, handle line continuations and normalize whitespace
  let normalized = curlString
    .replace(/\\\n/g, ' ')  // Replace line continuations
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .trim();

  // Log the initial normalization
  console.log('Initial normalization:', normalized.substring(0, 50) + '...');

  // Fix unquoted URLs - look for URLs that aren't properly quoted
  const urlRegex = /(curl\s+-[^\s]*\s+)(https?:\/\/[^\s"']+)/i;
  const urlMatch = normalized.match(urlRegex);
  if (urlMatch && !normalized.includes('"' + urlMatch[2]) && !normalized.includes("'" + urlMatch[2])) {
    normalized = normalized.replace(urlRegex, `$1"$2"`);
    console.log('Fixed unquoted URL:', normalized.substring(0, 50) + '...');
  }

  // Fix unquoted headers (both short and long form)
  normalized = normalized.replace(/-H\s+([^"'])/g, '-H "$1');
  normalized = normalized.replace(/--header\s+([^"'])/g, '--header "$1');

  // Fix unquoted data (both short and long form)
  normalized = normalized.replace(/-d\s+([^"'])/g, '-d "$1');
  normalized = normalized.replace(/--data\s+([^"'])/g, '--data "$1');

  // Fix incomplete quotes - ensure all quotes are properly closed
  let quoteCount = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '"' && (i === 0 || normalized[i-1] !== '\\')) {
      quoteCount++;
    }
  }

  if (quoteCount % 2 !== 0) {
    console.log('Warning: Unbalanced quotes in cURL command');
    // Try to fix by adding a quote at the end
    normalized += '"';
  }

  return normalized;
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
