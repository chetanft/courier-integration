/**
 * Parses a cURL command string into a structured request object
 *
 * SECURITY NOTE:
 * This parser handles authentication credentials including Basic Auth and Bearer/JWT tokens.
 * - All credentials are treated as sensitive information
 * - No actual credentials should be logged to the console
 * - Any example tokens or credentials in this file are dummy values for testing only
 *
 * @param {string} curlString - The cURL command to parse
 * @returns {Object} The parsed request object
 * @throws {Error} If the curl command is invalid or cannot be parsed
 */
export const parseCurl = (curlString) => {
  // Don't log the actual curl command as it may contain sensitive information
  console.log('Parsing cURL command...');

  if (!curlString) {
    throw new Error('Empty cURL command');
  }

  const trimmedCommand = curlString.trim();

  if (!trimmedCommand.startsWith('curl')) {
    throw new Error('Invalid cURL command, must start with "curl"');
  }

  // Initialize the request object with default values
  const request = {
    method: 'GET', // Default method
    url: '',
    headers: [],
    body: null,
    queryParams: [],
    isFormUrlEncoded: false,
    auth: {
      type: 'none',
      username: '',
      password: '',
      token: ''
    }
  };

  try {
    // Remove 'curl' from the beginning and split by spaces (respecting quotes)
    const parts = splitCurlCommand(trimmedCommand.substring(4).trim());

    let i = 0;
    while (i < parts.length) {
      const part = parts[i];

      // URL (if not a flag)
      if (!part.startsWith('-') && !request.url) {
        request.url = part.replace(/['"]/g, '');

        // Validate URL format
        try {
          // Add protocol if missing
          if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
            request.url = 'https://' + request.url;
          }

          // Test if URL is valid
          new URL(request.url);
        } catch (urlError) {
          console.warn('URL validation warning:', urlError.message);
          // Continue anyway as the URL might be a template or variable
        }

        i++;
        continue;
      }

      // Method
      if (part === '-X' || part === '--request') {
        if (i + 1 < parts.length) {
          const method = parts[i + 1].toUpperCase();
          // Validate HTTP method
          const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
          request.method = validMethods.includes(method) ? method : 'GET';
          i += 2;
          continue;
        }
      }

    // Headers
    if (part === '-H' || part === '--header') {
      if (i + 1 < parts.length) {
        try {
          // Remove surrounding quotes but keep internal quotes
          let headerStr = parts[i + 1];

          // Remove outer quotes if present
          if ((headerStr.startsWith('"') && headerStr.endsWith('"')) ||
              (headerStr.startsWith("'") && headerStr.endsWith("'"))) {
            headerStr = headerStr.substring(1, headerStr.length - 1);
          }

          // Find the first colon that's not inside quotes
          let colonIndex = -1;
          let inQuote = false;
          let quoteChar = null;

          for (let j = 0; j < headerStr.length; j++) {
            const char = headerStr[j];

            if ((char === '"' || char === "'") && (j === 0 || headerStr[j-1] !== '\\')) {
              if (!inQuote) {
                inQuote = true;
                quoteChar = char;
              } else if (char === quoteChar) {
                inQuote = false;
                quoteChar = null;
              }
            }

            if (char === ':' && !inQuote) {
              colonIndex = j;
              break;
            }
          }

          if (colonIndex > 0) {
            const key = headerStr.substring(0, colonIndex).trim();
            const value = headerStr.substring(colonIndex + 1).trim();

            // Log header name but not value (which might contain sensitive info)
            console.log(`Processing header: ${key}`);

            // Check for Authorization header
            if (key.toLowerCase() === 'authorization') {
              const authLower = value.toLowerCase();

              if (authLower.startsWith('basic ')) {
                request.auth.type = 'basic';
                try {
                  const credentials = atob(value.substring(6));
                  const [username, password] = credentials.split(':');
                  request.auth.username = username || '';
                  request.auth.password = password || '';
                  console.log('Extracted Basic auth credentials');
                } catch (e) {
                  console.warn('Failed to decode Basic auth:', e.message);
                }
              } else if (authLower.startsWith('bearer ')) {
                // Extract the full token (trim any whitespace)
                const token = value.substring(7).trim();

                // Check if it's a JWT token (has 2 dots for header.payload.signature)
                if (token.split('.').length === 3) {
                  request.auth.type = 'jwt';
                  request.auth.token = token;
                  console.log('Detected JWT token format');
                } else {
                  request.auth.type = 'bearer';
                  request.auth.token = token;
                  console.log('Detected regular bearer token format');
                }
              } else if (authLower.startsWith('api-key ') || authLower.startsWith('apikey ')) {
                // Handle API key auth
                const apiKey = value.substring(value.indexOf(' ') + 1).trim();
                request.auth.type = 'api_key';
                request.auth.token = apiKey;
                console.log('Detected API key authentication');
              }
            }

            // Special handling for common API key headers
            const apiKeyHeaders = ['x-api-key', 'api-key', 'apikey', 'x-api-token'];
            if (apiKeyHeaders.includes(key.toLowerCase()) && value) {
              request.auth.type = 'api_key';
              request.auth.token = value;
              console.log('Detected API key in header');
            }

            request.headers.push({ key, value });
          } else {
            console.warn(`Invalid header format (missing colon): ${headerStr}`);
          }
        } catch (headerError) {
          console.warn('Error processing header:', headerError.message);
        }

        i += 2;
        continue;
      }
    }

    // Data (body)
    if (part === '-d' || part === '--data' || part === '--data-raw' || part === '--data-binary' || part === '--data-urlencode') {
      if (i + 1 < parts.length) {
        try {
          let bodyStr = parts[i + 1];
          const isUrlEncoded = part === '--data-urlencode';

          // Remove outer quotes if present
          if ((bodyStr.startsWith('"') && bodyStr.endsWith('"')) ||
              (bodyStr.startsWith("'") && bodyStr.endsWith("'"))) {
            bodyStr = bodyStr.substring(1, bodyStr.length - 1);
          }

          console.log(`Processing data parameter: ${part}`);

          // Initialize body object if it doesn't exist
          if (!request.body || typeof request.body !== 'object') {
            request.body = {};
            request.isFormUrlEncoded = isUrlEncoded;
          }

          // Handle --data-urlencode parameter (key=value format)
          if (isUrlEncoded) {
            const equalIndex = bodyStr.indexOf('=');
            if (equalIndex > 0) {
              const key = bodyStr.substring(0, equalIndex);
              const value = bodyStr.substring(equalIndex + 1);
              request.body[key] = value;
            } else {
              // Handle case where the parameter is just a value without a key
              request.body[bodyStr] = '';
            }

            // Set form-urlencoded flag
            request.isFormUrlEncoded = true;

            // Add Content-Type header if not already present
            const hasContentType = request.headers.some(
              h => h.key.toLowerCase() === 'content-type'
            );

            if (!hasContentType) {
              request.headers.push({
                key: 'Content-Type',
                value: 'application/x-www-form-urlencoded'
              });
            }
          }
          // Handle regular data parameters
          else {
            // Check for Content-Type header to determine how to parse the body
            const contentTypeHeader = request.headers.find(
              h => h.key.toLowerCase() === 'content-type'
            );

            const contentType = contentTypeHeader?.value?.toLowerCase() || '';

            // Handle different content types
            if (contentType.includes('application/x-www-form-urlencoded') ||
                (bodyStr.includes('=') && (bodyStr.includes('&') || !bodyStr.includes('{')))) {
              // Parse as form-urlencoded
              try {
                const pairs = bodyStr.split('&');

                for (const pair of pairs) {
                  const [key, value] = pair.split('=');
                  if (key) {
                    try {
                      const decodedKey = decodeURIComponent(key);
                      const decodedValue = value ? decodeURIComponent(value) : '';
                      request.body[decodedKey] = decodedValue;
                    } catch (error) {
                      // If decoding fails, use the raw values
                      request.body[key] = value || '';
                    }
                  }
                }

                // Set form-urlencoded flag
                request.isFormUrlEncoded = true;

                // Add Content-Type header if not already present
                if (!contentTypeHeader) {
                  request.headers.push({
                    key: 'Content-Type',
                    value: 'application/x-www-form-urlencoded'
                  });
                }
              } catch (formError) {
                console.warn('Error parsing form data:', formError.message);
                request.body = bodyStr;
              }
            } else if (contentType.includes('application/json') ||
                      (bodyStr.startsWith('{') && bodyStr.endsWith('}')) ||
                      (bodyStr.startsWith('[') && bodyStr.endsWith(']'))) {
              // Parse as JSON
              try {
                const jsonBody = JSON.parse(bodyStr);

                // If we already have a body object, merge with it
                if (request.body && typeof request.body === 'object' && typeof jsonBody === 'object' && !Array.isArray(jsonBody)) {
                  request.body = { ...request.body, ...jsonBody };
                } else {
                  request.body = jsonBody;
                }

                // Add Content-Type header if not already present
                if (!contentTypeHeader) {
                  request.headers.push({
                    key: 'Content-Type',
                    value: 'application/json'
                  });
                }
              } catch (jsonError) {
                console.warn('Error parsing JSON body:', jsonError.message);
                request.body = bodyStr;
              }
            } else {
              // Store as raw string for other content types
              request.body = bodyStr;
            }
          }

          // If method is still GET, change to POST when data is present
          if (request.method === 'GET') {
            request.method = 'POST';
            console.log('Changed method to POST because data is present');
          }
        } catch (bodyError) {
          console.warn('Error processing request body:', bodyError.message);
        }

        i += 2;
        continue;
      }
    }

    // User and password (basic auth)
    if (part === '-u' || part === '--user') {
      if (i + 1 < parts.length) {
        try {
          let authStr = parts[i + 1];

          // Remove outer quotes if present
          if ((authStr.startsWith('"') && authStr.endsWith('"')) ||
              (authStr.startsWith("'") && authStr.endsWith("'"))) {
            authStr = authStr.substring(1, authStr.length - 1);
          }

          const colonIndex = authStr.indexOf(':');

          request.auth.type = 'basic';
          if (colonIndex > 0) {
            request.auth.username = authStr.substring(0, colonIndex);
            request.auth.password = authStr.substring(colonIndex + 1);
          } else {
            request.auth.username = authStr;
          }

          console.log('Extracted Basic auth from --user parameter');

          // Add Authorization header if not already present
          const hasAuthHeader = request.headers.some(
            h => h.key.toLowerCase() === 'authorization'
          );

          if (!hasAuthHeader) {
            // Create the Authorization header with Basic auth
            const credentials = `${request.auth.username}:${request.auth.password || ''}`;
            const base64Credentials = btoa(credentials);

            request.headers.push({
              key: 'Authorization',
              value: `Basic ${base64Credentials}`
            });
          }
        } catch (authError) {
          console.warn('Error processing basic auth:', authError.message);
        }

        i += 2;
        continue;
      }
    }

    // Move to next part if we didn't handle this one
    i++;
  }

  // Process the URL to extract query parameters
  try {
    if (request.url) {
      // Ensure URL has a protocol
      const urlWithProtocol = request.url.startsWith('http') ? request.url : `https://${request.url}`;

      // Parse the URL
      const urlObj = new URL(urlWithProtocol);

      // Extract query parameters
      if (urlObj.search) {
        const searchParams = urlObj.searchParams;

        // Convert URLSearchParams to array of key-value pairs
        request.queryParams = Array.from(searchParams.entries()).map(([key, value]) => ({
          key,
          value
        }));

        console.log(`Extracted ${request.queryParams.length} query parameters from URL`);
      }

      // Clean up the URL if needed (e.g., normalize protocol)
      request.url = urlObj.toString();
    }
  } catch (urlError) {
    console.warn('Error processing URL:', urlError.message);
  }

  // Add default Content-Type header if not present and we have a body
  if (request.body && !request.headers.some(h => h.key.toLowerCase() === 'content-type')) {
    // Determine appropriate Content-Type based on body
    let contentType = 'text/plain';

    if (request.isFormUrlEncoded) {
      contentType = 'application/x-www-form-urlencoded';
    } else if (typeof request.body === 'object') {
      contentType = 'application/json';
    }

    request.headers.push({
      key: 'Content-Type',
      value: contentType
    });
  }

  // Create a sanitized version of the request for logging (without sensitive data)
  const sanitizedRequest = {
    method: request.method,
    url: request.url,
    headers: request.headers.map(h => {
      // Redact sensitive header values
      const sensitiveHeaders = ['authorization', 'x-api-key', 'api-key', 'cookie', 'token'];
      if (sensitiveHeaders.includes(h.key.toLowerCase())) {
        return { key: h.key, value: '[REDACTED]' };
      }
      return h;
    }),
    queryParams: request.queryParams,
    hasBody: !!request.body,
    bodyType: typeof request.body,
    isFormUrlEncoded: request.isFormUrlEncoded,
    auth: {
      type: request.auth.type,
      hasUsername: !!request.auth.username,
      hasPassword: !!request.auth.password,
      hasToken: !!request.auth.token
    }
  };

  console.log('Parsed cURL request:', sanitizedRequest);
  return request;
  } catch (error) {
    console.error('Error parsing cURL command:', error);
    throw new Error(`Failed to parse cURL command: ${error.message}`);
  }
};

/**
 * Splits a cURL command respecting quotes and escaping
 * @param {string} command - The command to split
 * @returns {string[]} Array of command parts
 */
function splitCurlCommand(command) {
  // Don't log the actual command as it may contain sensitive information
  console.log('Splitting cURL command...');

  // Initialize variables
  const parts = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  let inFlag = false;

  try {
    // Pre-process: normalize spaces and fix common formatting issues
    const normalizedCommand = command
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Ensure space between quote and flag
      .replace(/(['"]) -/g, '$1 -')
      // Ensure space between quote and next part
      .replace(/ (['"]) /g, ' $1')
      // Ensure space after short flags
      .replace(/-([a-zA-Z]) /g, '-$1 ')
      // Fix common issues with header formatting
      .replace(/-H ([^"'])/g, '-H "$1')
      .replace(/-H "([^"]*[^"])$/g, '-H "$1"')
      .replace(/-H '([^']*[^'])$/g, "-H '$1'")
      // Also handle --header parameter (long form of -H)
      .replace(/--header ([^"'])/g, '--header "$1')
      .replace(/--header "([^"]*[^"])$/g, '--header "$1"')
      .replace(/--header '([^']*[^'])$/g, "--header '$1'")
      // Fix data parameter formatting
      .replace(/-d ([^"'])/g, '-d "$1')
      .replace(/--data ([^"'])/g, '--data "$1')
      .replace(/--data-raw ([^"'])/g, '--data-raw "$1')
      .replace(/--data-binary ([^"'])/g, '--data-binary "$1"')
      .replace(/--data-urlencode ([^"'])/g, '--data-urlencode "$1"')
      // Fix user parameter formatting
      .replace(/-u ([^"'])/g, '-u "$1')
      .replace(/--user ([^"'])/g, '--user "$1"');

    // Process each character in the normalized command
    for (let i = 0; i < normalizedCommand.length; i++) {
      const char = normalizedCommand[i];

      // Handle escape sequences
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      // Handle quotes
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
        continue;
      }

      // Handle flags (-H, --header, etc.)
      if (char === '-' && !inSingleQuote && !inDoubleQuote && !inFlag) {
        // If we have content, push it before starting a new flag
        if (current) {
          parts.push(current);
          current = '';
        }
        inFlag = true;
        current += char;
        continue;
      }

      // End of flag when we hit a space
      if (char === ' ' && inFlag && !inSingleQuote && !inDoubleQuote) {
        parts.push(current);
        current = '';
        inFlag = false;
        continue;
      }

      // Handle spaces outside of quotes and flags
      if (char === ' ' && !inSingleQuote && !inDoubleQuote && !inFlag) {
        if (current) {
          parts.push(current);
          current = '';
        }
        continue;
      }

      // Special handling for flag values
      const knownFlags = [
        '-H', '--header',
        '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
        '-u', '--user',
        '-X', '--request',
        '-A', '--user-agent',
        '-b', '--cookie',
        '-e', '--referer',
        '-F', '--form',
        '-I', '--head',
        '-L', '--location'
      ];

      if (char === ' ' && !inSingleQuote && !inDoubleQuote && knownFlags.includes(current)) {
        parts.push(current);
        current = '';
        inFlag = false;
        continue;
      }

      current += char;
    }

    // Add the last part if there's anything left
    if (current) {
      parts.push(current);
    }

    // Check for unclosed quotes
    if (inSingleQuote || inDoubleQuote) {
      console.warn('Warning: Unclosed quotes in cURL command');
    }

    // Log the number of parts found (not the actual parts which may contain sensitive data)
    console.log(`Split cURL command into ${parts.length} parts`);

    return parts;
  } catch (error) {
    console.error('Error splitting cURL command:', error);
    // Return whatever we've parsed so far
    if (current) {
      parts.push(current);
    }
    return parts;
  }
}

/**
 * Converts a request object to a cURL command
 *
 * @param {Object} request - The request object to convert
 * @returns {string} The cURL command
 */
export const toCurl = (request) => {
  try {
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
        } else if (request.auth.type === 'api_key' && request.auth.token) {
          // For API key auth, add as a header (common convention)
          curl += ` -H "X-API-Key: ${request.auth.token}"`;
        }
      }
    }

    // Add query parameters if they're not already in the URL
    if (request.queryParams && Array.isArray(request.queryParams) && request.queryParams.length > 0) {
      // Check if URL already has query parameters
      const hasQueryParams = request.url.includes('?');

      // Build query string
      const queryString = request.queryParams
        .filter(param => param.key)
        .map(param => {
          const encodedKey = encodeURIComponent(param.key);
          const encodedValue = param.value ? encodeURIComponent(param.value) : '';
          return `${encodedKey}=${encodedValue}`;
        })
        .join('&');

      if (queryString && !request.url.includes(queryString)) {
        curl = curl.replace(`"${request.url}"`, `"${request.url}${hasQueryParams ? '&' : '?'}${queryString}"`);
      }
    }

    // Add body
    if (request.body) {
      let bodyStr;
      let dataFlag = '-d';

      // Determine the appropriate data flag based on content type
      const contentTypeHeader = request.headers && request.headers.find(
        h => h.key.toLowerCase() === 'content-type'
      );

      const contentType = contentTypeHeader?.value?.toLowerCase() || '';

      if (contentType.includes('application/x-www-form-urlencoded')) {
        dataFlag = '--data-urlencode';
      } else if (contentType.includes('multipart/form-data')) {
        dataFlag = '-F';
      } else if (request.isFormUrlEncoded) {
        dataFlag = '--data-urlencode';
      }

      // Format the body based on its type
      if (typeof request.body === 'string') {
        bodyStr = request.body;
      } else if (request.isFormUrlEncoded && typeof request.body === 'object') {
        // For form-urlencoded, add each key-value pair separately
        for (const [key, value] of Object.entries(request.body)) {
          if (value !== undefined && value !== null) {
            const encodedValue = typeof value === 'string' ? value : JSON.stringify(value);
            curl += ` ${dataFlag} "${key}=${encodedValue}"`;
          }
        }
        bodyStr = null; // We've already added the body parts
      } else {
        try {
          bodyStr = JSON.stringify(request.body);
        } catch (error) {
          console.warn('Error stringifying body:', error.message);
          bodyStr = '';
        }
      }

      // Add the body if we have one and haven't already added it
      if (bodyStr) {
        // Escape single quotes in the body
        const escapedBody = bodyStr.replace(/'/g, "'\\''");
        curl += ` ${dataFlag} '${escapedBody}'`;
      }
    }

    return curl;
  } catch (error) {
    console.error('Error converting request to cURL:', error);
    return `curl "${request?.url || ''}"`;
  }
};
