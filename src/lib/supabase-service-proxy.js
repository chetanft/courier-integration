// Supabase service for courier integration platform using the Netlify Function proxy

// Base URL for API requests - use relative URL in production, full URL in development
const API_BASE_URL = import.meta.env.PROD 
  ? '/api' 
  : 'http://localhost:8888/api';

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

// Generic function to make API requests
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`Making ${method} request to ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: `API request failed with status ${response.status}`,
        status: response.status,
        statusText: response.statusText,
        details: errorData
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    handleApiError(error, endpoint);
  }
};

// Get all TMS fields
export const getTmsFields = async () => {
  try {
    const data = await apiRequest('/tms_fields?select=*&order=created_at.asc');
    return data;
  } catch (error) {
    handleApiError(error, 'getTmsFields');
  }
};

// Add a new TMS field
export const addTmsField = async (fieldData) => {
  try {
    const data = await apiRequest('/tms_fields', 'POST', {
      name: fieldData.name,
      display_name: fieldData.displayName,
      description: fieldData.description,
      data_type: fieldData.dataType || 'string',
      is_required: fieldData.isRequired || false,
      updated_at: new Date().toISOString()
    });
    
    return data[0]; // Return the first item from the array
  } catch (error) {
    handleApiError(error, 'addTmsField');
  }
};

// Update an existing TMS field
export const updateTmsField = async (id, fieldData) => {
  try {
    const data = await apiRequest(`/tms_fields?id=eq.${id}`, 'PATCH', {
      name: fieldData.name,
      display_name: fieldData.displayName,
      description: fieldData.description,
      data_type: fieldData.dataType,
      is_required: fieldData.isRequired,
      updated_at: new Date().toISOString()
    });
    
    return data[0]; // Return the first item from the array
  } catch (error) {
    handleApiError(error, 'updateTmsField');
  }
};

// Delete a TMS field
export const deleteTmsField = async (id) => {
  try {
    await apiRequest(`/tms_fields?id=eq.${id}`, 'DELETE');
    return true;
  } catch (error) {
    handleApiError(error, 'deleteTmsField');
  }
};

// Get couriers missing specific TMS field mappings
export const getCouriersMissingFields = async () => {
  try {
    // Get all TMS fields
    const tmsFields = await apiRequest('/tms_fields?select=name');
    const tmsFieldNames = tmsFields.map(field => field.name);
    
    // Get all couriers
    const couriers = await apiRequest('/couriers?select=id,name');
    
    // For each courier, check if they have mappings for all the specified fields
    const results = [];
    
    for (const courier of couriers) {
      const mappings = await apiRequest(`/field_mappings?select=tms_field&courier_id=eq.${courier.id}`);
      
      const existingFields = mappings.map(m => m.tms_field);
      const missingFields = tmsFieldNames.filter(field => !existingFields.includes(field));
      
      if (missingFields.length > 0) {
        results.push({
          courier,
          missingFields
        });
      }
    }
    
    return results;
  } catch (error) {
    handleApiError(error, 'getCouriersMissingFields');
  }
};

// Export other functions as needed for your application
// For example:

// Get all couriers
export const getCouriers = async () => {
  try {
    return await apiRequest('/couriers?select=*&order=name.asc');
  } catch (error) {
    handleApiError(error, 'getCouriers');
  }
};

// Get a single courier by ID
export const getCourierById = async (courierId) => {
  try {
    const data = await apiRequest(`/couriers?id=eq.${courierId}&limit=1`);
    return data[0]; // Return the first item from the array
  } catch (error) {
    handleApiError(error, 'getCourierById');
  }
};

// Get field mappings for a courier
export const getCourierMappings = async (courierId) => {
  try {
    return await apiRequest(`/field_mappings?select=*&courier_id=eq.${courierId}`);
  } catch (error) {
    handleApiError(error, 'getCourierMappings');
  }
};

// Add field mapping
export const addFieldMapping = async (mappingData) => {
  try {
    const data = await apiRequest('/field_mappings', 'POST', {
      courier_id: mappingData.courier_id,
      tms_field: mappingData.tms_field,
      api_field: mappingData.api_field,
      api_type: mappingData.api_type,
      data_type: mappingData.data_type || 'string',
      created_at: new Date().toISOString()
    });
    
    return data[0]; // Return the first item from the array
  } catch (error) {
    handleApiError(error, 'addFieldMapping');
  }
};
