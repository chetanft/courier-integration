/**
 * Courier API Client Usage Examples
 *
 * This file demonstrates how to use the improved courier API client.
 */

import { trackShipment, generateToken, makeCustomRequest } from '../lib/courier-api-client';

/**
 * Example: Track a shipment
 */
const trackShipmentExample = async () => {
  try {
    // Track a shipment with Safexpress
    const trackingResponse = await trackShipment({
      courier: 'safexpress',
      trackingNumber: '123456789',
      // Optional authentication (if not using the default from registry)
      auth: {
        type: 'basic',
        username: 'your_username',
        password: 'your_password'
      }
    });

    console.log('Tracking response:', trackingResponse);

    // Access standardized fields
    console.log('Tracking number:', trackingResponse.tracking_number);
    console.log('Status:', trackingResponse.status);
    console.log('Delivery date:', trackingResponse.delivery_date);

    // Access the original response
    console.log('Original response:', trackingResponse.original);

    return trackingResponse;
  } catch (error) {
    console.error('Error tracking shipment:', error);
    throw error;
  }
};

/**
 * Example: Generate an authentication token
 */
const generateTokenExample = async () => {
  try {
    // Generate a token for FreightTiger
    const tokenResponse = await generateToken({
      courier: 'freighttiger',
      credentials: {
        username: 'your_username',
        password: 'your_password'
      }
    });

    console.log('Token response:', tokenResponse);

    // Extract the token
    const token = tokenResponse.data?.token || tokenResponse.access_token;

    console.log('Generated token:', token);

    return tokenResponse;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
};

/**
 * Example: Make a custom API request
 */
const makeCustomRequestExample = async () => {
  try {
    // Make a custom request to get EPOD (Electronic Proof of Delivery)
    const epodResponse = await makeCustomRequest({
      courier: 'safexpress',
      endpoint: 'epod', // Using endpoint identifier from registry
      method: 'POST',
      body: {
        docNo: '123456789',
        docType: 'WB'
      }
    });

    console.log('EPOD response:', epodResponse);

    // Make a custom request with a direct URL
    const customResponse = await makeCustomRequest({
      courier: 'safexpress',
      endpoint: 'https://apigateway.safexpress.com/api/custom/endpoint',
      method: 'GET',
      headers: [
        { key: 'Custom-Header', value: 'custom-value' }
      ]
    });

    console.log('Custom response:', customResponse);

    return { epodResponse, customResponse };
  } catch (error) {
    console.error('Error making custom request:', error);
    throw error;
  }
};

/**
 * Example: Using the client with async/await in a React component
 */
// Import React and hooks
import React, { useState } from 'react';
import { trackShipment as trackShipmentFunc } from '../lib/courier-api-client';

const ComponentExample = () => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleTrackShipment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await trackShipmentFunc({
        courier: 'safexpress',
        trackingNumber
      });

      setTrackingData(response);
    } catch (error) {
      console.error('Error tracking shipment:', error);
      setError(error.message || 'Failed to track shipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Track Shipment</h2>
      <form onSubmit={handleTrackShipment}>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Tracking...' : 'Track'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {trackingData && (
        <div className="tracking-result">
          <h3>Tracking Result</h3>
          <p><strong>Tracking Number:</strong> {trackingData.tracking_number}</p>
          <p><strong>Status:</strong> {trackingData.status}</p>
          <p><strong>Delivery Date:</strong> {trackingData.delivery_date}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Example: Error handling
 */
const errorHandlingExample = async () => {
  try {
    // Attempt to track with an invalid courier
    const response = await trackShipment({
      courier: 'invalid_courier',
      trackingNumber: '123456789'
    });

    // This won't execute if an error is thrown
    console.log('Response:', response);

    return response;
  } catch (error) {
    // Handle specific error types
    if (error.errorType === 'NETWORK_ERROR') {
      console.error('Network error occurred. Please check your internet connection.');
    } else if (error.errorType === 'AUTHENTICATION_ERROR') {
      console.error('Authentication failed. Please check your credentials.');
    } else if (error.errorType === 'RESPONSE_SIZE_ERROR') {
      console.error('Response size too large. Try using pagination or filtering.');
    } else {
      console.error('An unexpected error occurred:', error.message);
    }

    // Log detailed error information for debugging
    console.debug('Error details:', error);

    // Return a fallback or re-throw
    return { error: true, message: error.message };
  }
};

// Export examples for use in other files
export {
  trackShipmentExample,
  generateTokenExample,
  makeCustomRequestExample,
  errorHandlingExample
};
