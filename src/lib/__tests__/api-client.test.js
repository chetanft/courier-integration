/**
 * Unit tests for the centralized API client
 */

import { makeApiRequest, normalizeRequestConfig, applyAuthentication, createErrorResponse } from '../api-client';
import axios from 'axios';

// Mock axios manually instead of using jest.mock
const originalAxios = { ...axios };
beforeAll(() => {
  axios.post = jest.fn();
});

describe('API Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore all mocks after each test
    jest.restoreAllMocks();
  });

  describe('normalizeRequestConfig', () => {
    it('should normalize request config with defaults', () => {
      const config = { url: 'https://api.example.com' };
      const normalized = normalizeRequestConfig(config);

      expect(normalized).toEqual({
        url: 'https://api.example.com',
        method: 'GET',
        headers: [],
        queryParams: [],
        body: {},
        auth: { type: 'none' },
        apiIntent: 'generic_request'
      });
    });

    it('should throw an error if URL is missing', () => {
      const config = {};
      expect(() => normalizeRequestConfig(config)).toThrow('URL is required');
    });

    it('should preserve existing values', () => {
      const config = {
        url: 'https://api.example.com',
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        queryParams: [{ key: 'limit', value: '10' }],
        body: { foo: 'bar' },
        auth: { type: 'basic', username: 'user', password: 'pass' },
        apiIntent: 'custom_intent'
      };

      const normalized = normalizeRequestConfig(config);
      expect(normalized).toEqual(config);
    });
  });

  describe('applyAuthentication', () => {
    it('should add basic auth header if not present', () => {
      const config = {
        url: 'https://api.example.com',
        headers: [],
        auth: {
          type: 'basic',
          username: 'user',
          password: 'pass'
        }
      };

      const result = applyAuthentication(config);
      expect(result.headers).toContainEqual({
        key: 'Authorization',
        value: expect.stringContaining('Basic ')
      });
    });

    it('should add bearer token header if not present', () => {
      const config = {
        url: 'https://api.example.com',
        headers: [],
        auth: {
          type: 'bearer',
          token: 'my-token'
        }
      };

      const result = applyAuthentication(config);
      expect(result.headers).toContainEqual({
        key: 'Authorization',
        value: 'Bearer my-token'
      });
    });

    it('should add API key header if not present', () => {
      const config = {
        url: 'https://api.example.com',
        headers: [],
        auth: {
          type: 'apikey',
          apiKey: 'my-api-key',
          apiKeyName: 'X-API-Key'
        }
      };

      const result = applyAuthentication(config);
      expect(result.headers).toContainEqual({
        key: 'X-API-Key',
        value: 'my-api-key'
      });
    });

    it('should not add auth header if already present', () => {
      const config = {
        url: 'https://api.example.com',
        headers: [
          { key: 'Authorization', value: 'Bearer existing-token' }
        ],
        auth: {
          type: 'bearer',
          token: 'my-token'
        }
      };

      const result = applyAuthentication(config);
      expect(result.headers).toHaveLength(1);
      expect(result.headers[0].value).toBe('Bearer existing-token');
    });
  });

  describe('createErrorResponse', () => {
    it('should create a standardized error response', () => {
      const error = new Error('Test error');
      error.status = 400;
      error.statusText = 'Bad Request';

      const requestConfig = {
        url: 'https://api.example.com',
        method: 'GET',
        apiIntent: 'test_intent',
        auth: {
          type: 'bearer',
          token: 'secret-token'
        }
      };

      const errorResponse = createErrorResponse(error, requestConfig);

      expect(errorResponse).toEqual({
        error: true,
        status: 400,
        statusText: 'Bad Request',
        message: 'Test error',
        timestamp: expect.any(String),
        requestDetails: {
          url: 'https://api.example.com',
          method: 'GET',
          apiIntent: 'test_intent'
        }
      });

      // Ensure sensitive information is redacted
      expect(errorResponse.requestDetails.auth).toBeUndefined();
    });

    it('should include response data details if available', () => {
      const error = new Error('Test error');
      error.response = {
        status: 400,
        statusText: 'Bad Request',
        data: {
          message: 'Invalid request',
          errors: ['Field is required']
        }
      };

      const errorResponse = createErrorResponse(error, {});

      expect(errorResponse.details).toEqual({
        message: 'Invalid request',
        errors: ['Field is required']
      });
    });
  });

  describe('makeApiRequest', () => {
    it('should make a successful API request', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 1, name: 'Test' }
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await makeApiRequest({
        url: 'https://api.example.com',
        method: 'GET'
      });

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        url: 'https://api.example.com',
        method: 'GET'
      }));
    });

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            message: 'Invalid request'
          }
        }
      };

      axios.post.mockRejectedValueOnce(mockError);

      await expect(makeApiRequest({
        url: 'https://api.example.com',
        method: 'GET'
      })).rejects.toEqual(expect.objectContaining({
        error: true,
        status: 400,
        statusText: 'Bad Request',
        message: expect.any(String)
      }));
    });
  });
});
