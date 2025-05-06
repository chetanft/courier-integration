-- SQL script to fix RLS issues with the js_files table

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS js_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS js_files_courier_id_idx ON js_files(courier_id);

-- Disable RLS temporarily to fix any issues
ALTER TABLE js_files DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON js_files;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON js_files;

-- Re-enable RLS
ALTER TABLE js_files ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users (full access)
CREATE POLICY "Allow full access to anonymous users"
ON js_files FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users
CREATE POLICY "Allow full access to authenticated users" 
ON js_files FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create policy for service_role (if needed)
CREATE POLICY "Allow full access to service role" 
ON js_files FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- Grant permissions to the tables
GRANT ALL ON js_files TO anon, authenticated, service_role;

-- Verify the policies
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'js_files';
