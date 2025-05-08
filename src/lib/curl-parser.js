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
 */
export const parseCurl = (curlString) => {
  console.log('Parsing cURL command:', curlString);

  if (!curlString || !curlString.trim().startsWith('curl')) {
    console.error('Invalid cURL command, must start with "curl"');
    throw new Error('Invalid cURL command');
  }

  // Initialize the request object
  const request = {
    method: 'GET', // Default method
    url: '',
    headers: [],
    body: null,
    isFormUrlEncoded: false,
    auth: {
      type: 'none',
      username: '',
      password: '',
      token: ''
    }
  };

  // Remove 'curl' from the beginning and split by spaces (respecting quotes)
  const parts = splitCurlCommand(curlString.trim().substring(4).trim());

  let i = 0;
  while (i < parts.length) {
    const part = parts[i];

    // URL (if not a flag)
    if (!part.startsWith('-') && !request.url) {
      request.url = part.replace(/['"]/g, '');
      i++;
      continue;
    }

    // Method
    if (part === '-X' || part === '--request') {
      if (i + 1 < parts.length) {
        request.method = parts[i + 1].toUpperCase();
        i += 2;
        continue;
      }
    }

    // Headers
    if (part === '-H' || part === '--header') {
      if (i + 1 < parts.length) {
        // Remove surrounding quotes but keep internal quotes
        let headerStr = parts[i + 1];

        // Remove outer quotes if present
        if ((headerStr.startsWith('"') && headerStr.endsWith('"')) ||
            (headerStr.startsWith("'") && headerStr.endsWith("'"))) {
          headerStr = headerStr.substring(1, headerStr.length - 1);
        }

        console.log('Processing header:', headerStr);

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

          console.log(`Found header: "${key}: ${value}"`);


          // Check for Authorization header
          if (key.toLowerCase() === 'authorization') {
            if (value.toLowerCase().startsWith('basic ')) {
              request.auth.type = 'basic';
              try {
                const credentials = atob(value.substring(6));
                const [username, password] = credentials.split(':');
                request.auth.username = username || '';
                request.auth.password = password || '';
                // Don't log actual credentials for security reasons
                console.log('Extracted Basic auth credentials: [CREDENTIALS REDACTED]');
              } catch (e) {
                // If we can't decode, just store the raw value
                console.error('Failed to decode Basic auth:', e);
              }
            } else if (value.toLowerCase().startsWith('bearer ')) {
              // Extract the full token (trim any whitespace)
              const token = value.substring(7).trim();
              // Don't log the actual token value for security reasons
              console.log('Extracted bearer token: [TOKEN CONTENT REDACTED]');

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
            }
          }

          // Special handling for Cookie header
          if (key.toLowerCase() === 'cookie') {
            console.log('Found Cookie header:', value);
          }

          request.headers.push({ key, value });
        }
        i += 2;
        continue;
      }
    }

    // Data (body)
    if (part === '-d' || part === '--data' || part === '--data-raw' || part === '--data-binary' || part === '--data-urlencode') {
      if (i + 1 < parts.length) {
        let bodyStr = parts[i + 1].replace(/^['"]|['"]$/g, '');
        const isUrlEncoded = part === '--data-urlencode';

        console.log(`Processing data parameter: ${part} with value: ${bodyStr}`);

        // Initialize body object if it doesn't exist
        if (!request.body || typeof request.body !== 'object') {
          request.body = {};
          request.isFormUrlEncoded = true;
        }

        // Handle --data-urlencode parameter (key=value format)
        if (isUrlEncoded) {
          const equalIndex = bodyStr.indexOf('=');
          if (equalIndex > 0) {
            const key = bodyStr.substring(0, equalIndex);
            const value = bodyStr.substring(equalIndex + 1);
            console.log(`Adding URL-encoded parameter: ${key}=${value}`);
            request.body[key] = value;
          } else {
            // Handle case where the parameter is just a value without a key
            console.log(`Adding URL-encoded parameter without key: ${bodyStr}`);
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
          // Check if this is form-urlencoded data (contains key=value&key2=value2)
          if (bodyStr.includes('=') && (bodyStr.includes('&') || !bodyStr.includes('{'))) {
            try {
              // Parse as form-urlencoded
              const pairs = bodyStr.split('&');

              for (const pair of pairs) {
                const [key, value] = pair.split('=');
                if (key) {
                  request.body[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
                }
              }

              // Add a special flag to indicate this is form-urlencoded data
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
            } catch (error) {
              console.error('Error parsing form data:', error);
              // If we already have a body object, don't overwrite it
              if (!request.body || typeof request.body !== 'object') {
                request.body = bodyStr;
              }
            }
          } else {
            try {
              // Try to parse as JSON
              const jsonBody = JSON.parse(bodyStr);

              // If we already have a body object, merge with it
              if (request.body && typeof request.body === 'object' && typeof jsonBody === 'object') {
                request.body = { ...request.body, ...jsonBody };
              } else {
                request.body = jsonBody;
              }
            } catch (error) {
              // If not valid JSON, store as string
              console.error('Error parsing JSON body:', error);
              // If we already have a body object, don't overwrite it
              if (!request.body || typeof request.body !== 'object') {
                request.body = bodyStr;
              }
            }
          }
        }

        // If method is still GET, change to POST when data is present
        if (request.method === 'GET') {
          request.method = 'POST';
        }

        i += 2;
        continue;
      }
    }

    // User and password (basic auth)
    if (part === '-u' || part === '--user') {
      if (i + 1 < parts.length) {
        const authStr = parts[i + 1].replace(/['"]/g, '');
        const colonIndex = authStr.indexOf(':');

        request.auth.type = 'basic';
        if (colonIndex > 0) {
          request.auth.username = authStr.substring(0, colonIndex);
          request.auth.password = authStr.substring(colonIndex + 1);
        } else {
          request.auth.username = authStr;
        }

        i += 2;
        continue;
      }
    }

    // Move to next part if we didn't handle this one
    i++;
  }

  // Create a sanitized version of the request for logging (without sensitive data)
  const sanitizedRequest = {
    ...request,
    auth: {
      ...request.auth,
      // Redact sensitive information
      username: request.auth.username ? '[USERNAME REDACTED]' : '',
      password: request.auth.password ? '[PASSWORD REDACTED]' : '',
      token: request.auth.token ? '[TOKEN REDACTED]' : ''
    }
  };

  console.log('Parsed cURL request:', sanitizedRequest);
  return request;
};

/**
 * Splits a cURL command respecting quotes
 * @param {string} command - The command to split
 * @returns {string[]} Array of command parts
 */
function splitCurlCommand(command) {
  console.log('Splitting cURL command:', command);
  const parts = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  let inFlag = false;

  // Pre-process: normalize spaces around quotes and flags
  command = command.replace(/\s+/g, ' ')
                   .replace(/(['"]) -/g, '$1 -')
                   .replace(/ (['"]) /g, ' $1')
                   .replace(/-([a-zA-Z]) /g, '-$1 ')
                   // Fix common issues with header formatting
                   .replace(/-H ([^"'])/g, '-H "$1')
                   .replace(/-H "([^"]*[^"])$/g, '-H "$1"')
                   .replace(/-H '([^']*[^'])$/g, "-H '$1'")
                   // Also handle --header parameter (long form of -H)
                   .replace(/--header ([^"'])/g, '--header "$1')
                   .replace(/--header "([^"]*[^"])$/g, '--header "$1"')
                   .replace(/--header '([^']*[^'])$/g, "--header '$1'");

  console.log('Normalized command:', command);

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

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
    if (char === ' ' && !inSingleQuote && !inDoubleQuote &&
        (current === '-H' || current === '--header' ||
         current === '-d' || current === '--data' ||
         current === '--data-urlencode' || current === '--data-raw' ||
         current === '--data-binary' ||
         current === '-u' || current === '--user')) {
      console.log('Found flag:', current);
      parts.push(current);
      current = '';
      inFlag = false;
      continue;
    }

    current += char;
  }

  if (current) {
    parts.push(current);
  }

  console.log('Split parts:', parts);
  return parts;
}

/**
 * Converts a request object to a cURL command
 * @param {Object} request - The request object to convert
 * @returns {string} The cURL command
 */
export const toCurl = (request) => {
  if (!request || !request.url) {
    return 'curl';
  }

  let curl = `curl -X ${request.method} "${request.url}"`;

  // Add headers
  if (request.headers && request.headers.length > 0) {
    for (const header of request.headers) {
      if (header.key && header.value) {
        curl += ` -H "${header.key}: ${header.value}"`;
      }
    }
  }

  // Add auth if not already in headers
  if (request.auth && request.auth.type !== 'none') {
    const hasAuthHeader = request.headers.some(
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
      }
    }
  }

  // Add body
  if (request.body) {
    let bodyStr;
    if (typeof request.body === 'string') {
      bodyStr = request.body;
    } else {
      try {
        bodyStr = JSON.stringify(request.body);
      } catch (error) {
        console.error('Error stringifying body:', error);
        bodyStr = '';
      }
    }

    if (bodyStr) {
      curl += ` -d '${bodyStr}'`;
    }
  }

  return curl;
};
