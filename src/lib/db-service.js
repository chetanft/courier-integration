/**
 * Database Service
 * 
 * Provides centralized functionality for interacting with the database.
 * Handles CRUD operations for couriers, clients, field mappings, and more.
 */

import axios from 'axios';
import { DB_ENDPOINTS } from './constants';

// Helper to get the base URL for database API
const getBaseUrl = () => {
  return import.meta.env.VITE_DB_API_URL || 'http://localhost:3001';
};

/**
 * Generic error handler for database operations
 * 
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @throws {Object} Standardized error object
 */
const handleDbError = (error, operation) => {
  console.error(`Database error during ${operation}:`, error);
  
  throw {
    error: true,
    message: error.message || `An error occurred during ${operation}`,
    status: error.response?.status,
    statusText: error.response?.statusText,
    details: error.response?.data,
    operation,
    timestamp: new Date().toISOString()
  };
};

/**
 * Generic function to get all records from a collection
 * 
 * @param {string} collection - The collection name
 * @param {Object} params - Optional query parameters
 * @returns {Promise<Array>} Collection of records
 */
export const getAll = async (collection, params = {}) => {
  try {
    const url = `${getBaseUrl()}/${collection}`;
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    handleDbError(error, `get all ${collection}`);
  }
};

/**
 * Generic function to get a single record by ID
 * 
 * @param {string} collection - The collection name
 * @param {string|number} id - The record ID
 * @returns {Promise<Object>} The record
 */
export const getById = async (collection, id) => {
  try {
    const url = `${getBaseUrl()}/${collection}/${id}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    handleDbError(error, `get ${collection} by ID`);
  }
};

/**
 * Generic function to create a record
 * 
 * @param {string} collection - The collection name
 * @param {Object} data - The record data
 * @returns {Promise<Object>} The created record
 */
export const create = async (collection, data) => {
  try {
    const formattedData = {
      ...data,
      created_at: data.created_at || new Date().toISOString()
    };
    
    const url = `${getBaseUrl()}/${collection}`;
    const response = await axios.post(url, formattedData);
    return response.data;
  } catch (error) {
    handleDbError(error, `create ${collection}`);
  }
};

/**
 * Generic function to update a record
 * 
 * @param {string} collection - The collection name
 * @param {string|number} id - The record ID
 * @param {Object} data - The updated data
 * @returns {Promise<Object>} The updated record
 */
export const update = async (collection, id, data) => {
  try {
    const formattedData = {
      ...data,
      updated_at: new Date().toISOString()
    };
    
    const url = `${getBaseUrl()}/${collection}/${id}`;
    const response = await axios.put(url, formattedData);
    return response.data;
  } catch (error) {
    handleDbError(error, `update ${collection}`);
  }
};

/**
 * Generic function to delete a record
 * 
 * @param {string} collection - The collection name
 * @param {string|number} id - The record ID
 * @returns {Promise<Object>} Deletion result
 */
export const remove = async (collection, id) => {
  try {
    const url = `${getBaseUrl()}/${collection}/${id}`;
    const response = await axios.delete(url);
    return response.data;
  } catch (error) {
    handleDbError(error, `delete ${collection}`);
  }
};

/**
 * Get all couriers
 * 
 * @param {Object} params - Optional query parameters
 * @returns {Promise<Array>} Collection of couriers
 */
export const getCouriers = async (params = {}) => {
  return getAll(DB_ENDPOINTS.COURIERS, params);
};

/**
 * Get a courier by ID
 * 
 * @param {string|number} id - The courier ID
 * @returns {Promise<Object>} The courier
 */
export const getCourierById = async (id) => {
  return getById(DB_ENDPOINTS.COURIERS, id);
};

/**
 * Create a new courier
 * 
 * @param {Object} data - The courier data
 * @returns {Promise<Object>} The created courier
 */
export const createCourier = async (data) => {
  return create(DB_ENDPOINTS.COURIERS, data);
};

/**
 * Update a courier
 * 
 * @param {string|number} id - The courier ID
 * @param {Object} data - The updated data
 * @returns {Promise<Object>} The updated courier
 */
export const updateCourier = async (id, data) => {
  return update(DB_ENDPOINTS.COURIERS, id, data);
};

/**
 * Delete a courier
 * 
 * @param {string|number} id - The courier ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteCourier = async (id) => {
  return remove(DB_ENDPOINTS.COURIERS, id);
};

/**
 * Get all clients
 * 
 * @param {Object} params - Optional query parameters
 * @returns {Promise<Array>} Collection of clients
 */
export const getClients = async (params = {}) => {
  return getAll(DB_ENDPOINTS.CLIENTS, params);
};

/**
 * Get a client by ID
 * 
 * @param {string|number} id - The client ID
 * @returns {Promise<Object>} The client
 */
export const getClientById = async (id) => {
  return getById(DB_ENDPOINTS.CLIENTS, id);
};

/**
 * Create a new client
 * 
 * @param {Object} data - The client data
 * @returns {Promise<Object>} The created client
 */
export const createClient = async (data) => {
  return create(DB_ENDPOINTS.CLIENTS, data);
};

/**
 * Update a client
 * 
 * @param {string|number} id - The client ID
 * @param {Object} data - The updated data
 * @returns {Promise<Object>} The updated client
 */
export const updateClient = async (id, data) => {
  return update(DB_ENDPOINTS.CLIENTS, id, data);
};

/**
 * Delete a client
 * 
 * @param {string|number} id - The client ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteClient = async (id) => {
  return remove(DB_ENDPOINTS.CLIENTS, id);
};

/**
 * Get field mappings for a courier
 * 
 * @param {string|number} courierId - The courier ID
 * @returns {Promise<Array>} Collection of field mappings
 */
export const getCourierMappings = async (courierId) => {
  try {
    const url = `${getBaseUrl()}/${DB_ENDPOINTS.FIELD_MAPPINGS}?courier_id=${courierId}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    handleDbError(error, 'get courier mappings');
  }
};

/**
 * Create a field mapping
 * 
 * @param {Object} data - The mapping data
 * @returns {Promise<Object>} The created mapping
 */
export const createFieldMapping = async (data) => {
  return create(DB_ENDPOINTS.FIELD_MAPPINGS, data);
};

/**
 * Delete a field mapping
 * 
 * @param {string|number} id - The mapping ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFieldMapping = async (id) => {
  return remove(DB_ENDPOINTS.FIELD_MAPPINGS, id);
};

/**
 * Get clients linked to a courier
 * 
 * @param {string|number} courierId - The courier ID
 * @returns {Promise<Array>} Collection of linked clients
 */
export const getCourierClients = async (courierId) => {
  try {
    // First get the links
    const url = `${getBaseUrl()}/${DB_ENDPOINTS.COURIER_CLIENTS}?courier_id=${courierId}`;
    const linkResponse = await axios.get(url);
    const clientIds = linkResponse.data.map(link => link.client_id);
    
    if (clientIds.length === 0) {
      return [];
    }
    
    // Then get all clients
    const clientsResponse = await axios.get(`${getBaseUrl()}/${DB_ENDPOINTS.CLIENTS}`);
    
    // Filter to only linked clients
    return clientsResponse.data.filter(client => clientIds.includes(client.id));
  } catch (error) {
    handleDbError(error, 'get courier clients');
  }
};

/**
 * Link clients to a courier
 * 
 * @param {string|number} courierId - The courier ID
 * @param {Array} clientIds - Array of client IDs
 * @returns {Promise<Object>} Link result
 */
export const linkClientsToCourier = async (courierId, clientIds) => {
  try {
    // Create a link for each client
    const promises = clientIds.map(clientId => {
      return axios.post(`${getBaseUrl()}/${DB_ENDPOINTS.COURIER_CLIENTS}`, {
        courier_id: courierId,
        client_id: clientId,
        created_at: new Date().toISOString()
      });
    });
    
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    handleDbError(error, 'link clients to courier');
  }
};

/**
 * Remove a client link from a courier
 * 
 * @param {string|number} courierId - The courier ID
 * @param {string|number} clientId - The client ID
 * @returns {Promise<Object>} Unlink result
 */
export const unlinkClientFromCourier = async (courierId, clientId) => {
  try {
    // Find the link
    const url = `${getBaseUrl()}/${DB_ENDPOINTS.COURIER_CLIENTS}?courier_id=${courierId}&client_id=${clientId}`;
    const response = await axios.get(url);
    
    if (response.data.length === 0) {
      return { success: false, message: 'Link not found' };
    }
    
    // Delete the link
    const linkId = response.data[0].id;
    await axios.delete(`${getBaseUrl()}/${DB_ENDPOINTS.COURIER_CLIENTS}/${linkId}`);
    
    return { success: true };
  } catch (error) {
    handleDbError(error, 'unlink client from courier');
  }
};

// Default export with named functions
export default {
  // Generic CRUD
  getAll,
  getById,
  create,
  update,
  remove,
  
  // Courier operations
  getCouriers,
  getCourierById,
  createCourier,
  updateCourier, 
  deleteCourier,
  
  // Client operations
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  
  // Field mappings
  getCourierMappings,
  createFieldMapping,
  deleteFieldMapping,
  
  // Courier-client links
  getCourierClients,
  linkClientsToCourier,
  unlinkClientFromCourier
}; 