import { testCourierApi } from './api-utils';

/**
 * Test function to verify the proxy is working with Safexpress
 * @param {string} trackingNumber - The tracking number to test
 * @returns {Promise<Object>} The API response
 */
export const testSafexpressTracking = async (trackingNumber) => {
  const result = await testCourierApi({
    url: 'https://apigateway.safexpress.com/api/shipments/track',
    method: 'POST',
    apiIntent: 'track_shipment',
    courier: 'safexpress', // Used to determine environment variable names
    auth: {
      type: 'basic',
      useEnvCredentials: true // Get credentials from environment variables
    },
    body: {
      docNo: trackingNumber,
      docType: 'WB'
    }
  });

  console.log('Safexpress tracking result:', result);
  return result;
};

/**
 * Run a simple test of courier proxy functionality
 */
export const runProxyTest = async () => {
  try {
    console.log('Testing courier proxy with Safexpress...');
    // Use a test tracking number
    const result = await testSafexpressTracking('123456789');
    
    if (result.error) {
      console.error('Test failed with error:', result.message);
    } else {
      console.log('Test successful! API responded without CORS errors.');
    }
    
    return result;
  } catch (error) {
    console.error('Unexpected error in test:', error);
    return { error: true, message: error.message };
  }
}; 