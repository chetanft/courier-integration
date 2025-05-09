/**
 * @jest-environment jsdom
 */

describe('API URL Handling', () => {
  // Test URL normalization
  test('should normalize URLs without protocol', () => {
    // Function to normalize URLs
    const normalizeUrl = (url) => {
      if (!url) return '';

      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
      }

      return url;
    };

    // Test cases
    expect(normalizeUrl('api.example.com')).toBe('https://api.example.com');
    expect(normalizeUrl('https://api.example.com')).toBe('https://api.example.com');
    expect(normalizeUrl('http://api.example.com')).toBe('http://api.example.com');
  });

  // Test query parameter handling
  test('should properly append query parameters to URL', () => {
    // Function to append query parameters
    const appendQueryParams = (url, queryParams) => {
      if (!url || !queryParams || !Array.isArray(queryParams) || queryParams.length === 0) {
        return url;
      }

      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);

      // Add query parameters
      queryParams.forEach(param => {
        if (param.key && param.value !== undefined) {
          urlObj.searchParams.append(param.key, param.value);
        }
      });

      return urlObj.toString();
    };

    // Test with a URL without existing query parameters
    const url1 = 'https://api.example.com/endpoint';
    const queryParams1 = [
      { key: 'param1', value: 'value1' },
      { key: 'param2', value: 'value2' }
    ];

    expect(appendQueryParams(url1, queryParams1))
      .toBe('https://api.example.com/endpoint?param1=value1&param2=value2');

    // Test with a URL that already has query parameters
    const url2 = 'https://api.example.com/endpoint?existing=param';
    const queryParams2 = [
      { key: 'param1', value: 'value1' }
    ];

    expect(appendQueryParams(url2, queryParams2))
      .toBe('https://api.example.com/endpoint?existing=param&param1=value1');

    // Test with special characters
    const url3 = 'https://api.example.com/endpoint';
    const queryParams3 = [
      { key: 'param with spaces', value: 'value with spaces' }
    ];

    // Note: URL encoding can use either %20 or + for spaces, both are valid
    const result = appendQueryParams(url3, queryParams3);
    expect(result).toMatch(/param(\+|%20)with(\+|%20)spaces=value(\+|%20)with(\+|%20)spaces/);
  });
});
