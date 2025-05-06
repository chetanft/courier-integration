// Debug script to check courier data in Supabase
/* eslint-disable no-undef */
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wyewfqxsxzakafksexil.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Missing Supabase anon key. Please provide it as an environment variable.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to get courier by ID
async function getCourierById(courierId) {
  try {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('id', courierId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching courier:', error);
    return null;
  }
}

// Function to get field mappings for a courier
async function getCourierMappings(courierId) {
  try {
    const { data, error } = await supabase
      .from('field_mappings')
      .select('*')
      .eq('courier_id', courierId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching field mappings:', error);
    return [];
  }
}

// Function to get JS files for a courier
async function getJsFilesForCourier(courierId) {
  try {
    const { data, error } = await supabase
      .from('js_files')
      .select('*')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching JS files:', error);
    return [];
  }
}

// Function to check if a table exists
async function checkTableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        return false;
      }
      throw error;
    }
    return true;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Main function
async function main() {
  // Check if required tables exist
  console.log('Checking if required tables exist...');
  const tablesExist = {
    couriers: await checkTableExists('couriers'),
    field_mappings: await checkTableExists('field_mappings'),
    js_files: await checkTableExists('js_files')
  };

  console.log('Tables exist:', tablesExist);

  if (!tablesExist.js_files) {
    console.error('The js_files table does not exist. Please run the create-js-files-table.sql script.');
    process.exit(1);
  }

  // Get courier ID from command line arguments
  const courierId = process.argv[2];
  if (!courierId) {
    console.error('Please provide a courier ID as a command line argument.');
    process.exit(1);
  }

  // Get courier data
  console.log(`Fetching data for courier ID: ${courierId}`);
  const courier = await getCourierById(courierId);
  if (!courier) {
    console.error('Courier not found.');
    process.exit(1);
  }

  console.log('Courier data:');
  console.log(JSON.stringify(courier, null, 2));

  // Get field mappings
  const mappings = await getCourierMappings(courierId);
  console.log(`\nField mappings (${mappings.length}):`);
  console.log(JSON.stringify(mappings, null, 2));

  // Get JS files
  const jsFiles = await getJsFilesForCourier(courierId);
  console.log(`\nJS files (${jsFiles.length}):`);
  console.log(JSON.stringify(jsFiles, null, 2));

  // Check for field naming inconsistencies
  if (mappings.length > 0) {
    console.log('\nChecking field mapping properties:');
    const firstMapping = mappings[0];
    console.log('Properties in first mapping:', Object.keys(firstMapping));

    // Check for expected properties
    const hasApiField = 'api_field' in firstMapping;
    const hasTmsField = 'tms_field' in firstMapping;
    const hasApiType = 'api_type' in firstMapping;

    console.log('Has api_field:', hasApiField);
    console.log('Has tms_field:', hasTmsField);
    console.log('Has api_type:', hasApiType);

    if (!hasApiField || !hasTmsField) {
      console.error('Field mappings have unexpected property names. This could cause display issues.');
    }
  }

  console.log('\nDebug complete.');
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
