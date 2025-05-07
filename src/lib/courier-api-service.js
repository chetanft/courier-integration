/**
 * Courier API Service
 * 
 * This service handles fetching and processing courier data from client APIs.
 * It provides functions to standardize different API response formats and
 * extract courier information.
 */

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
    // Check if the response has a standard format with courier_partners
    if (data.courier_partners && Array.isArray(data.courier_partners)) {
      couriers = data.courier_partners.map(courier => ({
        name: courier.name,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name} integration`
      }));
    }
    // Check if the response has a company_name and courier_partners format
    else if (data.company_name && data.courier_partners && Array.isArray(data.courier_partners)) {
      couriers = data.courier_partners.map(courier => ({
        name: courier.name,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name} integration for ${data.company_name}`
      }));
    }
    // Check if the response is an array of couriers directly
    else if (Array.isArray(data)) {
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
      couriers = data.couriers.map(courier => ({
        name: courier.name || courier.courier_name,
        services: courier.services || [],
        api_base_url: courier.api_url || courier.api_base_url || null,
        auth_type: courier.auth_type || 'none',
        description: courier.description || `${courier.name || courier.courier_name} integration`
      }));
    }
    // If no recognized format, return empty array
    else {
      console.warn('Unrecognized API response format:', data);
      return [];
    }

    // Filter out couriers without a name
    couriers = couriers.filter(courier => courier.name);

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
 * @returns {Promise<Array>} - Promise resolving to an array of courier objects
 */
export const fetchCourierData = async (apiUrl) => {
  try {
    // Validate API URL
    if (!apiUrl) {
      throw new Error('API URL is required');
    }

    // Make the API request
    const response = await fetch(apiUrl);
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Parse the response as JSON
    const data = await response.json();

    // Extract couriers from the response
    const couriers = extractCouriersFromResponse(data);

    return couriers;
  } catch (error) {
    console.error('Error fetching courier data:', error);
    throw error;
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
