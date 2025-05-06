// Edge Function for couriers missing fields
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase-client.ts'

console.log(`Function "couriers-missing-fields" up and running!`)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabase = getSupabaseClient(req)
    
    // Only handle GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        }
      )
    }

    // Get all TMS fields
    const { data: tmsFields, error: tmsFieldsError } = await supabase
      .from('tms_fields')
      .select('name')

    if (tmsFieldsError) {
      throw tmsFieldsError
    }

    const tmsFieldNames = tmsFields.map(field => field.name)

    // Get all couriers
    const { data: couriers, error: couriersError } = await supabase
      .from('couriers')
      .select('id, name')

    if (couriersError) {
      throw couriersError
    }

    // For each courier, check if they have mappings for all the specified fields
    const results = []

    for (const courier of couriers) {
      const { data: mappings, error: mappingsError } = await supabase
        .from('field_mappings')
        .select('tms_field')
        .eq('courier_id', courier.id)

      if (mappingsError) {
        throw mappingsError
      }

      const existingFields = mappings.map(m => m.tms_field)
      const missingFields = tmsFieldNames.filter(field => !existingFields.includes(field))

      if (missingFields.length > 0) {
        results.push({
          courier,
          missingFields
        })
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in couriers-missing-fields function:', error)
    
    // Check if it's an RLS error
    const isRlsError = error.message?.includes('permission denied') || 
                       error.code === '42501' || 
                       error.details?.includes('policy')
    
    return new Response(
      JSON.stringify({
        error: true,
        message: isRlsError 
          ? 'Permission denied. Row Level Security (RLS) is preventing access.' 
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
