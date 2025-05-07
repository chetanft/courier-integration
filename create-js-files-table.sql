-- SQL script to create the missing js_files table
-- Run this in your Supabase SQL Editor to fix the "relation 'public.js_files' does not exist" error

-- Create js_files table for storing generated JS file metadata
CREATE TABLE IF NOT EXISTS js_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS js_files_courier_id_idx ON js_files(courier_id);

-- Enable RLS on the table
ALTER TABLE js_files ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous users (full access)
CREATE POLICY "Allow full access to anonymous users"
ON js_files FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Optional: Create policy for authenticated users (if you're using authentication)
CREATE POLICY "Allow full access to authenticated users" 
ON js_files FOR ALL 
TO authenticated 
USING (true);
