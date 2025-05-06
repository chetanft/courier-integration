// Supabase client for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Create a single supabase client for interacting with your database
export const getSupabaseClient = (req: Request) => {
  // Get the authorization header from the request
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }
  
  // Extract the token from the Authorization header
  const supabaseKey = authHeader.replace('Bearer ', '')
  
  // Create a Supabase client with the token
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wyewfqxsxzakafksexil.supabase.co'
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  return supabase
}

// Create an admin client for operations that require admin privileges
export const getAdminSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wyewfqxsxzakafksexil.supabase.co'
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}
