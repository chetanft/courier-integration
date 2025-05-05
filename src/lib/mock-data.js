// Mock data for testing without Supabase

// Mock couriers
let couriers = [
  {
    id: '1',
    name: 'SafeExpress',
    auth_config: {
      username: 'safeuser',
      password: 'safepass',
      api_key: 'safe123',
      identifier: 'safe-id',
      auth_endpoint: 'https://api.safeexpress.com/auth',
      auth_method: 'POST',
      auth_content_type: 'application/json',
      token_path: 'access_token'
    },
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'FastCourier',
    auth_config: {
      username: 'fastuser',
      password: 'fastpass',
      api_key: 'fast456',
      identifier: 'fast-id',
      auth_endpoint: 'https://api.fastcourier.com/auth',
      auth_method: 'POST',
      auth_content_type: 'application/json',
      token_path: 'token'
    },
    created_at: new Date().toISOString()
  }
];

// Mock clients
let clients = [
  {
    id: '1',
    name: 'ABC Electronics',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'XYZ Retail',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Global Logistics',
    created_at: new Date().toISOString()
  }
];

// Mock courier-client links
let courierClientLinks = [
  {
    id: '1',
    courier_id: '1',
    client_id: '1',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    courier_id: '1',
    client_id: '3',
    created_at: new Date().toISOString()
  }
];

// Mock field mappings
let fieldMappings = [
  {
    id: '1',
    courier_id: '1',
    api_field: 'shipment.waybill',
    tms_field: 'docket_number',
    api_type: 'track_docket',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    courier_id: '1',
    api_field: 'shipment.status',
    tms_field: 'status',
    api_type: 'track_docket',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    courier_id: '1',
    api_field: 'shipment.tracking',
    tms_field: 'tracking_details',
    api_type: 'track_docket',
    created_at: new Date().toISOString()
  }
];

// Mock API response for testing
export const mockApiResponse = {
  shipment: {
    result: "success",
    waybill: "ABC123456",
    status: "IN-TRANSIT",
    tracking: [
      {
        date: "2023-05-01T10:30:00Z",
        description: "Package picked up from sender",
        status: "PICKED_UP"
      },
      {
        date: "2023-05-02T14:45:00Z",
        description: "Package arrived at sorting facility",
        status: "IN-TRANSIT"
      },
      {
        date: "2023-05-03T08:15:00Z",
        description: "Package in transit to destination",
        status: "IN-TRANSIT"
      }
    ]
  }
};

// Helper function to generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Mock Supabase functions
export const getCouriers = async () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...couriers]);
    }, 500);
  });
};

export const addCourier = async (courierData) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const newCourier = {
        id: generateId(),
        ...courierData,
        created_at: new Date().toISOString()
      };
      couriers.push(newCourier);
      resolve(newCourier);
    }, 500);
  });
};

export const getClients = async () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...clients]);
    }, 500);
  });
};

export const addClient = async (clientData) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const newClient = {
        id: generateId(),
        ...clientData,
        created_at: new Date().toISOString()
      };
      clients.push(newClient);
      resolve(newClient);
    }, 500);
  });
};

export const addFieldMapping = async (mappingData) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const newMapping = {
        id: generateId(),
        ...mappingData,
        created_at: new Date().toISOString()
      };
      fieldMappings.push(newMapping);
      resolve(newMapping);
    }, 500);
  });
};

export const getFieldMappings = async (courierId, apiType) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const filteredMappings = fieldMappings.filter(
        mapping => mapping.courier_id === courierId && mapping.api_type === apiType
      );
      resolve([...filteredMappings]);
    }, 500);
  });
};

export const linkClientToCourier = async (linkData) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const newLink = {
        id: generateId(),
        ...linkData,
        created_at: new Date().toISOString()
      };
      courierClientLinks.push(newLink);
      resolve(newLink);
    }, 500);
  });
};

export const getCourierClients = async (courierId) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const clientIds = courierClientLinks
        .filter(link => link.courier_id === courierId)
        .map(link => link.client_id);
      resolve(clientIds);
    }, 500);
  });
};

// Mock API testing function
export const testCourierApi = async (credentials, endpoint, payload) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate API call
      console.log('Testing API with credentials:', credentials);
      console.log('Endpoint:', endpoint);
      console.log('Payload:', payload);
      
      // Return mock response
      resolve(mockApiResponse);
    }, 1000);
  });
};
