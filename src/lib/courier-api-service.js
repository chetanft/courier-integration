/**
 * @deprecated This file is deprecated and will be removed in a future release.
 * Please use the new services:
 * - courier-api-client.js - For courier-specific API operations
 * - api-service.js - For generic API operations
 * 
 * See migration-doc.md for a complete mapping of functions.
 */

/**
 * Courier API Service
 *
 * This service handles fetching and processing courier data from client APIs.
 * It provides functions to standardize different API response formats and
 * extract courier information.
 */

import { directFetch, proxyFetch } from './proxy-service';

/**
 * Extract couriers from an API response
 *
 * This function attempts to parse different API response formats and extract
 * standardized courier information.
 *
 * @param {Object} data - The API response data
 * @returns {Array} - Array of courier objects with standardized properties
 */
export const extractCouriersFromResponse = (data) => {
  // Initialize empty array for couriers
  let couriers = [];

  try {
    // Check if data is undefined or null
    if (!data) {
      console.warn('API response data is undefined or null');
      return [];
    }

    console.log('Extracting couriers from response data:', data);

    // Helper function to extract FreightTiger specific fields
    const extractFreightTigerFields = (courier) => {
      // Check if this is a FreightTiger response by looking for fteid
      if (courier.fteid) {
        return {
          fteid: courier.fteid,
          entity_type: courier.entity_type,
          partner_type: courier.partner_type,
          short_code: courier.short_code,
          company_fteid: courier.company_fteid,
          company_name: courier.company_name,
          company_gstin: courier.company_gstin,
          company_head_office: courier.company_head_office,
          old_company_id: courier.old_company_id,
          branch_fteid: courier.branch_fteid,
          branch_name: courier.branch_name,
          old_branch_id: courier.old_branch_id,
          department_fteid: courier.department_fteid,
          department_name: courier.department_name,
          old_department_id: courier.old_department_id,
          relation_types: courier.relation_types,
          tags: courier.tags,
          contact_user: courier.contact_user,
          place_fteid: courier.place_fteid,
          crm_type: courier.crm_type,
          is_crm_supplier: courier.is_crm_supplier,
          is_crm_transporter: courier.is_crm_transporter,
          premium_from: courier.premium_from,
          is_active: courier.is_active,
          created_at: courier.created_at,
          updated_at: courier.updated_at,
          created_by: courier.created_by,
          updated_by: courier.updated_by
        };
      }
      return {};
    };

    // Check if the response has a standard format with courier_partners
    if (data.courier_partners && Array.isArray(data.courier_partners)) {
      console.log('Found courier_partners array in response');

      // Check if there's also a company_name to use in the description
      if (data.company_name) {
        console.log('Found company_name and courier_partners array in response');
        couriers = data.courier_partners.map(courier => ({
          name: courier.name,
          services: courier.services || [],
          api_base_url: courier.api_url || courier.api_base_url || null,
          auth_type: courier.auth_type || 'none',
          description: courier.description || `${courier.name} integration for ${data.company_name}`,
          ...extractFreightTigerFields(courier)
        }));
      } else {
        couriers = data.courier_partners.map(courier => ({
          name: courier.name,
          services: courier.services || [],
          api_base_url: courier.api_url || courier.api_base_url || null,
          auth_type: courier.auth_type || 'none',
          description: courier.description || `${courier.name} integration`,
          ...extractFreightTigerFields(courier)
        }));
      }
    }
    // Check if the response is an array of couriers directly
    else if (Array.isArray(data)) {
      console.log('Response is a direct array of couriers');
      couriers = data.map(courier => ({
        name: courier.name || courier.courier_name,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name} integration`,
        ...extractFreightTigerFields(courier)
      }));
    }
    // Check if the response has a couriers property that is an array
    else if (data.couriers && Array.isArray(data.couriers)) {
      console.log('Found couriers array in response');
      couriers = data.couriers.map(courier => ({
        name: courier.name || courier.courier_name,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name} integration`,
        ...extractFreightTigerFields(courier)
      }));
    }
    // Check if the response has a data property that is an array
    else if (data.data && Array.isArray(data.data)) {
      console.log('Found data array in response');
      couriers = data.data.map(courier => ({
        name: courier.name || courier.courier_name,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name} integration`,
        ...extractFreightTigerFields(courier)
      }));
    }
    // Check if the response has a results property that is an array
    else if (data.results && Array.isArray(data.results)) {
      console.log('Found results array in response');
      couriers = data.results.map(courier => ({
        name: courier.name || courier.courier_name,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name} integration`,
        ...extractFreightTigerFields(courier)
      }));
    }
    // Check if the response has a content property that is an array
    else if (data.content && Array.isArray(data.content)) {
      console.log('Found content array in response');
      couriers = data.content.map(courier => ({
        name: courier.name || courier.courier_name || courier.companyName,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name || courier.companyName} integration`,
        ...extractFreightTigerFields(courier)
      }));
    }
    // Check if the response has a partners property that is an array
    else if (data.partners && Array.isArray(data.partners)) {
      console.log('Found partners array in response');
      couriers = data.partners.map(courier => ({
        name: courier.name || courier.courier_name || courier.partnerName,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name || courier.partnerName} integration`,
        ...extractFreightTigerFields(courier)
      }));
    }
    // Check if the response has a items property that is an array
    else if (data.items && Array.isArray(data.items)) {
      console.log('Found items array in response');
      couriers = data.items.map(courier => ({
        name: courier.name || courier.courier_name || courier.companyName,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name || courier.companyName} integration`,
        ...extractFreightTigerFields(courier)
      }));
    }
    // Try to extract from any array property in the response as a last resort
    else {
      console.log('Trying to find any array property in the response');
      // Find the first property that is an array with objects that have name or courier_name
      const arrayProps = Object.keys(data).filter(key =>
        Array.isArray(data[key]) &&
        data[key].length > 0 &&
        typeof data[key][0] === 'object'
      );

      if (arrayProps.length > 0) {
        console.log(`Found array properties: ${arrayProps.join(', ')}`);
        // Try each array property to see if it contains courier-like objects
        for (const prop of arrayProps) {
          const possibleCouriers = data[prop];
          // Check if the first item has a name-like property
          const firstItem = possibleCouriers[0];
          if (firstItem.name || firstItem.courier_name || firstItem.companyName || firstItem.partnerName) {
            console.log(`Using ${prop} as courier array`);
            couriers = possibleCouriers.map(courier => ({
              name: courier.name || courier.courier_name || courier.companyName || courier.partnerName,
              services: courier.services || [],
              api_base_url: courier.api_url || courier.api_base_url || null,
              auth_type: courier.auth_type || 'none',
              description: courier.description || `${courier.name || courier.courier_name || courier.companyName || courier.partnerName} integration`,
              ...extractFreightTigerFields(courier)
            }));
            break;
          }
        }
      }

      // If still no couriers found, log and return empty array
      if (couriers.length === 0) {
        console.warn('Unrecognized API response format:', data);
        return [];
      }
    }

    // Filter out couriers without a name
    couriers = couriers.filter(courier => courier.name);
    console.log(`After filtering, found ${couriers.length} couriers with names`);

    // Check if courier supports PTL service
    couriers = couriers.map(courier => ({
      ...courier,
      supportsPTL: Array.isArray(courier.services) &&
                  courier.services.some(service =>
                    service.toLowerCase() === 'ptl' ||
                    service.toLowerCase() === 'part truck load')
    }));

    return couriers;
  } catch (error) {
    console.error('Error extracting couriers from response:', error);
    return [];
  }
};

// Helper function to show deprecation warnings
const showDeprecationWarning = (oldFn, newFn) => {
  console.warn(`DEPRECATED: ${oldFn} is deprecated. Use ${newFn} instead. This will be removed in a future release.`);
};

/**
 * Fetch courier data from an API endpoint
 * @deprecated Use courier-api-client.js: fetchData() instead
 */
export const fetchCourierData = async (url, parameters = {}) => {
  showDeprecationWarning('fetchCourierData', 'courier-api-client.js: fetchData');
  try {
    // Validate API URL
    if (!url) {
      throw new Error('API URL is required');
    }

    // Decode the URL if it's encoded
    let decodedUrl = url;
    try {
      // Check if the URL contains encoded characters
      if (url.includes('%')) {
        console.log('URL appears to be encoded, attempting to decode...');
        decodedUrl = decodeURIComponent(url);
        console.log(`Decoded URL: ${decodedUrl}`);
      }
    } catch (decodeError) {
      console.warn('Error decoding URL, will use original:', decodeError);
      // Always set decodedUrl to url in case of error
      decodedUrl = url;
    }

    console.log(`Fetching courier data from: ${decodedUrl}`);
    console.log('Request config:', parameters);

    // Check for duplicate query parameters in the URL
    if (parameters && parameters.queryParams && parameters.queryParams.length > 0) {
      try {
        const urlObj = new URL(decodedUrl);
        const existingParams = new Set(urlObj.searchParams.keys());
        
        // Filter out query parameters that already exist in the URL
        parameters.queryParams = parameters.queryParams.filter(param => 
          !existingParams.has(param.key)
        );
        
        console.log('After filtering for duplicates, using query parameters:', parameters.queryParams);
      } catch (urlError) {
        console.warn('Error parsing URL to check for duplicate parameters:', urlError);
      }
    }

    let data;
    let error;

    // If we have a request config, use it with testCourierApi
    if (parameters) {
      try {
        console.log('Using provided request config with testCourierApi');
        // Make sure the URL in the request config is updated
        const config = {
          ...parameters,
          url: decodedUrl,
          apiIntent: 'fetch_courier_data'
        };

        // Import testCourierApi dynamically to avoid circular dependencies
        const { testCourierApi } = await import('./api-utils');

        // Use testCourierApi to make the request
        const response = await testCourierApi(config);

        // Check if the response contains an error
        if (response.error) {
          throw {
            message: response.message || 'API request failed',
            status: response.status,
            statusText: response.statusText,
            details: response.details
          };
        }

        data = response;
        console.log('testCourierApi successful, data received:', data);
      } catch (apiError) {
        console.error('testCourierApi failed:', apiError);
        error = apiError;

        // Fall back to direct and proxy fetch
        console.log('Falling back to direct and proxy fetch');
      }
    }

    // If we don't have data yet (no request config or it failed), try direct and proxy fetch
    if (!data) {
      // First try direct fetch
      try {
        console.log('Attempting direct fetch...');

        // Create options for direct fetch with auth if available
        const directFetchOptions = {
          method: parameters?.method || 'GET',
          headers: {}
        };

        // Add auth if available
        if (parameters?.auth) {
          directFetchOptions.auth = parameters.auth;

          // Add Authorization header based on auth type
          if (parameters.auth.type === 'bearer' && parameters.auth.token) {
            directFetchOptions.headers['Authorization'] = `Bearer ${parameters.auth.token}`;
          } else if (parameters.auth.type === 'basic' && parameters.auth.username && parameters.auth.password) {
            const basicAuth = btoa(`${parameters.auth.username}:${parameters.auth.password}`);
            directFetchOptions.headers['Authorization'] = `Basic ${basicAuth}`;
          } else if (parameters.auth.type === 'apikey' && parameters.auth.apiKey) {
            const keyName = parameters.auth.apiKeyName || 'X-API-Key';
            directFetchOptions.headers[keyName] = parameters.auth.apiKey;
          }
        }

        // Add any headers from requestConfig
        if (parameters?.headers && Array.isArray(parameters.headers)) {
          parameters.headers.forEach(header => {
            if (header.key && header.value) {
              directFetchOptions.headers[header.key] = header.value;
            }
          });
        }

        data = await directFetch(decodedUrl, directFetchOptions);
        console.log('Direct fetch successful, data received:', data);
      } catch (directError) {
        console.warn('Direct fetch failed, trying proxy:', directError);
        error = directError;

        // If direct fetch fails, try proxy fetch
        try {
          console.log('Attempting proxy fetch...');

          // Create options for proxy fetch with auth if available
          const proxyFetchOptions = {
            method: parameters?.method || 'GET',
            headers: {},
            auth: parameters?.auth
          };

          // Add any headers from requestConfig
          if (parameters?.headers && Array.isArray(parameters.headers)) {
            parameters.headers.forEach(header => {
              if (header.key && header.value) {
                proxyFetchOptions.headers[header.key] = header.value;
              }
            });
          }

          data = await proxyFetch(decodedUrl, proxyFetchOptions);
          console.log('Proxy fetch successful, data received:', data);
        } catch (proxyError) {
          console.error('Proxy fetch also failed:', proxyError);
          console.error('Proxy error details:', JSON.stringify(proxyError, null, 2));

          // Try one more time with the original URL if we decoded it
          if (decodedUrl !== url) {
            console.log('Trying one more time with the original encoded URL...');
            try {
              data = await proxyFetch(url);
              console.log('Proxy fetch with original URL successful, data received:', data);
            } catch (error) {
              console.error('All fetch attempts failed');
              throw error;
            }
          } else {
            // If both fail, throw the original error
            throw error;
          }
        }
      }
    }

    // Check if data is undefined or null
    if (!data) {
      console.warn('API response data is undefined or null');
      return [];
    }

    // Check if we need to filter the data
    if (parameters.filterFields && parameters.filterFields.length > 0) {
      console.log('Filtering data with fields:', parameters.filterFields);

      // Apply the filter
      const filteredData = filterApiResponse(data, parameters.filterFields, parameters.filterPath);
      console.log('Filtered data:', filteredData);

      return filteredData;
    } else {
      // Extract couriers from the response using the standard method
      const couriers = extractCouriersFromResponse(data);
      console.log(`Found ${couriers.length} couriers in API response`);
      return couriers;
    }
  } catch (error) {
    console.error('Error fetching courier data:', error);

    // Log more detailed error information
    if (error.isAxiosError) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });
    } else {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }

    // Create a more detailed error object
    const errorDetails = {
      message: error.message || 'Failed to fetch courier data',
      code: error.code,
      status: error.response?.status || error.status,
      statusText: error.response?.statusText || error.statusText,
      data: error.response?.data || error.data,
      url: url,
      stack: error.stack,
      isNetworkError: error.message?.includes('Network Error') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK'
    };

    console.error('Structured error details:', errorDetails);

    // Throw the error to allow proper error handling by the caller
    throw errorDetails;
  }
};

/**
 * Filter API response to extract specific fields
 *
 * @param {Object} data - The API response data
 * @param {Array} filterFields - Array of field paths to extract
 * @param {string} filterPath - Optional path to the array of items to filter
 * @returns {Array} - Filtered data
 */
export const filterApiResponse = (data, filterFields, filterPath = null) => {
  try {
    console.log('Filtering API response with fields:', filterFields);

    // If filterPath is provided, navigate to that path in the data
    let targetData = data;
    if (filterPath) {
      const pathParts = filterPath.split('.');
      for (const part of pathParts) {
        if (targetData && typeof targetData === 'object' && part in targetData) {
          targetData = targetData[part];
        } else {
          console.warn(`Filter path "${filterPath}" not found in response`);
          return [];
        }
      }
    }

    // If the target data is an array, filter each item
    if (Array.isArray(targetData)) {
      return targetData.map(item => {
        const filteredItem = {};

        // Extract each specified field
        for (const fieldPath of filterFields) {
          try {
            const pathParts = fieldPath.split('.');
            let value = item;

            // Navigate the path to get the value
            for (const part of pathParts) {
              if (value && typeof value === 'object' && part in value) {
                value = value[part];
              } else {
                // Field not found, skip it
                value = undefined;
                break;
              }
            }

            // Only include the field if it has a value
            if (value !== undefined) {
              // Create nested structure based on the field path
              let current = filteredItem;
              for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (!(part in current)) {
                  current[part] = {};
                }
                current = current[part];
              }

              // Set the value at the final path part
              current[pathParts[pathParts.length - 1]] = value;
            }
          } catch (error) {
            console.warn(`Error extracting field "${fieldPath}":`, error);
          }
        }

        return filteredItem;
      });
    } else if (targetData && typeof targetData === 'object') {
      // If the target data is a single object, filter it
      const filteredItem = {};

      // Extract each specified field
      for (const fieldPath of filterFields) {
        try {
          const pathParts = fieldPath.split('.');
          let value = targetData;

          // Navigate the path to get the value
          for (const part of pathParts) {
            if (value && typeof value === 'object' && part in value) {
              value = value[part];
            } else {
              // Field not found, skip it
              value = undefined;
              break;
            }
          }

          // Only include the field if it has a value
          if (value !== undefined) {
            // Create nested structure based on the field path
            let current = filteredItem;
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i];
              if (!(part in current)) {
                current[part] = {};
              }
              current = current[part];
            }

            // Set the value at the final path part
            current[pathParts[pathParts.length - 1]] = value;
          }
        } catch (error) {
          console.warn(`Error extracting field "${fieldPath}":`, error);
        }
      }

      return [filteredItem];
    }

    // If we couldn't filter the data, return an empty array
    console.warn('Could not filter data, returning empty array');
    return [];
  } catch (error) {
    console.error('Error filtering API response:', error);
    return [];
  }
};

/**
 * Check if a courier supports PTL service
 *
 * @param {Object} courier - The courier object
 * @returns {boolean} - True if the courier supports PTL service
 */
export const courierSupportsPTL = (courier) => {
  if (!courier) return false;

  // Check if the courier has a supportsPTL property
  if (typeof courier.supportsPTL === 'boolean') {
    return courier.supportsPTL;
  }

  // Check if the courier has a services array
  if (Array.isArray(courier.services)) {
    return courier.services.some(service =>
      service.toLowerCase() === 'ptl' ||
      service.toLowerCase() === 'part truck load'
    );
  }

  return false;
};

/**
 * Fetch couriers for multiple clients
 *
 * @param {Array} clients - Array of client objects with id, name, api_url, and request_config
 * @param {Object} options - Options for batch processing
 * @returns {Promise<Array>} - Promise resolving to an array of results
 */
export const fetchCouriersForMultipleClients = async (clients, options = {}) => {
  const results = [];
  const batchSize = options.batchSize || 5; // Process 5 clients at a time by default
  const delay = options.delay || 1000; // 1 second delay between batches by default

  // Process clients in batches
  for (let i = 0; i < clients.length; i += batchSize) {
    const batch = clients.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(clients.length / batchSize)}`);

    // Process each client in the batch concurrently
    const batchPromises = batch.map(async (client) => {
      try {
        if (!client.api_url) {
          return {
            clientId: client.id,
            clientName: client.name,
            error: 'No API URL provided',
            success: false,
            couriers: []
          };
        }

        // Parse request_config if it's a string
        let requestConfig = null;
        if (client.request_config) {
          try {
            requestConfig = typeof client.request_config === 'string'
              ? JSON.parse(client.request_config)
              : client.request_config;
          } catch (parseError) {
            console.warn(`Error parsing request_config for client ${client.name}:`, parseError);
          }
        }

        // Fetch couriers for this client
        const couriers = await fetchCourierData(client.api_url, requestConfig);

        return {
          clientId: client.id,
          clientName: client.name,
          success: true,
          couriers,
          count: couriers.length
        };
      } catch (error) {
        console.error(`Error fetching couriers for client ${client.name}:`, error);
        return {
          clientId: client.id,
          clientName: client.name,
          error: error.message || 'Unknown error',
          success: false,
          couriers: []
        };
      }
    });

    // Wait for all clients in this batch to be processed
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add a delay before processing the next batch (if not the last batch)
    if (i + batchSize < clients.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
};

/**
 * Make a request to the courier API
 * @deprecated Use courier-api-client.js: makeRequest() instead
 */
export const makeCourierRequest = async () => {
  showDeprecationWarning('makeCourierRequest', 'courier-api-client.js: makeRequest');
  throw new Error('This function is deprecated. Please use courier-api-client.js: makeRequest() instead.');
};
