/**
 * Migration Script for API Service Consolidation
 * 
 * Run this script to check for remaining references to deprecated services
 * and generate suggestions for replacements.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service mapping from old to new
const serviceMapping = {
  'supabase-service.js': 'db-service.js',
  'courier-api-service.js': 'courier-api-client.js',
  'proxy-service.js': 'api-service.js',
  'courier-api-service-new.js': 'courier-api-client.js',
  'supabase-service-proxy.js': 'db-service.js',
  'supabase-client-proxy.js': 'auth-service.js',
  'api-utils.js': 'utils.js'
};

// Function mapping from old to new
const functionMapping = {
  // supabase-service.js → db-service.js
  'getClients': 'getClients',
  'getClientById': 'getClientById',
  'addClient': 'createClient',
  'updateClient': 'updateClient',
  'deleteClient': 'deleteClient',
  'getCouriers': 'getCouriers',
  'getCourierById': 'getCourierById',
  'addCourier': 'createCourier',
  'updateCourier': 'updateCourier',
  'deleteCourier': 'deleteCourier',
  'getCouriersByClientId': 'getCourierClients',
  'getCourierMappings': 'getCourierMappings',
  'addFieldMapping': 'createFieldMapping',
  
  // courier-api-service.js → courier-api-client.js
  'fetchCourierData': 'fetchData',
  'makeCourierRequest': 'makeRequest',
  'processResponse': 'processApiResponse',
  'extractFields': 'extractResponseFields',
  
  // proxy-service.js → api-service.js
  'directFetch': 'makeApiRequest',
  'proxyFetch': 'makeProxyRequest',
  'createErrorResponse': 'createErrorResponse'
};

// Special function mappings that changed service files
const specialFunctionMapping = {
  'uploadJsFile': { service: 'courier-api-client.js', function: 'uploadJsFile' },
  'saveApiTestResult': { service: 'courier-api-client.js', function: 'testApiConnection' }
};

// Check if a file should be scanned
const shouldScanFile = (filePath) => {
  // Skip node_modules and .git
  if (filePath.includes('node_modules') || filePath.includes('.git')) {
    return false;
  }
  
  // Only scan .js, .jsx, .ts, .tsx files
  const ext = path.extname(filePath).toLowerCase();
  return ['.js', '.jsx', '.ts', '.tsx'].includes(ext);
};

// Scan a file for references to old services
const scanFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for imports from old services
    Object.keys(serviceMapping).forEach(oldService => {
      const regex = new RegExp(`from\\s+['"]\\.\\.?\\/.*?\\/${oldService.replace('.js', '')}['"]`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        matches.forEach(match => {
          issues.push({
            type: 'import',
            oldService,
            newService: serviceMapping[oldService],
            line: match
          });
        });
      }
    });
    
    // Check for function calls from old services
    Object.keys(functionMapping).forEach(oldFunction => {
      const regex = new RegExp(`\\b${oldFunction}\\s*\\(`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        matches.forEach(match => {
          issues.push({
            type: 'function',
            oldFunction,
            newFunction: functionMapping[oldFunction],
            line: match
          });
        });
      }
    });
    
    return issues.length > 0 ? { file: filePath, issues } : null;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return null;
  }
};

// Recursively scan a directory
const scanDirectory = (dir, results = []) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      scanDirectory(filePath, results);
    } else if (shouldScanFile(filePath)) {
      const fileIssues = scanFile(filePath);
      if (fileIssues) {
        results.push(fileIssues);
      }
    }
  });
  
  return results;
};

// Generate update suggestions
const generateSuggestions = (results) => {
  return results.map(result => {
    const suggestions = result.issues.map(issue => {
      if (issue.type === 'import') {
        return `In ${result.file}, replace import from ${issue.oldService} with ${issue.newService}`;
      } else {
        // Check if this is a special case function
        if (specialFunctionMapping[issue.oldFunction]) {
          const special = specialFunctionMapping[issue.oldFunction];
          return `In ${result.file}, replace ${issue.oldFunction}() with ${special.function}() from ${special.service}`;
        } else {
          return `In ${result.file}, replace ${issue.oldFunction}() with ${issue.newFunction}()`;
        }
      }
    });
    
    return {
      file: result.file,
      suggestions
    };
  });
};

// Main function
const main = () => {
  console.log('Starting API service migration scan...');
  
  // Scan the src directory
  const srcDir = path.join(__dirname, 'src');
  const results = scanDirectory(srcDir);
  
  console.log(`Found ${results.length} files with references to old services`);
  
  // Generate suggestions
  const suggestions = generateSuggestions(results);
  
  // Write results to file
  const outputPath = path.join(__dirname, 'migration-suggestions.json');
  fs.writeFileSync(outputPath, JSON.stringify(suggestions, null, 2));
  
  console.log(`Migration suggestions written to ${outputPath}`);
  
  // Print summary
  console.log('\nMigration Summary:');
  console.log('=================');
  
  if (suggestions.length === 0) {
    console.log('No issues found! Migration is complete.');
  } else {
    console.log(`${suggestions.length} files still need updates:`);
    suggestions.forEach(suggestion => {
      console.log(`\n${suggestion.file}:`);
      suggestion.suggestions.forEach(s => {
        console.log(`- ${s}`);
      });
    });
  }
};

// Run the script
main(); 