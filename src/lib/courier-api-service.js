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
          description: courier.description || `${courier.name} integration for ${data.company_name}`
        }));
      } else {
        couriers = data.courier_partners.map(courier => ({
          name: courier.name,
          services: courier.services || [],
          api_base_url: courier.api_url || courier.api_base_url || null,
          auth_type: courier.auth_type || 'none',
          description: courier.description || `${courier.name} integration`
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
        description: courier.description || `${courier.name || courier.courier_name} integration`
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
        description: courier.description || `${courier.name || courier.courier_name} integration`
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
        description: courier.description || `${courier.name || courier.courier_name} integration`
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
        description: courier.description || `${courier.name || courier.courier_name} integration`
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
        description: courier.description || `${courier.name || courier.courier_name || courier.companyName} integration`
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
        description: courier.description || `${courier.name || courier.courier_name || courier.partnerName} integration`
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
        description: courier.description || `${courier.name || courier.courier_name || courier.companyName} integration`
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
              description: courier.description || `${courier.name || courier.courier_name || courier.companyName || courier.partnerName} integration`
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

/**
 * Fetch courier data from a client API
 *
 * @param {string} apiUrl - The client's API URL
 * @param {Object} requestConfig - Optional request configuration
 * @returns {Promise<Array>} - Promise resolving to an array of courier objects
 */
export const fetchCourierData = async (apiUrl, requestConfig = null) => {
  try {
    // Validate API URL
    if (!apiUrl) {
      throw new Error('API URL is required');
    }

    // Decode the URL if it's encoded
    let decodedUrl = apiUrl;
    try {
      // Check if the URL contains encoded characters
      if (apiUrl.includes('%')) {
        console.log('URL appears to be encoded, attempting to decode...');
        decodedUrl = decodeURIComponent(apiUrl);
        console.log(`Decoded URL: ${decodedUrl}`);
      }
    } catch (decodeError) {
      console.warn('Error decoding URL, will use original:', decodeError);
      // Always set decodedUrl to apiUrl in case of error
      decodedUrl = apiUrl;
    }

    console.log(`Fetching courier data from: ${decodedUrl}`);
    console.log('Request config:', requestConfig);

    let data;
    let error;

    // If we have a request config, use it with testCourierApi
    if (requestConfig) {
      try {
        console.log('Using provided request config with testCourierApi');
        // Make sure the URL in the request config is updated
        const config = {
          ...requestConfig,
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
        data = await directFetch(decodedUrl);
        console.log('Direct fetch successful, data received:', data);
      } catch (directError) {
        console.warn('Direct fetch failed, trying proxy:', directError);
        error = directError;

        // If direct fetch fails, try proxy fetch
        try {
          console.log('Attempting proxy fetch...');
          data = await proxyFetch(decodedUrl);
          console.log('Proxy fetch successful, data received:', data);
        } catch (proxyError) {
          console.error('Proxy fetch also failed:', proxyError);
          console.error('Proxy error details:', JSON.stringify(proxyError, null, 2));

          // Try one more time with the original URL if we decoded it
          if (decodedUrl !== apiUrl) {
            console.log('Trying one more time with the original encoded URL...');
            try {
              data = await proxyFetch(apiUrl);
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

    // Extract couriers from the response
    const couriers = extractCouriersFromResponse(data);

    console.log(`Found ${couriers.length} couriers in API response`);

    return couriers;
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
      url: apiUrl,
      stack: error.stack,
      isNetworkError: error.message?.includes('Network Error') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK'
    };

    console.error('Structured error details:', errorDetails);

    // Throw the error to allow proper error handling by the caller
    throw errorDetails;
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
