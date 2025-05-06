// Netlify function to handle TMS fields with proper RLS handling
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

    // Parse the request body if it exists
    let requestBody = null;
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (error) {
        requestBody = event.body;
      }
    }

    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET': {
        // Get all TMS fields
        const { data, error } = await supabase
          .from('tms_fields')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching TMS fields:', error);
          
          // Check if it's an RLS error
          if (error.code === '42501' || error.message.includes('permission denied')) {
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
          
          throw error;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }

      case 'POST': {
        // Add a new TMS field
        if (!requestBody) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: true,
              message: 'Request body is required'
            })
          };
        }

        const { data, error } = await supabase
          .from('tms_fields')
          .insert({
            name: requestBody.name,
            display_name: requestBody.displayName,
            description: requestBody.description,
            data_type: requestBody.dataType || 'string',
            is_required: requestBody.isRequired || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding TMS field:', error);
          
          // Check if it's an RLS error
          if (error.code === '42501' || error.message.includes('permission denied')) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: true,
                message: 'Permission denied. Row Level Security (RLS) is preventing insertion into the tms_fields table.',
                details: 'Please enable RLS for the tms_fields table and add a policy to allow insert access.',
                code: 'RLS_ERROR'
              })
            };
          }
          
          throw error;
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data)
        };
      }

      case 'PUT': {
        // Update a TMS field
        if (!requestBody || !requestBody.id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: true,
              message: 'Request body with id is required'
            })
          };
        }

        const { data, error } = await supabase
          .from('tms_fields')
          .update({
            name: requestBody.name,
            display_name: requestBody.display_name,
            description: requestBody.description,
            data_type: requestBody.data_type || 'string',
            is_required: requestBody.is_required || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestBody.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating TMS field:', error);
          
          // Check if it's an RLS error
          if (error.code === '42501' || error.message.includes('permission denied')) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: true,
                message: 'Permission denied. Row Level Security (RLS) is preventing updates to the tms_fields table.',
                details: 'Please enable RLS for the tms_fields table and add a policy to allow update access.',
                code: 'RLS_ERROR'
              })
            };
          }
          
          throw error;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }

      case 'DELETE': {
        // Delete a TMS field
        const id = event.queryStringParameters?.id;
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: true,
              message: 'Field id is required'
            })
          };
        }

        const { error } = await supabase
          .from('tms_fields')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting TMS field:', error);
          
          // Check if it's an RLS error
          if (error.code === '42501' || error.message.includes('permission denied')) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({
                error: true,
                message: 'Permission denied. Row Level Security (RLS) is preventing deletion from the tms_fields table.',
                details: 'Please enable RLS for the tms_fields table and add a policy to allow delete access.',
                code: 'RLS_ERROR'
              })
            };
          }
          
          throw error;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, id })
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            error: true,
            message: 'Method not allowed'
          })
        };
    }
  } catch (error) {
    console.error('TMS fields function error:', error);

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
