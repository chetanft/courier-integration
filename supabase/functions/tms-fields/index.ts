// Edge Function for TMS fields
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase-client.ts'

console.log(`Function "tms-fields" up and running!`)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabase = getSupabaseClient(req)
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        // Get all TMS fields
        const { data, error } = await supabase
          .from('tms_fields')
          .select('*')
          .order('created_at', { ascending: true })

        if (error) {
          throw error
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      case 'POST': {
        // Add a new TMS field
        const requestData = await req.json()
        
        if (!requestData.name || !requestData.displayName) {
          return new Response(
            JSON.stringify({ error: 'Name and displayName are required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        const { data, error } = await supabase
          .from('tms_fields')
          .insert({
            name: requestData.name,
            display_name: requestData.displayName,
            description: requestData.description,
            data_type: requestData.dataType || 'string',
            is_required: requestData.isRequired || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        })
      }

      case 'PUT': {
        // Update a TMS field
        const requestData = await req.json()
        
        if (!requestData.id) {
          return new Response(
            JSON.stringify({ error: 'Field id is required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        const { data, error } = await supabase
          .from('tms_fields')
          .update({
            name: requestData.name,
            display_name: requestData.display_name,
            description: requestData.description,
            data_type: requestData.data_type || 'string',
            is_required: requestData.is_required || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestData.id)
          .select()
          .single()

        if (error) {
          throw error
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      case 'DELETE': {
        // Delete a TMS field
        const url = new URL(req.url)
        const id = url.searchParams.get('id')
        
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'Field id is required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        const { error } = await supabase
          .from('tms_fields')
          .delete()
          .eq('id', id)

        if (error) {
          throw error
        }

        return new Response(JSON.stringify({ success: true, id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
          }
        )
    }
  } catch (error) {
    console.error('Error in tms-fields function:', error)
    
    // Check if it's an RLS error
    const isRlsError = error.message?.includes('permission denied') || 
                       error.code === '42501' || 
                       error.details?.includes('policy')
    
    return new Response(
      JSON.stringify({
        error: true,
        message: isRlsError 
          ? 'Permission denied. Row Level Security (RLS) is preventing access to the tms_fields table.' 
          : 'Error processing request',
        details: error.message,
        code: isRlsError ? 'RLS_ERROR' : 'FUNCTION_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isRlsError ? 403 : 500,
      }
    )
  }
})
