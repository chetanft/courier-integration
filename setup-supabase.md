# Setting Up Supabase for Courier Integration Platform

This guide will help you set up your Supabase project for the Courier Integration Platform.

## Prerequisites

1. A Supabase account
2. A new Supabase project

## Steps

### 1. Access the SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query" to create a new SQL query

### 2. Create the Database Schema

Copy and paste the following SQL into the editor and run it:

```sql
-- Create couriers table
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  api_base_url TEXT,
  auth_type TEXT,
  api_key TEXT,
  username TEXT,
  password TEXT,
  auth_endpoint TEXT,
  auth_method TEXT DEFAULT 'POST',
  api_intent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courier_clients relationship table
CREATE TABLE IF NOT EXISTS courier_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(courier_id, client_id)
);

-- Create field_mappings table
CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  tms_field TEXT NOT NULL,
  api_field TEXT NOT NULL,
  api_type TEXT NOT NULL,
  data_type TEXT DEFAULT 'string',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_test_results table
CREATE TABLE IF NOT EXISTS api_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  api_endpoint TEXT NOT NULL,
  api_intent TEXT NOT NULL,
  request_payload JSONB,
  response_data JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS courier_clients_courier_id_idx ON courier_clients(courier_id);
CREATE INDEX IF NOT EXISTS courier_clients_client_id_idx ON courier_clients(client_id);
CREATE INDEX IF NOT EXISTS field_mappings_courier_id_idx ON field_mappings(courier_id);
CREATE INDEX IF NOT EXISTS field_mappings_api_type_idx ON field_mappings(api_type);
CREATE INDEX IF NOT EXISTS api_test_results_courier_id_idx ON api_test_results(courier_id);
```

### 3. Set Up Row Level Security (RLS)

Run the following SQL to enable Row Level Security and create policies:

```sql
-- Enable RLS on all tables
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_test_results ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous users (full access)
CREATE POLICY "Allow full access to anonymous users" ON couriers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to anonymous users" ON clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to anonymous users" ON courier_clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to anonymous users" ON field_mappings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to anonymous users" ON api_test_results FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create policies for authenticated users (full access)
CREATE POLICY "Allow full access to authenticated users" ON couriers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON courier_clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON field_mappings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON api_test_results FOR ALL TO authenticated USING (true);
```

> **Important**: If you're getting RLS policy errors, you may need to run the SQL in `fix-rls-policies.sql` to update the policies.

### 4. Insert Sample Data (Optional)

If you want to add some sample data to test with, run the following SQL:

```sql
-- Insert sample couriers
INSERT INTO couriers (name, api_base_url, auth_type, api_key, created_at)
VALUES
  ('FedEx', 'https://api.fedex.com/v1', 'API Key', 'fedex_api_key_12345', NOW()),
  ('UPS', 'https://api.ups.com/api', 'OAuth', 'ups_api_key_67890', NOW()),
  ('DHL', 'https://api.dhl.com/shipping', 'Bearer Token', 'dhl_api_key_abcde', NOW());

-- Insert sample clients
INSERT INTO clients (name, created_at)
VALUES
  ('Acme Corp', NOW()),
  ('Globex Industries', NOW()),
  ('Initech LLC', NOW());

-- Link clients to couriers
INSERT INTO courier_clients (courier_id, client_id, created_at)
VALUES
  ((SELECT id FROM couriers WHERE name = 'FedEx'), (SELECT id FROM clients WHERE name = 'Acme Corp'), NOW()),
  ((SELECT id FROM couriers WHERE name = 'FedEx'), (SELECT id FROM clients WHERE name = 'Globex Industries'), NOW()),
  ((SELECT id FROM couriers WHERE name = 'UPS'), (SELECT id FROM clients WHERE name = 'Initech LLC'), NOW());

-- Insert sample field mappings
INSERT INTO field_mappings (courier_id, tms_field, api_field, api_type, created_at)
VALUES
  ((SELECT id FROM couriers WHERE name = 'FedEx'), 'tracking_number', 'response.shipment.tracking_id', 'tracking', NOW()),
  ((SELECT id FROM couriers WHERE name = 'FedEx'), 'status', 'response.shipment.status', 'tracking', NOW()),
  ((SELECT id FROM couriers WHERE name = 'FedEx'), 'estimated_delivery', 'response.shipment.delivery_date', 'tracking', NOW()),
  ((SELECT id FROM couriers WHERE name = 'UPS'), 'tracking_number', 'data.tracking.id', 'tracking', NOW()),
  ((SELECT id FROM couriers WHERE name = 'UPS'), 'status', 'data.tracking.current_status', 'tracking', NOW());
```

## Verification

After running these SQL commands, you should be able to see the tables in the "Table Editor" section of your Supabase dashboard. You can verify that the tables were created correctly by checking the structure and data.

## Troubleshooting

If you encounter any issues:

1. Check the SQL Editor for error messages
2. Verify that all tables were created correctly
3. Make sure Row Level Security is enabled and policies are in place
4. Check that your application's `.env` file has the correct Supabase URL and API key
