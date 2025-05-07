-- Create couriers table
CREATE TABLE couriers (
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
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courier_clients relationship table
CREATE TABLE courier_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(courier_id, client_id)
);

-- Create field_mappings table
CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  tms_field TEXT NOT NULL,
  api_field TEXT NOT NULL,
  api_type TEXT NOT NULL,
  data_type TEXT DEFAULT 'string',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_test_results table
CREATE TABLE api_test_results (
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

-- Create js_files table for storing generated JS file metadata
CREATE TABLE js_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courier Credentials table (sensitive info)
CREATE TABLE courier_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  credentials JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX courier_clients_courier_id_idx ON courier_clients(courier_id);
CREATE INDEX courier_clients_client_id_idx ON courier_clients(client_id);
CREATE INDEX field_mappings_courier_id_idx ON field_mappings(courier_id);
CREATE INDEX field_mappings_api_type_idx ON field_mappings(api_type);
CREATE INDEX api_test_results_courier_id_idx ON api_test_results(courier_id);
CREATE INDEX js_files_courier_id_idx ON js_files(courier_id);

-- Create RLS policies
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE js_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON couriers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON courier_clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON field_mappings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON api_test_results FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON js_files FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON courier_credentials
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create policies for anonymous users (read-only)
CREATE POLICY "Allow read access to anonymous users" ON couriers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access to anonymous users" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access to anonymous users" ON courier_clients FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access to anonymous users" ON field_mappings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access to anonymous users" ON js_files FOR SELECT TO anon USING (true);

-- Create view for admin UI (excluding credential details)
CREATE VIEW courier_credentials_summary AS
  SELECT 
    cc.id,
    cc.courier_id,
    c.name AS courier_name,
    cc.created_at,
    cc.updated_at,
    jsonb_build_object(
      'auth_type', 
      CASE 
        WHEN credentials ? 'username' AND credentials ? 'password' THEN 'basic'
        WHEN credentials ? 'apiKey' THEN 'api_key'
        WHEN credentials ? 'token' THEN 'bearer'
        WHEN credentials ? 'jwt' THEN 'jwt_auth'
        ELSE 'unknown'
      END
    ) AS auth_type
  FROM 
    courier_credentials cc
    JOIN couriers c ON cc.courier_id = c.id;

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamps
CREATE TRIGGER update_courier_credentials_updated_at
  BEFORE UPDATE ON courier_credentials
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
