import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { KeyValueEditor } from './ui/key-value-editor';
import { JsonEditor } from './ui/json-editor';
import { JsonViewer } from './ui/json-viewer';
import { parseCurl, toCurl } from '../lib/curl-parser';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './ui/form';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from './ui/tabs';

/**
 * A component for building API requests
 */
const RequestBuilder = ({
  formMethods,
  onSubmit,
  loading = false,
  showCurlInput = true,
  showApiIntents = true
}) => {
  const { control, watch, setValue, handleSubmit, formState } = formMethods;

  // Watch for changes to relevant fields
  const method = watch('method') || 'GET';
  const url = watch('url') || '';
  const apiIntent = watch('apiIntent') || 'track_shipment';

  // Use state to track auth type
  const [authType, setAuthType] = useState(watch('auth.type') || 'none');

  // Update auth type when it changes in the form
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'auth.type') {
        console.log('Auth type changed in form:', value.auth?.type);
        setAuthType(value.auth?.type || 'none');
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  // Debug auth type changes
  useEffect(() => {
    console.log('Current auth type state:', authType);
  }, [authType]);

  // Highlight token in headers if present
  useEffect(() => {
    const token = watch('auth.token');
    if (token && authType === 'jwt_auth' || authType === 'bearer' || authType === 'jwt') {
      // Check if Authorization header already exists
      const headers = watch('headers') || [];
      const hasAuthHeader = headers.some(h => h.key.toLowerCase() === 'authorization');
      
      // If no Authorization header exists, add it
      if (!hasAuthHeader) {
        const updatedHeaders = [
          ...headers,
          { key: 'Authorization', value: `Bearer ${token}` }
        ];
        setValue('headers', updatedHeaders);
      }
    }
  }, [authType, watch, setValue]);

  // These are used in the useEffect for generating cURL preview
  const curlCommand = watch('curlCommand') || '';

  // State for JSON validation
  const [isBodyValid, setIsBodyValid] = useState(true);

  // State for JWT token fetching
  const [jwtTokenStatus, setJwtTokenStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  // Generate cURL preview
  const [curlPreview, setCurlPreview] = useState('');

  useEffect(() => {
    // Only update the cURL preview if we have a URL
    if (url) {
      try {
        // Get the current headers and body from the form
        const currentHeaders = watch('headers') || [];
        const currentBody = watch('body') || {};

        const requestObj = {
          method,
          url,
          headers: currentHeaders,
          auth: {
            type: authType,
            username: watch('auth.username') || '',
            password: watch('auth.password') || '',
            token: watch('auth.token') || ''
          },
          body: method !== 'GET' ? currentBody : undefined
        };

        setCurlPreview(toCurl(requestObj));
      } catch (e) {
        console.error('Error generating cURL preview:', e);
      }
    }
  }, [method, url, authType, watch]);

  // Parse cURL command when it changes
  const handleCurlParse = () => {
    console.log('Attempting to parse cURL command:', curlCommand);
    try {
      if (!curlCommand.trim()) {
        console.log('Empty cURL command, skipping parse');
        return;
      }

      const parsed = parseCurl(curlCommand);
      console.log('Successfully parsed cURL command:', parsed);

      // Log headers specifically for debugging
      if (parsed.headers && parsed.headers.length > 0) {
        console.log('Parsed headers:');
        parsed.headers.forEach((header, index) => {
          console.log(`  ${index + 1}. ${header.key}: ${header.value}`);
        });
      } else {
        console.log('No headers found in cURL command');
      }

      // Update form values with parsed data
      setValue('method', parsed.method);
      setValue('url', parsed.url);

      // Set auth type and update local state
      console.log('Setting auth type from cURL:', parsed.auth.type);
      setValue('auth.type', parsed.auth.type);
      setAuthType(parsed.auth.type); // Update local state to ensure UI reflects the change

      setValue('auth.username', parsed.auth.username);
      setValue('auth.password', parsed.auth.password);
      setValue('auth.token', parsed.auth.token);

      // Make sure headers are properly set
      if (parsed.headers && parsed.headers.length > 0) {
        setValue('headers', parsed.headers);
      } else {
        setValue('headers', []);
      }

      if (parsed.body) {
        setValue('body', parsed.body);

        // If this is form-urlencoded data, pass that information along
        if (parsed.isFormUrlEncoded) {
          // Store this information in a hidden field
          setValue('isFormUrlEncoded', true);

          // Check if we need to add the Content-Type header
          const hasContentType = parsed.headers.some(
            h => h.key.toLowerCase() === 'content-type' &&
                 h.value.toLowerCase().includes('form-urlencoded')
          );

          if (!hasContentType) {
            const updatedHeaders = [...parsed.headers];
            updatedHeaders.push({
              key: 'Content-Type',
              value: 'application/x-www-form-urlencoded'
            });
            setValue('headers', updatedHeaders);
          }
        }
      }

      // Log the current form values after update
      console.log('Form values after cURL parse:', {
        method: watch('method'),
        url: watch('url'),
        auth: {
          type: watch('auth.type'),
          username: watch('auth.username'),
          password: watch('auth.password'),
          token: watch('auth.token')
        },
        headers: watch('headers'),
        body: watch('body')
      });

      // Try to extract tracking number from URL or body if API intent is track_shipment
      if (watch('apiIntent') === 'track_shipment' && !watch('testDocket')) {
        console.log('Trying to extract tracking number from parsed cURL');

        // Check URL for tracking number
        const url = watch('url');
        if (url) {
          // Common tracking number parameter names
          const trackingParams = ['tracking', 'trackingNumber', 'track', 'awb', 'waybill', 'docNo', 'docket'];
          const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);

          for (const param of trackingParams) {
            const trackingNumber = urlObj.searchParams.get(param);
            if (trackingNumber) {
              console.log(`Found tracking number in URL: ${trackingNumber}`);
              setValue('testDocket', trackingNumber);
              break;
            }
          }
        }

        // Check body for tracking number if not found in URL
        if (!watch('testDocket') && typeof parsed.body === 'object') {
          const body = parsed.body;
          const trackingFields = ['tracking', 'trackingNumber', 'track', 'awb', 'waybill', 'docNo', 'docket'];

          for (const field of trackingFields) {
            if (body[field]) {
              console.log(`Found tracking number in body: ${body[field]}`);
              setValue('testDocket', body[field]);
              break;
            }
          }
        }
      }

    } catch (e) {
      console.error('Error parsing cURL command:', e);
      alert('Error parsing cURL command: ' + e.message);
    }
  };

  // Handle JSON body changes
  const handleJsonChange = (value) => {
    try {
      // If it's a string, try to parse it
      if (typeof value === 'string') {
        if (value.trim()) {
          JSON.parse(value); // This will throw if invalid
        }
        setIsBodyValid(true);
      }
      setValue('body', value);
    } catch (error) {
      console.error('Invalid JSON:', error);
      setIsBodyValid(false);
    }
  };

  // Add a local submit handler for debugging
  const handleFormSubmit = (data) => {
    console.log('RequestBuilder form submitted:', data);
    onSubmit(data);
  };

  return (
    <Form {...formMethods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Courier Information */}
        <Card>
          <CardHeader>
            <CardTitle>Courier Information</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="courier_name"
              rules={{ required: "Courier name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Courier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter courier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* cURL Input Section */}
        {showCurlInput && (
          <Card>
            <CardHeader>
              <CardTitle>cURL Command</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormField
                  control={control}
                  name="curlCommand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paste cURL Command</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="curl -X GET 'https://api.example.com/tracking?id=123' -H 'Authorization: Bearer token'"
                            className="font-mono flex-1"
                            {...field}
                          />
                          <Button
                            type="button"
                            onClick={handleCurlParse}
                            className="self-end"
                          >
                            Parse
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Paste a cURL command to automatically fill the form below
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Intent Selection */}
        {showApiIntents && (
          <Card>
            <CardHeader>
              <CardTitle>API Intent</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={control}
                name="apiIntent"
                rules={{ required: "API intent is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What are you trying to do?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select API intent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="generate_auth_token">Generate Auth Token</SelectItem>
                        <SelectItem value="fetch_static_config">Fetch Static Config</SelectItem>
                        <SelectItem value="fetch_api_schema">Fetch API Schema</SelectItem>
                        <SelectItem value="track_shipment">Track Shipment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This helps us optimize the request for specific use cases
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Test Docket Field */}
              {apiIntent === 'track_shipment' && (
                <FormField
                  control={control}
                  name="testDocket"
                  rules={{
                    validate: () => {
                      // Only validate on form submission, not on field change
                      return true;
                    }
                  }}
                  render={({ field }) => {
                    // Check if form has been submitted
                    const isSubmitted = formState.isSubmitted;
                    const isEmpty = !field.value;

                    // Only show error styling if the form was submitted and field is empty
                    const showError = isSubmitted && isEmpty;

                    return (
                      <FormItem className={`mt-4 p-4 rounded-md ${showError ? 'border-2 border-red-300 bg-red-50' : 'border border-gray-200'}`}>
                        <FormLabel className={`flex items-center ${showError ? 'text-red-700 font-bold' : ''}`}>
                          {showError && <span className="mr-2">⚠️</span>}
                          Test Docket Number (Required)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ABC123456"
                            {...field}
                            className={showError ? 'border-red-300' : ''}
                          />
                        </FormControl>
                        <FormDescription className={showError ? 'text-red-700' : 'text-gray-500'}>
                          {showError
                            ? 'You must enter a valid tracking/docket number to test the shipment tracking API'
                            : 'Enter a tracking/docket number to test the shipment tracking API'
                          }
                        </FormDescription>
                        {showError && <FormMessage />}
                      </FormItem>
                    );
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Request Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Request Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* HTTP Method */}
              <FormField
                control={control}
                name="method"
                rules={{ required: "HTTP method is required" }}
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
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* URL */}
              <div className="md:col-span-3">
                <FormField
                  control={control}
                  name="url"
                  rules={{
                    required: "URL is required",
                    pattern: {
                      value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                      message: "Please enter a valid URL"
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com/tracking" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Authentication</h3>

              <FormField
                control={control}
                name="auth.type"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <div className="flex items-center gap-2">
                      <FormLabel>Authentication Type</FormLabel>
                      <div className="relative flex items-center">
                        <div className="group">
                          <span className="cursor-help text-sm text-gray-500">ⓘ</span>
                          <div className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                            JWT Token Auth: Use when the courier API requires a login to obtain a Bearer token.
                          </div>
                        </div>
                      </div>
                    </div>
                    <Select
                      onValueChange={(value) => {
                        console.log('Auth type selected:', value);
                        field.onChange(value);
                        setAuthType(value);
                      }}
                      value={authType}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select auth type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Auth</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="jwt">JWT Bearer</SelectItem>
                        <SelectItem value="jwt_auth">JWT Token Auth</SelectItem>
                        <SelectItem value="oauth">OAuth 2.0</SelectItem>
                        <SelectItem value="apikey">API Key</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the authentication method required by the API
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Basic Auth */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md ${authType === 'basic' ? 'block' : 'hidden'}`}>
                <FormField
                  control={control}
                  name="auth.username"
                  rules={{ required: authType === 'basic' ? "Username is required for Basic Auth" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="auth.password"
                  rules={{ required: authType === 'basic' ? "Password is required for Basic Auth" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bearer Token */}
              <div className={`p-4 border rounded-md ${authType === 'bearer' ? 'block' : 'hidden'}`}>
                <FormField
                  control={control}
                  name="auth.token"
                  rules={{ required: authType === 'bearer' ? "Token is required for Bearer Auth" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bearer Token</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter token"
                          {...field}
                          onChange={(event) => {
                            console.log('Bearer token changed:', event.target.value);
                            field.onChange(event);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The token will be sent in the Authorization header as "Bearer [token]"
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* JWT Bearer */}
              <div className={`space-y-4 p-4 border rounded-md ${authType === 'jwt' ? 'block' : 'hidden'}`}>
                <FormField
                  control={control}
                  name="auth.token"
                  rules={{ required: authType === 'jwt' ? "JWT token is required for JWT Bearer Auth" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>JWT Token</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter JWT token"
                          {...field}
                          className="font-mono text-xs"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the full JWT token (including header, payload, and signature)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* JWT Token Auth */}
              <div className={`space-y-4 p-4 border rounded-md ${authType === 'jwt_auth' ? 'block' : 'hidden'}`}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      JWT Configuration
                      {jwtTokenStatus.loading && (
                        <span className="text-xs text-amber-600 animate-pulse">Fetching token...</span>
                      )}
                      {jwtTokenStatus.success && (
                        <span className="text-xs text-green-600">Token fetched successfully</span>
                      )}
                      {jwtTokenStatus.error && (
                        <span className="text-xs text-red-600">Error: {jwtTokenStatus.error}</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* JWT Auth Endpoint */}
                    <FormField
                      control={control}
                      name="auth.jwtAuthEndpoint"
                      rules={{ required: authType === 'jwt_auth' ? "JWT Auth Endpoint is required" : false }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>JWT Auth Endpoint</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://courier.com/api/auth/jwt"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The endpoint used to obtain a JWT token
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* JWT HTTP Method */}
                    <FormField
                      control={control}
                      name="auth.jwtAuthMethod"
                      rules={{ required: authType === 'jwt_auth' ? "HTTP method is required" : false }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>JWT HTTP Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "POST"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GET">GET</SelectItem>
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                              <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The HTTP method to use for the JWT auth request
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* JWT Request Headers */}
                    <FormField
                      control={control}
                      name="auth.jwtAuthHeaders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>JWT Request Headers</FormLabel>
                          <FormControl>
                            <KeyValueEditor
                              pairs={field.value}
                              onChange={field.onChange}
                              keyPlaceholder="Content-Type"
                              valuePlaceholder="application/json"
                              description="Add HTTP headers for the JWT auth request"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* JWT Request Body */}
                    <FormField
                      control={control}
                      name="auth.jwtAuthBody"
                      rules={{ required: authType === 'jwt_auth' ? "Request body is required" : false }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>JWT Request Body</FormLabel>
                          <FormControl>
                            <JsonEditor
                              value={field.value}
                              onChange={(value) => {
                                try {
                                  if (typeof value === 'string' && value.trim()) {
                                    field.onChange(JSON.parse(value));
                                  } else {
                                    field.onChange(value);
                                  }
                                } catch (e) {
                                  console.error('Invalid JSON in JWT Auth Body:', e);
                                  field.onChange(value);
                                }
                              }}
                              placeholder='{"username": "abc", "password": "xyz"}'
                              description="Enter the JSON body for the JWT auth request"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Token Path in Response */}
                    <FormField
                      control={control}
                      name="auth.jwtTokenPath"
                      rules={{ required: authType === 'jwt_auth' ? "Token path is required" : false }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Path in Response</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="data.token or access_token"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            JSON path to extract token from the response (e.g., "data.token" or "access_token")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test JWT Auth Button */}
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            // Validate required fields
                            if (!watch('auth.jwtAuthEndpoint')) {
                              alert('JWT Auth Endpoint is required');
                              return;
                            }

                            // Update status
                            setJwtTokenStatus({
                              loading: true,
                              success: false,
                              error: null
                            });

                            // Create JWT config
                            const jwtConfig = {
                              jwtAuthEndpoint: watch('auth.jwtAuthEndpoint'),
                              jwtAuthMethod: watch('auth.jwtAuthMethod') || 'POST',
                              jwtAuthHeaders: watch('auth.jwtAuthHeaders') || [],
                              jwtAuthBody: watch('auth.jwtAuthBody') || {},
                              jwtTokenPath: watch('auth.jwtTokenPath') || 'access_token'
                            };

                            // Make the request directly using axios
                            // Prepare headers for JWT auth request
                            const headers = {};

                            // Add custom headers
                            if (jwtConfig.jwtAuthHeaders && Array.isArray(jwtConfig.jwtAuthHeaders)) {
                              jwtConfig.jwtAuthHeaders.forEach(header => {
                                if (header.key && header.value) {
                                  headers[header.key] = header.value;
                                }
                              });
                            }

                            // Set default content type if not specified
                            if (!headers['Content-Type'] && !headers['content-type']) {
                              headers['Content-Type'] = 'application/json';
                            }

                            // Create axios request config
                            const axiosConfig = {
                              method: jwtConfig.jwtAuthMethod || 'POST',
                              url: jwtConfig.jwtAuthEndpoint,
                              headers
                            };

                            // Add request body for methods that support it
                            if (['POST', 'PUT', 'PATCH'].includes(axiosConfig.method.toUpperCase()) && jwtConfig.jwtAuthBody) {
                              axiosConfig.data = jwtConfig.jwtAuthBody;
                            }

                            console.log('Making JWT auth request with config:', axiosConfig);
                            const response = await axios(axiosConfig);

                            // Extract token from response using the specified path
                            const tokenPath = jwtConfig.jwtTokenPath || 'access_token';
                            const pathParts = tokenPath.split('.');

                            let token = response.data;
                            for (const part of pathParts) {
                              if (token && typeof token === 'object' && part in token) {
                                token = token[part];
                              } else {
                                throw new Error(`Token path "${tokenPath}" not found in response`);
                              }
                            }

                            if (!token || typeof token !== 'string') {
                              throw new Error(`Token not found in response using path "${tokenPath}"`);
                            }

                            // Store the token
                            setValue('auth.token', token);

                            // Update status
                            setJwtTokenStatus({
                              loading: false,
                              success: true,
                              error: null
                            });

                            // Show success message
                            alert('JWT token fetched successfully!');
                          } catch (error) {
                            console.error('Error testing JWT auth:', error);

                            // Update status
                            setJwtTokenStatus({
                              loading: false,
                              success: false,
                              error: error.message
                            });

                            // Show error message
                            alert(`Error testing JWT auth: ${error.message}`);
                          }
                        }}
                        className="w-full"
                      >
                        Test JWT Auth
                      </Button>
                      <FormDescription className="text-center mt-2">
                        Test the JWT authentication separately before submitting the form
                      </FormDescription>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* OAuth 2.0 */}
              <div className={`space-y-4 p-4 border rounded-md ${authType === 'oauth' ? 'block' : 'hidden'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="auth.clientId"
                    rules={{ required: authType === 'oauth' ? "Client ID is required for OAuth" : false }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input placeholder="OAuth Client ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="auth.clientSecret"
                    rules={{ required: authType === 'oauth' ? "Client Secret is required for OAuth" : false }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="OAuth Client Secret" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="auth.tokenEndpoint"
                  rules={{ required: authType === 'oauth' ? "Token endpoint is required for OAuth" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Endpoint</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com/oauth/token" {...field} />
                      </FormControl>
                      <FormDescription>
                        The endpoint used to obtain an access token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="auth.scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="read write" {...field} />
                      </FormControl>
                      <FormDescription>
                        Space-separated list of scopes to request
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* API Key */}
              <div className={`space-y-4 p-4 border rounded-md ${authType === 'apikey' ? 'block' : 'hidden'}`}>
                <FormField
                  control={control}
                  name="auth.apiKey"
                  rules={{ required: authType === 'apikey' ? "API Key is required" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter API Key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="auth.apiKeyName"
                  rules={{ required: authType === 'apikey' ? "API Key name is required" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key Name</FormLabel>
                      <FormControl>
                        <Input placeholder="X-API-Key" {...field} />
                      </FormControl>
                      <FormDescription>
                        The header or query parameter name for the API key
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="auth.apiKeyLocation"
                  rules={{ required: authType === 'apikey' ? "API Key location is required" : false }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key Location</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "header"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="query">Query Parameter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Where to include the API key in the request
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Headers, Query Params, and Body */}
            <Tabs defaultValue="headers" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="query">Query Parameters</TabsTrigger>
                {method !== 'GET' && <TabsTrigger value="body">Request Body</TabsTrigger>}
              </TabsList>

              <TabsContent value="headers">
                <FormField
                  control={control}
                  name="headers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headers</FormLabel>
                      {(authType === 'jwt_auth' || authType === 'bearer' || authType === 'jwt') && watch('auth.token') && (
                        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-green-700">
                              <span className="font-medium">Authorization:</span> Bearer token is automatically included
                            </span>
                          </div>
                        </div>
                      )}
                      <FormControl>
                        <KeyValueEditor
                          pairs={field.value}
                          onChange={field.onChange}
                          keyPlaceholder="Content-Type"
                          valuePlaceholder="application/json"
                          description="Add HTTP headers for the request"
                          disabledKeys={[(authType === 'jwt_auth' || authType === 'bearer' || authType === 'jwt') && watch('auth.token') ? 'Authorization' : null].filter(Boolean)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="query">
                <FormField
                  control={control}
                  name="queryParams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Query Parameters</FormLabel>
                      <FormControl>
                        <KeyValueEditor
                          pairs={field.value}
                          onChange={field.onChange}
                          keyPlaceholder="trackingNumber"
                          valuePlaceholder="ABC123"
                          description="Add query parameters to append to the URL"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {method !== 'GET' && (
                <TabsContent value="body">
                  <FormField
                    control={control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Body</FormLabel>
                        <FormControl>
                          <JsonEditor
                            value={field.value}
                            onChange={handleJsonChange}
                            placeholder='{"key": "value"}'
                            description="Enter the JSON body for the request"
                            isValid={isBodyValid}
                            errorMessage="Invalid JSON format"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              )}
            </Tabs>

            {/* cURL Preview */}
            {curlPreview && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium mb-2">cURL Preview</h3>
                <pre className="text-xs overflow-x-auto p-2 bg-gray-100 rounded">
                  {curlPreview}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            onClick={() => console.log('Submit button clicked')}
          >
            {loading ? 'Testing API...' : 'Test API & Continue'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RequestBuilder;
