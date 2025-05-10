/**
 * Utility Functions
 * 
 * This module provides utility functions used throughout the application.
 */

import { SENSITIVE_HEADERS } from './constants';

/**
 * Format a date to a readable string
 * 
 * @param {string|Date} date - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
};

/**
 * Format a date to an ISO string
 * 
 * @param {string|Date} date - The date to format
 * @returns {string} ISO date string
 */
export const toISOString = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  } catch (error) {
    console.error('Error converting to ISO string:', error);
    return '';
  }
};

/**
 * Truncate a string to a maximum length with ellipsis
 * 
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export const truncateString = (str, maxLength = 100) => {
  if (!str) return '';
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength - 3) + '...';
};

/**
 * Redact sensitive information in objects for logging
 * 
 * @param {Object} obj - The object to redact
 * @returns {Object} Redacted object
 */
export const redactSensitiveInfo = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveInfo(item));
  }
  
  const redacted = { ...obj };
  
  // Redact common sensitive fields
  ['password', 'token', 'apiKey', 'secret', 'key', 'privateKey', 'private_key'].forEach(field => {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  });
  
  // Redact headers
  if (redacted.headers) {
    if (Array.isArray(redacted.headers)) {
      redacted.headers = redacted.headers.map(header => {
        if (SENSITIVE_HEADERS.includes(header.key.toLowerCase())) {
          return { ...header, value: '[REDACTED]' };
        }
        return header;
      });
    } else if (typeof redacted.headers === 'object') {
      const headers = { ...redacted.headers };
      Object.keys(headers).forEach(key => {
        if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
          headers[key] = '[REDACTED]';
        }
      });
      redacted.headers = headers;
    }
  }
  
  // Redact auth
  if (redacted.auth) {
    const auth = { ...redacted.auth };
    ['password', 'token', 'apiKey', 'secret'].forEach(field => {
      if (field in auth) {
        auth[field] = '[REDACTED]';
      }
    });
    redacted.auth = auth;
  }
  
  // Recursively redact nested objects
  Object.keys(redacted).forEach(key => {
    if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveInfo(redacted[key]);
    }
  });
  
  return redacted;
};

/**
 * Safely parse JSON
 * 
 * @param {string} jsonString - The JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
};

/**
 * Safely stringify an object to JSON
 * 
 * @param {*} value - The value to stringify
 * @param {*} defaultValue - Default value if stringification fails
 * @returns {string} JSON string or default value
 */
export const safeJsonStringify = (value, defaultValue = '{}') => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Error stringifying JSON:', error);
    return defaultValue;
  }
};

/**
 * Convert an object to query string parameters
 * 
 * @param {Object} params - The parameters to convert
 * @returns {string} Query string (without leading ?)
 */
export const objectToQueryString = (params) => {
  if (!params || typeof params !== 'object') {
    return '';
  }
  
  // Filter out undefined and null values first
  const filteredParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      filteredParams[key] = value;
    }
  });
  
  return Object.entries(filteredParams)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value
          .map(item => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
};

/**
 * Parse query string parameters to an object
 * 
 * @param {string} queryString - The query string to parse
 * @returns {Object} Parsed parameters
 */
export const queryStringToObject = (queryString) => {
  if (!queryString) {
    return {};
  }
  
  // Remove leading ? if present
  const normalizedQuery = queryString.startsWith('?') 
    ? queryString.substring(1) 
    : queryString;
  
  // Split and parse
  return normalizedQuery
    .split('&')
    .filter(Boolean)
    .reduce((acc, param) => {
      const parts = param.split('=');
      if (parts.length !== 2) return acc;
      
      const key = decodeURIComponent(parts[0]);
      const value = decodeURIComponent(parts[1]);
      
      // Handle array parameters (key[]=value format)
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2);
        acc[arrayKey] = acc[arrayKey] || [];
        acc[arrayKey].push(value);
      } else {
        acc[key] = value;
      }
      
      return acc;
    }, {});
};

/**
 * Deep copy an object
 * 
 * @param {*} obj - The object to copy
 * @returns {*} Deep copy of the object
 */
export const deepCopy = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Error during deep copy:', error);
    return obj;
  }
};

/**
 * Generate a unique ID
 * 
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export const generateId = (prefix = '') => {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Extract dot notation path from object
 * 
 * @param {Object} obj - The object to extract from
 * @param {string} path - The dot notation path
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} The value at the path or default value
 */
export const getValueByPath = (obj, path, defaultValue = null) => {
  if (!obj || !path) {
    return defaultValue;
  }
  
  try {
    const pathArray = path.split('.');
    
    let value = obj;
    
    for (const key of pathArray) {
      // Handle array indexing
      if (key.includes('[') && key.includes(']')) {
        const propName = key.substring(0, key.indexOf('['));
        const indexStr = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
        const index = parseInt(indexStr, 10);
        
        if (value[propName] && Array.isArray(value[propName]) && !isNaN(index)) {
          value = value[propName][index];
        } else {
          return defaultValue;
        }
      } else {
        if (value === undefined || value === null || !(key in value)) {
          return defaultValue;
        }
        
        value = value[key];
      }
    }
    
    return value === undefined ? defaultValue : value;
  } catch (error) {
    console.error('Error extracting path:', error);
    return defaultValue;
  }
};

/**
 * Set value at dot notation path in object
 * 
 * @param {Object} obj - The object to modify
 * @param {string} path - The dot notation path
 * @param {*} value - The value to set
 * @returns {Object} The modified object
 */
export const setValueByPath = (obj, path, value) => {
  if (!obj || !path) {
    return obj;
  }
  
  try {
    const pathArray = path.split('.');
    let target = obj;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      
      // Handle array indexing in path
      if (key.includes('[') && key.includes(']')) {
        const propName = key.substring(0, key.indexOf('['));
        const indexStr = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
        const index = parseInt(indexStr, 10);
        
        // Create property if it doesn't exist
        if (!(propName in target)) {
          target[propName] = [];
        }
        
        // Create array elements if they don't exist
        while (target[propName].length <= index) {
          target[propName].push({});
        }
        
        target = target[propName][index];
      } else {
        // Create nested object if it doesn't exist
        if (!(key in target) || target[key] === null || typeof target[key] !== 'object') {
          target[key] = {};
        }
        
        target = target[key];
      }
    }
    
    // Set the value at the final path segment
    const lastKey = pathArray[pathArray.length - 1];
    
    // Handle array indexing in the last path segment
    if (lastKey.includes('[') && lastKey.includes(']')) {
      const propName = lastKey.substring(0, lastKey.indexOf('['));
      const indexStr = lastKey.substring(lastKey.indexOf('[') + 1, lastKey.indexOf(']'));
      const index = parseInt(indexStr, 10);
      
      // Create property if it doesn't exist
      if (!(propName in target)) {
        target[propName] = [];
      }
      
      // Create array elements if they don't exist
      while (target[propName].length <= index) {
        target[propName].push(undefined);
      }
      
      target[propName][index] = value;
    } else {
      target[lastKey] = value;
    }
    
    return obj;
  } catch (error) {
    console.error('Error setting value at path:', error);
    return obj;
  }
};

/**
 * Check if an object is empty (has no properties)
 * 
 * @param {Object} obj - The object to check
 * @returns {boolean} Whether the object is empty
 */
export const isEmptyObject = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return true;
  }
  
  return Object.keys(obj).length === 0;
};

/**
 * Convert a file size in bytes to a human-readable string
 * 
 * @param {number} bytes - The file size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Human-readable file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Check if a variable is a promise
 * 
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a promise
 */
export const isPromise = (value) => {
  return value !== null 
    && typeof value === 'object' 
    && typeof value.then === 'function' 
    && typeof value.catch === 'function';
};

/**
 * Join URL paths, handling trailing and leading slashes
 * 
 * @param {...string} paths - URL paths to join
 * @returns {string} Joined URL
 */
export const joinUrlPaths = (...paths) => {
  return paths
    .map(path => String(path).trim())
    .filter(Boolean)
    .map(path => path.replace(/^\/+|\/+$/g, ''))
    .join('/');
};

// Export default object with all functions
export default {
  formatDate,
  toISOString,
  truncateString,
  redactSensitiveInfo,
  safeJsonParse,
  safeJsonStringify,
  objectToQueryString,
  queryStringToObject,
  deepCopy,
  generateId,
  getValueByPath,
  setValueByPath,
  isEmptyObject,
  formatFileSize,
  isPromise,
  joinUrlPaths
};
