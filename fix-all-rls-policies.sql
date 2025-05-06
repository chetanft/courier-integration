-- SQL script to fix Row Level Security (RLS) policies for all tables
-- Run this in your Supabase SQL Editor to fix RLS issues across the database

-- List of tables to apply RLS policies to
DO $$
DECLARE
  tables_cursor CURSOR FOR
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('pg_stat_statements', 'schema_migrations');
  
  table_name text;
BEGIN
  -- Loop through all tables
  OPEN tables_cursor;
  LOOP
    FETCH tables_cursor INTO table_name;
    EXIT WHEN NOT FOUND;
    
    -- Log the table we're working on
    RAISE NOTICE 'Fixing RLS policies for table: %', table_name;
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access to anonymous users" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access to authenticated users" ON %I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow read access to anonymous users" ON %I', table_name);
    
    -- Disable RLS temporarily
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
    
    -- Re-enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Create a policy that allows anonymous users to perform all operations
    EXECUTE format('
      CREATE POLICY "Allow full access to anonymous users"
      ON %I FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true)
    ', table_name);
    
    -- Create a policy that allows authenticated users to perform all operations
    EXECUTE format('
      CREATE POLICY "Allow full access to authenticated users"
      ON %I FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true)
    ', table_name);
  END LOOP;
  CLOSE tables_cursor;
  
  RAISE NOTICE 'RLS policies have been successfully updated for all tables.';
END
$$;
