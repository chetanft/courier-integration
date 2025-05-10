/**
 * Field Extractor Utility
 *
 * This module provides utilities for extracting field paths from API responses,
 * formatting field paths, and getting values by path.
 */

/**
 * Extract all field paths from an API response with optimizations for large responses
 * @param {Object} obj - The API response object
 * @param {string} prefix - The current path prefix
 * @param {Set} paths - Set to store unique paths
 * @param {Object} options - Options for extraction
 * @param {number} options.maxDepth - Maximum depth to traverse (default: 10)
 * @param {number} options.maxArrayItems - Maximum number of array items to sample (default: 1)
 * @param {number} options.maxPaths - Maximum number of paths to extract (default: 1000)
 * @param {Set} options.visited - Set of visited objects to prevent circular references
 * @returns {Array} Array of field paths
 */
export const extractFieldPaths = (
  obj,
  prefix = '',
  paths = new Set(),
  options = {
    maxDepth: 10,
    maxArrayItems: 1,
    maxPaths: 1000,
    visited: new Set()
  }
) => {
  // Check if we've reached the maximum number of paths
  if (paths.size >= options.maxDepth) {
    return Array.from(paths);
  }

  // Handle null, undefined, or non-object values
  if (obj === null || obj === undefined) {
    return Array.from(paths);
  }

  if (typeof obj !== 'object') {
    paths.add(prefix);
    return Array.from(paths);
  }

  // Check for circular references
  if (options.visited.has(obj)) {
    return Array.from(paths);
  }

  // Add object to visited set
  options.visited.add(obj);

  // Check if we've reached the maximum depth
  const currentDepth = prefix.split('.').length;
  if (currentDepth >= options.maxDepth) {
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

    // For arrays, we'll sample a few items to extract field paths
    // This assumes items in the array have similar structure
    const sampleSize = Math.min(options.maxArrayItems, obj.length);

    for (let i = 0; i < sampleSize; i++) {
      const item = obj[i];

      // If the item is an object, extract its fields
      if (item && typeof item === 'object') {
        extractFieldPaths(
          item,
          prefix ? `${prefix}[${i}]` : `[${i}]`,
          paths,
          {
            ...options,
            maxDepth: options.maxDepth - 1
          }
        );
      } else {
        // If it's a primitive, add the array path
        paths.add(prefix);
        break; // No need to check more items if they're primitives
      }

      // Check if we've reached the maximum number of paths
      if (paths.size >= options.maxPaths) {
        break;
      }
    }

    return Array.from(paths);
  }

  // Handle error responses
  if (obj.error === true && obj.details) {
    // If this is an error response, try to extract fields from the details
    if (typeof obj.details === 'object') {
      extractFieldPaths(
        obj.details,
        prefix ? `${prefix}.details` : 'details',
        paths,
        {
          ...options,
          maxDepth: options.maxDepth - 1
        }
      );
    }
  }

  // Handle objects
  const keys = Object.keys(obj);

  // If there are too many keys, sample a subset
  const keysToProcess = keys.length > 100 ? keys.slice(0, 100) : keys;

  for (const key of keysToProcess) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newPrefix = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        paths.add(newPrefix);
      } else if (typeof value !== 'object') {
        paths.add(newPrefix);
      } else {
        // Recursively extract paths from nested objects
        extractFieldPaths(
          value,
          newPrefix,
          paths,
          {
            ...options,
            maxDepth: options.maxDepth - 1
          }
        );
      }

      // Check if we've reached the maximum number of paths
      if (paths.size >= options.maxPaths) {
        break;
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
