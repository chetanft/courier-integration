// This script can be pasted into the browser console to update client names

// Function to update client names
async function updateClientNames() {
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
    
    console.log(`Found ${clients.length} clients. Checking for clients that need updating...`);
    
    let updateCount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    // Check each client to see if the name looks like a company ID
    for (const client of clients) {
      try {
        // Check if the name looks like a company ID (alphanumeric with no spaces)
        const isLikelyCompanyId = /^[A-Z0-9]+$/.test(client.name);
        
        if (isLikelyCompanyId) {
          console.log(`Client "${client.name}" (${client.id}) appears to be a company ID. Updating...`);
          updateCount++;
          
          // Prompt for the new name
          const newName = prompt(`Enter the company name for client "${client.name}" (ID: ${client.id}):`);
          
          if (!newName || newName.trim() === '') {
            console.log(`Skipping update for client "${client.name}" - no name provided.`);
            continue;
          }
          
          // Update the client name
          const { error: updateError } = await supabase
            .from('clients')
            .update({ name: newName.trim() })
            .eq('id', client.id);
          
          if (updateError) {
            console.error(`Failed to update client "${client.name}":`, updateError);
            failureCount++;
          } else {
            console.log(`Successfully updated client "${client.name}" to "${newName.trim()}"`);
            successCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing client ${client.name}:`, error);
        failureCount++;
      }
    }
    
    console.log('\n--- Update Summary ---');
    console.log(`Total clients: ${clients.length}`);
    console.log(`Clients needing update: ${updateCount}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${failureCount}`);
    
    if (updateCount === 0) {
      console.log('\nNo clients needed updating!');
    } else if (successCount === updateCount) {
      console.log('\nAll clients have been successfully updated!');
    } else {
      console.log('\nSome clients could not be updated. Check the logs for details.');
    }
  } catch (error) {
    console.error('Error during client update:', error);
  }
}

// Execute the function
updateClientNames().then(() => {
  console.log('Client update process completed.');
});
