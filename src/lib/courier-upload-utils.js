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
    console.log("Parsed JSON data:", data);

    let couriersArray = [];

    // Handle different JSON formats
    if (Array.isArray(data)) {
      // Format: Direct array of couriers
      console.log("Detected array format");
      couriersArray = data;
    } else if (data.couriers && Array.isArray(data.couriers)) {
      // Format: Object with couriers array
      console.log("Detected object with couriers array format");
      couriersArray = data.couriers;
    } else {
      // Neither format is valid
      return {
        isValid: false,
        errors: ['JSON must be either an array of couriers or contain a "couriers" array'],
        couriers: []
      };
    }

    if (couriersArray.length === 0) {
      return {
        isValid: false,
        errors: ['JSON contains no courier data'],
        couriers: []
      };
    }

    // Validate each courier
    const errors = [];
    const validCouriers = [];

    couriersArray.forEach((courier, index) => {
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
    // Fix the incorrect escape sequence in the regex
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    console.log('Original CSV content length:', csvContent.length);
    console.log('CSV lines count:', lines.length);

    if (lines.length === 0) {
      return {
        isValid: false,
        errors: ['CSV is empty'],
        couriers: [],
        count: 0
      };
    }

    // Parse header row using the same parsing function as data rows
    // This ensures consistent handling of quotes and special characters
    const headers = parseCSVLine(lines[0]);
    console.log('CSV headers:', headers);

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
  console.log('Parsing CSV line:', line);

  // Handle empty line
  if (!line || !line.trim()) {
    console.log('Empty line detected');
    return [];
  }

  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Process the current field
      const processedValue = current.trim().replace(/^["'](.*)["']$/, '$1');
      result.push(processedValue);
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  const lastValue = current.trim().replace(/^["'](.*)["']$/, '$1');
  result.push(lastValue);

  console.log('Parsed line result:', result);
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
    // Standard fields
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
    active: courier.active !== undefined ? courier.active : true,

    // FreightTiger-specific fields
    fteid: courier.fteid,
    entity_type: courier.entity_type,
    partner_type: courier.partner_type,
    short_code: courier.short_code,
    company_fteid: courier.company_fteid,
    company_name: courier.company_name,
    company_gstin: courier.company_gstin,
    company_head_office: courier.company_head_office,
    old_company_id: courier.old_company_id,
    branch_fteid: courier.branch_fteid,
    branch_name: courier.branch_name,
    old_branch_id: courier.old_branch_id,
    department_fteid: courier.department_fteid,
    department_name: courier.department_name,
    old_department_id: courier.old_department_id,
    relation_types: courier.relation_types,
    tags: courier.tags,
    contact_user: courier.contact_user,
    place_fteid: courier.place_fteid,
    crm_type: courier.crm_type,
    is_crm_supplier: courier.is_crm_supplier,
    is_crm_transporter: courier.is_crm_transporter,
    premium_from: courier.premium_from,
    is_active: courier.is_active !== undefined ? courier.is_active : true,
    created_at: courier.created_at,
    updated_at: courier.updated_at,
    created_by: courier.created_by,
    updated_by: courier.updated_by
  };

  // Convert services to array if it's a string
  if (typeof normalizedCourier.services === 'string') {
    normalizedCourier.services = normalizedCourier.services
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Convert tags to array if it's a string
  if (typeof normalizedCourier.tags === 'string') {
    normalizedCourier.tags = normalizedCourier.tags
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Convert relation_types to array if it's a string
  if (typeof normalizedCourier.relation_types === 'string') {
    normalizedCourier.relation_types = normalizedCourier.relation_types
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Convert boolean fields if they're strings
  if (typeof normalizedCourier.is_active === 'string') {
    normalizedCourier.is_active = normalizedCourier.is_active.toLowerCase() === 'true';
  }

  if (typeof normalizedCourier.is_crm_supplier === 'string') {
    normalizedCourier.is_crm_supplier = normalizedCourier.is_crm_supplier.toLowerCase() === 'true';
  }

  if (typeof normalizedCourier.is_crm_transporter === 'string') {
    normalizedCourier.is_crm_transporter = normalizedCourier.is_crm_transporter.toLowerCase() === 'true';
  }

  return {
    isValid: errors.length === 0,
    errors,
    courier: normalizedCourier
  };
};
