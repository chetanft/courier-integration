-- Create tms_fields table
CREATE TABLE IF NOT EXISTS tms_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  data_type TEXT DEFAULT 'string',
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default TMS fields
INSERT INTO tms_fields (name, display_name, description, data_type, is_required)
VALUES 
  ('docket_number', 'Docket Number', 'The shipment tracking or docket number', 'string', true),
  ('status', 'Status', 'Current status of the shipment', 'string', true),
  ('tracking_details', 'Tracking Details', 'Detailed information about the shipment', 'string', false),
  ('event_date', 'Event Date', 'Date of the tracking event', 'date', false),
  ('event_status', 'Event Status', 'Status of a specific tracking event', 'string', false),
  ('origin', 'Origin', 'Origin location of the shipment', 'string', false),
  ('destination', 'Destination', 'Destination location of the shipment', 'string', false)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  data_type = EXCLUDED.data_type,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();
