// API Proxy for external courier API calls
// This function acts as a CORS proxy to allow the frontend to make requests to external APIs
/* eslint-disable no-undef */
const fetch = require('node-fetch');

exports.handler = async function(event) {
  // Set CORS headers to allow requests from any origin
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      console.error('Error parsing request body:', e);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: true,
          message: 'Invalid request body. Expected JSON.',
          details: e.message
        })
      };
    }

    // Extract request details from the body
    const { url, method, headers: customHeaders, body, params } = requestBody;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: true,
          message: 'URL is required'
        })
      };
    }

    console.log(`Proxying ${method || 'GET'} request to: ${url}`);

    // Prepare fetch options with sanitized headers
    const sanitizedHeaders = {};

    // Process headers to ensure they're all strings and valid
    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        if (value !== undefined && value !== null) {
          sanitizedHeaders[key] = String(value);
        }
      }
    }

    const fetchOptions = {
      method: method || 'GET',
      headers: sanitizedHeaders
    };

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(fetchOptions.method) && body) {
      // If the content type is application/json, stringify the body
      if (
        sanitizedHeaders['Content-Type']?.includes('application/json') ||
        sanitizedHeaders['content-type']?.includes('application/json')
      ) {
        fetchOptions.body = JSON.stringify(body);
      }
      // If it's form-urlencoded, convert to URLSearchParams
      else if (
        sanitizedHeaders['Content-Type']?.includes('application/x-www-form-urlencoded') ||
        sanitizedHeaders['content-type']?.includes('application/x-www-form-urlencoded')
      ) {
        const formData = new URLSearchParams();
        for (const key in body) {
          if (body[key] !== undefined && body[key] !== null) {
            formData.append(key, body[key]);
          }
        }
        fetchOptions.body = formData.toString();
      }
      // Otherwise, just use the body as is
      else {
        fetchOptions.body = JSON.stringify(body);
      }
    }

    // Add query parameters if provided
    let finalUrl = url;
    if (params && Object.keys(params).length > 0) {
      const urlObj = new URL(url);
      for (const key in params) {
        if (params[key] !== undefined && params[key] !== null) {
          urlObj.searchParams.append(key, params[key]);
        }
      }
      finalUrl = urlObj.toString();
    }

    console.log('Making request with options:', {
      url: finalUrl,
      method: fetchOptions.method,
      headers: fetchOptions.headers,
      bodyLength: fetchOptions.body ? fetchOptions.body.length : 0
    });

    // Log the headers for debugging
    console.log('Headers before fetch:', JSON.stringify(fetchOptions.headers));

    // Create a new Headers object to ensure it's properly formatted
    const headers = new Headers();

    // Add each header individually to ensure they're properly formatted
    for (const [key, value] of Object.entries(fetchOptions.headers)) {
      if (value !== undefined && value !== null) {
        headers.set(key, String(value));
      }
    }

    // Create a new fetch options object with the properly formatted headers
    const finalFetchOptions = {
      method: fetchOptions.method,
      headers: headers
    };

    // Add body if it exists
    if (fetchOptions.body) {
      finalFetchOptions.body = fetchOptions.body;
    }

    // Make the request to the external API
    const response = await fetch(finalUrl, finalFetchOptions);

    // Get the response body
    let responseBody;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
      // Try to parse as JSON anyway, in case the content type is wrong
      try {
        responseBody = JSON.parse(responseBody);
      } catch (_) {
        // If it's not valid JSON, keep it as text
        console.log('Response is not valid JSON, keeping as text');
      }
    }

    // Check for error status codes and enhance the response
    if (response.status >= 400) {
      console.error(`API returned error status: ${response.status}`, responseBody);

      // Special handling for 405 Method Not Allowed
      if (response.status === 405) {
        const isSafexpress = url.includes('safexpress.com');
        let errorMessage = `API request failed (Status: 405) - URL: ${url}`;
        let troubleshooting = [];

        // Add specific troubleshooting suggestions for Safexpress
        if (isSafexpress) {
          troubleshooting = [
            "Try using a different HTTP method (GET instead of POST, or vice versa)",
            "Verify the API endpoint URL is correct",
            "Check if the API requires specific headers",
            "Ensure the request body format matches API requirements"
          ];

          // For Safexpress auth endpoint specifically
          if (url.includes('oauth2/token')) {
            troubleshooting.push(
              "For Safexpress auth endpoint, try using GET method with client_id and client_secret as query parameters",
              "Alternatively, try using Basic Auth with client_id:client_secret encoded in the Authorization header"
            );
          }
        }

        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            error: true,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            details: {
              requestedMethod: fetchOptions.method,
              allowedMethods: response.headers.get('allow') || 'Not specified by server',
              troubleshooting
            }
          })
        };
      }

      // For other error status codes
      return {
        statusCode: response.status,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: true,
          message: `API request failed (Status: ${response.status}) - URL: ${url}`,
          timestamp: new Date().toISOString(),
          details: responseBody || {}
        })
      };
    }

    // Return the successful response
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': contentType || 'application/json'
      },
      body: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
    };
  } catch (error) {
    console.error('API proxy error:', error);

    // Return a detailed error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: error.message,
        details: {
          stack: error.stack,
          code: error.code
        }
      })
    };
  }
};
