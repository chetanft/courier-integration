-- SQL script to fix Row Level Security (RLS) policies for the js_files table
-- Run this in your Supabase SQL Editor to fix the "new row violates row-level security policy" error

-- First, check if the js_files table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'js_files'
  ) THEN
    RAISE EXCEPTION 'The js_files table does not exist. Please run the create-js-files-table.sql script first.';
  END IF;
END
$$;

-- Drop existing policies on js_files table
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON js_files;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON js_files;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON js_files;
DROP POLICY IF EXISTS "Allow insert access to anonymous users" ON js_files;
DROP POLICY IF EXISTS "Allow update access to anonymous users" ON js_files;
DROP POLICY IF EXISTS "Allow delete access to anonymous users" ON js_files;

-- Disable RLS temporarily to ensure we can modify the table
ALTER TABLE js_files DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE js_files ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous users to perform all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Allow full access to anonymous users"
ON js_files FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Create a policy that allows authenticated users to perform all operations (if you're using authentication)
CREATE POLICY "Allow full access to authenticated users"
ON js_files FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'js_files';

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for js_files table have been successfully updated.';
END
$$;
