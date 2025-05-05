/**
 * Extracts all possible field paths from a JSON object
 * @param {Object} obj - The JSON object to extract paths from
 * @param {string} prefix - The current path prefix (used in recursion)
 * @param {Array} result - Array to store the paths (used in recursion)
 * @param {Set} visited - Set to track visited objects to prevent circular references
 * @returns {Array} Array of field paths
 */
export const extractFieldPaths = (obj, prefix = '', result = [], visited = new Set()) => {
  // Handle null, undefined, or primitive values
  if (!obj || typeof obj !== 'object') {
    return result;
  }

  // Prevent circular references
  if (visited.has(obj)) {
    return result;
  }
  visited.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      // If array has elements, extract paths from the first element with array notation
      extractFieldPaths(obj[0], `${prefix}[]`, result, visited);

      // Also add the array itself as a path
      if (prefix) {
        result.push(prefix);
      }
    } else {
      // Empty array, just add the path
      if (prefix) {
        result.push(`${prefix}[]`);
      }
    }
    return result;
  }

  // Handle objects
  Object.keys(obj).forEach(key => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;

    // Add the current path
    result.push(newPrefix);

    // Recursively process nested objects/arrays
    if (obj[key] && typeof obj[key] === 'object') {
      extractFieldPaths(obj[key], newPrefix, result, visited);
    }
  });

  // Sort and deduplicate the result
  return Array.from(new Set(result)).sort((a, b) => {
    // Sort by depth (number of dots) first
    const depthA = (a.match(/\./g) || []).length;
    const depthB = (b.match(/\./g) || []).length;

    if (depthA !== depthB) {
      return depthA - depthB;
    }

    // Then sort alphabetically
    return a.localeCompare(b);
  });
};

/**
 * Gets the value at a specific path in a JSON object
 * @param {Object} obj - The JSON object
 * @param {string} path - The path to extract (e.g., "shipment.result", "shipment.tracking[].date")
 * @returns {any} The value at the specified path
 */
export const getValueAtPath = (obj, path) => {
  if (!path) return obj;

  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Handle array notation (e.g., "tracking[]")
    if (part.endsWith('[]')) {
      const arrayKey = part.slice(0, -2);
      if (!current[arrayKey] || !Array.isArray(current[arrayKey])) {
        return undefined;
      }

      // If this is the last part, return the array
      if (i === parts.length - 1) {
        return current[arrayKey];
      }

      // Otherwise, we need to map over the array for the remaining path
      const remainingPath = parts.slice(i + 1).join('.');
      return current[arrayKey].map(item => getValueAtPath(item, remainingPath));
    }

    // Regular object property
    if (current[part] === undefined) {
      return undefined;
    }

    current = current[part];
  }

  return current;
};

/**
 * Formats a field path for display
 * @param {string} path - The field path
 * @returns {string} Formatted path for display
 */
export const formatFieldPath = (path) => {
  return path.replace(/\[\]/g, '[0]');
};
