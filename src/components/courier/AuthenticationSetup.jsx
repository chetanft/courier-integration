import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { KeyValueEditor } from '../ui/key-value-editor';
import { JsonEditor } from '../ui/json-editor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Loader2, CheckCircle } from 'lucide-react';
import { parseCurl } from '../../lib/curl-parser';
import { testCourierApi } from '../../lib/api-utils';
import { toast } from 'sonner';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';

const AuthenticationSetup = ({ onComplete, createCourier, loading }) => {
  const { control, watch, setValue, handleSubmit, formState: { errors } } = useFormContext();

  // Local state
  const [authType, setAuthType] = useState('none');
  const [tokenResponse, setTokenResponse] = useState(null);
  const [token, setToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenGenerated, setTokenGenerated] = useState(false);

  // Watch auth type
  const watchAuthType = watch('auth.type');

  // Update local state when auth type changes
  useEffect(() => {
    setAuthType(watchAuthType);
  }, [watchAuthType]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      console.log('Submitting form with data:', data);

      // Validate courier name
      if (!data.courier_name || data.courier_name.trim() === '') {
        toast.error('Please enter a courier name');
        return;
      }

      // If auth type is none, just proceed to next step
      if (data.auth.type === 'none') {
        console.log('No auth required, proceeding to next step');
        // Create courier in database
        const courier = await createCourier(data);
        onComplete('');
        return;
      }

      // If auth type is form and token is not generated, check if we need to generate one
      if (data.auth.type === 'form') {
        if (!data.auth.url || data.auth.url.trim() === '') {
          toast.error('Please enter an auth URL');
          return;
        }

        if (!tokenGenerated) {
          toast.error('Please generate a token first');
          return;
        }

        // Token is generated, proceed to next step
        console.log('Token generated via form, proceeding to next step');
        const courier = await createCourier(data);
        onComplete(token);
        return;
      }

      // If auth type is curl, check if URL is parsed
      if (data.auth.type === 'curl') {
        if (!data.auth.url || data.auth.url.trim() === '') {
          toast.error('Please parse a cURL command first');
          return;
        }

        // If token is found in the parsed cURL, use it
        if (token) {
          console.log('Token found in parsed cURL, proceeding to next step');
          const courier = await createCourier(data);
          onComplete(token);
          return;
        }

        // If no token is found but URL is parsed, proceed anyway
        console.log('No token found in parsed cURL, proceeding to next step');
        const courier = await createCourier(data);
        onComplete('');
        return;
      }

      // Otherwise, show error
      toast.error('Please complete the authentication setup');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to proceed to next step: ' + error.message);
    }
  };

  // Handle curl parsing
  const handleCurlParse = (curlCommand) => {
    try {
      console.log('Parsing cURL command:', curlCommand);
      if (!curlCommand || curlCommand.trim() === '') {
        toast.error('Please enter a cURL command');
        return;
      }

      const parsed = parseCurl(curlCommand);
      console.log('Parsed cURL result:', parsed);

      // Update form values with parsed data
      setValue('auth.method', parsed.method);
      setValue('auth.url', parsed.url);

      // Set headers
      if (parsed.headers && parsed.headers.length > 0) {
        setValue('auth.headers', parsed.headers);
      }

      // Set query parameters
      if (parsed.queryParams && parsed.queryParams.length > 0) {
        setValue('auth.queryParams', parsed.queryParams);
      }

      // Set body
      if (parsed.body) {
        setValue('auth.body', parsed.body);
      }

      // Check for auth
      if (parsed.auth && parsed.auth.type !== 'none') {
        if (parsed.auth.type === 'basic') {
          setValue('auth.username', parsed.auth.username);
          setValue('auth.password', parsed.auth.password);
        } else if (parsed.auth.type === 'bearer' || parsed.auth.type === 'jwt') {
          setToken(parsed.auth.token);
          setTokenGenerated(true);
          toast.success('Token extracted from cURL command');
        }
      }

      toast.success('cURL command parsed successfully');
    } catch (error) {
      console.error('Error parsing cURL command:', error);
      toast.error('Failed to parse cURL command: ' + error.message);
    }
  };

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

  // Generate token
  const generateToken = async () => {
    try {
      setTokenLoading(true);

      const formData = watch();
      const { auth } = formData;

      // Process URL and query parameters
      let url = auth.url;
      const queryParams = auth.queryParams || [];

      // If we have query parameters, append them to the URL
      if (queryParams.length > 0) {
        // Check if URL already has query parameters
        const hasQueryParams = url.includes('?');
        const queryString = queryParams
          .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
          .join('&');

        url = hasQueryParams ? `${url}&${queryString}` : `${url}?${queryString}`;
      }

      // Create request config
      const requestConfig = {
        url: url,
        method: auth.method,
        apiIntent: 'generate_auth_token',
        headers: auth.headers,
        body: auth.body
      };

      // Make API request
      const response = await testCourierApi(requestConfig);

      console.log('API response received:', response);

      // Check for errors
      if (response.error) {
        console.error('API error response:', response);
        throw new Error(response.message || 'Failed to generate token');
      }

      // If response is empty or null, throw an error
      if (!response || Object.keys(response).length === 0) {
        console.error('Empty API response received');
        throw new Error('Received empty response from API');
      }

      setTokenResponse(response);

      // Extract token from response using token path
      const tokenPath = auth.tokenPath || 'access_token';
      const pathParts = tokenPath.split('.');

      console.log('Extracting token using path:', tokenPath);
      console.log('Response data:', response);

      // Variable to hold the extracted token
      let extractedToken;

      // Check if we're in development mode with a mock token
      if (response.dev_mode && response.access_token) {
        console.log('Using mock token from development mode');
        extractedToken = response.access_token;
      } else {
        // Try multiple strategies to extract the token
        try {
          // Strategy 1: Use the specified token path
          console.log('Strategy 1: Using specified token path');
          extractedToken = response;

          for (const part of pathParts) {
            if (extractedToken && typeof extractedToken === 'object' && part in extractedToken) {
              extractedToken = extractedToken[part];
              console.log(`Extracted part "${part}":`, typeof extractedToken);
            } else {
              console.warn(`Token path part "${part}" not found in response`);
              extractedToken = null;
              break;
            }
          }

          // Check if we successfully extracted a string token
          if (extractedToken && typeof extractedToken === 'string') {
            console.log('Successfully extracted token using specified path');
          } else {
            // Strategy 2: Look for common token fields at the root level
            console.log('Strategy 2: Looking for common token fields at root level');
            const commonTokenFields = ['access_token', 'token', 'id_token', 'jwt', 'auth_token'];

            for (const field of commonTokenFields) {
              if (response[field] && typeof response[field] === 'string') {
                console.log(`Found token in field "${field}"`);
                extractedToken = response[field];
                break;
              }
            }

            // Strategy 3: Look for Authorization header in the response
            if (!extractedToken) {
              console.log('Strategy 3: Looking for Authorization header');
              if (response.headers && response.headers.Authorization) {
                const authHeader = response.headers.Authorization;
                if (authHeader.startsWith('Bearer ')) {
                  extractedToken = authHeader.substring(7);
                  console.log('Extracted token from Authorization header');
                }
              }
            }

            // Strategy 4: If response itself is a string, use it as the token
            if (!extractedToken && typeof response === 'string') {
              console.log('Strategy 4: Using response itself as token');
              extractedToken = response;
            }
          }

          // If we still don't have a token, throw an error
          if (!extractedToken) {
            throw new Error(`Could not extract token from response`);
          }

          // Validate that we have a string token
          if (typeof extractedToken !== 'string') {
            console.error('Extracted value is not a string:', extractedToken);
            throw new Error('Extracted token is not a string');
          }

        } catch (error) {
          console.error('Error extracting token:', error);

          // Last resort: If we have a response and it's a non-empty string, use it as the token
          if (response && typeof response === 'string' && response.trim() !== '') {
            console.log('Last resort: Using entire response as token');
            extractedToken = response;
          } else {
            // If all strategies fail, create a mock token for development
            if (isDevelopment) {
              console.warn('Creating mock token for development');
              extractedToken = 'mock_token_' + Date.now();
            } else {
              throw error;
            }
          }
        }
      }

      setToken(extractedToken);
      setTokenGenerated(true);
      toast.success('Token generated successfully');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error(error.message || 'Failed to generate token');
    } finally {
      setTokenLoading(false);
    }
  };

  // Copy token to clipboard
  const copyToken = () => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Courier Name - always show for now */}
          <FormField
            control={control}
            name="courier_name"
            rules={{ required: "Courier name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Courier Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., SafeExpress" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Authentication Type */}
          <FormField
            control={control}
            name="auth.type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setAuthType(value);
                    setTokenGenerated(false);
                    setToken('');
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Authentication (Public API)</SelectItem>
                    <SelectItem value="form">Auth via Form (Manual Auth API)</SelectItem>
                    <SelectItem value="curl">Auth via cURL (Auth cURL Parser)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how you want to authenticate with the courier API
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Auth via Form */}
          {authType === 'form' && (
            <div className="space-y-4 border p-4 rounded-md">
              <h3 className="text-lg font-medium">Auth API Configuration</h3>

              {/* Auth URL */}
              <FormField
                control={control}
                name="auth.url"
                rules={{ required: "Auth URL is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com/auth" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Auth Method */}
              <FormField
                control={control}
                name="auth.method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Headers */}
              <FormField
                control={control}
                name="auth.headers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headers</FormLabel>
                    <FormControl>
                      <KeyValueEditor
                        value={field.value || []}
                        onChange={field.onChange}
                        keyPlaceholder="Header name"
                        valuePlaceholder="Header value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Body (for POST) */}
              {watch('auth.method') === 'POST' && (
                <FormField
                  control={control}
                  name="auth.body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Body</FormLabel>
                      <FormControl>
                        <JsonEditor
                          value={field.value || {}}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Token Path */}
              <FormField
                control={control}
                name="auth.tokenPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Path</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="access_token"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Path to the token in the response (e.g., "access_token" or "data.token")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Generate Token Button */}
              <Button
                type="button"
                onClick={generateToken}
                disabled={tokenLoading}
              >
                {tokenLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Token'
                )}
              </Button>
            </div>
          )}

          {/* Auth via cURL */}
          {authType === 'curl' && (
            <div className="space-y-4 border p-4 rounded-md">
              <h3 className="text-lg font-medium">cURL Command Parser</h3>

              {/* cURL Command */}
              <FormField
                control={control}
                name="auth.curlCommand"
                rules={{ required: "cURL command is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>cURL Command</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-2">
                        <Textarea
                          placeholder="curl -X POST https://api.example.com/auth -H 'Content-Type: application/json' -d '{...}'"
                          className="min-h-[100px]"
                          {...field}
                        />
                        <Button
                          type="button"
                          onClick={() => handleCurlParse(field.value)}
                          className="self-end"
                        >
                          Parse cURL Command
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Paste a complete cURL command including headers and body
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parsed Results */}
              {watch('auth.url') && (
                <div className="mt-4 space-y-4 border p-4 rounded-md bg-gray-50">
                  <h3 className="text-md font-medium">Parsed Results</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* URL */}
                    <FormField
                      control={control}
                      name="auth.url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API URL</FormLabel>
                          <FormControl>
                            <Input value={field.value} readOnly />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Method */}
                    <FormField
                      control={control}
                      name="auth.method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Method</FormLabel>
                          <FormControl>
                            <Input value={field.value} readOnly />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Headers */}
                  {watch('auth.headers') && watch('auth.headers').length > 0 && (
                    <FormField
                      control={control}
                      name="auth.headers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Headers</FormLabel>
                          <FormControl>
                            <div className="border rounded-md p-2 bg-white">
                              {field.value.map((header, i) => (
                                <div key={i} className="flex items-center space-x-2 mb-2">
                                  <div className="font-medium text-sm">{header.key}:</div>
                                  <div className="text-sm text-gray-600">{header.value}</div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Query Parameters */}
                  {watch('auth.queryParams') && watch('auth.queryParams').length > 0 && (
                    <FormField
                      control={control}
                      name="auth.queryParams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Query Parameters</FormLabel>
                          <FormControl>
                            <div className="border rounded-md p-2 bg-white">
                              {field.value.map((param, i) => (
                                <div key={i} className="flex items-center space-x-2 mb-2">
                                  <div className="font-medium text-sm">{param.key}=</div>
                                  <div className="text-sm text-gray-600">{param.value}</div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Body */}
                  {watch('auth.method') === 'POST' && watch('auth.body') && (
                    <FormField
                      control={control}
                      name="auth.body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Request Body</FormLabel>
                          <FormControl>
                            <div className="border rounded-md p-2 bg-white">
                              <pre className="text-xs overflow-auto max-h-[200px]">
                                {JSON.stringify(field.value, null, 2)}
                              </pre>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Token Display */}
          {token && (
            <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-md">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-green-800">Token Generated</h3>
              </div>

              <div className="bg-white p-2 rounded border border-gray-200 flex items-center">
                <div className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm">
                  {token.length > 50 ? `${token.substring(0, 50)}...` : token}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyToken}
                  className="ml-2"
                >
                  Copy
                </Button>
              </div>

              <p className="text-sm text-green-700 mt-2">
                This token will be used for API requests in the next step
              </p>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div></div>
        <Button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Continue to API Setup'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthenticationSetup;
