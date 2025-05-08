import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import RequestBuilder from '../request-builder';
import { parseCurl } from '../../lib/curl-parser';
import { fetchCourierData } from '../../lib/courier-api-service';
import { updateClientApiUrl, fetchAndStoreCourierData } from '../../lib/supabase-service';
import ApiFilterOptions from './ApiFilterOptions';
import { useToast } from '../ui/use-toast';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../ui/form';

const CourierApiIntegrationForm = ({ clientId, onSuccess, onError, onParsedData }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingCouriers, setFetchingCouriers] = useState(false);
  const [couriersFound, setCouriersFound] = useState(null);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({});
  const { toast } = useToast();

  // Initialize form with react-hook-form
  const formMethods = useForm({
    defaultValues: {
      method: 'GET',
      url: '',
      apiIntent: 'fetch_courier_data', // Custom intent for fetching couriers
      auth: {
        type: 'none',
        username: '',
        password: '',
        token: '',
        clientId: '',
        clientSecret: '',
        tokenEndpoint: '',
        scope: '',
        apiKey: '',
        apiKeyName: 'X-API-Key',
        apiKeyLocation: 'header',
        // JWT Token Auth fields
        jwtAuthEndpoint: '',
        jwtAuthMethod: 'POST',
        jwtAuthHeaders: [],
        jwtAuthBody: {},
        jwtTokenPath: 'access_token'
      },
      headers: [],
      queryParams: [],
      body: {},
      curlCommand: ''
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setCouriersFound(null);

    try {
      // Create request config from form data
      const requestConfig = {
        url: data.url.trim(),
        method: data.method || 'GET',
        apiIntent: 'fetch_courier_data',
        headers: data.headers || [],
        queryParams: data.queryParams || [],
        body: data.body || {}
      };

      // Special handling for FreightTiger API
      if (data.url.includes('freighttiger.com')) {
        console.log('Detected FreightTiger API, ensuring proper authentication');

        // Check if we have an Authorization header
        const hasAuthHeader = requestConfig.headers.some(h => h.key.toLowerCase() === 'authorization');

        // If we have auth data, use it
        if (data.auth && data.auth.type === 'bearer' && data.auth.token) {
          // Add Authorization header if not already present
          if (!hasAuthHeader) {
            requestConfig.headers.push({
              key: 'Authorization',
              value: `Bearer ${data.auth.token}`
            });
            console.log('Added Authorization header for FreightTiger API from auth.token');
          }
        }
        // If we don't have auth data but have an Authorization header, that's fine too
        else if (hasAuthHeader) {
          console.log('Using existing Authorization header for FreightTiger API');
        }
        // If we have neither, add a warning but don't block the request
        else {
          console.warn('No Authorization header or Bearer token found for FreightTiger API. The request may fail.');
          // Add a warning to the UI but don't block the request
          toast({
            title: "Authentication Warning",
            description: "FreightTiger API typically requires authentication. Your request may fail without proper credentials.",
            variant: "warning",
            duration: 5000
          });

          // For FreightTiger, we'll add a default auth type to help with proxy handling
          if (!requestConfig.auth) {
            requestConfig.auth = { type: 'bearer', token: '' };
          }

          // Add a special flag to indicate we're using FreightTiger API
          requestConfig.isFreightTigerApi = true;
        }
      }

      // Add authentication if provided
      if (data.auth && data.auth.type !== 'none') {
        requestConfig.auth = {
          type: data.auth.type
        };

        // Add auth details based on type
        switch (data.auth.type) {
          case 'basic':
            requestConfig.auth.username = data.auth.username;
            requestConfig.auth.password = data.auth.password;
            break;
          case 'bearer':
          case 'jwt':
            requestConfig.auth.token = data.auth.token;
            break;
          case 'jwt_auth':
            requestConfig.auth.jwtAuthEndpoint = data.auth.jwtAuthEndpoint;
            requestConfig.auth.jwtAuthMethod = data.auth.jwtAuthMethod;
            requestConfig.auth.jwtAuthHeaders = data.auth.jwtAuthHeaders;
            requestConfig.auth.jwtAuthBody = data.auth.jwtAuthBody;
            requestConfig.auth.jwtTokenPath = data.auth.jwtTokenPath;
            break;
          case 'oauth':
            requestConfig.auth.clientId = data.auth.clientId;
            requestConfig.auth.clientSecret = data.auth.clientSecret;
            requestConfig.auth.tokenEndpoint = data.auth.tokenEndpoint;
            requestConfig.auth.scope = data.auth.scope;
            break;
          case 'apikey':
            requestConfig.auth.apiKey = data.auth.apiKey;
            requestConfig.auth.apiKeyName = data.auth.apiKeyName;
            requestConfig.auth.apiKeyLocation = data.auth.apiKeyLocation;
            break;
        }
      }

      // Test the API URL first
      setFetchingCouriers(true);
      const url = data.url.trim();

      // Extract couriers from the response
      const couriers = await fetchCourierData(url, requestConfig, filterOptions);

      if (!couriers || couriers.length === 0) {
        setError({
          message: 'No couriers found in the API response'
        });

        if (onError) {
          onError({
            message: 'No couriers found in the API response'
          });
        }
      } else {
        setCouriersFound({
          count: couriers.length,
          couriers: couriers.map(c => c.name).join(', ')
        });

        // If onParsedData is provided, call it with the parsed couriers
        if (onParsedData) {
          onParsedData(couriers);
        }

        // If clientId is not provided, just call onSuccess with the couriers
        if (!clientId) {
          if (onSuccess) {
            onSuccess(couriers);
          }
          return;
        }

        // Update client with API URL
        await updateClientApiUrl(clientId, url, requestConfig);

        // Store the courier data
        await fetchAndStoreCourierData(clientId, url, requestConfig, filterOptions);

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(couriers);
        }
      }
    } catch (err) {
      console.error('Error testing API URL:', err);
      setError({
        message: err.message || 'Failed to fetch couriers from API',
        details: err
      });

      if (onError) {
        onError({
          message: err.message || 'Failed to fetch couriers from API',
          details: err
        });
      }
    } finally {
      setLoading(false);
      setFetchingCouriers(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4 border border-red-200">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <h3 className="text-red-700 font-medium">Error</h3>
          </div>
          <p className="text-red-600">{error.message}</p>
        </div>
      )}

      {couriersFound && (
        <div className="bg-green-50 p-4 rounded-md mb-4 border border-green-200">
          <div className="flex items-center mb-2">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <h3 className="text-green-700 font-medium">Success</h3>
          </div>
          <p className="text-green-600">
            Found {couriersFound.count} couriers: {couriersFound.couriers}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* cURL Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>cURL Command</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormField
                control={formMethods.control}
                name="curlCommand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paste cURL Command</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="curl -X GET 'https://api.example.com/couriers' -H 'Authorization: Bearer token'"
                          className="font-mono flex-1"
                          {...field}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            try {
                              if (!field.value.trim()) {
                                console.log('Empty cURL command, skipping parse');
                                return;
                              }

                              const parsed = parseCurl(field.value);
                              console.log('Successfully parsed cURL command:', parsed);

                              // Update form values with parsed data
                              formMethods.setValue('method', parsed.method);
                              formMethods.setValue('url', parsed.url);

                              // Set auth type
                              formMethods.setValue('auth.type', parsed.auth.type);

                              formMethods.setValue('auth.username', parsed.auth.username);
                              formMethods.setValue('auth.password', parsed.auth.password);
                              formMethods.setValue('auth.token', parsed.auth.token);

                              // Set headers
                              if (parsed.headers && parsed.headers.length > 0) {
                                formMethods.setValue('headers', parsed.headers);
                              } else {
                                formMethods.setValue('headers', []);
                              }

                              // Set body
                              if (parsed.body) {
                                formMethods.setValue('body', parsed.body);
                              }
                            } catch (e) {
                              console.error('Error parsing cURL command:', e);
                              alert('Error parsing cURL command: ' + e.message);
                            }
                          }}
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

        {/* API Filter Options */}
        <ApiFilterOptions
          onChange={setFilterOptions}
        />

        {/* Use the rest of the RequestBuilder component without name field */}
        <div className="space-y-6">
          <RequestBuilder
            formMethods={formMethods}
            onSubmit={() => {
              // Prevent form submission
              console.log('RequestBuilder submit button clicked, preventing form submission');
            }}
            loading={loading || fetchingCouriers}
            showCurlInput={false} // Hide the cURL input since we have our own
            showApiIntents={false}
            customSubmitLabel="Configure Request"
            showNameField={false} // Hide the name field since we're fetching multiple couriers
          />

          {/* Add a separate button for fetching couriers */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                const data = formMethods.getValues();
                onSubmit(data);
              }}
              disabled={loading || fetchingCouriers}
            >
              {fetchingCouriers ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Couriers...
                </>
              ) : (
                'Fetch Couriers'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierApiIntegrationForm;
