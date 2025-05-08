-- Migration script to add additional client fields
-- Run this in your Supabase SQL Editor to add the new fields to the clients table

-- Add company_id, old_company_id, display_id, and types fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS old_company_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS types TEXT;

-- Update the schema in the supabase-schema.sql file
-- This is just for documentation purposes, you'll need to manually update the file

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added company_id, company_name, old_company_id, display_id, and types fields to clients table.';
END
$$;
