// eslint-disable-next-line no-undef
const fetch = require('node-fetch');

// eslint-disable-next-line no-undef
exports.handler = async function(event) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Parse the request body if it exists
    let requestBody = null;
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (/* eslint-disable-next-line no-unused-vars */error) {
        requestBody = event.body;
      }
    }

    // Get the path and query parameters from the request
    const path = event.path.replace('/.netlify/functions/supabase-proxy', '');
    const queryParams = new URLSearchParams(event.queryStringParameters || {}).toString();
    // eslint-disable-next-line no-undef
    const url = `${process.env.VITE_SUPABASE_URL}/rest/v1${path}${queryParams ? `?${queryParams}` : ''}`;

    // Forward the request to Supabase
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        // eslint-disable-next-line no-undef
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        // eslint-disable-next-line no-undef
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined
    });

    // Get the response body
    const responseBody = await response.text();
    let parsedBody;

    try {
      // Try to parse the response as JSON
      parsedBody = JSON.parse(responseBody);
    } catch (/* eslint-disable-next-line no-unused-vars */e) {
      // If it's not valid JSON, use the raw text
      parsedBody = responseBody;
    }

    // Return the response
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('Content-Type')
      },
      body: typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)
    };
  } catch (error) {
    console.error('Proxy error:', error);

    // Return an error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: 'Error in Supabase proxy function',
        details: error.message
      })
    };
  }
};
