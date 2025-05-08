/**
 * Utility functions for handling client name patterns and normalization
 */

/**
 * Detect client type from name
 * @param {string} name - The client name to analyze
 * @returns {string} - The detected client type ('CNR', 'CNR_CEE', or 'STANDARD')
 */
export const detectClientType = (name) => {
  if (!name) return 'STANDARD';
  
  const upperName = name.toUpperCase();
  
  if (upperName.includes('CNR+CEE')) {
    return 'CNR_CEE';
  } else if (upperName.includes('CNR')) {
    return 'CNR';
  }
  
  return 'STANDARD';
};

/**
 * Normalize client name by removing special characters and trimming
 * @param {string} name - The client name to normalize
 * @returns {string} - The normalized client name
 */
export const normalizeClientName = (name) => {
  if (!name) return '';
  
  // Trim whitespace
  let normalized = name.trim();
  
  // Remove any excessive whitespace between words
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
};

/**
 * Extract client name from API response based on common patterns
 * @param {Object} item - An object from the API response
 * @returns {string|null} - The extracted client name or null if not found
 */
export const extractClientName = (item) => {
  if (!item) return null;
  
  // Common field names for client names in APIs
  const possibleNameFields = [
    'name',
    'client_name',
    'clientName',
    'cnr',
    'cnr_name',
    'cnrName',
    'customer',
    'customer_name',
    'customerName',
    'title',
    'label'
  ];
  
  // Try to find a field that contains the client name
  for (const field of possibleNameFields) {
    if (item[field] && typeof item[field] === 'string') {
      return item[field];
    }
  }
  
  // If no name field is found, check if the item itself is a string
  if (typeof item === 'string') {
    return item;
  }
  
  return null;
};

/**
 * Validate client name
 * @param {string} name - The client name to validate
 * @returns {Object} - Validation result with isValid and message properties
 */
export const validateClientName = (name) => {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      message: 'Client name is required'
    };
  }
  
  if (name.length < 2) {
    return {
      isValid: false,
      message: 'Client name must be at least 2 characters long'
    };
  }
  
  if (name.length > 100) {
    return {
      isValid: false,
      message: 'Client name must be at most 100 characters long'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * Generate a unique client name by appending a number if necessary
 * @param {string} name - The original client name
 * @param {Array} existingNames - Array of existing client names
 * @returns {string} - A unique client name
 */
export const generateUniqueClientName = (name, existingNames) => {
  if (!existingNames || !existingNames.length) {
    return name;
  }
  
  let uniqueName = name;
  let counter = 1;
  
  while (existingNames.includes(uniqueName)) {
    uniqueName = `${name} (${counter})`;
    counter++;
  }
  
  return uniqueName;
};
