// Script to delete all clients from the database
import { getClients, deleteClient } from './src/lib/supabase-service.js';

// Function to delete all clients
async function deleteAllClients() {
  try {
    console.log('Fetching all clients...');
    const clients = await getClients();
    
    if (!clients || clients.length === 0) {
      console.log('No clients found in the database.');
      return;
    }
    
    console.log(`Found ${clients.length} clients. Starting deletion...`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const client of clients) {
      try {
        console.log(`Deleting client: ${client.name} (${client.id})...`);
        await deleteClient(client.id);
        console.log(`Successfully deleted client: ${client.name}`);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete client ${client.name}:`, error);
        failureCount++;
      }
    }
    
    console.log('\n--- Deletion Summary ---');
    console.log(`Total clients: ${clients.length}`);
    console.log(`Successfully deleted: ${successCount}`);
    console.log(`Failed to delete: ${failureCount}`);
    
    if (successCount === clients.length) {
      console.log('\nAll clients have been successfully deleted!');
    } else {
      console.log('\nSome clients could not be deleted. Check the logs for details.');
    }
  } catch (error) {
    console.error('Error during client deletion:', error);
  }
}

// Execute the function
deleteAllClients();
