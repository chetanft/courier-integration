// Update imports script for API service consolidation

import fs from 'fs';

/* global process */

/**
 * Updates imports in a file by replacing old services with new ones
 * @param {string} filePath - Path to the file to update
 * @return {boolean} - True if changes were made, false otherwise
 */
const updateImports = (filePath) => {
  try {
    console.log(`Processing ${filePath}...`);
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Service mapping from old to new
    const serviceMapping = {
      'supabase-service': 'db-service',
      'courier-api-service': 'courier-api-client',
      'proxy-service': 'api-service',
      'courier-api-service-new': 'courier-api-client',
      'supabase-service-proxy': 'db-service',
      'supabase-client-proxy': 'auth-service',
      'api-utils': 'utils',
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
      'uploadJsFile': { service: 'courier-api-client', function: 'uploadJsFile' },
      'saveApiTestResult': { service: 'courier-api-client', function: 'testApiConnection' }
    };
    
    // Update imports
    Object.keys(serviceMapping).forEach(oldService => {
      const newService = serviceMapping[oldService];
      
      // Match imports from old service
      const importRegex = new RegExp(`import\\s+([^;]+?)\\s+from\\s+['"]\\.\\.?\\/.*?\\/${oldService}['"]`, 'g');
      
      content = content.replace(importRegex, (match, imports) => {
        console.log(`  Found import: ${match.trim()}`);
        
        // If it's the new special case for api-utils, handle differently
        if (oldService === 'api-utils') {
          // Check if it contains testCourierApi
          if (imports.includes('testCourierApi')) {
            // Split the imports
            let otherImports = imports.replace(/\{|\}|testCourierApi|,\s*testCourierApi|testCourierApi\s*,/g, '').trim();
            
            if (otherImports) {
              // Has other imports besides testCourierApi
              return `import ${otherImports} from '../lib/${newService}';\nimport { testCourierApi } from '../lib/courier-api-client'`;
            } else {
              // Only has testCourierApi
              return `import { testCourierApi } from '../lib/courier-api-client'`;
            }
          }
        }
        
        return `import ${imports} from '../lib/${newService}'`;
      });
    });
    
    // Update function calls
    Object.keys(functionMapping).forEach(oldFunction => {
      const newFunction = functionMapping[oldFunction];
      
      if (oldFunction !== newFunction) {
        const functionRegex = new RegExp(`\\b${oldFunction}\\s*\\(`, 'g');
        
        content = content.replace(functionRegex, (match) => {
          console.log(`  Found function call: ${match.trim()}`);
          return match.replace(oldFunction, newFunction);
        });
      }
    });
    
    // Special case for functions that moved to different services
    Object.keys(specialFunctionMapping).forEach(oldFunction => {
      const { function: newFunction } = specialFunctionMapping[oldFunction];
      
      if (oldFunction !== newFunction) {
        const functionRegex = new RegExp(`\\b${oldFunction}\\s*\\(`, 'g');
        
        content = content.replace(functionRegex, (match) => {
          console.log(`  Found special function call: ${match.trim()}`);
          return match.replace(oldFunction, newFunction);
        });
      }
    });
    
    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  Updated ${filePath}`);
      return true;
    } else {
      console.log(`  No changes needed for ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return false;
  }
};

// Process a single file from command line
if (process.argv.length > 2) {
  const filePath = process.argv[2];
  if (fs.existsSync(filePath)) {
    updateImports(filePath);
  } else {
    console.error(`File not found: ${filePath}`);
  }
}

export default updateImports; 