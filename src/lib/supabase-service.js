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

    // Create a base client object
    const clientObject = {
      name: clientData.name,
      created_at: new Date().toISOString()
    };

    // Add api_url if provided
    if (clientData.api_url) {
      try {
        clientObject.api_url = clientData.api_url;
        clientObject.last_api_fetch = null;
      } catch (fieldError) {
        // If the field doesn't exist in the database, log the error but continue
        console.warn('Could not add api_url field, it might not exist in the database yet:', fieldError);
      }
    }

    // Insert the client
    const { data, error } = await supabase
      .from('clients')
      .insert(clientObject)
      .select()
      .single();

    if (error) {
      // If the error is related to the api_url field not existing, try again without it
      if (error.message && (
          error.message.includes('api_url') ||
          error.message.includes('last_api_fetch') ||
          error.message.includes('column')
        )) {
        console.warn('Error might be related to missing columns, trying without api_url and last_api_fetch');

        // Try again without the api_url and last_api_fetch fields
        const { data: retryData, error: retryError } = await supabase
          .from('clients')
          .insert({
            name: clientData.name,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (retryError) {
          console.error('Retry also failed:', retryError);
          throw retryError;
        }

        console.log('Client added successfully on retry:', retryData);
        return retryData;
      }

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

// Get a single client by ID
export const getClientById = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'getClientById');
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

// Get couriers linked to a client
export const getCouriersByClientId = async (clientId) => {
  try {
    // Join courier_clients with couriers to get courier details
    const { data, error } = await supabase
      .from('courier_clients')
      .select(`
        courier_id,
        couriers:courier_id (
          id,
          name,
          api_base_url,
          auth_type,
          api_intent,
          created_at
        )
      `)
      .eq('client_id', clientId);

    if (error) throw error;

    // Transform the data to match the expected format
    return data.map(item => item.couriers);
  } catch (error) {
    handleApiError(error, 'getCouriersByClientId');
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

// Get API test results for a courier
export const getApiTestResults = async (courierId) => {
  try {
    const { data, error } = await supabase
      .from('api_test_results')
      .select('*')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'getApiTestResults');
  }
};

// Update client's last API fetch timestamp
export const updateClientLastFetch = async (clientId) => {
  try {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({
          last_api_fetch: new Date().toISOString()
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        // If the error is related to the last_api_fetch field not existing, just log and continue
        if (error.message && (
            error.message.includes('last_api_fetch') ||
            error.message.includes('column')
          )) {
          console.warn('Could not update last_api_fetch, column might not exist:', error.message);
          return null;
        }
        throw error;
      }

      return data;
    } catch (updateError) {
      console.warn('Error updating last_api_fetch timestamp:', updateError);
      // Return null instead of throwing to allow the process to continue
      return null;
    }
  } catch (error) {
    handleApiError(error, 'updateClientLastFetch');
  }
};

// Fetch and store courier data from client API
export const fetchAndStoreCourierData = async (clientId, apiUrl) => {
  try {
    // Import the courier API service
    const { fetchCourierData } = await import('./courier-api-service.js');

    // Fetch data from the client's API
    const couriers = await fetchCourierData(apiUrl);

    if (!couriers || couriers.length === 0) {
      console.warn('No couriers found in API response');
      return [];
    }

    console.log(`Found ${couriers.length} couriers in API response`);

    // Store each courier and link to the client
    const results = [];

    for (const courier of couriers) {
      try {
        // Check if courier already exists by name
        const { data: existingCouriers, error: searchError } = await supabase
          .from('couriers')
          .select('id, name')
          .eq('name', courier.name);

        if (searchError) throw searchError;

        let courierId;

        if (existingCouriers && existingCouriers.length > 0) {
          // Courier already exists, use its ID
          courierId = existingCouriers[0].id;
          console.log(`Courier "${courier.name}" already exists with ID ${courierId}`);
        } else {
          // Create new courier
          const newCourier = await addCourier({
            name: courier.name,
            api_base_url: courier.api_base_url || '',
            auth_type: courier.auth_type || 'none',
            api_intent: 'track_shipment'
          });

          courierId = newCourier.id;
          console.log(`Created new courier "${courier.name}" with ID ${courierId}`);
        }

        // Check if courier is already linked to this client
        const { data: existingLinks, error: linkCheckError } = await supabase
          .from('courier_clients')
          .select('*')
          .eq('courier_id', courierId)
          .eq('client_id', clientId);

        if (linkCheckError) throw linkCheckError;

        if (!existingLinks || existingLinks.length === 0) {
          // Link courier to client
          await linkClientsToCourier(courierId, [clientId]);
          console.log(`Linked courier "${courier.name}" to client ID ${clientId}`);
        } else {
          console.log(`Courier "${courier.name}" is already linked to client ID ${clientId}`);
        }

        results.push({
          id: courierId,
          name: courier.name,
          isNew: !existingCouriers || existingCouriers.length === 0
        });
      } catch (courierError) {
        console.error(`Error processing courier "${courier.name}":`, courierError);
        // Continue with next courier
      }
    }

    // Update last fetch timestamp
    await updateClientLastFetch(clientId);

    return results;
  } catch (error) {
    console.error('Error in fetchAndStoreCourierData:', error);
    handleApiError(error, 'fetchAndStoreCourierData');
  }
};

// Get available couriers for a client from API
export const getAvailableCouriersForClient = async (clientId, apiUrl) => {
  try {
    // Import the courier API service
    const { fetchCourierData } = await import('./courier-api-service.js');

    // Get client details to ensure we have the API URL
    if (!apiUrl) {
      const client = await getClientById(clientId);

      // Check if client has api_url property
      if (client && Object.prototype.hasOwnProperty.call(client, 'api_url')) {
        apiUrl = client.api_url;
      }

      if (!apiUrl) {
        // If no API URL is available, return an empty array instead of throwing
        console.warn('Client does not have an API URL configured');
        return [];
      }
    }

    // Fetch all couriers from the API
    const allCouriers = await fetchCourierData(apiUrl);

    // Get couriers already linked to this client
    const linkedCouriers = await getCouriersByClientId(clientId);
    const linkedCourierNames = linkedCouriers.map(c => c.name.toLowerCase());

    // Filter out already linked couriers
    const availableCouriers = allCouriers.filter(c =>
      !linkedCourierNames.includes(c.name.toLowerCase())
    );

    return availableCouriers;
  } catch (error) {
    console.error('Error in getAvailableCouriersForClient:', error);
    // Return empty array instead of throwing to allow the process to continue
    return [];
  }
};

// Get courier by name
export const getCourierByName = async (courierName) => {
  try {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('name', courierName)
      .single();

    if (error) {
      // If no courier found, return null instead of throwing an error
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    handleApiError(error, 'getCourierByName');
  }
};

// Upload a generated JS file to Supabase storage
export const uploadJsFile = async (courierId, fileName, fileContent) => {
  try {
    console.log('Starting uploadJsFile for courier:', courierId, 'fileName:', fileName);

    // Create a bucket if it doesn't exist (this is idempotent)
    const { error: bucketError } = await supabase.storage.createBucket('js-configs', {
      public: false,
      fileSizeLimit: 1024 * 1024, // 1MB
    });

    if (bucketError) {
      console.warn('Bucket creation error (might be ok if duplicate):', bucketError);
      if (bucketError.code !== 'duplicate_bucket') {
        throw bucketError;
      }
    }

    // Upload the file
    const filePath = `${courierId}/${fileName}`;
    console.log('Uploading file to path:', filePath);

    const { data, error } = await supabase.storage
      .from('js-configs')
      .upload(filePath, fileContent, {
        contentType: 'application/javascript',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Error uploading file to storage:', error);
      throw error;
    }

    console.log('File uploaded successfully to storage');

    // Skip database insertion entirely - we know it's failing due to RLS
    // This is a temporary workaround until the RLS policy is fixed in Supabase
    return {
      file: data,
      metadata: null,
      success: true,
      message: 'File was uploaded successfully to storage.'
    };

    /* Commenting out the database insertion code since it's failing due to RLS
    try {
      // Try to save metadata in the database
      const { data: metaData, error: metaError } = await supabase
        .from('js_files')
        .insert({
          courier_id: courierId,
          file_name: fileName,
          file_path: filePath,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (metaError) {
        console.warn('Error saving JS file metadata, but file was uploaded successfully:', metaError);
        // Return partial success even if metadata saving fails
        return {
          file: data,
          metadata: null,
          warning: 'File was uploaded but metadata could not be saved due to database permissions. Please run the fix-js-files-rls-policy.sql script in Supabase.'
        };
      }

      return {
        file: data,
        metadata: metaData
      };
    } catch (metaError) {
      console.warn('Exception saving JS file metadata, but file was uploaded successfully:', metaError);
      // Return partial success even if metadata saving fails
      return {
        file: data,
        metadata: null,
        warning: 'File was uploaded but metadata could not be saved due to database permissions. Please run the fix-js-files-rls-policy.sql script in Supabase.'
      };
    }
    */
  } catch (error) {
    console.error('Error in uploadJsFile:', error);
    handleApiError(error, 'uploadJsFile');
  }
};

// Get all JS files for a courier
export const getJsFilesForCourier = async (courierId) => {
  try {
    console.log('Getting JS files for courier:', courierId);

    const { data, error } = await supabase
      .from('js_files')
      .select('*')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching JS files from database, will try storage instead:', error);

      // If database query fails, try to list files from storage directly
      try {
        const { data: storageData, error: storageError } = await supabase.storage
          .from('js-configs')
          .list(courierId, {
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (storageError) {
          console.error('Error listing files from storage:', storageError);
          throw storageError;
        }

        // Convert storage objects to a format similar to js_files table
        if (storageData && storageData.length > 0) {
          console.log('Found files in storage:', storageData);
          return storageData.map(file => ({
            id: file.id,
            courier_id: courierId,
            file_name: file.name,
            file_path: `${courierId}/${file.name}`,
            created_at: file.created_at || new Date().toISOString(),
            from_storage: true // Flag to indicate this came from storage, not database
          }));
        }

        return []; // No files found in storage
      } catch (storageError) {
        console.error('Error in storage fallback:', storageError);
        return []; // Return empty array instead of throwing
      }
    }

    return data || [];
  } catch (error) {
    console.error('Error in getJsFilesForCourier:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

// Get a download URL for a JS file
export const getJsFileDownloadUrl = async (filePath) => {
  try {
    console.log('Getting download URL for file path:', filePath);

    const { data, error } = await supabase.storage
      .from('js-configs')
      .createSignedUrl(filePath, 300); // URL valid for 5 minutes (300 seconds)

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    console.log('Successfully created signed URL');
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getJsFileDownloadUrl:', error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
};

// Get all TMS fields
export const getTmsFields = async () => {
  try {
    const { data, error } = await supabase
      .from('tms_fields')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'getTmsFields');
  }
};

// Add a new TMS field
export const addTmsField = async (fieldData) => {
  try {
    const { data, error } = await supabase
      .from('tms_fields')
      .insert({
        name: fieldData.name,
        display_name: fieldData.displayName,
        description: fieldData.description,
        data_type: fieldData.dataType || 'string',
        is_required: fieldData.isRequired || false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'addTmsField');
  }
};

// Update an existing TMS field
export const updateTmsField = async (id, fieldData) => {
  try {
    const { data, error } = await supabase
      .from('tms_fields')
      .update({
        name: fieldData.name,
        display_name: fieldData.displayName,
        description: fieldData.description,
        data_type: fieldData.dataType,
        is_required: fieldData.isRequired,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'updateTmsField');
  }
};

// Delete a TMS field
export const deleteTmsField = async (id) => {
  try {
    const { error } = await supabase
      .from('tms_fields')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deleteTmsField');
  }
};

// Delete a courier
export const deleteCourier = async (id) => {
  try {
    const { error } = await supabase
      .from('couriers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deleteCourier');
  }
};

// Delete a client
export const deleteClient = async (id) => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deleteClient');
  }
};

// Get couriers missing specific TMS field mappings
export const getCouriersMissingFields = async () => {
  try {
    // Get all TMS fields
    const { data: tmsFields, error: tmsFieldsError } = await supabase
      .from('tms_fields')
      .select('name');

    if (tmsFieldsError) throw tmsFieldsError;

    const tmsFieldNames = tmsFields.map(field => field.name);

    // Get all couriers
    const { data: couriers, error: couriersError } = await supabase
      .from('couriers')
      .select('id, name');

    if (couriersError) throw couriersError;

    // For each courier, check if they have mappings for all the specified fields
    const results = [];

    for (const courier of couriers) {
      const { data: mappings, error: mappingsError } = await supabase
        .from('field_mappings')
        .select('tms_field')
        .eq('courier_id', courier.id);

      if (mappingsError) throw mappingsError;

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

/**
 * Save courier credentials to Supabase
 * @param {string} courierId - The ID of the courier
 * @param {Object} credentials - The credentials object (username, password, apiKey, etc.)
 * @returns {Promise<Object>} The result of the operation
 */
export const saveCourierCredentials = async (courierId, credentials) => {
  try {
    // Check if courier exists
    const { data: existing } = await supabase
      .from('courier_credentials')
      .select('*')
      .eq('courier_id', courierId)
      .single();

    // If exists, update it
    if (existing) {
      const { data, error } = await supabase
        .from('courier_credentials')
        .update({ credentials })
        .eq('courier_id', courierId);

      if (error) throw error;
      return { success: true, data };
    }
    // Otherwise, insert new record
    else {
      const { data, error } = await supabase
        .from('courier_credentials')
        .insert([{ courier_id: courierId, credentials }]);

      if (error) throw error;
      return { success: true, data };
    }
  } catch (error) {
    console.error('Error saving courier credentials:', error);
    return { success: false, error };
  }
};

/**
 * Get courier credentials from Supabase
 * @param {string} courierId - The ID of the courier
 * @returns {Promise<Object>} The credentials object
 */
export const getCourierCredentials = async (courierId) => {
  try {
    const { data, error } = await supabase
      .from('courier_credentials')
      .select('credentials')
      .eq('courier_id', courierId)
      .single();

    if (error) throw error;
    return { success: true, credentials: data.credentials };
  } catch (error) {
    console.error('Error getting courier credentials:', error);
    return { success: false, error };
  }
};

/**
 * Get courier credentials by courier name
 * @param {string} courierName - The name of the courier (e.g., 'safexpress')
 * @returns {Promise<Object>} The credentials object
 */
export const getCourierCredentialsByName = async (courierName) => {
  try {
    // First find the courier by name
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('id')
      .eq('name', courierName)
      .single();

    if (courierError) throw courierError;

    // Then get credentials by courier ID
    return getCourierCredentials(courier.id);
  } catch (error) {
    console.error('Error getting courier credentials by name:', error);
    return { success: false, error };
  }
};
