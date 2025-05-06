// Netlify function to get couriers missing specific TMS field mappings
const { createClient } = require('@supabase/supabase-js');

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
    // Get Supabase credentials from environment variables
    let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    // Fix common URL issues
    if (supabaseUrl) {
      // 1. Ensure URL has https:// prefix
      if (!supabaseUrl.startsWith('http')) {
        supabaseUrl = 'https://' + supabaseUrl;
      }

      // 2. Ensure URL ends with .co (common issue with Supabase URLs)
      if (supabaseUrl.includes('supabase.') && !supabaseUrl.endsWith('.co')) {
        supabaseUrl = supabaseUrl + '.co';
      }
    }

    // Final URL validation
    if (!supabaseUrl) {
      throw new Error('Supabase URL is missing. Please set SUPABASE_URL in your Netlify environment variables.');
    }

    if (!supabaseKey) {
      throw new Error('Supabase Anon Key is missing. Please set SUPABASE_ANON_KEY in your Netlify environment variables.');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only handle GET requests
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
          error: true,
          message: 'Method not allowed'
        })
      };
    }

    try {
      // Get all TMS fields
      const { data: tmsFields, error: tmsFieldsError } = await supabase
        .from('tms_fields')
        .select('name');

      if (tmsFieldsError) {
        console.error('Error fetching TMS fields:', tmsFieldsError);
        
        // Check if it's an RLS error
        if (tmsFieldsError.code === '42501' || tmsFieldsError.message.includes('permission denied')) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: true,
              message: 'Permission denied. Row Level Security (RLS) is preventing access to the tms_fields table.',
              details: 'Please enable RLS for the tms_fields table and add a policy to allow read access.',
              code: 'RLS_ERROR'
            })
          };
        }
        
        throw tmsFieldsError;
      }

      const tmsFieldNames = tmsFields.map(field => field.name);

      // Get all couriers
      const { data: couriers, error: couriersError } = await supabase
        .from('couriers')
        .select('id, name');

      if (couriersError) {
        console.error('Error fetching couriers:', couriersError);
        
        // Check if it's an RLS error
        if (couriersError.code === '42501' || couriersError.message.includes('permission denied')) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: true,
              message: 'Permission denied. Row Level Security (RLS) is preventing access to the couriers table.',
              details: 'Please enable RLS for the couriers table and add a policy to allow read access.',
              code: 'RLS_ERROR'
            })
          };
        }
        
        throw couriersError;
      }

      // For each courier, check if they have mappings for all the specified fields
      const results = [];

      for (const courier of couriers) {
        const { data: mappings, error: mappingsError } = await supabase
          .from('field_mappings')
          .select('tms_field')
          .eq('courier_id', courier.id);

        if (mappingsError) {
          console.error(`Error fetching mappings for courier ${courier.id}:`, mappingsError);
          
          // Check if it's an RLS error
          if (mappingsError.code === '42501' || mappingsError.message.includes('permission denied')) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: true,
                message: 'Permission denied. Row Level Security (RLS) is preventing access to the field_mappings table.',
                details: 'Please enable RLS for the field_mappings table and add a policy to allow read access.',
                code: 'RLS_ERROR'
              })
            };
          }
          
          throw mappingsError;
        }

        const existingFields = mappings.map(m => m.tms_field);
        const missingFields = tmsFieldNames.filter(field => !existingFields.includes(field));

        if (missingFields.length > 0) {
          results.push({
            courier,
            missingFields
          });
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results)
      };
    } catch (error) {
      console.error('Error in couriers-missing-fields function:', error);
      throw error;
    }
  } catch (error) {
    console.error('Couriers missing fields function error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: 'Error processing request',
        details: error.message
      })
    };
  }
};
