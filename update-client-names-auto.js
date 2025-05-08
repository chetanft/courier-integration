// This script can be pasted into the browser console to update client names automatically

// Function to update client names
async function updateClientNamesAuto() {
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
    
    // Create a mapping of client IDs to names
    const clientMapping = {};
    
    // Ask for the CSV mapping
    const csvMapping = prompt(
      "Enter a CSV mapping of Company IDs to Company Names in the format:\n" +
      "COMPANY_ID,Company Name\n" +
      "Example:\n" +
      "CLI001,Client 1\n" +
      "CLI002,Client 2"
    );
    
    if (!csvMapping || csvMapping.trim() === '') {
      console.log('No mapping provided. Exiting.');
      return;
    }
    
    // Parse the CSV mapping
    const lines = csvMapping.trim().split('\n');
    for (const line of lines) {
      const [companyId, companyName] = line.split(',');
      if (companyId && companyName) {
        clientMapping[companyId.trim()] = companyName.trim();
      }
    }
    
    console.log('Parsed client mapping:', clientMapping);
    
    let updateCount = 0;
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    
    // Update each client based on the mapping
    for (const client of clients) {
      try {
        // Check if this client's name is in our mapping
        if (clientMapping[client.name]) {
          console.log(`Client "${client.name}" (${client.id}) found in mapping. Updating to "${clientMapping[client.name]}"...`);
          updateCount++;
          
          // Update the client name
          const { error: updateError } = await supabase
            .from('clients')
            .update({ name: clientMapping[client.name] })
            .eq('id', client.id);
          
          if (updateError) {
            console.error(`Failed to update client "${client.name}":`, updateError);
            failureCount++;
          } else {
            console.log(`Successfully updated client "${client.name}" to "${clientMapping[client.name]}"`);
            successCount++;
          }
        } else {
          console.log(`Client "${client.name}" (${client.id}) not found in mapping. Skipping.`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error processing client ${client.name}:`, error);
        failureCount++;
      }
    }
    
    console.log('\n--- Update Summary ---');
    console.log(`Total clients: ${clients.length}`);
    console.log(`Clients in mapping: ${Object.keys(clientMapping).length}`);
    console.log(`Clients updated: ${updateCount}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${failureCount}`);
    console.log(`Skipped: ${skippedCount}`);
    
    if (updateCount === 0) {
      console.log('\nNo clients were updated!');
    } else if (successCount === updateCount) {
      console.log('\nAll mapped clients have been successfully updated!');
    } else {
      console.log('\nSome clients could not be updated. Check the logs for details.');
    }
  } catch (error) {
    console.error('Error during client update:', error);
  }
}

// Execute the function
updateClientNamesAuto().then(() => {
  console.log('Client update process completed.');
});
