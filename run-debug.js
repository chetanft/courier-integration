// Run the debug script with environment variables
/* eslint-disable no-undef */
require('dotenv').config();
const { exec } = require('child_process');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for courier ID
rl.question('Enter the courier ID to debug: ', (courierId) => {
  console.log(`Debugging courier with ID: ${courierId}`);

  // Run the debug script
  const command = `node debug-courier-data.js ${courierId}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
    rl.close();
  });
});
