// Debug function to check environment variables in Netlify Functions

exports.handler = async function(event) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Get all environment variable names
    const allEnvVars = Object.keys(process.env).sort();

    // Filter out sensitive variables that might contain secrets
    const safeEnvVars = allEnvVars.filter(key =>
      !key.includes('KEY') &&
      !key.includes('SECRET') &&
      !key.includes('TOKEN') &&
      !key.includes('PASSWORD')
    );

    // Get environment variables (without exposing full values for security)
    const envInfo = {
      // Check Supabase environment variables
      supabaseUrl: {
        exists: !!process.env.SUPABASE_URL,
        value: process.env.SUPABASE_URL ?
          `${process.env.SUPABASE_URL.substring(0, 8)}...${process.env.SUPABASE_URL.substring(process.env.SUPABASE_URL.length - 5)}` :
          'Not set',
        startsWithHttp: process.env.SUPABASE_URL ?
          process.env.SUPABASE_URL.startsWith('http') :
          false,
        length: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0
      },
      supabaseAnonKey: {
        exists: !!process.env.SUPABASE_ANON_KEY,
        length: process.env.SUPABASE_ANON_KEY ?
          process.env.SUPABASE_ANON_KEY.length :
          0,
        firstChars: process.env.SUPABASE_ANON_KEY ?
          process.env.SUPABASE_ANON_KEY.substring(0, 5) + '...' :
          'Not set'
      },
      // Check if VITE_ prefixed variables also exist
      viteSupabaseUrl: {
        exists: !!process.env.VITE_SUPABASE_URL,
        value: process.env.VITE_SUPABASE_URL ?
          `${process.env.VITE_SUPABASE_URL.substring(0, 8)}...${process.env.VITE_SUPABASE_URL.substring(process.env.VITE_SUPABASE_URL.length - 5)}` :
          'Not set',
        startsWithHttp: process.env.VITE_SUPABASE_URL ?
          process.env.VITE_SUPABASE_URL.startsWith('http') :
          false,
        length: process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.length : 0
      },
      viteSupabaseAnonKey: {
        exists: !!process.env.VITE_SUPABASE_ANON_KEY,
        length: process.env.VITE_SUPABASE_ANON_KEY ?
          process.env.VITE_SUPABASE_ANON_KEY.length :
          0,
        firstChars: process.env.VITE_SUPABASE_ANON_KEY ?
          process.env.VITE_SUPABASE_ANON_KEY.substring(0, 5) + '...' :
          'Not set'
      },
      // General environment info
      nodeEnv: process.env.NODE_ENV || 'Not set',
      netlifyDev: process.env.NETLIFY_DEV || 'Not set',
      context: process.env.CONTEXT || 'Not set',
      // List of available environment variables (safe ones only)
      availableEnvVars: safeEnvVars,
      // Request info
      requestPath: event.path,
      requestMethod: event.httpMethod,
      // Test URL construction
      testUrl: {
        withSupabaseUrl: process.env.SUPABASE_URL ?
          `${process.env.SUPABASE_URL}/rest/v1/test` :
          'Cannot construct URL',
        withViteSupabaseUrl: process.env.VITE_SUPABASE_URL ?
          `${process.env.VITE_SUPABASE_URL}/rest/v1/test` :
          'Cannot construct URL',
        withFallbackUrl: 'https://wyewfqxsxzakafksexil.supabase.co/rest/v1/test'
      }
    };

    // Test URL construction with different methods
    let testUrlWithHttps = '';
    let baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'wyewfqxsxzakafksexil.supabase.co';

    // Check if URL ends with .co
    const endsWithCo = baseUrl ? baseUrl.endsWith('.co') : false;
    envInfo.urlEndsWithCo = endsWithCo;

    // Fix URL if needed
    if (baseUrl && baseUrl.includes('supabase.') && !baseUrl.endsWith('.co')) {
      baseUrl = baseUrl + '.co';
      envInfo.fixedUrl = baseUrl;
    }

    // Add https:// if needed
    if (baseUrl && !baseUrl.startsWith('http')) {
      testUrlWithHttps = `https://${baseUrl}/rest/v1/test`;
    } else {
      testUrlWithHttps = `${baseUrl}/rest/v1/test`;
    }

    envInfo.testUrlWithHttps = testUrlWithHttps;

    // Test URL with explicit fixes
    const fixedUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'wyewfqxsxzakafksexil.supabase.co';
    let fullyFixedUrl = fixedUrl;

    if (!fullyFixedUrl.startsWith('http')) {
      fullyFixedUrl = 'https://' + fullyFixedUrl;
    }

    if (fullyFixedUrl.includes('supabase.') && !fullyFixedUrl.endsWith('.co')) {
      fullyFixedUrl = fullyFixedUrl + '.co';
    }

    envInfo.fullyFixedUrl = fullyFixedUrl;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Environment variables check',
        environment: envInfo,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Debug function error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: 'Error checking environment variables',
        details: error.message
      })
    };
  }
};
