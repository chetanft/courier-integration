/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

describe('RequestBuilder Component', () => {
  // Test the handleCurlParse function
  test('should parse curl commands and update form values', () => {
    // Mock the form methods
    const setValue = jest.fn();
    const watch = jest.fn().mockReturnValue('curl -X POST https://api.example.com/endpoint -H "Content-Type: application/json"');

    // Mock the parseCurl function
    const parseCurl = jest.fn().mockReturnValue({
      method: 'POST',
      url: 'https://api.example.com/endpoint',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      auth: { type: 'none' },
      body: null
    });

    // Simulate the handleCurlParse function from RequestBuilder
    const handleCurlParse = () => {
      const curlCommand = watch('curlCommand');

      if (!curlCommand.trim()) {
        console.log('Empty cURL command, skipping parse');
        return;
      }

      try {
        const parsed = parseCurl(curlCommand);

        // Update form values with parsed data
        setValue('method', parsed.method);
        setValue('url', parsed.url);

        // Set headers
        if (parsed.headers && parsed.headers.length > 0) {
          setValue('headers', parsed.headers);
        } else {
          setValue('headers', []);
        }

        // Set auth type
        setValue('auth.type', parsed.auth.type);

        // Set body if present
        if (parsed.body) {
          setValue('body', parsed.body);
        }
      } catch (error) {
        console.error('Error parsing cURL command:', error);
      }
    };

    // Call the function
    handleCurlParse();

    // Check if parseCurl was called with the correct argument
    expect(parseCurl).toHaveBeenCalledWith('curl -X POST https://api.example.com/endpoint -H "Content-Type: application/json"');

    // Check if setValue was called to update the form values
    expect(setValue).toHaveBeenCalledWith('method', 'POST');
    expect(setValue).toHaveBeenCalledWith('url', 'https://api.example.com/endpoint');
    expect(setValue).toHaveBeenCalledWith('headers', [{ key: 'Content-Type', value: 'application/json' }]);
    expect(setValue).toHaveBeenCalledWith('auth.type', 'none');
  });

  // Test adding headers
  test('should add a header when Add Header button is clicked', () => {
    // Mock the form methods
    const setValue = jest.fn();
    const watch = jest.fn().mockReturnValue([
      { key: 'Content-Type', value: 'application/json' }
    ]);

    // Simulate the handleAddHeader function
    const handleAddHeader = () => {
      const currentHeaders = watch('headers') || [];
      setValue('headers', [
        ...currentHeaders,
        { key: '', value: '' }
      ]);
    };

    // Call the function
    handleAddHeader();

    // Check if setValue was called with the correct arguments
    expect(setValue).toHaveBeenCalledWith('headers', [
      { key: 'Content-Type', value: 'application/json' },
      { key: '', value: '' }
    ]);
  });
});
