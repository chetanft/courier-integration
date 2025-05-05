// Mock data for testing

// Mock couriers
let couriers = [];

// Mock clients
let clients = [];

// Mock field mappings
let fieldMappings = [];

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
      }
    ]
  }
};

// Helper function to generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Mock database functions
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
    }, 300);
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
    }, 300);
  });
};

// Mock API testing function
export const testCourierApi = async (credentials, endpoint, payload) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return mock response
      resolve(mockApiResponse);
    }, 500);
  });
};
