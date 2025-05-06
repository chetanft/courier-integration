-- SQL script to fix Row Level Security (RLS) policies for the Courier Integration Platform
-- Run this in your Supabase SQL Editor to enable proper access to tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON clients;
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON clients;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON clients FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON couriers;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON couriers;
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON couriers;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON couriers FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON courier_clients;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON courier_clients;
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON courier_clients;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON courier_clients FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON field_mappings;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON field_mappings;
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON field_mappings;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON field_mappings FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON api_test_results;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON api_test_results;
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON api_test_results;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON api_test_results FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON js_files;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON js_files;
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON js_files;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON js_files FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist for tms_fields
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON tms_fields;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON tms_fields;
DROP POLICY IF EXISTS "Allow full access to anonymous users" ON tms_fields;

-- Create a policy that allows anonymous users to insert, select, update, and delete for tms_fields
CREATE POLICY "Allow full access to anonymous users"
ON tms_fields FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Note: This script enables full access to all tables for anonymous users.
-- In a production environment, you might want to restrict access more carefully.
-- For example, you might want to only allow authenticated users to insert, update, or delete data.
