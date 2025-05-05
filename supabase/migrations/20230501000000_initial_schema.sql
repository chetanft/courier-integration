-- Create couriers table
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  auth_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courier_client_links table
CREATE TABLE IF NOT EXISTS courier_client_links (
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
  api_field TEXT NOT NULL,
  tms_field TEXT NOT NULL,
  api_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS courier_client_links_courier_id_idx ON courier_client_links(courier_id);
CREATE INDEX IF NOT EXISTS courier_client_links_client_id_idx ON courier_client_links(client_id);
CREATE INDEX IF NOT EXISTS field_mappings_courier_id_idx ON field_mappings(courier_id);
CREATE INDEX IF NOT EXISTS field_mappings_api_type_idx ON field_mappings(api_type);
