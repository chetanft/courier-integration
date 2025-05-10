/**
 * Courier API Client
 *
 * This client provides courier-specific API functionality using the unified API service.
 * It handles courier-specific request formatting, response parsing, and error handling.
 */

import apiService from './api-service';
import { 
  API_INTENTS, 
  HTTP_METHODS,
  AUTH_TYPES,
  FIELD_MAPPING_TYPES
} from './constants';

/**
 * Create a courier API client with the provided configuration
 * 
 * @param {Object} courierConfig - The courier configuration containing authentication details
 * @returns {Object} Courier API client with method functions
 */
export const createCourierClient = (courierConfig) => {
  // Validate courier config
  if (!courierConfig) {
    throw new Error('Courier configuration is required');
  }
  
  /**
   * Make a courier-specific API request
   * 
   * @param {Object} endpointConfig - The endpoint configuration
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The API response
   */
  const makeRequest = async (endpointConfig, options = {}) => {
    try {
      return await apiService.makeCourierApiRequest(courierConfig, endpointConfig, options);
    } catch (error) {
      console.error('Courier API request error:', error);
      throw error;
    }
  };
  
  /**
   * Test the courier API connectivity
   * 
   * @returns {Promise<Object>} Test result
   */
  const testConnection = async () => {
    try {
      const testEndpoint = courierConfig.testEndpoint || courierConfig.baseUrl;
      
      if (!testEndpoint) {
        return {
          success: false,
          message: 'No test endpoint configured'
        };
      }
      
      const config = {
        url: testEndpoint,
        method: HTTP_METHODS.GET,
        apiIntent: API_INTENTS.TEST_CONNECTION,
        timeout: 10000 // Shorter timeout for tests
      };
      
      const response = await makeRequest(config);
      
      return {
        success: true,
        message: 'Connection successful',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection failed',
        error
      };
    }
  };
  
  /**
   * Get available shipments from the courier API
   * 
   * @param {Object} params - Query parameters for the request
   * @returns {Promise<Object>} Shipments data
   */
  const getShipments = async (params = {}) => {
    const endpoint = courierConfig.endpoints?.shipments;
    
    if (!endpoint) {
      throw new Error('Shipments endpoint not configured for this courier');
    }
    
    const config = {
      url: endpoint,
      method: HTTP_METHODS.GET,
      queryParams: Object.entries(params).map(([key, value]) => ({
        key,
        value: String(value)
      })),
      apiIntent: API_INTENTS.GET_SHIPMENTS
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Get a specific shipment by ID
   * 
   * @param {string} shipmentId - The shipment ID
   * @returns {Promise<Object>} Shipment data
   */
  const getShipmentById = async (shipmentId) => {
    const endpoint = courierConfig.endpoints?.shipmentDetails;
    
    if (!endpoint) {
      throw new Error('Shipment details endpoint not configured for this courier');
    }
    
    // Replace :id placeholder in endpoint
    const url = endpoint.replace(':id', shipmentId);
    
    const config = {
      url,
      method: HTTP_METHODS.GET,
      apiIntent: API_INTENTS.GET_SHIPMENT_DETAILS
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Create a new shipment
   * 
   * @param {Object} shipmentData - The shipment data
   * @returns {Promise<Object>} Created shipment
   */
  const createShipment = async (shipmentData) => {
    const endpoint = courierConfig.endpoints?.createShipment;
    
    if (!endpoint) {
      throw new Error('Create shipment endpoint not configured for this courier');
    }
    
    const config = {
      url: endpoint,
      method: HTTP_METHODS.POST,
      body: shipmentData,
      apiIntent: API_INTENTS.CREATE_SHIPMENT
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Update an existing shipment
   * 
   * @param {string} shipmentId - The shipment ID
   * @param {Object} shipmentData - The updated shipment data
   * @returns {Promise<Object>} Updated shipment
   */
  const updateShipment = async (shipmentId, shipmentData) => {
    const endpoint = courierConfig.endpoints?.updateShipment;
    
    if (!endpoint) {
      throw new Error('Update shipment endpoint not configured for this courier');
    }
    
    // Replace :id placeholder in endpoint
    const url = endpoint.replace(':id', shipmentId);
    
    const config = {
      url,
      method: HTTP_METHODS.PUT,
      body: shipmentData,
      apiIntent: API_INTENTS.UPDATE_SHIPMENT
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Cancel a shipment
   * 
   * @param {string} shipmentId - The shipment ID
   * @returns {Promise<Object>} Cancellation result
   */
  const cancelShipment = async (shipmentId) => {
    const endpoint = courierConfig.endpoints?.cancelShipment;
    
    if (!endpoint) {
      throw new Error('Cancel shipment endpoint not configured for this courier');
    }
    
    // Replace :id placeholder in endpoint
    const url = endpoint.replace(':id', shipmentId);
    
    const config = {
      url,
      method: HTTP_METHODS.DELETE,
      apiIntent: API_INTENTS.CANCEL_SHIPMENT
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Generate a shipping label
   * 
   * @param {string} shipmentId - The shipment ID
   * @param {Object} options - Label generation options
   * @returns {Promise<Object>} Label data
   */
  const generateLabel = async (shipmentId, options = {}) => {
    const endpoint = courierConfig.endpoints?.generateLabel;
    
    if (!endpoint) {
      throw new Error('Generate label endpoint not configured for this courier');
    }
    
    // Replace :id placeholder in endpoint
    const url = endpoint.replace(':id', shipmentId);
    
    const config = {
      url,
      method: HTTP_METHODS.POST,
      body: options,
      apiIntent: API_INTENTS.GENERATE_LABEL
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Get tracking information for a shipment
   * 
   * @param {string} trackingNumber - The tracking number
   * @returns {Promise<Object>} Tracking data
   */
  const getTracking = async (trackingNumber) => {
    const endpoint = courierConfig.endpoints?.tracking;
    
    if (!endpoint) {
      throw new Error('Tracking endpoint not configured for this courier');
    }
    
    // Replace :tracking placeholder in endpoint
    const url = endpoint.replace(':tracking', trackingNumber);
    
    const config = {
      url,
      method: HTTP_METHODS.GET,
      apiIntent: API_INTENTS.GET_TRACKING
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Get available services from the courier
   * 
   * @returns {Promise<Object>} Available services
   */
  const getServices = async () => {
    const endpoint = courierConfig.endpoints?.services;
    
    if (!endpoint) {
      throw new Error('Services endpoint not configured for this courier');
    }
    
    const config = {
      url: endpoint,
      method: HTTP_METHODS.GET,
      apiIntent: API_INTENTS.GET_SERVICES
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Get rate quotes for a shipment
   * 
   * @param {Object} shipmentData - The shipment data for rate calculation
   * @returns {Promise<Object>} Rate quotes
   */
  const getRates = async (shipmentData) => {
    const endpoint = courierConfig.endpoints?.rates;
    
    if (!endpoint) {
      throw new Error('Rates endpoint not configured for this courier');
    }
    
    const config = {
      url: endpoint,
      method: HTTP_METHODS.POST,
      body: shipmentData,
      apiIntent: API_INTENTS.GET_RATES
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Validate an address
   * 
   * @param {Object} addressData - Address to validate
   * @returns {Promise<Object>} Validation result
   */
  const validateAddress = async (addressData) => {
    const endpoint = courierConfig.endpoints?.validateAddress;
    
    if (!endpoint) {
      throw new Error('Address validation endpoint not configured for this courier');
    }
    
    const config = {
      url: endpoint,
      method: HTTP_METHODS.POST,
      body: addressData,
      apiIntent: API_INTENTS.VALIDATE_ADDRESS
    };
    
    return await makeRequest(config);
  };
  
  /**
   * Get field mappings from an API response
   * 
   * @param {Object} response - API response to extract fields from
   * @returns {Array} Extracted field paths
   */
  const extractFieldMappingsFromResponse = (response) => {
    // Create a function to recursively extract paths from an object
    const extractPaths = (obj, currentPath = '', paths = []) => {
      if (!obj || typeof obj !== 'object') {
        return paths;
      }
      
      // If object is an array, check first item as sample
      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          // Add array path
          paths.push({
            path: currentPath,
            type: 'array',
            sampleValue: JSON.stringify(obj).substring(0, 100) // First 100 chars of stringified array
          });
          
          // If first item is an object, extract its paths too
          if (obj[0] && typeof obj[0] === 'object') {
            extractPaths(obj[0], `${currentPath}[0]`, paths);
          }
        } else {
          // Empty array
          paths.push({
            path: currentPath,
            type: 'array',
            sampleValue: '[]'
          });
        }
        return paths;
      }
      
      // Process object
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (value === null) {
          paths.push({
            path: newPath,
            type: 'null',
            sampleValue: 'null'
          });
        } else if (typeof value !== 'object') {
          // Leaf node (primitive value)
          paths.push({
            path: newPath,
            type: typeof value,
            sampleValue: String(value).substring(0, 100) // First 100 chars
          });
        } else {
          // Object or array, add path and recurse
          if (Array.isArray(value)) {
            extractPaths(value, newPath, paths);
          } else {
            paths.push({
              path: newPath,
              type: 'object',
              sampleValue: JSON.stringify(value).substring(0, 100) // First 100 chars of stringified object
            });
            extractPaths(value, newPath, paths);
          }
        }
      }
      
      return paths;
    };
    
    return extractPaths(response);
  };
  
  // Return the courier client interface
  return {
    testConnection,
    getShipments,
    getShipmentById,
    createShipment,
    updateShipment,
    cancelShipment,
    generateLabel,
    getTracking,
    getServices,
    getRates,
    validateAddress,
    extractFieldMappingsFromResponse,
    // Add the raw makeRequest method for custom endpoints
    makeRequest
  };
};

export default createCourierClient;
