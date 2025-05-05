// Mock data for testing

// Mock couriers
let couriers = [];

// Mock clients
let clients = [];

// Mock field mappings
let fieldMappings = [];

// Mock courier-client relationships
let courierClients = [];

// Mock API responses for different API intents
const mockResponses = {
  // Auth token response
  generate_auth_token: {
    access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkNvdXJpZXIgQVBJIFRva2VuIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    token_type: "Bearer",
    expires_in: 3600,
    scope: "tracking.read config.read",
    created_at: new Date().toISOString()
  },

  // Static config response
  fetch_static_config: {
    config: {
      api_version: "2.1.0",
      endpoints: {
        tracking: "/api/v2/tracking",
        shipments: "/api/v2/shipments",
        locations: "/api/v2/locations"
      },
      features: {
        real_time_tracking: true,
        signature_capture: true,
        address_validation: true
      },
      rate_limits: {
        requests_per_minute: 60,
        requests_per_day: 10000
      },
      supported_countries: ["US", "CA", "MX", "UK", "AU"]
    }
  },

  // API schema response
  fetch_api_schema: {
    openapi: "3.0.0",
    info: {
      title: "Courier API",
      version: "2.1.0",
      description: "API for tracking shipments and managing deliveries"
    },
    paths: {
      "/tracking/{trackingNumber}": {
        get: {
          summary: "Get tracking information",
          parameters: [
            {
              name: "trackingNumber",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": {
              description: "Tracking information",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      shipment: { type: "object" },
                      status: { type: "string" },
                      tracking: { type: "array" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // Shipment tracking response
  track_shipment: {
    shipment: {
      result: "success",
      waybill: "ABC123456",
      status: "IN-TRANSIT",
      estimated_delivery: "2023-05-05T17:00:00Z",
      origin: {
        city: "Los Angeles",
        state: "CA",
        country: "US"
      },
      destination: {
        city: "New York",
        state: "NY",
        country: "US"
      },
      tracking: [
        {
          date: "2023-05-01T10:30:00Z",
          description: "Package picked up from sender",
          status: "PICKED_UP",
          location: "Los Angeles, CA"
        },
        {
          date: "2023-05-02T14:45:00Z",
          description: "Package arrived at sorting facility",
          status: "IN-TRANSIT",
          location: "Denver, CO"
        },
        {
          date: "2023-05-03T08:15:00Z",
          description: "Package departed sorting facility",
          status: "IN-TRANSIT",
          location: "Denver, CO"
        }
      ]
    }
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
    }, 300);
  });
};

export const getClients = async () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...clients]);
    }, 300);
  });
};

export const getCouriers = async () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...couriers]);
    }, 300);
  });
};

// Link clients to a courier
export const linkClientsTocourier = async (courierId, clientIds) => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Add the relationship to the courierClients array
      clientIds.forEach(clientId => {
        courierClients.push({
          courierId,
          clientId,
          created_at: new Date().toISOString()
        });
      });
      resolve({ success: true });
    }, 300);
  });
};

// Get clients linked to a courier
export const getCourierClients = async (courierId) => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Find all client IDs linked to this courier
      const clientIds = courierClients
        .filter(relation => relation.courierId === courierId)
        .map(relation => relation.clientId);

      // Get the full client objects
      const linkedClients = clients.filter(client => clientIds.includes(client.id));

      resolve(linkedClients);
    }, 300);
  });
};

// Get field mappings for a courier
export const getCourierMappings = async (courierId) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const mappings = fieldMappings.filter(mapping => mapping.courierId === courierId);
      resolve(mappings);
    }, 300);
  });
};

// Mock API testing function
export const mockTestCourierApi = async (credentials, endpoint, payload, apiIntent = 'track_shipment') => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return the appropriate mock response based on the API intent
      // Default to track_shipment if the intent is not recognized
      const response = mockResponses[apiIntent] || mockResponses.track_shipment;

      // For tracking requests, customize the response with the tracking number from the payload
      if (apiIntent === 'track_shipment' && payload.docNo) {
        const customResponse = JSON.parse(JSON.stringify(response));
        customResponse.shipment.waybill = payload.docNo;
        resolve(customResponse);
      } else {
        resolve(response);
      }
    }, 500);
  });
};
