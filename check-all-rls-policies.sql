-- SQL script to check Row Level Security (RLS) policies for all tables
-- Run this in your Supabase SQL Editor to see the current RLS configuration

-- Check which tables have RLS enabled
SELECT
  table_schema,
  table_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = table_schema
      AND c.relname = table_name
      AND c.relrowsecurity = true
    ) THEN 'Enabled'
    ELSE 'Disabled'
  END AS rls_enabled
FROM
  information_schema.tables
WHERE
  table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY
  table_name;

-- Check all RLS policies
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
  schemaname = 'public'
ORDER BY
  tablename, policyname;
