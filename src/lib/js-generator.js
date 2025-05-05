/**
 * Generates a JavaScript configuration file for a courier based on the mappings
 * @param {Object} courier - The courier object
 * @param {Array} mappings - Array of field mappings
 * @returns {string} Generated JavaScript code
 */
export const generateJsConfig = (courier, mappings) => {
  // Group mappings by API type
  const mappingsByType = mappings.reduce((acc, mapping) => {
    if (!acc[mapping.api_type]) {
      acc[mapping.api_type] = [];
    }
    acc[mapping.api_type].push(mapping);
    return acc;
  }, {});

  const courierName = courier.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Start building the JS file
  let jsCode = `const axios = require('axios');
const { ConfigAccessor } = require('@freighttiger/app');

const ${courierName}Mapping = {
`;

  // Add each API type mapping
  Object.keys(mappingsByType).forEach(apiType => {
    const typeMappings = mappingsByType[apiType];

    // Response mapping
    jsCode += `  "${apiType}_response": {
    "is_success": (payload) => payload?.shipment?.result === "success",
    "tracking_provider": "${courier.name.toLowerCase()}",`;

    // Add field mappings
    typeMappings.forEach(mapping => {
      jsCode += `
    "${mapping.tms_field}": (payload) => ${generatePathAccessor(mapping.api_field)},`;
    });

    jsCode += `
    "timestamp": () => Date.now()
  },
`;
  });

  // Close the object and export
  jsCode += `};

module.exports = ${courierName}Mapping;`;

  return jsCode;
};

/**
 * Generates code to access a value at a specific path
 * @param {string} path - The field path
 * @returns {string} JavaScript code to access the value
 */
const generatePathAccessor = (path) => {
  if (!path) return 'null';
  return path.includes('[]')
    ? `payload?.${path.replace('[]', '?.[0]')}`
    : `payload?.${path}`;
};
