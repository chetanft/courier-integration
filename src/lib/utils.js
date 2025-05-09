/**
 * Utility functions for the courier integration platform
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names and merges Tailwind classes
 * @param {...string} inputs - Class names to combine
 * @returns {string} - Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Validate a URL string
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid
 */
export const isValidUrl = (url) => {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    new URL(urlWithProtocol);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Check if a URL points to a private IP or localhost
 *
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL points to a private IP or localhost
 */
export const isPrivateUrl = (url) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname;

    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           (hostname.startsWith('172.') &&
            parseInt(hostname.split('.')[1]) >= 16 &&
            parseInt(hostname.split('.')[1]) <= 31);
  } catch (error) {
    return false;
  }
};

/**
 * Get a nested value from an object using a path string
 * Similar to lodash.get but without the dependency
 *
 * @param {Object} obj - The object to get the value from
 * @param {string} path - The path to the value (e.g., 'data.user.name')
 * @param {*} defaultValue - The default value to return if the path doesn't exist
 * @returns {*} The value at the path or the default value
 */
export const getNestedValue = (obj, path, defaultValue = undefined) => {
  if (!obj || !path) {
    return defaultValue;
  }

  const pathParts = path.split('.');
  let current = obj;

  for (const part of pathParts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }

    current = current[part];
  }

  return current !== undefined ? current : defaultValue;
};

/**
 * Set a nested value in an object using a path string
 * Similar to lodash.set but without the dependency
 *
 * @param {Object} obj - The object to set the value in
 * @param {string} path - The path to set (e.g., 'data.user.name')
 * @param {*} value - The value to set
 * @returns {Object} The modified object
 */
export const setNestedValue = (obj, path, value) => {
  if (!obj || !path) {
    return obj;
  }

  const pathParts = path.split('.');
  let current = obj;

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];

    if (!(part in current)) {
      current[part] = {};
    }

    current = current[part];
  }

  current[pathParts[pathParts.length - 1]] = value;
  return obj;
};

/**
 * Safely parse JSON with error handling
 *
 * @param {string} jsonString - The JSON string to parse
 * @param {*} defaultValue - The default value to return if parsing fails
 * @returns {*} The parsed JSON or the default value
 */
export const safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
    return defaultValue;
  }
};

/**
 * Redact sensitive information from an object for logging
 *
 * @param {Object} obj - The object to redact
 * @param {Array<string>} sensitiveKeys - Keys to redact (case-insensitive)
 * @returns {Object} The redacted object
 */
export const redactSensitiveInfo = (obj, sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth']) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = Array.isArray(obj) ? [...obj] : {...obj};

  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      // Check if this key should be redacted
      const shouldRedact = sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );

      if (shouldRedact && result[key]) {
        // Redact the value but preserve the type
        if (typeof result[key] === 'string') {
          result[key] = '[REDACTED]';
        } else if (typeof result[key] === 'object') {
          result[key] = '[REDACTED_OBJECT]';
        } else {
          result[key] = '[REDACTED]';
        }
      } else if (typeof result[key] === 'object') {
        // Recursively redact nested objects
        result[key] = redactSensitiveInfo(result[key], sensitiveKeys);
      }
    }
  }

  return result;
};

/**
 * Calculate the approximate size of an object in bytes
 *
 * @param {*} object - The object to measure
 * @returns {number} Approximate size in bytes
 */
export const getObjectSize = (object) => {
  const objectString = JSON.stringify(object);
  return new Blob([objectString]).size;
};

/**
 * Check if an object exceeds a size limit
 *
 * @param {*} object - The object to check
 * @param {number} maxSizeBytes - Maximum size in bytes (default: 5MB)
 * @returns {boolean} True if the object exceeds the size limit
 */
export const exceedsMaxSize = (object, maxSizeBytes = 5 * 1024 * 1024) => {
  return getObjectSize(object) > maxSizeBytes;
};
