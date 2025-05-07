// Courier API configurations
export const courierConfigs = {
  safexpress: {
    name: 'Safexpress',
    endpoints: {
      track_shipment: 'https://api.safexpress.com/api/shipments/track',
      // Add other endpoints as needed
    },
    auth: {
      type: 'basic',
      // These will be replaced with environment variables
      username: process.env.SAFEXPRESS_USERNAME,
      password: process.env.SAFEXPRESS_PASSWORD
    },
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ]
  },
  // Add other courier configurations here
};

// Validate courier config
export const validateCourierConfig = (courierName) => {
  const config = courierConfigs[courierName];
  if (!config) {
    throw new Error(`Courier configuration not found for: ${courierName}`);
  }
  return config;
}; 