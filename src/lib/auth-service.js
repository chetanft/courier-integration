/**
 * Authentication Service
 *
 * This service provides centralized authentication functionality for the courier integration platform.
 * It handles token generation, storage, validation, and refresh.
 */

import { getNestedValue, redactSensitiveInfo } from './utils';
import { makeProxyRequest, createErrorResponse } from './api-service-core';
import { ERROR_TYPES, API_INTENTS } from './constants';
import apiService from './api-service';
import { AUTH_ENDPOINTS, AUTH_TYPES, HTTP_METHODS } from './constants';

// In-memory token cache
// Note: This is cleared on page refresh. For persistence, consider using localStorage
// with appropriate security measures or a more robust state management solution.
const tokenCache = new Map();

// Auth token storage - use localStorage in production, for now keeping it simple
const TOKEN_STORAGE_KEY = 'courier_integration_auth_token';
const USER_STORAGE_KEY = 'courier_integration_user';

/**
 * Generate an authentication token
 *
 * @param {Object} authConfig - Authentication configuration
 * @param {string} authConfig.url - Authentication endpoint URL
 * @param {string} authConfig.method - HTTP method (default: POST)
 * @param {Array} authConfig.headers - Request headers
 * @param {Object} authConfig.body - Request body
 * @param {string} authConfig.tokenPath - Path to the token in the response
 * @param {string} authConfig.courier - Courier identifier for caching
 * @returns {Promise<Object>} Authentication result with token and metadata
 */
export const generateAuthToken = async (authConfig) => {
  try {
    // Validate required fields
    if (!authConfig.url) {
      throw new Error('Authentication endpoint URL is required');
    }

    console.log('Generating authentication token...');
    console.log('Auth config:', redactSensitiveInfo(authConfig));

    // Make the authentication request
    const requestConfig = {
      url: authConfig.url,
      method: authConfig.method || 'POST',
      headers: authConfig.headers || [],
      body: authConfig.body || {},
      apiIntent: API_INTENTS.GENERATE_AUTH_TOKEN
    };

    const response = await makeProxyRequest(requestConfig);

    // Check for errors in the response
    if (response.error) {
      console.error('Error generating token:', response);
      throw response;
    }

    // Extract the token using the provided path
    const tokenPath = authConfig.tokenPath || 'access_token';
    const token = getNestedValue(response, tokenPath);

    if (!token) {
      throw new Error(`Token not found in response using path "${tokenPath}"`);
    }

    // Determine token type (JWT or regular bearer token)
    const isJwt = typeof token === 'string' && token.split('.').length === 3;

    // Extract expiration time if it's a JWT
    let expiresAt = null;
    if (isJwt) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000);
        }
      } catch (error) {
        console.warn('Failed to parse JWT payload:', error);
      }
    }

    // Create token metadata
    const tokenMetadata = {
      token,
      type: isJwt ? 'jwt' : 'bearer',
      generatedAt: new Date(),
      expiresAt,
      courier: authConfig.courier
    };

    // Cache the token if courier is provided
    if (authConfig.courier) {
      tokenCache.set(authConfig.courier, tokenMetadata);
    }

    console.log('Token generated successfully');
    return {
      ...tokenMetadata,
      fullResponse: response
    };
  } catch (error) {
    console.error('Error generating authentication token:', error);
    throw createErrorResponse(error, { url: authConfig.url, method: authConfig.method || 'POST' });
  }
};

/**
 * Get a cached token for a courier
 *
 * @param {string} courier - Courier identifier
 * @returns {Object|null} Token metadata or null if not found
 */
export const getCachedToken = (courier) => {
  if (!courier) return null;

  const tokenMetadata = tokenCache.get(courier);
  if (!tokenMetadata) return null;

  // Check if token is expired
  if (tokenMetadata.expiresAt && new Date() > tokenMetadata.expiresAt) {
    console.log(`Token for ${courier} is expired`);
    return null;
  }

  return tokenMetadata;
};

/**
 * Refresh an authentication token
 *
 * @param {Object} authConfig - Authentication configuration
 * @returns {Promise<string>} The refreshed token
 */
export const refreshAuthToken = async (authConfig) => {
  try {
    console.log('Refreshing authentication token...');

    // Validate required fields
    if (!authConfig.jwtAuthEndpoint) {
      throw new Error('Auth endpoint URL is required for token refresh');
    }

    // Make the authentication request
    const requestConfig = {
      url: authConfig.jwtAuthEndpoint,
      method: authConfig.jwtAuthMethod || 'POST',
      headers: authConfig.jwtAuthHeaders || [],
      body: authConfig.jwtAuthBody || {},
      apiIntent: API_INTENTS.GENERATE_AUTH_TOKEN
    };

    const response = await makeProxyRequest(requestConfig);

    // Check for errors in the response
    if (response.error) {
      console.error('Error refreshing token:', response);
      throw response;
    }

    // Extract the token using the provided path
    const tokenPath = authConfig.jwtTokenPath || 'access_token';
    const token = getNestedValue(response, tokenPath);

    if (!token) {
      throw new Error(`Token not found in response using path "${tokenPath}"`);
    }

    // Update the token cache if courier is provided
    if (authConfig.courier) {
      const isJwt = typeof token === 'string' && token.split('.').length === 3;

      // Extract expiration time if it's a JWT
      let expiresAt = null;
      if (isJwt) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp) {
            expiresAt = new Date(payload.exp * 1000);
          }
        } catch (error) {
          console.warn('Failed to parse JWT payload:', error);
        }
      }

      // Update token cache
      tokenCache.set(authConfig.courier, {
        token,
        type: isJwt ? 'jwt' : 'bearer',
        generatedAt: new Date(),
        expiresAt,
        courier: authConfig.courier
      });
    }

    console.log('Token refreshed successfully');
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw createErrorResponse(error, {
      url: authConfig.jwtAuthEndpoint,
      method: authConfig.jwtAuthMethod || 'POST'
    });
  }
};

/**
 * Clear the token cache for a specific courier or all couriers
 *
 * @param {string} [courier] - Courier identifier (if omitted, clears all tokens)
 */
export const clearTokenCache = (courier) => {
  if (courier) {
    tokenCache.delete(courier);
    console.log(`Token cache cleared for ${courier}`);
  } else {
    tokenCache.clear();
    console.log('All token caches cleared');
  }
};

/**
 * Check if a token is valid and not expired
 *
 * @param {string} token - The token to validate
 * @returns {boolean} Whether the token is valid
 */
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // For JWT validation we would use jwt.decode here
    // For this implementation, we just check if the token exists and has a basic structure
    return token.split('.').length === 3; // Very basic JWT structure check
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Get the stored authentication token
 * 
 * @returns {string|null} The stored token or null if not found
 */
export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Error accessing token storage:', error);
    return null;
  }
};

/**
 * Store an authentication token
 * 
 * @param {string} token - The token to store
 * @returns {boolean} Whether the token was stored successfully
 */
export const storeToken = (token) => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

/**
 * Remove the stored authentication token
 * 
 * @returns {boolean} Whether the token was removed successfully
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error removing token:', error);
    return false;
  }
};

/**
 * Get the stored user information
 * 
 * @returns {Object|null} The stored user information or null
 */
export const getStoredUser = () => {
  try {
    const userJson = localStorage.getItem(USER_STORAGE_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error accessing user storage:', error);
    return null;
  }
};

/**
 * Store user information
 * 
 * @param {Object} user - The user information to store
 * @returns {boolean} Whether the user was stored successfully
 */
export const storeUser = (user) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Error storing user:', error);
    return false;
  }
};

/**
 * Remove stored user information
 * 
 * @returns {boolean} Whether the user was removed successfully
 */
export const removeUser = () => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
};

/**
 * Login with credentials
 * 
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {Promise<Object>} The login result
 */
export const login = async (username, password) => {
  try {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    const requestConfig = {
      url: AUTH_ENDPOINTS.LOGIN,
      method: HTTP_METHODS.POST,
      body: { username, password },
      apiIntent: API_INTENTS.USER_LOGIN
    };
    
    const response = await apiService.makeApiRequest(requestConfig);
    
    if (response.error) {
      console.error('Login failed:', response);
      throw new Error(response.message || 'Login failed');
    }
    
    // Extract token and user data
    const { token, user } = response;
    
    if (!token) {
      throw new Error('No token received from server');
    }
    
    // Store token and user data
    storeToken(token);
    storeUser(user);
    
    return {
      success: true,
      token,
      user
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.message || 'Login failed',
      error
    };
  }
};

/**
 * Register a new user
 * 
 * @param {Object} userData - The user data
 * @returns {Promise<Object>} The registration result
 */
export const register = async (userData) => {
  try {
    // Validate required fields
    if (!userData.username || !userData.password || !userData.email) {
      throw new Error('Username, password, and email are required');
    }
    
    const requestConfig = {
      url: AUTH_ENDPOINTS.REGISTER,
      method: HTTP_METHODS.POST,
      body: userData,
      apiIntent: API_INTENTS.USER_REGISTRATION
    };
    
    const response = await apiService.makeApiRequest(requestConfig);
    
    if (response.error) {
      console.error('Registration failed:', response);
      throw new Error(response.message || 'Registration failed');
    }
    
    return {
      success: true,
      message: 'Registration successful',
      user: response.user
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: error.message || 'Registration failed',
      error
    };
  }
};

/**
 * Log out the current user
 * 
 * @returns {Object} The logout result
 */
export const logout = () => {
  try {
    // Clear stored auth data
    removeToken();
    removeUser();
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: error.message || 'Logout failed',
      error
    };
  }
};

/**
 * Check if a user is currently authenticated
 * 
 * @returns {boolean} Whether the user is authenticated
 */
export const isAuthenticated = () => {
  const token = getStoredToken();
  return !!token && isTokenValid(token);
};

/**
 * Get the current authenticated user
 * 
 * @returns {Object|null} The current user or null if not authenticated
 */
export const getCurrentUser = () => {
  if (!isAuthenticated()) {
    return null;
  }
  
  return getStoredUser();
};

/**
 * Refresh the authentication token
 * 
 * @returns {Promise<Object>} The refresh result
 */
export const refreshToken = async () => {
  try {
    const currentToken = getStoredToken();
    
    if (!currentToken) {
      throw new Error('No token to refresh');
    }
    
    const requestConfig = {
      url: AUTH_ENDPOINTS.REFRESH_TOKEN,
      method: HTTP_METHODS.POST,
      body: { token: currentToken },
      apiIntent: API_INTENTS.REFRESH_TOKEN
    };
    
    const response = await apiService.makeApiRequest(requestConfig);
    
    if (response.error) {
      console.error('Token refresh failed:', response);
      throw new Error(response.message || 'Token refresh failed');
    }
    
    // Extract new token
    const { token } = response;
    
    if (!token) {
      throw new Error('No token received from server');
    }
    
    // Store the new token
    storeToken(token);
    
    return {
      success: true,
      token
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // If token refresh fails, log the user out
    logout();
    
    return {
      success: false,
      message: error.message || 'Token refresh failed',
      error
    };
  }
};

/**
 * Check if the current user has a specific permission
 * 
 * @param {string} permission - The permission to check
 * @returns {boolean} Whether the user has the permission
 */
export const hasPermission = (permission) => {
  const user = getCurrentUser();
  
  if (!user || !user.permissions) {
    return false;
  }
  
  return user.permissions.includes(permission);
};

/**
 * Get authentication headers for API requests
 * 
 * @returns {Array} Authorization headers
 */
export const getAuthHeaders = () => {
  const token = getStoredToken();
  
  if (!token) {
    return [];
  }
  
  return [
    {
      key: 'Authorization',
      value: `Bearer ${token}`
    }
  ];
};

/**
 * Update user profile
 * 
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<Object>} The update result
 */
export const updateProfile = async (profileData) => {
  try {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    const requestConfig = {
      url: `${AUTH_ENDPOINTS.USERS}/${currentUser.id}`,
      method: HTTP_METHODS.PUT,
      body: profileData,
      apiIntent: API_INTENTS.UPDATE_PROFILE,
      auth: {
        type: AUTH_TYPES.BEARER,
        token: getStoredToken()
      }
    };
    
    const response = await apiService.makeApiRequest(requestConfig);
    
    if (response.error) {
      console.error('Profile update failed:', response);
      throw new Error(response.message || 'Profile update failed');
    }
    
    // Update stored user data
    const updatedUser = {
      ...currentUser,
      ...response.user
    };
    
    storeUser(updatedUser);
    
    return {
      success: true,
      user: updatedUser
    };
  } catch (error) {
    console.error('Profile update error:', error);
    return {
      success: false,
      message: error.message || 'Profile update failed',
      error
    };
  }
};

// Export default object with all functions
export default {
  login,
  register,
  logout,
  isAuthenticated,
  getCurrentUser,
  refreshToken,
  hasPermission,
  getAuthHeaders,
  updateProfile,
  getStoredToken,
  storeToken,
  removeToken,
  getStoredUser,
  storeUser,
  removeUser,
  isTokenValid
};
