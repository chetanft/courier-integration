/**
 * Extracts all possible field paths from a JSON object
 * @param {Object} obj - The JSON object to extract paths from
 * @returns {Array} Array of field paths
 */
export const extractFieldPaths = (obj, prefix = '', result = [], visited = new Set()) => {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) {
    return result;
  }

  visited.add(obj);

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      extractFieldPaths(obj[0], `${prefix}[]`, result, visited);
      if (prefix) result.push(prefix);
    } else if (prefix) {
      result.push(`${prefix}[]`);
    }
    return result;
  }

  Object.keys(obj).forEach(key => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    result.push(newPrefix);

    if (obj[key] && typeof obj[key] === 'object') {
      extractFieldPaths(obj[key], newPrefix, result, visited);
    }
  });

  return Array.from(new Set(result)).sort();
};

/**
 * Formats a field path for display
 * @param {string} path - The field path
 * @returns {string} Formatted path for display
 */
export const formatFieldPath = (path) => {
  return path.replace(/\[\]/g, '[0]');
};
