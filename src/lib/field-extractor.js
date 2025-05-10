/**
 * Field Extractor Utility
 *
 * This module provides utilities for extracting field paths from API responses,
 * formatting field paths, and getting values by path.
 */

/**
 * Extract all field paths from an API response
 * @param {Object} obj - The API response object
 * @param {string} prefix - The current path prefix
 * @param {Set} paths - Set to store unique paths
 * @returns {Array} Array of field paths
 */
export const extractFieldPaths = (obj, prefix = '', paths = new Set()) => {
  // Handle null, undefined, or non-object values
  if (obj === null || obj === undefined) {
    return Array.from(paths);
  }

  if (typeof obj !== 'object') {
    paths.add(prefix);
    return Array.from(paths);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    // Add the array itself as a path
    if (prefix) {
      paths.add(prefix);
    }

    // If it's an empty array, just return
    if (obj.length === 0) {
      return Array.from(paths);
    }

    // For arrays, we'll look at the first item to extract field paths
    // This assumes all items in the array have the same structure
    const firstItem = obj[0];

    // If the first item is an object, extract its fields
    if (firstItem && typeof firstItem === 'object') {
      extractFieldPaths(firstItem, prefix ? `${prefix}[0]` : '[0]', paths);
    } else {
      // If it's a primitive, add the array path
      paths.add(prefix);
    }

    return Array.from(paths);
  }

  // Handle error responses
  if (obj.error === true && obj.details) {
    // If this is an error response, try to extract fields from the details
    if (typeof obj.details === 'object') {
      extractFieldPaths(obj.details, prefix ? `${prefix}.details` : 'details', paths);
    }
  }

  // Handle objects
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newPrefix = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        paths.add(newPrefix);
      } else if (typeof value !== 'object') {
        paths.add(newPrefix);
      } else {
        // Recursively extract paths from nested objects
        extractFieldPaths(value, newPrefix, paths);
      }
    }
  }

  return Array.from(paths).sort();
};

/**
 * Format a field path for display
 * @param {string} path - The field path
 * @returns {string} Formatted field path
 */
export const formatFieldPath = (path) => {
  if (!path) return '';

  // Replace array notation with more readable format
  return path.replace(/\[(\d+)\]/g, '[$1]');
};

/**
 * Get a value from an object using a field path
 * @param {Object} obj - The object to extract from
 * @param {string} path - The field path
 * @returns {*} The extracted value
 */
export const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // Handle array notation (e.g., "items[0]")
    const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);

    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);

      if (!current[arrayName] || !Array.isArray(current[arrayName])) {
        return undefined;
      }

      if (index >= current[arrayName].length) {
        return undefined;
      }

      current = current[arrayName][index];
    } else {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }

      current = current[part];
    }
  }

  return current;
};

/**
 * Extract a subset of fields from an object
 * @param {Object} obj - The object to extract from
 * @param {Array} fieldPaths - Array of field paths to extract
 * @returns {Object} Object with only the specified fields
 */
export const extractFields = (obj, fieldPaths) => {
  if (!obj || !fieldPaths || !Array.isArray(fieldPaths)) {
    return obj;
  }

  const result = {};

  for (const path of fieldPaths) {
    const value = getValueByPath(obj, path);

    if (value !== undefined) {
      // Create nested structure based on the field path
      const parts = path.split('.');
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];

        // Handle array notation
        const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);

        if (arrayMatch) {
          const [, arrayName, indexStr] = arrayMatch;
          const index = parseInt(indexStr, 10);

          if (!current[arrayName]) {
            current[arrayName] = [];
          }

          if (!current[arrayName][index]) {
            current[arrayName][index] = {};
          }

          current = current[arrayName][index];
        } else {
          if (!current[part]) {
            current[part] = {};
          }

          current = current[part];
        }
      }

      // Set the value at the final path part
      const lastPart = parts[parts.length - 1];

      // Handle array notation in the last part
      const arrayMatch = lastPart.match(/^([^[]+)\[(\d+)\]$/);

      if (arrayMatch) {
        const [, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);

        if (!current[arrayName]) {
          current[arrayName] = [];
        }

        current[arrayName][index] = value;
      } else {
        current[lastPart] = value;
      }
    }
  }

  return result;
};
