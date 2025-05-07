-- Add api_url and last_api_fetch fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS api_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_api_fetch TIMESTAMP WITH TIME ZONE;

-- Update the schema in the supabase-schema.sql file
-- This is just for documentation purposes, you'll need to manually update the file
