// API Proxy for external courier API calls
// This function acts as a CORS proxy to allow the frontend to make requests to external APIs
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

    // Prepare fetch options
    const fetchOptions = {
      method: method || 'GET',
      headers: customHeaders || {}
    };

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(fetchOptions.method) && body) {
      // If the content type is application/json, stringify the body
      if (
        fetchOptions.headers['Content-Type']?.includes('application/json') ||
        fetchOptions.headers['content-type']?.includes('application/json')
      ) {
        fetchOptions.body = JSON.stringify(body);
      } 
      // If it's form-urlencoded, convert to URLSearchParams
      else if (
        fetchOptions.headers['Content-Type']?.includes('application/x-www-form-urlencoded') ||
        fetchOptions.headers['content-type']?.includes('application/x-www-form-urlencoded')
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

    // Make the request to the external API
    const response = await fetch(finalUrl, fetchOptions);
    
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
      } catch (e) {
        // If it's not valid JSON, keep it as text
      }
    }

    // Return the response
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
