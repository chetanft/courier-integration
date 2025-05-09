/**
 * Courier Registry
 * 
 * This module provides a centralized registry for courier-specific configurations.
 * It allows for easy addition of new couriers without modifying core code.
 */

/**
 * Registry of courier configurations
 * Each courier entry contains:
 * - name: Display name of the courier
 * - endpoints: Map of endpoint identifiers to URLs
 * - auth: Default authentication configuration
 * - headers: Default headers to include in requests
 * - responseMapping: Field mappings for standardizing responses
 */
const courierRegistry = {
  // Safexpress configuration
  safexpress: {
    name: 'Safexpress',
    endpoints: {
      track_shipment: 'https://apigateway.safexpress.com/api/shipments/track',
      generate_auth_token: 'https://apigateway.safexpress.com/api/auth/token',
      epod: 'https://apigateway.safexpress.com/api/shipments/epod'
    },
    auth: {
      type: 'basic',
      jwtAuthEndpoint: 'https://apigateway.safexpress.com/api/auth/token',
      jwtAuthMethod: 'POST',
      jwtTokenPath: 'access_token'
    },
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ],
    // Field mappings for standardizing responses
    responseMapping: {
      track_shipment: {
        tracking_number: 'docNo',
        status: 'status',
        delivery_date: 'deliveryDate',
        current_location: 'currentLocation',
        shipment_events: 'events'
      }
    },
    // Special handling functions
    handlers: {
      // Transform tracking request
      transformTrackingRequest: (request) => {
        // Ensure the body has the required fields for Safexpress
        if (request.body && request.apiIntent === 'track_shipment') {
          request.body = {
            ...request.body,
            docType: 'WB'
          };
        }
        return request;
      }
    }
  },
  
  // Delhivery configuration
  delhivery: {
    name: 'Delhivery',
    endpoints: {
      track_shipment: 'https://track.delhivery.com/api/v1/packages/json',
      generate_auth_token: 'https://track.delhivery.com/api/auth/token'
    },
    auth: {
      type: 'api_key'
    },
    headers: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Accept', value: 'application/json' }
    ],
    responseMapping: {
      track_shipment: {
        tracking_number: 'waybillNumber',
        status: 'status',
        delivery_date: 'deliveryDate',
        current_location: 'currentLocation',
        shipment_events: 'scans'
      }
    }
  },
  
  // FreightTiger configuration
  freighttiger: {
    name: 'FreightTiger',
    endpoints: {
      track_shipment: 'https://api.freighttiger.com/api/v1/shipments/track',
      generate_auth_token: 'https://api.freighttiger.com/api/v1/auth/login'
    },
    auth: {
      type: 'jwt',
      jwtAuthEndpoint: 'https://api.freighttiger.com/api/v1/auth/login',
      jwtAuthMethod: 'POST',
      jwtTokenPath: 'data.token'
    },
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ],
    responseMapping: {
      track_shipment: {
        tracking_number: 'data.trackingNumber',
        status: 'data.status',
        delivery_date: 'data.deliveryDate',
        current_location: 'data.currentLocation',
        shipment_events: 'data.events'
      }
    },
    // Special handling for FreightTiger API responses
    handlers: {
      // Extract company details from response
      extractCompanyDetails: (response) => {
        if (response && response.data && response.data.company) {
          return {
            fteid: response.data.company.fteid,
            name: response.data.company.name,
            gstin: response.data.company.gstin,
            head_office: response.data.company.head_office,
            old_company_id: response.data.company.old_company_id
          };
        }
        return null;
      }
    }
  }
};

/**
 * Get courier configuration by ID
 * 
 * @param {string} courierId - Courier identifier
 * @returns {Object|null} Courier configuration or null if not found
 */
export const getCourierConfig = (courierId) => {
  if (!courierId) return null;
  
  // Normalize courier ID (case-insensitive lookup)
  const normalizedId = courierId.toLowerCase();
  
  return courierRegistry[normalizedId] || null;
};

/**
 * Get endpoint URL for a courier and endpoint identifier
 * 
 * @param {string} courierId - Courier identifier
 * @param {string} endpointId - Endpoint identifier (e.g., 'track_shipment')
 * @returns {string|null} Endpoint URL or null if not found
 */
export const getCourierEndpoint = (courierId, endpointId) => {
  const config = getCourierConfig(courierId);
  
  if (!config || !config.endpoints || !config.endpoints[endpointId]) {
    return null;
  }
  
  return config.endpoints[endpointId];
};

/**
 * Get default headers for a courier
 * 
 * @param {string} courierId - Courier identifier
 * @returns {Array} Array of default headers
 */
export const getCourierHeaders = (courierId) => {
  const config = getCourierConfig(courierId);
  
  if (!config || !config.headers) {
    return [];
  }
  
  return [...config.headers];
};

/**
 * Get response field mapping for a courier and endpoint
 * 
 * @param {string} courierId - Courier identifier
 * @param {string} endpointId - Endpoint identifier
 * @returns {Object|null} Field mapping or null if not found
 */
export const getCourierResponseMapping = (courierId, endpointId) => {
  const config = getCourierConfig(courierId);
  
  if (!config || !config.responseMapping || !config.responseMapping[endpointId]) {
    return null;
  }
  
  return config.responseMapping[endpointId];
};

/**
 * Get all registered couriers
 * 
 * @returns {Array} Array of courier objects with id and name
 */
export const getAllCouriers = () => {
  return Object.entries(courierRegistry).map(([id, config]) => ({
    id,
    name: config.name
  }));
};

/**
 * Apply courier-specific request transformations
 * 
 * @param {string} courierId - Courier identifier
 * @param {Object} request - Request object to transform
 * @returns {Object} Transformed request
 */
export const applyCourierRequestTransform = (courierId, request) => {
  const config = getCourierConfig(courierId);
  
  if (!config || !config.handlers || !config.handlers.transformTrackingRequest) {
    return request;
  }
  
  return config.handlers.transformTrackingRequest(request);
};

/**
 * Apply courier-specific response transformations
 * 
 * @param {string} courierId - Courier identifier
 * @param {string} endpointId - Endpoint identifier
 * @param {Object} response - Response object to transform
 * @returns {Object} Transformed response
 */
export const applyCourierResponseTransform = (courierId, endpointId, response) => {
  const mapping = getCourierResponseMapping(courierId, endpointId);
  
  if (!mapping || !response) {
    return response;
  }
  
  // Create a standardized response
  const standardized = {};
  
  // Apply field mappings
  for (const [standardField, sourceField] of Object.entries(mapping)) {
    // Handle nested fields with dot notation
    if (sourceField.includes('.')) {
      const parts = sourceField.split('.');
      let value = response;
      
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }
      
      standardized[standardField] = value;
    } else {
      standardized[standardField] = response[sourceField];
    }
  }
  
  // Include the original response
  standardized.original = response;
  
  return standardized;
};
