// API service for courier integration platform
import axios from 'axios';

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';

// Helper function to handle API errors
const handleApiError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);

  // Create a detailed error object
  const errorResponse = {
    error: true,
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    details: error.response?.data || {},
    operation,
    timestamp: new Date().toISOString()
  };

  throw errorResponse;
};

// Add a new courier
export const addCourier = async (courierData) => {
  try {
    // Format the data for json-server
    const formattedData = {
      ...courierData,
      created_at: new Date().toISOString()
    };

    const response = await axios.post(`${API_BASE_URL}/couriers`, formattedData);
    return response.data;
  } catch (error) {
    handleApiError(error, 'addCourier');
  }
};

// Add field mapping
export const addFieldMapping = async (mappingData) => {
  try {
    // Format the data for json-server
    const formattedData = {
      courier_id: mappingData.courier_id,
      tms_field: mappingData.tms_field,
      api_field: mappingData.api_field,
      api_type: mappingData.api_type,
      created_at: new Date().toISOString()
    };

    const response = await axios.post(`${API_BASE_URL}/field_mappings`, formattedData);
    return response.data;
  } catch (error) {
    handleApiError(error, 'addFieldMapping');
  }
};

// Add a new client
export const addClient = async (clientData) => {
  try {
    // Format the data for json-server
    const formattedData = {
      ...clientData,
      created_at: new Date().toISOString()
    };

    const response = await axios.post(`${API_BASE_URL}/clients`, formattedData);
    return response.data;
  } catch (error) {
    handleApiError(error, 'addClient');
  }
};

// Get all clients
export const getClients = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/clients`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getClients');
  }
};

// Get all couriers
export const getCouriers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/couriers`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getCouriers');
  }
};

// Link clients to a courier
export const linkClientsToCourier = async (courierId, clientIds) => {
  try {
    // For json-server, we need to create individual entries in the courier_clients table
    const promises = clientIds.map(clientId => {
      return axios.post(`${API_BASE_URL}/courier_clients`, {
        courier_id: courierId,
        client_id: clientId
      });
    });

    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    handleApiError(error, 'linkClientsToCourier');
  }
};

// Get clients linked to a courier
export const getCourierClients = async (courierId) => {
  try {
    // For json-server, we need to filter the courier_clients table and then get the clients
    const linkResponse = await axios.get(`${API_BASE_URL}/courier_clients?courier_id=${courierId}`);
    const clientIds = linkResponse.data.map(link => link.client_id);

    if (clientIds.length === 0) {
      return [];
    }

    // Get all clients and filter them
    const clientsResponse = await axios.get(`${API_BASE_URL}/clients`);
    return clientsResponse.data.filter(client => clientIds.includes(client.id));
  } catch (error) {
    handleApiError(error, 'getCourierClients');
  }
};

// Get field mappings for a courier
export const getCourierMappings = async (courierId) => {
  try {
    // For json-server, we need to filter the field_mappings by courier_id
    const response = await axios.get(`${API_BASE_URL}/field_mappings?courier_id=${courierId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getCourierMappings');
  }
};
