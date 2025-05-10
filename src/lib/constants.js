/**
 * Constants for the Courier Integration Platform
 *
 * This file centralizes constants used throughout the application to avoid duplication
 * and ensure consistency.
 */

// API Proxy Endpoints
export const PROXY_ENDPOINTS = {
  PRIMARY: '/.netlify/functions/db-courier-proxy',
  FALLBACK: '/.netlify/functions/courier-proxy',
  GENERIC: '/.netlify/functions/api-proxy'
};

// Request Defaults
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_RETRIES = 2;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second

// Response Size Limits
export const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB (to stay under Netlify's 6MB limit with buffer)

// Error Types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTHENTICATION_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  RESPONSE_SIZE: 'RESPONSE_SIZE_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Environment Detection
export const IS_DEVELOPMENT =
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1')) ||
  (import.meta && import.meta.env && import.meta.env.DEV === true);

// Common API Intents
export const API_INTENTS = {
  // General API intents
  GENERIC_REQUEST: 'api_request',
  TEST_CONNECTION: 'test_connection',
  
  // Auth-related intents
  GENERATE_AUTH_TOKEN: 'generate_auth_token',
  USER_LOGIN: 'user_login',
  USER_REGISTRATION: 'user_registration',
  REFRESH_TOKEN: 'refresh_token',
  UPDATE_PROFILE: 'update_profile',
  
  // Courier-related intents
  TRACK_SHIPMENT: 'track_shipment',
  GET_SHIPMENTS: 'get_shipments',
  GET_SHIPMENT_DETAILS: 'get_shipment_details',
  CREATE_SHIPMENT: 'create_shipment',
  UPDATE_SHIPMENT: 'update_shipment',
  CANCEL_SHIPMENT: 'cancel_shipment',
  GENERATE_LABEL: 'generate_label',
  GET_TRACKING: 'get_tracking',
  GET_SERVICES: 'get_services',
  GET_RATES: 'get_rates',
  VALIDATE_ADDRESS: 'validate_address',
  
  // Data fetching intents
  FETCH_COURIER_DATA: 'fetch_courier_data',
  FETCH_EPOD: 'fetch_epod'
};

// Field mapping types
export const FIELD_MAPPING_TYPES = {
  RESPONSE: 'response',
  REQUEST: 'request',
  TRACKING: 'tracking',
  EPOD: 'epod',
  SHIPMENT: 'shipment',
  CUSTOM: 'custom'
};

// Default FT fields for tracking
export const DEFAULT_TRACKING_FIELDS = [
  { key: 'trackingNumber', label: 'Tracking Number' },
  { key: 'status', label: 'Status' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  { key: 'estimatedDelivery', label: 'Estimated Delivery' },
  { key: 'actualDelivery', label: 'Actual Delivery' },
  { key: 'events', label: 'Events' }
];

// Default FT fields for EPOD
export const DEFAULT_EPOD_FIELDS = [
  { key: 'trackingNumber', label: 'Tracking Number' },
  { key: 'podDate', label: 'POD Date' },
  { key: 'podTime', label: 'POD Time' },
  { key: 'receiverName', label: 'Receiver Name' },
  { key: 'receiverDesignation', label: 'Receiver Designation' },
  { key: 'podImage', label: 'POD Image URL' }
];

// Common Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain'
};

// Sensitive Header Names (for redaction)
export const SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'api-key',
  'apikey',
  'x-api-token',
  'cookie',
  'token'
];

// Common Data Field Names in API Responses
export const COMMON_DATA_FIELDS = [
  'data',
  'items',
  'results',
  'content',
  'records',
  'couriers'
];

// Pagination Field Names
export const PAGINATION_FIELDS = {
  NEXT_PAGE: 'next_page',
  NEXT_PAGE_URL: 'next_page_url',
  HAS_MORE: 'hasMore',
  HAS_MORE_ALT: 'has_more'
};

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS'
};

// Authentication Types
export const AUTH_TYPES = {
  NONE: 'none',
  BASIC: 'basic',
  BEARER: 'bearer',
  JWT: 'jwt',
  API_KEY: 'api_key'
};

// Database Endpoints
export const DB_ENDPOINTS = {
  COURIERS: 'couriers',
  CLIENTS: 'clients',
  FIELD_MAPPINGS: 'field_mappings',
  COURIER_CLIENTS: 'courier_clients',
  JS_FILES: 'js_files',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings'
};

// Authentication Endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh-token',
  USERS: '/users',
  CHANGE_PASSWORD: '/auth/change-password',
  RESET_PASSWORD: '/auth/reset-password',
  FORGOT_PASSWORD: '/auth/forgot-password'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  CLIENT: 'client',
  GUEST: 'guest'
};

// User Permissions
export const USER_PERMISSIONS = {
  VIEW_COURIERS: 'view:couriers',
  MANAGE_COURIERS: 'manage:couriers',
  VIEW_CLIENTS: 'view:clients',
  MANAGE_CLIENTS: 'manage:clients',
  MANAGE_USERS: 'manage:users',
  VIEW_SETTINGS: 'view:settings',
  MANAGE_SETTINGS: 'manage:settings'
};

// Export all constants as a default object for convenience
export default {
  PROXY_ENDPOINTS,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY,
  MAX_RESPONSE_SIZE,
  ERROR_TYPES,
  IS_DEVELOPMENT,
  API_INTENTS,
  CONTENT_TYPES,
  SENSITIVE_HEADERS,
  COMMON_DATA_FIELDS,
  PAGINATION_FIELDS,
  HTTP_METHODS,
  AUTH_TYPES,
  FIELD_MAPPING_TYPES,
  DEFAULT_TRACKING_FIELDS,
  DEFAULT_EPOD_FIELDS,
  DB_ENDPOINTS,
  AUTH_ENDPOINTS,
  USER_ROLES,
  USER_PERMISSIONS
};
