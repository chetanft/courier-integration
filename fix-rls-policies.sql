-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON clients;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON clients FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON couriers;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON couriers;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON couriers FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON courier_clients;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON courier_clients;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON courier_clients FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON field_mappings;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON field_mappings;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON field_mappings FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON api_test_results;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON api_test_results;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON api_test_results FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON js_files;
DROP POLICY IF EXISTS "Allow read access to anonymous users" ON js_files;

-- Create a policy that allows anonymous users to insert, select, update, and delete
CREATE POLICY "Allow full access to anonymous users"
ON js_files FOR ALL
TO anon
USING (true)
WITH CHECK (true);
