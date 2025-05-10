/**
 * Unit tests for the enhanced cURL parser
 */

import { parseCurl, validateCurlParse, toCurl } from '../enhanced-curl-parser';

describe('Enhanced cURL Parser', () => {
  describe('parseCurl', () => {
    it('should parse a simple GET request', () => {
      const curlCommand = 'curl https://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed).toEqual({
        method: 'GET',
        url: 'https://api.example.com/endpoint',
        headers: [],
        body: null,
        queryParams: [],
        auth: {
          type: 'none',
          username: '',
          password: '',
          token: ''
        }
      });
    });

    it('should parse a request with method', () => {
      const curlCommand = 'curl -X POST https://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed.method).toBe('POST');
      expect(parsed.url).toBe('https://api.example.com/endpoint');
    });

    it('should parse a request with headers', () => {
      const curlCommand = 'curl -H "Content-Type: application/json" -H "Accept: application/json" https://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed.headers).toEqual([
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Accept', value: 'application/json' }
      ]);
    });

    it('should parse a request with JSON body', () => {
      const curlCommand = 'curl -X POST -d \'{"name":"test","value":123}\' https://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed.method).toBe('POST');
      expect(parsed.body).toEqual({ name: 'test', value: 123 });
    });

    it('should parse a request with basic auth', () => {
      const curlCommand = 'curl -u "username:password" https://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed.auth).toEqual({
        type: 'basic',
        username: 'username',
        password: 'password',
        token: ''
      });
    });

    it('should parse a request with bearer token', () => {
      const curlCommand = 'curl -H "Authorization: Bearer my-token" https://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed.auth).toEqual({
        type: 'bearer',
        username: '',
        password: '',
        token: 'my-token'
      });
    });

    it('should parse a request with JWT token', () => {
      const curlCommand = 'curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" https://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed.auth.type).toBe('jwt');
      expect(parsed.auth.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    });

    it('should parse a request with query parameters', () => {
      const curlCommand = 'curl "https://api.example.com/endpoint?param1=value1&param2=value2"';
      const parsed = parseCurl(curlCommand);

      expect(parsed.url).toBe('https://api.example.com/endpoint?param1=value1&param2=value2');
      expect(parsed.queryParams).toEqual([
        { key: 'param1', value: 'value1' },
        { key: 'param2', value: 'value2' }
      ]);
    });

    it('should handle line continuations', () => {
      const curlCommand = 'curl -X POST \\\n-H "Content-Type: application/json" \\\nhttps://api.example.com/endpoint';
      const parsed = parseCurl(curlCommand);

      expect(parsed.method).toBe('POST');
      expect(parsed.headers).toEqual([
        { key: 'Content-Type', value: 'application/json' }
      ]);
      expect(parsed.url).toBe('https://api.example.com/endpoint');
    });

    it('should throw an error for invalid cURL commands', () => {
      expect(() => parseCurl('')).toThrow();
      expect(() => parseCurl('invalid command')).toThrow();
    });
  });

  describe('validateCurlParse', () => {
    it('should validate a complete parsed result', () => {
      const parsed = {
        url: 'https://api.example.com',
        method: 'GET',
        auth: { type: 'none' }
      };

      const validation = validateCurlParse(parsed);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should report missing URL', () => {
      const parsed = {
        method: 'GET',
        auth: { type: 'none' }
      };

      const validation = validateCurlParse(parsed);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Missing URL');
    });

    it('should report missing method', () => {
      const parsed = {
        url: 'https://api.example.com',
        auth: { type: 'none' }
      };

      const validation = validateCurlParse(parsed);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Missing HTTP method');
    });

    it('should report incomplete basic auth', () => {
      const parsed = {
        url: 'https://api.example.com',
        method: 'GET',
        auth: { type: 'basic', username: '', password: '' }
      };

      const validation = validateCurlParse(parsed);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Incomplete Basic auth credentials');
    });

    it('should report missing token for bearer auth', () => {
      const parsed = {
        url: 'https://api.example.com',
        method: 'GET',
        auth: { type: 'bearer', token: '' }
      };

      const validation = validateCurlParse(parsed);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Missing token for Bearer/JWT auth');
    });
  });

  describe('toCurl', () => {
    it('should convert a request object to a cURL command', () => {
      const request = {
        url: 'https://api.example.com/endpoint',
        method: 'POST',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Accept', value: 'application/json' }
        ],
        body: { name: 'test', value: 123 }
      };

      const curlCommand = toCurl(request);
      expect(curlCommand).toContain('curl -X POST "https://api.example.com/endpoint"');
      expect(curlCommand).toContain('-H "Content-Type: application/json"');
      expect(curlCommand).toContain('-H "Accept: application/json"');
      expect(curlCommand).toContain('-d \'{"name":"test","value":123}\'');
    });

    it('should handle basic auth', () => {
      const request = {
        url: 'https://api.example.com/endpoint',
        method: 'GET',
        auth: {
          type: 'basic',
          username: 'user',
          password: 'pass'
        }
      };

      const curlCommand = toCurl(request);
      expect(curlCommand).toContain('-u "user:pass"');
    });

    it('should handle bearer token', () => {
      const request = {
        url: 'https://api.example.com/endpoint',
        method: 'GET',
        auth: {
          type: 'bearer',
          token: 'my-token'
        }
      };

      const curlCommand = toCurl(request);
      expect(curlCommand).toContain('-H "Authorization: Bearer my-token"');
    });

    it('should handle missing values', () => {
      const request = {};
      const curlCommand = toCurl(request);
      expect(curlCommand).toBe('curl');
    });
  });
});
