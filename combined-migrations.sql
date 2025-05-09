-- Combined migration script for all tables

-- 1. Add client fields
DO $$
BEGIN
    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'company_id') THEN
        ALTER TABLE clients ADD COLUMN company_id TEXT;
    END IF;

    -- Add company_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'company_name') THEN
        ALTER TABLE clients ADD COLUMN company_name TEXT;
    END IF;

    -- Add old_company_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'old_company_id') THEN
        ALTER TABLE clients ADD COLUMN old_company_id TEXT;
    END IF;

    -- Add display_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'display_id') THEN
        ALTER TABLE clients ADD COLUMN display_id TEXT;
    END IF;

    -- Add types column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'types') THEN
        ALTER TABLE clients ADD COLUMN types TEXT;
    END IF;

    -- Add api_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'api_url') THEN
        ALTER TABLE clients ADD COLUMN api_url TEXT;
    END IF;

    -- Add last_api_fetch column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'last_api_fetch') THEN
        ALTER TABLE clients ADD COLUMN last_api_fetch TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Add FreightTiger fields to couriers table
DO $$
BEGIN
    -- Add fteid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'fteid') THEN
        ALTER TABLE couriers ADD COLUMN fteid TEXT;
    END IF;

    -- Add entity_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'entity_type') THEN
        ALTER TABLE couriers ADD COLUMN entity_type TEXT;
    END IF;

    -- Add partner_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'partner_type') THEN
        ALTER TABLE couriers ADD COLUMN partner_type TEXT;
    END IF;

    -- Add short_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'short_code') THEN
        ALTER TABLE couriers ADD COLUMN short_code TEXT;
    END IF;

    -- Add company_fteid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'company_fteid') THEN
        ALTER TABLE couriers ADD COLUMN company_fteid TEXT;
    END IF;

    -- Add company_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'company_name') THEN
        ALTER TABLE couriers ADD COLUMN company_name TEXT;
    END IF;

    -- Add company_gstin column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'company_gstin') THEN
        ALTER TABLE couriers ADD COLUMN company_gstin TEXT;
    END IF;

    -- Add company_head_office column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'company_head_office') THEN
        ALTER TABLE couriers ADD COLUMN company_head_office TEXT;
    END IF;

    -- Add old_company_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'old_company_id') THEN
        ALTER TABLE couriers ADD COLUMN old_company_id BIGINT;
    END IF;

    -- Add branch_fteid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'branch_fteid') THEN
        ALTER TABLE couriers ADD COLUMN branch_fteid TEXT;
    END IF;

    -- Add branch_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'branch_name') THEN
        ALTER TABLE couriers ADD COLUMN branch_name TEXT;
    END IF;

    -- Add old_branch_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'old_branch_id') THEN
        ALTER TABLE couriers ADD COLUMN old_branch_id BIGINT;
    END IF;

    -- Add department_fteid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'department_fteid') THEN
        ALTER TABLE couriers ADD COLUMN department_fteid TEXT;
    END IF;

    -- Add department_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'department_name') THEN
        ALTER TABLE couriers ADD COLUMN department_name TEXT;
    END IF;

    -- Add old_department_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'old_department_id') THEN
        ALTER TABLE couriers ADD COLUMN old_department_id BIGINT;
    END IF;

    -- Add relation_types column if it doesn't exist (as an array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'relation_types') THEN
        ALTER TABLE couriers ADD COLUMN relation_types TEXT[];
    END IF;

    -- Add tags column if it doesn't exist (as an array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'tags') THEN
        ALTER TABLE couriers ADD COLUMN tags TEXT[];
    END IF;

    -- Add contact_user column if it doesn't exist (as JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'contact_user') THEN
        ALTER TABLE couriers ADD COLUMN contact_user JSONB;
    END IF;

    -- Add place_fteid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'place_fteid') THEN
        ALTER TABLE couriers ADD COLUMN place_fteid TEXT;
    END IF;

    -- Add crm_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'crm_type') THEN
        ALTER TABLE couriers ADD COLUMN crm_type TEXT;
    END IF;

    -- Add is_crm_supplier column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'is_crm_supplier') THEN
        ALTER TABLE couriers ADD COLUMN is_crm_supplier BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add is_crm_transporter column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'is_crm_transporter') THEN
        ALTER TABLE couriers ADD COLUMN is_crm_transporter BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add premium_from column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'premium_from') THEN
        ALTER TABLE couriers ADD COLUMN premium_from TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'is_active') THEN
        ALTER TABLE couriers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add created_by column if it doesn't exist (as JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'created_by') THEN
        ALTER TABLE couriers ADD COLUMN created_by JSONB;
    END IF;

    -- Add updated_by column if it doesn't exist (as JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'updated_by') THEN
        ALTER TABLE couriers ADD COLUMN updated_by JSONB;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'updated_at') THEN
        ALTER TABLE couriers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Create js_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS js_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add js_file_generated column to couriers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'js_file_generated') THEN
        ALTER TABLE couriers ADD COLUMN js_file_generated BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'js_file_path') THEN
        ALTER TABLE couriers ADD COLUMN js_file_path TEXT;
    END IF;
END $$;

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
END
$$;
