// Script to verify Supabase schema
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Environment variables are now loaded

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('Verifying Supabase schema...');

  try {
    // Try to query the clients table as a test
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (clientsError) {
      if (clientsError.code === '42P01') { // Table doesn't exist
        console.error('The clients table does not exist. Please run the SQL schema setup script.');
        throw clientsError;
      }
      throw clientsError;
    }

    console.log('Successfully connected to the clients table');

    // Check other required tables
    const requiredTables = ['couriers', 'courier_clients', 'field_mappings', 'api_test_results'];

    for (const table of requiredTables) {
      console.log(`Checking if table '${table}' exists...`);
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (tableError) {
        if (tableError.code === '42P01') { // Table doesn't exist
          console.error(`The '${table}' table does not exist. Please run the SQL schema setup script.`);
          throw tableError;
        }
        throw tableError;
      }

      console.log(`Table '${table}' exists`);
    }

    // Test inserting a client
    const testClient = {
      name: 'Test Client ' + new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    console.log('Attempting to insert test client:', testClient);

    const { data: insertedClient, error: insertError } = await supabase
      .from('clients')
      .insert(testClient)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting test client:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted test client:', insertedClient);

    // Clean up test data
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', insertedClient.id);

    if (deleteError) {
      console.warn('Warning: Could not delete test client:', deleteError);
    } else {
      console.log('Successfully deleted test client');
    }

    console.log('Schema verification completed successfully!');
  } catch (error) {
    console.error('Schema verification failed:', error);
    process.exit(1);
  }
}

verifySchema();
