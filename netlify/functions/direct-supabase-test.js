// Direct Supabase test function
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function() {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    // Log the URL and key (partially masked for security)
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key length:', supabaseKey ? supabaseKey.length : 0);
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection by fetching a small amount of data
    const { data, error } = await supabase
      .from('tms_fields')
      .select('*')
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Successfully connected to Supabase',
        data: data || [],
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Direct Supabase test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: 'Error connecting to Supabase',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
