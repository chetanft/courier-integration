import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Exists but not showing for security' : 'Missing');

  // In production, throw an error if environment variables are missing
  if (import.meta.env.PROD) {
    throw new Error('Missing Supabase environment variables in production. Check your Netlify environment variables.');
  } else {
    // In development, just warn
    console.warn('Using fallback values for development. DO NOT use in production!');
  }
}

// Log the Supabase URL (but not the key for security reasons)
console.log('Connecting to Supabase at URL:', supabaseUrl);

// Create the Supabase client with appropriate configuration for the environment
const supabase = createClient(
  // In production, don't use fallback values
  import.meta.env.PROD ? supabaseUrl : (supabaseUrl || 'https://placeholder-url.supabase.co'),
  import.meta.env.PROD ? supabaseAnonKey : (supabaseAnonKey || 'placeholder-key'),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    // Enable debug mode in development only
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
