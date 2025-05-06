// eslint-disable-next-line no-undef
const fetch = require('node-fetch');

// Hard-coded fallback URL for testing - replace with your actual Supabase URL
const FALLBACK_SUPABASE_URL = 'https://wyewfqxsxzakafksexil.supabase.co';

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

    // Get environment variables with fallbacks
    // eslint-disable-next-line no-undef
    let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
    // eslint-disable-next-line no-undef
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    // Always use the fallback URL if the environment variable is empty or undefined
    if (!supabaseUrl || supabaseUrl.trim() === '') {
      console.log('Using fallback Supabase URL');
      supabaseUrl = FALLBACK_SUPABASE_URL;
    }

    // Log environment variable status (without exposing full values)
    console.log('Environment variables check:', {
      // eslint-disable-next-line no-undef
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      // eslint-disable-next-line no-undef
      hasViteSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      // eslint-disable-next-line no-undef
      usingFallbackUrl: !process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL,
      supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 8) : 'undefined',
      // eslint-disable-next-line no-undef
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      // eslint-disable-next-line no-undef
      hasViteSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
      supabaseKeyLength: supabaseKey ? supabaseKey.length : 0
    });

    // Log the raw URL for debugging
    console.log('Raw Supabase URL:', supabaseUrl);
    console.log('URL length:', supabaseUrl ? supabaseUrl.length : 0);

    // Fix common URL issues
    if (supabaseUrl) {
      // 1. Ensure URL has https:// prefix
      if (!supabaseUrl.startsWith('http')) {
        supabaseUrl = 'https://' + supabaseUrl;
        console.log('Added https:// prefix to URL:', supabaseUrl.substring(0, 12) + '...');
      }

      // 2. Ensure URL ends with .co (common issue with Supabase URLs)
      if (supabaseUrl.includes('supabase.') && !supabaseUrl.endsWith('.co')) {
        supabaseUrl = supabaseUrl + '.co';
        console.log('Added .co suffix to URL:', supabaseUrl);
      }

      // 3. Ensure URL is properly formatted (no trailing slashes)
      supabaseUrl = supabaseUrl.trim();
      if (supabaseUrl.endsWith('/')) {
        supabaseUrl = supabaseUrl.slice(0, -1);
        console.log('Removed trailing slash from URL:', supabaseUrl);
      }

      // 4. Double-check that we have a valid URL
      try {
        new URL(supabaseUrl);
        console.log('URL is valid:', supabaseUrl);
      } catch (e) {
        console.error('Invalid URL, using fallback:', e.message);
        supabaseUrl = FALLBACK_SUPABASE_URL;
      }
    }

    // Final URL validation
    if (!supabaseUrl) {
      throw new Error('Supabase URL is missing. Please set SUPABASE_URL in your Netlify environment variables.');
    }

    console.log('Final Supabase URL:', supabaseUrl);

    // Construct the full URL for the Supabase REST API
    let url;
    try {
      // Ensure the path starts with a slash if it's not empty
      const formattedPath = path && !path.startsWith('/') ? `/${path}` : path;

      // Construct the URL
      url = `${supabaseUrl}/rest/v1${formattedPath}${queryParams ? `?${queryParams}` : ''}`;

      // Validate the URL
      new URL(url);
      console.log('Proxying request to:', url.substring(0, 30) + '...');
    } catch (e) {
      console.error('Error constructing URL:', e.message);
      throw new Error(`Invalid URL: ${e.message}. Please check your Supabase URL configuration.`);
    }

    // Prepare headers for the Supabase request
    const requestHeaders = {
      'Content-Type': 'application/json'
    };

    // Only add auth headers if we have a key
    if (supabaseKey) {
      requestHeaders['apikey'] = supabaseKey;
      requestHeaders['Authorization'] = `Bearer ${supabaseKey}`;
    }

    // Forward the request to Supabase
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: requestHeaders,
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

    // Log all environment variables for debugging (without exposing sensitive values)
    // eslint-disable-next-line no-undef
    const envVars = Object.keys(process.env).sort();
    console.log('Available environment variables:', envVars);

    // Log specific environment variables we're interested in
    console.log('Environment check:', {
      // eslint-disable-next-line no-undef
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      // eslint-disable-next-line no-undef
      hasViteSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      // eslint-disable-next-line no-undef
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      // eslint-disable-next-line no-undef
      hasViteSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
      // eslint-disable-next-line no-undef
      nodeEnv: process.env.NODE_ENV,
      // eslint-disable-next-line no-undef
      netlifyContext: process.env.CONTEXT
    });

    // Check if it's a URL error
    const isUrlError = error.message.includes('URL') ||
                       error.message.includes('Only absolute URLs are supported') ||
                       error.message.includes('Invalid URL');

    // Return an error response with more detailed information
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: isUrlError
          ? 'Error with Supabase URL configuration. Please check your environment variables.'
          : 'Error in Supabase proxy function',
        details: error.message,
        type: isUrlError ? 'URL_ERROR' : 'PROXY_ERROR',
        // Include a redacted version of the URL if it's a URL error
        // eslint-disable-next-line no-undef
        supabaseUrlInfo: isUrlError ? {
          // eslint-disable-next-line no-undef
          source: process.env.SUPABASE_URL ? 'SUPABASE_URL' :
                 // eslint-disable-next-line no-undef
                 process.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 'FALLBACK',
          // eslint-disable-next-line no-undef
          length: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').length,
          // eslint-disable-next-line no-undef
          prefix: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').substring(0, 8),
          // eslint-disable-next-line no-undef
          hasHttps: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').startsWith('http'),
          // eslint-disable-next-line no-undef
          hasCo: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').endsWith('.co')
        } : undefined
      })
    };
  }
};
