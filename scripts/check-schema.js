// Script to check the database schema
import supabase from '../src/lib/supabase-client.js';

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
    
    // Check courier_clients table
    const { data: courierClientsData, error: courierClientsError } = await supabase
      .from('courier_clients')
      .select('*')
      .limit(1);
    
    if (courierClientsError) {
      console.error('Error fetching courier_clients:', courierClientsError);
    } else {
      console.log('Courier_clients table exists');
      if (courierClientsData.length > 0) {
        console.log('Courier_clients table schema:', Object.keys(courierClientsData[0]));
      } else {
        console.log('Courier_clients table is empty');
      }
    }
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();
