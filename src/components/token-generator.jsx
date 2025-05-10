import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { KeyValueEditor } from './ui/key-value-editor';
import { JsonEditor } from './ui/json-editor';
import { useToast } from './ui/use-toast';
import CopyButton from './ui/copy-button';
import axios from 'axios';
import _ from 'lodash';
import { parseCurl } from '../lib/curl-parser';

const TokenGenerator = ({ formMethods, onTokenGenerated }) => {
  const { watch, setValue } = formMethods;
  const [loading, setLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [curlDetected, setCurlDetected] = useState(false);
  const { addToast } = useToast();

  // Watch auth configuration values
  const authEndpoint = watch('auth.jwtAuthEndpoint') || '';
  const authMethod = watch('auth.jwtAuthMethod') || 'POST';
  const authHeaders = watch('auth.jwtAuthHeaders') || [];
  const authBody = watch('auth.jwtAuthBody') || {};
  const tokenPath = watch('auth.jwtTokenPath') || 'access_token';

  // State to track if a curl command was detected
  // (We keep this minimal state to show a simple notification)

  // Helper function to try alternative HTTP methods when a 405 error occurs
  const tryAlternativeMethod = async (endpoint, currentMethod, headers, body, apiIntent) => {
    // Define alternative methods to try
    const methodsToTry = ['GET', 'POST', 'PUT'].filter(m => m !== currentMethod);

    for (const method of methodsToTry) {
      try {
        console.log(`Trying alternative method ${method} after 405 error`);

        // Create a request to the proxy with the alternative method
        const response = await axios.post(endpoint, {
          url: authEndpoint,
          method: method,
          headers: headers,
          body: body,
          apiIntent: apiIntent
        });

        // If successful, update the form with the working method
        if (response.status >= 200 && response.status < 300) {
          setValue('auth.jwtAuthMethod', method);
          addToast(`Success! ${method} method works for this endpoint.`, 'success');
          return response;
        }
      } catch (error) {
        console.error(`Alternative method ${method} also failed:`, error);
        // Continue to the next method
      }
    }

    // If all alternatives failed, return null
    return null;
  };

  // We're now using the imported parseCurl function from curl-parser.js
  // This is a wrapper to handle errors and provide consistent interface
  const parseCurlCommand = (curlCommand) => {
    try {
      console.log('Parsing curl command using curl-parser library:', curlCommand);

      // Use the imported parseCurl function
      const parsed = parseCurl(curlCommand);

      // Log the parsed result for debugging
      console.log('Parsed curl result:', parsed);

      // Extract the relevant parts we need
      const { url, method, headers, body, auth } = parsed;

      // Check if we have a JWT token in the auth object
      if (auth && auth.type === 'jwt' && auth.token) {
        console.log('JWT token found in curl command:', auth.token);
      }

      // If the URL contains 'oauth' or 'token', suggest using the token path
      if (url && (url.includes('oauth') || url.includes('token'))) {
        // Check if we have a token path set
        if (!watch('auth.jwtTokenPath')) {
          setValue('auth.jwtTokenPath', 'access_token');
          addToast('Set token path to "access_token" based on URL', 'info');
        }
      }

      return { url, method, headers, body, auth };
    } catch (error) {
      console.error('Error parsing curl command:', error);
      setTokenError(`Failed to parse curl command: ${error.message}`);
      return null;
    }
  };

  // Handle auth endpoint input change - detect and parse curl commands
  const handleAuthEndpointChange = (value) => {
    setValue('auth.jwtAuthEndpoint', value);

    // Check if this looks like a curl command
    if (value.trim().toLowerCase().startsWith('curl ')) {
      setCurlDetected(true);

      console.log('Detected curl command, parsing...');
      const parsedCurl = parseCurlCommand(value);

      if (parsedCurl && parsedCurl.url) {
        console.log('Parsed curl results:', parsedCurl);

        // Auto-fill the form with the parsed curl data
        setValue('auth.jwtAuthEndpoint', parsedCurl.url);
        setValue('auth.jwtAuthMethod', parsedCurl.method);

        // Check if headers were found
        if (parsedCurl.headers && parsedCurl.headers.length > 0) {
          console.log('Setting headers:', parsedCurl.headers);
          setValue('auth.jwtAuthHeaders', parsedCurl.headers);
          addToast(`Found ${parsedCurl.headers.length} headers`, 'success');
        } else {
          console.log('No headers found in curl command');
        }

        // Check if body was found
        if (parsedCurl.body && Object.keys(parsedCurl.body).length > 0) {
          console.log('Setting body:', parsedCurl.body);
          setValue('auth.jwtAuthBody', parsedCurl.body);
          addToast(`Request body data extracted successfully`, 'success');
        } else {
          console.log('No body found in curl command');
        }

        // Check if JWT token was found in the auth object
        if (parsedCurl.auth && (parsedCurl.auth.type === 'jwt' || parsedCurl.auth.type === 'bearer') && parsedCurl.auth.token) {
          console.log('Setting token from curl auth:', parsedCurl.auth.token);
          setValue('auth.token', parsedCurl.auth.token);

          // If it's a JWT token, we can set it directly
          if (parsedCurl.auth.type === 'jwt') {
            addToast('JWT token extracted from curl command', 'success');

            // Notify parent component about token generation
            onTokenGenerated && onTokenGenerated(parsedCurl.auth.token);

            // Set token result for display
            setTokenResult({
              token: parsedCurl.auth.token,
              fullResponse: { _source: 'curl_command', token: parsedCurl.auth.token }
            });
          } else {
            addToast('Bearer token extracted from curl command', 'success');
          }
        }

        addToast('Curl command parsed successfully', 'success');
      } else {
        console.error('Failed to parse curl command or extract URL');
        addToast('Could not parse curl command correctly', 'error');
      }
    } else {
      setCurlDetected(false);
    }
  };

  const generateToken = async () => {
    try {
      setLoading(true);
      setTokenError(null);

      // Validate required fields
      if (!authEndpoint) {
        setTokenError('Auth endpoint URL is required');
        addToast('Auth endpoint URL is required', 'error');
        setLoading(false);
        return;
      }

      // Check if URL is valid
      try {
        new URL(authEndpoint);
      } catch {
        // URL is invalid
        setTokenError('Invalid URL format. Please enter a valid URL.');
        addToast('Invalid URL format. Please enter a valid URL.', 'error');
        setLoading(false);
        return;
      }

      console.log("Making token request with:", {
        url: authEndpoint,
        method: authMethod,
        headers: authHeaders,
        bodySize: Object.keys(authBody).length
      });

      // Define possible proxy endpoints to try
      const proxyEndpoints = [
        '/.netlify/functions/db-courier-proxy',  // Primary endpoint
        '/.netlify/functions/courier-proxy',     // Fallback endpoint
        '/.netlify/functions/api-proxy'          // Another fallback
      ];

      let lastError = null;
      let response = null;

      // Log the API we're calling
      console.log(`Making token request to: ${authEndpoint}`);

      // Try each endpoint until one works
      for (const endpoint of proxyEndpoints) {
        try {
          console.log(`Attempting to use proxy endpoint: ${endpoint}`);

          // Create a request to the proxy
          response = await axios.post(endpoint, {
            url: authEndpoint,
            method: authMethod,
            headers: authHeaders,
            body: authBody,
            apiIntent: 'generate_auth_token'
          });

          console.log(`Success with endpoint ${endpoint}:`, response.status);
          // If we got here, the request succeeded
          break;
        } catch (error) {
          console.error(`Error with endpoint ${endpoint}:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });

          // Check if this is a 405 Method Not Allowed error
          if (error.response?.status === 405) {
            console.log('Received 405 Method Not Allowed error, trying alternative methods');

            // Try alternative methods
            const alternativeResponse = await tryAlternativeMethod(
              endpoint,
              authMethod,
              authHeaders,
              authBody,
              'generate_auth_token'
            );

            if (alternativeResponse) {
              response = alternativeResponse;
              console.log('Alternative method succeeded:', response.status);
              break;
            }
          }

          lastError = error;
          // Continue to the next endpoint
        }
      }

      // If we still don't have a response after trying all proxies
      if (!response) {
        throw new Error(lastError ? 
          `API request failed: ${lastError?.message || 'Unknown error'}` : 
          'API request failed across all proxy endpoints'
        );
      }

      // Process the response
      if (response.data.error) {
        console.error("Error in response data:", response.data);
        throw new Error(response.data.message || 'Failed to generate token');
      }

      // Extract the token using the provided path
      let token = null;
      try {
        if (tokenPath) {
          // Normalize the token path - remove leading/trailing dots and spaces
          const normalizedPath = tokenPath.trim().replace(/^\.+|\.+$/g, '');
          token = _.get(response.data, normalizedPath);
          
          // If token not found with the exact path, try some common variations
          if (!token) {
            const commonPaths = [
              'access_token',
              'accessToken',
              'token',
              'data.token',
              'data.access_token',
              'auth.token',
              'jwt',
              'response.token'
            ];
            
            // Try each common path
            for (const path of commonPaths) {
              const potentialToken = _.get(response.data, path);
              if (potentialToken && typeof potentialToken === 'string') {
                token = potentialToken;
                // Update the token path in the form
                setValue('auth.jwtTokenPath', path);
                addToast(`Found token at path: ${path}`, 'info');
                break;
              }
            }
          }
        } else {
          // If no token path provided, use the entire response or try to find token in common paths
          if (typeof response.data === 'string') {
            token = response.data;
          } else {
            // Try common token paths
            const commonPaths = [
              'access_token',
              'accessToken',
              'token',
              'data.token',
              'data.access_token',
              'auth.token',
              'jwt',
              'response.token'
            ];
            
            for (const path of commonPaths) {
              const potentialToken = _.get(response.data, path);
              if (potentialToken && typeof potentialToken === 'string') {
                token = potentialToken;
                // Update the token path in the form
                setValue('auth.jwtTokenPath', path);
                addToast(`Found token at path: ${path}`, 'info');
                break;
              }
            }
          }
        }

        if (!token) {
          // If we still couldn't find a token, throw a clear error
          throw new Error(`Could not find token at path: ${tokenPath || 'root'}. Please check the response and provide the correct path.`);
        }

        // Save the token in the form
        setValue('auth.token', token);

        // Save the full response for reference
        setTokenResult({
          token,
          fullResponse: response.data
        });

        // Notify success
        addToast('Token generated successfully', 'success');

        // Notify parent component
        onTokenGenerated && onTokenGenerated(token);

      } catch (err) {
        console.error('Token path error:', err);
        
        // Show a more helpful error message with the response data
        setTokenError(`Failed to extract token using path "${tokenPath}". Please check the response and update the token path.`);
        
        // Still show the full response so the user can see what was returned
        setTokenResult({
          token: null,
          fullResponse: response.data
        });
        
        // Display a toast with instructions
        addToast('Token path not found. Check the response and update the token path field.', 'warning');
      }
    } catch (error) {
      console.error('Error generating token:', error);

      // Extract detailed error information if available
      let errorMessage = error.message || 'Failed to generate token';
      let errorDetails = {};

      // Check if this is an axios error with response data
      if (error.response && error.response.data) {
        const responseData = error.response.data;

        // If the response data has an error message, use it
        if (responseData.message) {
          errorMessage = responseData.message;
        }

        // If there are troubleshooting suggestions, include them
        if (responseData.details && responseData.details.troubleshooting) {
          errorDetails.troubleshooting = responseData.details.troubleshooting;
        }

        // Include any other details
        if (responseData.details) {
          errorDetails = { ...errorDetails, ...responseData.details };
        }
      }

      // Set the error message with details if available
      setTokenError(errorMessage);

      // Provide more helpful error messages based on error type
      if (errorMessage.includes('405')) {
        addToast('Method Not Allowed (405). Try changing the HTTP method (GET/POST/PUT).', 'error');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        addToast('Authentication failed. Check your credentials and headers.', 'error');
      } else if (errorMessage.includes('404')) {
        addToast('API endpoint not found (404). Verify the URL is correct.', 'error');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
        addToast('Connection failed. The API server may be down or unreachable.', 'error');
      } else {
        addToast(errorMessage, 'error');
      }

      // Log detailed error information for debugging
      if (Object.keys(errorDetails).length > 0) {
        console.log('Error details:', errorDetails);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate token header for display and copying
  const tokenHeader = tokenResult?.token ? `Authorization: Bearer ${tokenResult.token}` : '';

  return (
    <div className="token-generator">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Authentication Token Generator</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Use this tool to generate an authentication token from courier API authentication endpoints.
        This token will be automatically carried forward to the next step for your tracking API request.
      </p>
      {!isExpanded && tokenResult?.token && (
        <div className="text-sm text-green-600 mb-4">Token generated successfully</div>
      )}

      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Auth Endpoint URL or Curl Command</label>
              <div className="relative">
                <Input
                  placeholder="https://api.example.com/oauth/token or curl command"
                  value={authEndpoint}
                  onChange={(e) => handleAuthEndpointChange(e.target.value)}
                  className={curlDetected ? "pr-20 border-blue-300" : ""}
                />
                {curlDetected && (
                  <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded h-full flex items-center">
                    curl detected
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the authentication endpoint URL or paste a curl command to auto-fill all fields
              </p>
              <details className="text-xs text-gray-500 mt-1">
                <summary className="cursor-pointer font-medium">Example curl commands</summary>
                <div className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto text-xs space-y-2">
                  <p><strong>Basic example:</strong></p>
                  <pre className="p-1 bg-gray-100 rounded">
                    curl https://api.example.com/oauth/token -X POST -H "Content-Type: application/json" -d {"{\"grant_type\":\"client_credentials\",\"client_id\":\"your_client_id\",\"client_secret\":\"your_client_secret\"}"}
                  </pre>

                  <p><strong>With multiple headers:</strong></p>
                  <pre className="p-1 bg-gray-100 rounded">
                    {/* Note: This is a DUMMY credential for example purposes only */}
                    curl https://api.example.com/oauth/token -X POST \<br />
                    -H "Content-Type: application/json" \<br />
                    -H "Authorization: Basic DUMMY_CREDENTIAL_EXAMPLE_ONLY" \<br />
                    -d {"{\"grant_type\":\"password\",\"username\":\"user\",\"password\":\"pass\"}"}
                  </pre>

                  <p><strong>Form data format:</strong></p>
                  <pre className="p-1 bg-gray-100 rounded">
                    curl https://api.example.com/oauth/token -X POST \<br />
                    -H "Content-Type: application/x-www-form-urlencoded" \<br />
                    -d "grant_type=client_credentials&client_id=your_id&client_secret=your_secret"
                  </pre>

                  <p><strong>With JWT token:</strong></p>
                  <pre className="p-1 bg-gray-100 rounded">
                    {/* Note: This is a DUMMY JWT token for example purposes only */}
                    curl https://api.example.com/tracking -X GET \<br />
                    -H "Content-Type: application/json" \<br />
                    -H "Authorization: Bearer EXAMPLE.JWT.TOKEN_NOT_REAL"
                  </pre>
                </div>
              </details>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HTTP Method</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={authMethod}
                onChange={(e) => setValue('auth.jwtAuthMethod', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Headers</label>
            <KeyValueEditor
              value={authHeaders}
              onChange={(headers) => setValue('auth.jwtAuthHeaders', headers)}
              keyPlaceholder="Content-Type"
              valuePlaceholder="application/json"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Request Body</label>
            <JsonEditor
              value={authBody}
              onChange={(body) => setValue('auth.jwtAuthBody', body)}
              height="120px"
            />
            <p className="text-xs text-gray-500 mt-1">
              Common examples: {"{ \"grant_type\": \"client_credentials\", \"client_id\": \"YOUR_CLIENT_ID\", \"client_secret\": \"YOUR_CLIENT_SECRET\" }"}
              or {"{ \"username\": \"YOUR_USERNAME\", \"password\": \"YOUR_PASSWORD\" }"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Token Path in Response (e.g., "data.access_token" or "access_token")
            </label>
            <Input
              placeholder="access_token"
              value={tokenPath}
              onChange={(e) => setValue('auth.jwtTokenPath', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify the JSON path to extract the token from the response
            </p>
          </div>

          {tokenError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              <div className="font-medium">Error</div>
              <div>{tokenError}</div>
              <div className="mt-2 text-xs">
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure the endpoint URL is correct and accessible</li>
                  <li>Check that your headers and request body match the API requirements</li>
                  <li>If using a curl command, verify it works in your terminal</li>
                  {tokenError.includes('405') && (
                    <>
                      <li className="font-semibold">For "Method Not Allowed" (405) errors:</li>
                      <ul className="list-circle list-inside ml-4 space-y-1">
                        <li>Try changing the HTTP method (e.g., from POST to GET or vice versa)</li>
                        <li>Verify the API documentation for the correct HTTP method</li>
                        <li>Check if the endpoint requires specific headers or authentication</li>
                        <li>Some APIs require parameters in the URL instead of the request body</li>
                      </ul>
                    </>
                  )}
                  <li>You may need network admin assistance if your organization blocks API requests</li>
                </ul>
              </div>
            </div>
          )}

          {tokenResult?.token && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-green-700">Generated Token</label>
                <CopyButton text={tokenResult.token}>Copy Token</CopyButton>
              </div>
              <Textarea
                value={tokenResult.token}
                readOnly
                className="font-mono text-xs"
                rows={2}
              />
              <div className="mt-2 flex justify-between items-center">
                <label className="text-sm font-medium text-green-700">Authorization Header</label>
                <CopyButton text={tokenHeader}>Copy Header</CopyButton>
              </div>
              <Input
                value={tokenHeader}
                readOnly
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setLoading(true);
                  // Just test connection without token extraction
                  const testResponse = await axios.post('/.netlify/functions/api-proxy', {
                    url: authEndpoint,
                    method: authMethod,
                    headers: authHeaders.reduce((obj, item) => {
                      obj[item.key] = item.value;
                      return obj;
                    }, {}),
                    body: authBody
                  });

                  if (testResponse.status >= 200 && testResponse.status < 300) {
                    addToast('Connection test successful!', 'success');
                  } else {
                    addToast(`Connection test returned status: ${testResponse.status}`, 'warning');
                  }
                } catch (error) {
                  console.error('Connection test failed:', error);
                  addToast(`Connection test failed: ${error.message}`, 'error');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !authEndpoint}
            >
              Test Connection
            </Button>
            <Button
              onClick={generateToken}
              disabled={loading || !authEndpoint}
              className={loading ? 'opacity-70' : ''}
            >
              {loading ? 'Generating Token...' : 'Generate Token'}
            </Button>
          </div>

          {tokenResult?.fullResponse && (
            <div className="mt-4">
              <details className="bg-gray-50 border border-gray-200 rounded-md">
                <summary className="px-4 py-2 cursor-pointer font-medium text-sm">
                  View Full Response
                </summary>
                <div className="p-4 border-t border-gray-200">
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(tokenResult.fullResponse, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
          {curlDetected && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <p className="text-blue-700">
                <span className="font-medium">Curl command detected!</span> The form has been automatically filled with the parsed data.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </div>
  );
};

export default TokenGenerator;