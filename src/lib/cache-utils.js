/**
 * Cache Utilities
 * 
 * This module provides utilities for caching expensive operations.
 */

/**
 * A simple in-memory cache with LRU (Least Recently Used) eviction policy
 */
class LRUCache {
  /**
   * Create a new LRU cache
   * @param {number} capacity - Maximum number of items to store in the cache
   */
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {*} The cached value, or undefined if not found
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Get the value
    const value = this.cache.get(key);

    // Move the key to the end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * Set a value in the cache
   * @param {string} key - The cache key
   * @param {*} value - The value to cache
   */
  set(key, value) {
    // If the key already exists, delete it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // If the cache is at capacity, delete the least recently used item
    else if (this.cache.size >= this.capacity) {
      // Delete the first item (least recently used)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Add the new key-value pair
    this.cache.set(key, value);
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if the key exists, false otherwise
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete a key from the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if the key was deleted, false otherwise
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get the number of items in the cache
   * @returns {number} The number of items in the cache
   */
  get size() {
    return this.cache.size;
  }
}

// Create a global cache instance
const globalCache = new LRUCache(100);

/**
 * Memoize a function with caching
 * @param {Function} fn - The function to memoize
 * @param {Function} keyFn - Function to generate a cache key from the arguments
 * @param {LRUCache} cache - The cache to use (defaults to global cache)
 * @returns {Function} The memoized function
 */
export const memoize = (fn, keyFn = JSON.stringify, cache = globalCache) => {
  return function(...args) {
    const key = keyFn(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Create a cache key from a request configuration
 * @param {Object} config - The request configuration
 * @returns {string} The cache key
 */
export const createRequestCacheKey = (config) => {
  // Extract the parts of the config that should be part of the cache key
  const { url, method, apiIntent } = config;
  
  // Create a simplified version of the config for the cache key
  const keyParts = {
    url,
    method: method || 'GET',
    apiIntent: apiIntent || 'generic_request'
  };
  
  // Add query parameters if present
  if (config.queryParams && config.queryParams.length > 0) {
    keyParts.queryParams = config.queryParams;
  }
  
  // Add body if present for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(keyParts.method) && config.body) {
    keyParts.body = config.body;
  }
  
  // Generate a string key
  return JSON.stringify(keyParts);
};

/**
 * Cache for API responses
 */
export const apiResponseCache = new LRUCache(50);

/**
 * Cache for field paths
 */
export const fieldPathsCache = new LRUCache(50);

/**
 * Memoized version of extractFieldPaths
 * @param {Function} extractFieldPathsFn - The extractFieldPaths function to memoize
 * @returns {Function} The memoized function
 */
export const createMemoizedFieldPathsExtractor = (extractFieldPathsFn) => {
  return memoize(
    extractFieldPathsFn,
    (obj) => {
      // Create a cache key based on a hash of the object
      // For large objects, we'll use a sample of the object
      if (typeof obj !== 'object' || obj === null) {
        return String(obj);
      }
      
      // For arrays, use the length and a sample of items
      if (Array.isArray(obj)) {
        const sample = obj.length > 10 ? obj.slice(0, 10) : obj;
        return `array:${obj.length}:${JSON.stringify(sample)}`;
      }
      
      // For objects, use the keys and a sample of values
      const keys = Object.keys(obj).sort();
      const keyCount = keys.length;
      const keySample = keys.length > 10 ? keys.slice(0, 10) : keys;
      
      // Create a sample of values
      const valueSample = {};
      keySample.forEach(key => {
        const value = obj[key];
        if (typeof value !== 'object' || value === null) {
          valueSample[key] = value;
        } else {
          valueSample[key] = typeof value;
        }
      });
      
      return `object:${keyCount}:${JSON.stringify(valueSample)}`;
    },
    fieldPathsCache
  );
};

export default {
  LRUCache,
  memoize,
  createRequestCacheKey,
  apiResponseCache,
  fieldPathsCache,
  createMemoizedFieldPathsExtractor
};
