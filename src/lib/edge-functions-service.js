// Service for interacting with Supabase Edge Functions
import { supabase } from './supabase-client';

// Base URL for Edge Functions
const EDGE_FUNCTION_URL = import.meta.env.PROD 
  ? 'https://wyewfqxsxzakafksexil.supabase.co/functions/v1'
  : 'http://localhost:54321/functions/v1';

// Helper function to handle API errors
const handleApiError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);

  // Create a detailed error object
  const errorResponse = {
    error: true,
    message: error.message || 'An unknown error occurred',
    status: error.status || error.statusCode,
    statusText: error.statusText,
    details: error.details || {},
    operation,
    timestamp: new Date().toISOString()
  };

  // Check for RLS errors
  if (error.code === 'RLS_ERROR' || 
      (error.details && error.details.code === 'RLS_ERROR') ||
      error.message?.includes('permission denied') ||
      error.details?.message?.includes('permission denied')) {
    errorResponse.isRlsError = true;
    errorResponse.message = 'Permission denied. Please check Supabase RLS settings.';
    errorResponse.details = {
      ...errorResponse.details,
      help: 'Enable RLS for the tms_fields table and add policies to allow access.'
    };
  }

  throw errorResponse;
};

// Generic function to make Edge Function requests
const callEdgeFunction = async (functionName, method = 'GET', body = null) => {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
    
    // If no token is available, use the anon key
    const authHeader = token 
      ? `Bearer ${token}` 
      : `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    
    const url = `${EDGE_FUNCTION_URL}/${functionName}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    console.log(`Calling Edge Function: ${functionName} (${method})`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: `Edge Function request failed with status ${response.status}`,
        status: response.status,
        statusText: response.statusText,
        details: errorData
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    handleApiError(error, `edge-function:${functionName}`);
  }
};

// Get all TMS fields
export const getTmsFields = async () => {
  try {
    const data = await callEdgeFunction('tms-fields');
    return data;
  } catch (error) {
    handleApiError(error, 'getTmsFields');
  }
};

// Add a new TMS field
export const addTmsField = async (fieldData) => {
  try {
    const data = await callEdgeFunction('tms-fields', 'POST', {
      name: fieldData.name,
      displayName: fieldData.displayName,
      description: fieldData.description,
      dataType: fieldData.dataType || 'string',
      isRequired: fieldData.isRequired || false
    });
    
    return data;
  } catch (error) {
    handleApiError(error, 'addTmsField');
  }
};

// Update a TMS field
export const updateTmsField = async (fieldData) => {
  try {
    const data = await callEdgeFunction('tms-fields', 'PUT', {
      id: fieldData.id,
      name: fieldData.name,
      display_name: fieldData.display_name,
      description: fieldData.description,
      data_type: fieldData.data_type || 'string',
      is_required: fieldData.is_required || false
    });
    
    return data;
  } catch (error) {
    handleApiError(error, 'updateTmsField');
  }
};

// Delete a TMS field
export const deleteTmsField = async (fieldId) => {
  try {
    const data = await callEdgeFunction(`tms-fields?id=${fieldId}`, 'DELETE');
    return data;
  } catch (error) {
    handleApiError(error, 'deleteTmsField');
  }
};

// Get couriers missing specific TMS field mappings
export const getCouriersMissingFields = async () => {
  try {
    const data = await callEdgeFunction('couriers-missing-fields');
    return data;
  } catch (error) {
    handleApiError(error, 'getCouriersMissingFields');
  }
};

// Export a function to check if RLS is properly configured
export const checkRlsConfiguration = async () => {
  try {
    // Try to fetch TMS fields
    await getTmsFields();
    return { success: true };
  } catch (error) {
    if (error.isRlsError) {
      return {
        success: false,
        isRlsError: true,
        message: 'Row Level Security (RLS) is preventing access to the tms_fields table.',
        details: 'Please enable RLS for the tms_fields table and add a policy to allow read access.'
      };
    }
    
    return {
      success: false,
      message: error.message,
      details: error.details
    };
  }
};
