// Check if Supabase tables exist
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
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get list of tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      throw tablesError;
    }
    
    // Check specific tables
    const tableResults = {};
    const tablesToCheck = ['tms_fields', 'couriers', 'clients', 'field_mappings'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)')
          .limit(1);
        
        tableResults[table] = {
          exists: !error,
          error: error ? error.message : null,
          count: data ? data.length : 0
        };
      } catch (err) {
        tableResults[table] = {
          exists: false,
          error: err.message,
          count: 0
        };
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        allTables: tables ? tables.map(t => t.table_name) : [],
        tableResults,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Check tables error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: 'Error checking Supabase tables',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
