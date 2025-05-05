/**
 * Utility functions for the courier integration platform
 */
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge class names with tailwind-merge
 * @param  {...any} inputs - Class names to merge
 * @returns {string} Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a readable format
 * @param {string|number} date - Date string or timestamp
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';

  const dateObj = new Date(date);
  return dateObj.toLocaleString();
};

/**
 * Truncate a string to a specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
export const truncateString = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;

  return `${str.substring(0, length)}...`;
};

/**
 * Convert an object to a downloadable file
 * @param {Object} data - Data to convert
 * @param {string} filename - Name of the file
 * @param {string} type - MIME type
 */
export const downloadObjectAsFile = (data, filename, type = 'text/javascript') => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Validate if a URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if an object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} Whether the object is empty
 */
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};
