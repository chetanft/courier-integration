/**
 * Extracts all possible field paths from a JSON object
 * @param {Object} obj - The JSON object to extract paths from
 * @returns {Array} Array of field paths
 */
export const extractFieldPaths = (obj, prefix = '', result = [], visited = new Set()) => {
  console.log('Extracting field paths from:', obj);

  // Handle null, undefined, or non-object values
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    console.log('Object is null, undefined, or not an object');
    return result;
  }

  // Handle circular references
  if (visited.has(obj)) {
    console.log('Circular reference detected');
    return result;
  }

  visited.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    console.log('Processing array:', prefix);
    if (obj.length > 0) {
      // Process the first item in the array as an example
      extractFieldPaths(obj[0], `${prefix}[]`, result, visited);

      // Also add the array itself as a field
      if (prefix) result.push(prefix);
    } else if (prefix) {
      // Empty array
      result.push(`${prefix}[]`);
    }
    return result;
  }

  // Handle error responses
  if (obj.error === true && obj.details) {
    console.log('Processing error response');
    // If this is an error response, try to extract fields from the details
    if (typeof obj.details === 'object') {
      extractFieldPaths(obj.details, 'details', result, visited);
    }
  }

  // Process regular objects
  Object.keys(obj).forEach(key => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    result.push(newPrefix);

    if (obj[key] && typeof obj[key] === 'object') {
      extractFieldPaths(obj[key], newPrefix, result, visited);
    }
  });

  // Remove duplicates and sort
  const uniqueResults = Array.from(new Set(result)).sort();
  console.log('Extracted field paths:', uniqueResults);
  return uniqueResults;
};

/**
 * Formats a field path for display
 * @param {string} path - The field path
 * @returns {string} Formatted path for display
 */
export const formatFieldPath = (path) => {
  return path.replace(/\[\]/g, '[0]');
};
