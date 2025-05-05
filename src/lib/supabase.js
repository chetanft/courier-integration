// Real database operations using axios for API calls
import axios from 'axios';

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';

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
    const response = await axios.post(`${API_BASE_URL}/couriers`, courierData);
    return response.data;
  } catch (error) {
    // Instead of falling back to mock data, throw the error
    handleApiError(error, 'addCourier');
  }
};

// Add field mapping
export const addFieldMapping = async (mappingData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/field-mappings`, mappingData);
    return response.data;
  } catch (error) {
    handleApiError(error, 'addFieldMapping');
  }
};

// Add a new client
export const addClient = async (clientData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/clients`, clientData);
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
export const linkClientsTocourier = async (courierId, clientIds) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/couriers/${courierId}/clients`, {
      client_ids: clientIds
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'linkClientsTocourier');
  }
};

// Get clients linked to a courier
export const getCourierClients = async (courierId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/couriers/${courierId}/clients`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getCourierClients');
  }
};

// Get field mappings for a courier
export const getCourierMappings = async (courierId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/couriers/${courierId}/mappings`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'getCourierMappings');
  }
};
