/**
 * Utility functions for parsing and validating courier data from CSV and JSON files
 */

/**
 * Parse and validate JSON data containing couriers
 * @param {string} jsonContent - The JSON content to parse
 * @returns {Object} - Parsed and validated courier data with validation results
 */
export const parseAndValidateJsonCouriers = (jsonContent) => {
  try {
    // Parse the JSON
    const data = JSON.parse(jsonContent);
    
    // Check if it has a couriers array
    if (!data.couriers || !Array.isArray(data.couriers)) {
      return {
        isValid: false,
        errors: ['JSON must contain a "couriers" array'],
        couriers: []
      };
    }
    
    // Validate each courier
    const errors = [];
    const validCouriers = [];
    
    data.couriers.forEach((courier, index) => {
      const validationResult = validateCourier(courier, index);
      
      if (validationResult.isValid) {
        validCouriers.push(validationResult.courier);
      } else {
        errors.push(...validationResult.errors);
      }
    });
    
    // Check for duplicate names
    const names = validCouriers.map(c => c.name);
    const uniqueNames = [...new Set(names)];
    
    if (names.length !== uniqueNames.length) {
      errors.push('There are duplicate courier names in the JSON');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      couriers: validCouriers,
      count: validCouriers.length
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Invalid JSON: ${error.message}`],
      couriers: [],
      count: 0
    };
  }
};

/**
 * Parse and validate CSV data containing couriers
 * @param {string} csvContent - The CSV content to parse
 * @returns {Object} - Parsed and validated courier data with validation results
 */
export const parseAndValidateCsvCouriers = (csvContent) => {
  try {
    // Split by lines and filter out empty lines
    const lines = csvContent.split(/\\r?\\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      return {
        isValid: false,
        errors: ['CSV is empty'],
        couriers: [],
        count: 0
      };
    }
    
    // Parse header row
    const headers = lines[0].split(',').map(header => 
      header.trim().replace(/^["'](.*)["']$/, '$1') // Remove quotes if present
    );
    
    // Check required headers
    if (!headers.includes('name')) {
      return {
        isValid: false,
        errors: ['CSV must have a "name" column'],
        couriers: [],
        count: 0
      };
    }
    
    // Parse data rows
    const errors = [];
    const validCouriers = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        errors.push(`Line ${i + 1} has ${values.length} values, but header has ${headers.length} columns`);
        continue;
      }
      
      // Create courier object from CSV row
      const courier = {};
      headers.forEach((header, index) => {
        courier[header] = values[index];
      });
      
      // Validate the courier
      const validationResult = validateCourier(courier, i);
      
      if (validationResult.isValid) {
        validCouriers.push(validationResult.courier);
      } else {
        errors.push(...validationResult.errors);
      }
    }
    
    // Check for duplicate names
    const names = validCouriers.map(c => c.name);
    const uniqueNames = [...new Set(names)];
    
    if (names.length !== uniqueNames.length) {
      errors.push('There are duplicate courier names in the CSV');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      couriers: validCouriers,
      count: validCouriers.length
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Error parsing CSV: ${error.message}`],
      couriers: [],
      count: 0
    };
  }
};

/**
 * Parse a CSV line handling quoted values with commas
 * @param {string} line - The CSV line to parse
 * @returns {Array} - Array of values from the CSV line
 */
export const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["'](.*)["']$/, '$1'));
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim().replace(/^["'](.*)["']$/, '$1'));
  return result;
};

/**
 * Validate a courier object
 * @param {Object} courier - The courier object to validate
 * @param {number} index - The index of the courier in the array or CSV file
 * @returns {Object} - Validation result with isValid, errors, and courier properties
 */
export const validateCourier = (courier, index) => {
  const errors = [];
  
  // Check required fields
  if (!courier.name || courier.name.trim() === '') {
    errors.push(`Courier at index ${index} is missing a name`);
  }
  
  // Normalize the courier object
  const normalizedCourier = {
    name: courier.name ? courier.name.trim() : '',
    api_url: courier.api_url || courier.apiUrl || courier.api_endpoint || '',
    auth_type: courier.auth_type || courier.authType || 'none',
    auth_token: courier.auth_token || courier.authToken || '',
    auth_username: courier.auth_username || courier.authUsername || '',
    auth_password: courier.auth_password || courier.authPassword || '',
    api_key: courier.api_key || courier.apiKey || '',
    api_key_name: courier.api_key_name || courier.apiKeyName || 'X-API-Key',
    api_key_location: courier.api_key_location || courier.apiKeyLocation || 'header',
    supports_ptl: courier.supports_ptl || courier.supportsPTL || false,
    services: courier.services || [],
    description: courier.description || '',
    logo_url: courier.logo_url || courier.logoUrl || '',
    active: courier.active !== undefined ? courier.active : true
  };
  
  // Convert services to array if it's a string
  if (typeof normalizedCourier.services === 'string') {
    normalizedCourier.services = normalizedCourier.services
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    courier: normalizedCourier
  };
};
