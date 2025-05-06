/**
 * Parses a cURL command string into a structured request object
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
        const headerStr = parts[i + 1].replace(/['"]/g, '');
        const colonIndex = headerStr.indexOf(':');

        if (colonIndex > 0) {
          const key = headerStr.substring(0, colonIndex).trim();
          const value = headerStr.substring(colonIndex + 1).trim();

          // Check for Authorization header
          if (key.toLowerCase() === 'authorization') {
            if (value.toLowerCase().startsWith('basic ')) {
              request.auth.type = 'basic';
              try {
                const credentials = atob(value.substring(6));
                const [username, password] = credentials.split(':');
                request.auth.username = username || '';
                request.auth.password = password || '';
              } catch (e) {
                // If we can't decode, just store the raw value
                console.error('Failed to decode Basic auth:', e);
              }
            } else if (value.toLowerCase().startsWith('bearer ')) {
              // Check if it's a JWT token (has 2 dots for header.payload.signature)
              const token = value.substring(7);
              if (token.split('.').length === 3) {
                request.auth.type = 'jwt';
                request.auth.token = token;
              } else {
                request.auth.type = 'bearer';
                request.auth.token = token;
              }
            }
          }

          request.headers.push({ key, value });
        }
        i += 2;
        continue;
      }
    }

    // Data (body)
    if (part === '-d' || part === '--data' || part === '--data-raw' || part === '--data-binary') {
      if (i + 1 < parts.length) {
        let bodyStr = parts[i + 1].replace(/^['"]|['"]$/g, '');

        try {
          // Try to parse as JSON
          request.body = JSON.parse(bodyStr);
        } catch (error) {
          // If not valid JSON, store as string
          console.error('Error parsing JSON body:', error);
          request.body = bodyStr;
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

  console.log('Parsed cURL request:', request);
  return request;
};

/**
 * Splits a cURL command respecting quotes
 * @param {string} command - The command to split
 * @returns {string[]} Array of command parts
 */
function splitCurlCommand(command) {
  const parts = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

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

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    parts.push(current);
  }

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
