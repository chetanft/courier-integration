/**
 * Courier API Client
 *
 * This module provides a high-level client for interacting with courier APIs.
 * It uses the courier registry for configuration and the courier API service for making requests.
 */

import { makeCourierRequest } from './courier-api-service-new';
import {
  getCourierConfig,
  getCourierEndpoint,
  getCourierHeaders,
  applyCourierRequestTransform,
  applyCourierResponseTransform
} from './courier-registry';
import { redactSensitiveInfo } from './utils';
import { API_INTENTS, HTTP_METHODS } from './constants';

/**
 * Track a shipment using a courier API
 *
 * @param {Object} options - Tracking options
 * @param {string} options.courier - Courier identifier
 * @param {string} options.trackingNumber - Shipment tracking number
 * @param {Object} options.auth - Authentication configuration (optional)
 * @param {Object} options.additionalParams - Additional parameters (optional)
 * @returns {Promise<Object>} Tracking response
 */
export const trackShipment = async (options) => {
  try {
    const { courier, trackingNumber, auth, additionalParams } = options;

    if (!courier) {
      throw new Error('Courier identifier is required');
    }

    if (!trackingNumber) {
      throw new Error('Tracking number is required');
    }

    // Get courier configuration
    const courierConfig = getCourierConfig(courier);

    if (!courierConfig) {
      throw new Error(`Courier "${courier}" not found in registry`);
    }

    // Get tracking endpoint
    const trackingEndpoint = getCourierEndpoint(courier, 'track_shipment');

    if (!trackingEndpoint) {
      throw new Error(`Tracking endpoint not found for courier "${courier}"`);
    }

    // Get default headers
    const headers = getCourierHeaders(courier);

    // Build request configuration
    let requestConfig = {
      url: trackingEndpoint,
      method: HTTP_METHODS.POST,
      headers,
      body: {
        trackingNumber,
        ...additionalParams
      },
      apiIntent: API_INTENTS.TRACK_SHIPMENT,
      courier,
      auth: auth || courierConfig.auth
    };

    // Apply courier-specific transformations
    requestConfig = applyCourierRequestTransform(courier, requestConfig);

    // Log the request (without sensitive data)
    console.log('Tracking shipment:', redactSensitiveInfo({
      courier,
      trackingNumber,
      endpoint: trackingEndpoint
    }));

    // Make the API request
    const response = await makeCourierRequest(requestConfig);

    // Apply courier-specific response transformations
    const transformedResponse = applyCourierResponseTransform(courier, 'track_shipment', response);

    return transformedResponse;
  } catch (error) {
    console.error('Error tracking shipment:', error);
    throw error;
  }
};

/**
 * Generate an authentication token for a courier API
 *
 * @param {Object} options - Token generation options
 * @param {string} options.courier - Courier identifier
 * @param {Object} options.credentials - Credentials for token generation
 * @returns {Promise<Object>} Token response
 */
export const generateToken = async (options) => {
  try {
    const { courier, credentials } = options;

    if (!courier) {
      throw new Error('Courier identifier is required');
    }

    // Get courier configuration
    const courierConfig = getCourierConfig(courier);

    if (!courierConfig) {
      throw new Error(`Courier "${courier}" not found in registry`);
    }

    // Get token generation endpoint
    const tokenEndpoint = getCourierEndpoint(courier, 'generate_auth_token');

    if (!tokenEndpoint) {
      throw new Error(`Token generation endpoint not found for courier "${courier}"`);
    }

    // Get default headers
    const headers = getCourierHeaders(courier);

    // Build request configuration
    const requestConfig = {
      url: tokenEndpoint,
      method: HTTP_METHODS.POST,
      headers,
      body: credentials,
      apiIntent: API_INTENTS.GENERATE_AUTH_TOKEN,
      courier
    };

    // Log the request (without sensitive data)
    console.log('Generating token:', redactSensitiveInfo({
      courier,
      endpoint: tokenEndpoint
    }));

    // Make the API request
    const response = await makeCourierRequest(requestConfig);

    return response;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
};

/**
 * Make a custom courier API request
 *
 * @param {Object} options - Request options
 * @param {string} options.courier - Courier identifier
 * @param {string} options.endpoint - Endpoint identifier or URL
 * @param {string} options.method - HTTP method
 * @param {Object} options.body - Request body
 * @param {Object} options.auth - Authentication configuration (optional)
 * @param {Array} options.headers - Additional headers (optional)
 * @returns {Promise<Object>} API response
 */
export const makeCustomRequest = async (options) => {
  try {
    const { courier, endpoint, method, body, auth, headers: additionalHeaders } = options;

    if (!courier) {
      throw new Error('Courier identifier is required');
    }

    if (!endpoint) {
      throw new Error('Endpoint is required');
    }

    // Get courier configuration
    const courierConfig = getCourierConfig(courier);

    if (!courierConfig) {
      throw new Error(`Courier "${courier}" not found in registry`);
    }

    // Determine if endpoint is an identifier or a URL
    let url = endpoint;

    if (!endpoint.startsWith('http')) {
      // Get endpoint URL from registry
      const endpointUrl = getCourierEndpoint(courier, endpoint);

      if (!endpointUrl) {
        throw new Error(`Endpoint "${endpoint}" not found for courier "${courier}"`);
      }

      url = endpointUrl;
    }

    // Get default headers
    const defaultHeaders = getCourierHeaders(courier);

    // Merge default headers with additional headers
    const headers = [...defaultHeaders];

    if (additionalHeaders && Array.isArray(additionalHeaders)) {
      for (const header of additionalHeaders) {
        // Replace existing header if key matches
        const existingIndex = headers.findIndex(h => h.key.toLowerCase() === header.key.toLowerCase());

        if (existingIndex >= 0) {
          headers[existingIndex] = header;
        } else {
          headers.push(header);
        }
      }
    }

    // Build request configuration
    const requestConfig = {
      url,
      method: method || HTTP_METHODS.GET,
      headers,
      body,
      apiIntent: endpoint,
      courier,
      auth: auth || courierConfig.auth
    };

    // Log the request (without sensitive data)
    console.log('Making custom request:', redactSensitiveInfo({
      courier,
      endpoint: url,
      method: requestConfig.method
    }));

    // Make the API request
    const response = await makeCourierRequest(requestConfig);

    // Apply courier-specific response transformations if endpoint is an identifier
    if (endpoint !== url) {
      return applyCourierResponseTransform(courier, endpoint, response);
    }

    return response;
  } catch (error) {
    console.error('Error making custom request:', error);
    throw error;
  }
};
