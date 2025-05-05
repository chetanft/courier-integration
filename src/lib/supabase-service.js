// Supabase service for courier integration platform
import supabase from './supabase-client';

// Helper function to handle API errors
const handleApiError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);

  // Create a detailed error object
  const errorResponse = {
    error: true,
    message: error.message || 'An unknown error occurred',
    status: error.status,
    statusText: error.statusText,
    details: error.details || {},
    operation,
    timestamp: new Date().toISOString()
  };

  throw errorResponse;
};

// Add a new courier
export const addCourier = async (courierData) => {
  try {
    const { data, error } = await supabase
      .from('couriers')
      .insert({
        name: courierData.name,
        api_base_url: courierData.api_base_url,
        auth_type: courierData.auth_type,
        api_key: courierData.api_key,
        username: courierData.username,
        password: courierData.password,
        auth_endpoint: courierData.auth_endpoint,
        auth_method: courierData.auth_method || 'POST',
        api_intent: courierData.api_intent,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'addCourier');
  }
};

// Add field mapping
export const addFieldMapping = async (mappingData) => {
  try {
    const { data, error } = await supabase
      .from('field_mappings')
      .insert({
        courier_id: mappingData.courier_id,
        tms_field: mappingData.tms_field,
        api_field: mappingData.api_field,
        api_type: mappingData.api_type,
        data_type: mappingData.data_type || 'string',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'addFieldMapping');
  }
};

// Add a new client
export const addClient = async (clientData) => {
  try {
    console.log('Adding client with data:', clientData);

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: clientData.name,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error when adding client:', error);
      throw error;
    }

    console.log('Client added successfully:', data);
    return data;
  } catch (error) {
    console.error('Detailed error in addClient:', error);
    handleApiError(error, 'addClient');
  }
};

// Get all clients
export const getClients = async () => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'getClients');
  }
};

// Get all couriers
export const getCouriers = async () => {
  try {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'getCouriers');
  }
};

// Link clients to a courier
export const linkClientsToCourier = async (courierId, clientIds) => {
  try {
    // Create an array of objects for insertion
    const linkData = clientIds.map(clientId => ({
      courier_id: courierId,
      client_id: clientId,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('courier_clients')
      .insert(linkData)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'linkClientsToCourier');
  }
};

// Get clients linked to a courier
export const getCourierClients = async (courierId) => {
  try {
    // Join courier_clients with clients to get client details
    const { data, error } = await supabase
      .from('courier_clients')
      .select(`
        client_id,
        clients:client_id (
          id,
          name,
          created_at
        )
      `)
      .eq('courier_id', courierId);

    if (error) throw error;

    // Transform the data to match the expected format
    return data.map(item => item.clients);
  } catch (error) {
    handleApiError(error, 'getCourierClients');
  }
};

// Get field mappings for a courier
export const getCourierMappings = async (courierId) => {
  try {
    const { data, error } = await supabase
      .from('field_mappings')
      .select('*')
      .eq('courier_id', courierId);

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'getCourierMappings');
  }
};

// Get a single courier by ID
export const getCourierById = async (courierId) => {
  try {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('id', courierId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'getCourierById');
  }
};

// Save API test result
export const saveApiTestResult = async (testData) => {
  try {
    const { data, error } = await supabase
      .from('api_test_results')
      .insert({
        courier_id: testData.courier_id,
        api_endpoint: testData.api_endpoint,
        api_intent: testData.api_intent,
        request_payload: testData.request_payload,
        response_data: testData.response_data,
        success: testData.success,
        error_message: testData.error_message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'saveApiTestResult');
  }
};
