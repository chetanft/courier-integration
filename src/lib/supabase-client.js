import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Exists but not showing for security' : 'Missing');

  // Provide fallback values for development only
  // In production, this should throw an error
  if (import.meta.env.DEV) {
    console.warn('Using fallback values for development. DO NOT use in production!');
  }
}

// Log the Supabase URL (but not the key for security reasons)
console.log('Connecting to Supabase at URL:', supabaseUrl);

// Create the Supabase client with debug enabled in development
const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    // Enable debug mode in development
    debug: import.meta.env.DEV
  }
);

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Error connecting to Supabase:', error);
  } else {
    console.log('Successfully connected to Supabase');
  }
});

export default supabase;
