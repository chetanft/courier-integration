// Simple function to test URL construction

exports.handler = async function() {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Get the Supabase URL from environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    
    // Log the URL for debugging
    console.log('Raw Supabase URL:', supabaseUrl);
    console.log('URL length:', supabaseUrl ? supabaseUrl.length : 0);
    
    // Check if the URL ends with .co
    const endsWithCo = supabaseUrl ? supabaseUrl.endsWith('.co') : false;
    console.log('URL ends with .co:', endsWithCo);
    
    // Try to construct a valid URL
    let validUrl;
    if (supabaseUrl) {
      // If URL doesn't start with http, add it
      if (!supabaseUrl.startsWith('http')) {
        validUrl = 'https://' + supabaseUrl;
      } else {
        validUrl = supabaseUrl;
      }
      
      // If URL doesn't end with .co, add it
      if (!validUrl.endsWith('.co')) {
        validUrl = validUrl + '.co';
      }
    } else {
      validUrl = 'https://wyewfqxsxzakafksexil.supabase.co';
    }
    
    console.log('Constructed URL:', validUrl);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        originalUrl: supabaseUrl,
        constructedUrl: validUrl,
        urlLength: supabaseUrl ? supabaseUrl.length : 0,
        endsWithCo: endsWithCo
      })
    };
  } catch (error) {
    console.error('Test URL error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: 'Error testing URL',
        details: error.message
      })
    };
  }
};
