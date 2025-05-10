// Script to check the database schema
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  process.exit(1);
}

console.log('Connecting to Supabase at URL:', supabaseUrl);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('Checking database schema...');

    // Check clients table
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    } else {
      console.log('Clients table exists');
      if (clientsData.length > 0) {
        console.log('Clients table schema:', Object.keys(clientsData[0]));
      } else {
        console.log('Clients table is empty');

        // Try to insert a test client to see the schema
        const testClient = {
          name: 'Test Client ' + new Date().toISOString(),
          company_id: 'TEST-001',
          company_name: 'Test Company',
          old_company_id: 'OLD-001',
          display_id: 'DISP-001',
          types: 'TEST',
          created_at: new Date().toISOString()
        };

        console.log('Inserting test client to check schema:', testClient);

        const { data: insertedClient, error: insertError } = await supabase
          .from('clients')
          .insert(testClient)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting test client:', insertError);

          // Try with just the required fields
          const simpleClient = {
            name: 'Simple Test Client ' + new Date().toISOString(),
            created_at: new Date().toISOString()
          };

          console.log('Trying with simple client:', simpleClient);

          const { data: simpleInsertedClient, error: simpleInsertError } = await supabase
            .from('clients')
            .insert(simpleClient)
            .select()
            .single();

          if (simpleInsertError) {
            console.error('Error inserting simple client:', simpleInsertError);
          } else {
            console.log('Simple client inserted successfully. Schema:', Object.keys(simpleInsertedClient));

            // Clean up
            await supabase
              .from('clients')
              .delete()
              .eq('id', simpleInsertedClient.id);
          }
        } else {
          console.log('Test client inserted successfully. Schema:', Object.keys(insertedClient));

          // Clean up
          await supabase
            .from('clients')
            .delete()
            .eq('id', insertedClient.id);
        }
      }
    }

    // Check couriers table
    const { data: couriersData, error: couriersError } = await supabase
      .from('couriers')
      .select('*')
      .limit(1);

    if (couriersError) {
      console.error('Error fetching couriers:', couriersError);
    } else {
      console.log('Couriers table exists');
      if (couriersData.length > 0) {
        console.log('Couriers table schema:', Object.keys(couriersData[0]));
      } else {
        console.log('Couriers table is empty');
      }
    }
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();
