// Script to move or remove deprecated files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* global process */

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_LIB_DIR = path.join(__dirname, 'src', 'lib');
const DEPRECATED_DIR = path.join(__dirname, 'src', 'lib', '.deprecated');

// List of deprecated files to move or remove
const DEPRECATED_FILES = [
  'supabase-service.js',
  'courier-api-service.js',
  'proxy-service.js',
  'courier-api-service-new.js',
  'supabase-service-proxy.js',
  'supabase-client-proxy.js',
  'api-utils.js'
];

// Create the .deprecated directory if it doesn't exist
const createDeprecatedDir = () => {
  if (!fs.existsSync(DEPRECATED_DIR)) {
    fs.mkdirSync(DEPRECATED_DIR, { recursive: true });
    console.log(`Created directory: ${DEPRECATED_DIR}`);
  }
};

// Move deprecated files to .deprecated directory
const moveDeprecatedFiles = () => {
  console.log('Moving deprecated files to .deprecated directory...');
  createDeprecatedDir();
  
  let moved = 0;
  for (const file of DEPRECATED_FILES) {
    const sourcePath = path.join(SRC_LIB_DIR, file);
    const destPath = path.join(DEPRECATED_DIR, file);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Moved ${file} to .deprecated directory`);
        moved++;
      } catch (error) {
        console.error(`Error moving ${file}:`, error);
      }
    } else {
      console.log(`File ${file} not found, skipping`);
    }
  }
  
  console.log(`\nMoved ${moved} deprecated files to .deprecated directory`);
};

// Remove deprecated files
const removeDeprecatedFiles = () => {
  console.log('Removing deprecated files completely...');
  
  let removed = 0;
  for (const file of DEPRECATED_FILES) {
    const sourcePath = path.join(SRC_LIB_DIR, file);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.unlinkSync(sourcePath);
        console.log(`Removed ${file}`);
        removed++;
      } catch (error) {
        console.error(`Error removing ${file}:`, error);
      }
    } else {
      console.log(`File ${file} not found, skipping`);
    }
  }
  
  console.log(`\nRemoved ${removed} deprecated files`);
};

// Main function
const main = () => {
  const args = process.argv.slice(2);
  const action = args[0];
  
  if (action === 'move') {
    moveDeprecatedFiles();
  } else if (action === 'remove') {
    // Confirm removing files
    console.log('\n⚠️ WARNING: This will permanently delete the following files:');
    DEPRECATED_FILES.forEach(file => console.log(`- src/lib/${file}`));
    console.log('\nMake sure you have:');
    console.log('1. Completed the migration process');
    console.log('2. Thoroughly tested the application');
    console.log('3. Made a backup of these files (run `node move-deprecated-files.js move` first)');
    
    // Prompt for confirmation
    process.stdout.write('\nAre you sure you want to continue? (yes/no): ');
    process.stdin.once('data', (data) => {
      const response = data.toString().trim().toLowerCase();
      if (response === 'yes') {
        removeDeprecatedFiles();
      } else {
        console.log('Operation cancelled.');
      }
    });
  } else {
    console.log('Usage:');
    console.log('  node move-deprecated-files.js move   # Move deprecated files to .deprecated directory');
    console.log('  node move-deprecated-files.js remove # Remove deprecated files completely');
  }
};

// Run main function
main(); 