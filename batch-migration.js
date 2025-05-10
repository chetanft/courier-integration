// Batch Migration Script for API Service Consolidation

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import updateImports from './update-imports.js';

/* global process */

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BATCH_SIZE = 5; // Number of files to update in each batch
const SUGGESTIONS_PATH = path.join(__dirname, 'migration-suggestions.json');
const BACKUP_DIR = path.join(__dirname, 'migration-backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Load migration suggestions
let suggestions = [];
try {
  const suggestionsData = fs.readFileSync(SUGGESTIONS_PATH, 'utf8');
  suggestions = JSON.parse(suggestionsData);
  console.log(`Loaded ${suggestions.length} files to migrate from suggestions file`);
} catch (error) {
  console.error('Error loading suggestions file:', error);
  process.exit(1);
}

// Create backup of a file
const backupFile = (filePath) => {
  const fileName = path.basename(filePath);
  const backupPath = path.join(BACKUP_DIR, `${fileName}.bak.${Date.now()}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, content);
    console.log(`Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup for ${filePath}:`, error);
    return false;
  }
};

// Run tests
const runTests = () => {
  return new Promise((resolve, reject) => {
    console.log('\nRunning tests...');
    
    const test = spawn('npm', ['test'], { stdio: 'inherit' });
    
    test.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Tests passed!');
        resolve(true);
      } else {
        console.error(`❌ Tests failed with code ${code}`);
        resolve(false);
      }
    });
    
    test.on('error', (error) => {
      console.error('Error running tests:', error);
      reject(error);
    });
  });
};

// Process a batch of files
const processBatch = async (batch, batchNumber, totalBatches) => {
  console.log(`\n===== Processing Batch ${batchNumber}/${totalBatches} =====`);
  console.log(`Files in this batch: ${batch.length}`);
  
  let updatedFiles = 0;
  
  for (const suggestion of batch) {
    const filePath = suggestion.file;
    console.log(`\nFile: ${filePath}`);
    
    // Create backup before modifying
    const backupCreated = backupFile(filePath);
    if (!backupCreated) {
      console.error(`Skipping ${filePath} due to backup failure`);
      continue;
    }
    
    // Update imports
    const updated = updateImports(filePath);
    if (updated) {
      updatedFiles++;
    }
  }
  
  console.log(`\nBatch ${batchNumber} complete. Updated ${updatedFiles}/${batch.length} files.`);
  
  // Run tests after batch
  console.log('\nRunning tests to ensure functionality remains intact...');
  try {
    const testsPass = await runTests();
    return testsPass;
  } catch (error) {
    console.error('Error running tests:', error);
    return false;
  }
};

// Main function
const main = async () => {
  console.log('Starting batch migration of API services...');
  console.log(`Total files to migrate: ${suggestions.length}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  
  // Split suggestions into batches
  const batches = [];
  for (let i = 0; i < suggestions.length; i += BATCH_SIZE) {
    batches.push(suggestions.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Total batches: ${batches.length}`);
  
  // Process each batch
  let totalSuccess = true;
  for (let i = 0; i < batches.length; i++) {
    const batchSuccess = await processBatch(batches[i], i + 1, batches.length);
    
    if (!batchSuccess) {
      console.error(`\n❌ Batch ${i + 1} failed. Stopping migration.`);
      totalSuccess = false;
      break;
    }
    
    console.log(`\n✅ Batch ${i + 1} completed successfully!`);
    
    // Ask to continue if not the last batch
    if (i < batches.length - 1) {
      const continueResponse = await new Promise((resolve) => {
        process.stdout.write('\nContinue to next batch? (y/n): ');
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });
      
      if (continueResponse !== 'y') {
        console.log('\nMigration paused. You can resume later.');
        break;
      }
    }
  }
  
  if (totalSuccess) {
    console.log('\n🎉 All batches migrated successfully!');
    console.log('\nNext steps:');
    console.log('1. Move deprecated service files to .deprecated folder');
    console.log('2. After testing period, remove the deprecated files completely');
  } else {
    console.log('\n⚠️ Migration stopped due to test failures.');
    console.log('Review the logs, fix issues, and try again.');
  }
};

// Start migration
main().catch(error => {
  console.error('Error in migration process:', error);
  process.exit(1);
}); 