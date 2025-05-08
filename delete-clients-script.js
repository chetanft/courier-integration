// This script can be pasted into the browser console to delete all clients

// Function to delete all clients
async function deleteAllClients() {
  try {
    console.log('Fetching all clients...');
    
    // Get all clients
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching clients:', fetchError);
      return;
    }
    
    if (!clients || clients.length === 0) {
      console.log('No clients found in the database.');
      return;
    }
    
    console.log(`Found ${clients.length} clients. Starting deletion...`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Delete each client one by one
    for (const client of clients) {
      try {
        console.log(`Deleting client: ${client.name} (${client.id})...`);
        
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', client.id);
        
        if (deleteError) {
          console.error(`Failed to delete client ${client.name}:`, deleteError);
          failureCount++;
        } else {
          console.log(`Successfully deleted client: ${client.name}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error deleting client ${client.name}:`, error);
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
deleteAllClients().then(() => {
  console.log('Client deletion process completed.');
});
