import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { addClient, fetchAndStoreCourierData } from '../lib/supabase-service';
import { fetchCourierData } from '../lib/courier-api-service';
import { testCourierApi } from '../lib/api-utils';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import RequestBuilder from '../components/request-builder';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../components/ui/form';

const AddClient = () => {
  const [loading, setLoading] = useState(false);
  const [fetchingCouriers, setFetchingCouriers] = useState(false);
  const [error, setError] = useState(null);
  const [couriersFound, setCouriersFound] = useState(null);
  const navigate = useNavigate();

  // Initialize form with react-hook-form
  const formMethods = useForm({
    defaultValues: {
      courier_name: '', // We'll use this for client name
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

  // Handle testing the API URL
  const testApiUrl = async () => {
    const formData = formMethods.getValues();
    const url = formData.url;

    if (!url.trim()) {
      setError({
        message: 'Please enter an API URL'
      });
      return;
    }

    setFetchingCouriers(true);
    setError(null);
    setCouriersFound(null);

    try {
      console.log('About to fetch couriers with URL:', url.trim());
      console.log('Form data:', formData);

      // Create request config from form data
      const requestConfig = {
        url: url.trim(),
        method: formData.method || 'GET',
        apiIntent: 'fetch_courier_data',
        headers: formData.headers || [],
        queryParams: formData.queryParams || [],
        body: formData.body || {}
      };

      // Add authentication if provided
      if (formData.auth && formData.auth.type !== 'none') {
        requestConfig.auth = {
          type: formData.auth.type
        };

        // Add auth details based on type
        switch (formData.auth.type) {
          case 'basic':
            requestConfig.auth.username = formData.auth.username;
            requestConfig.auth.password = formData.auth.password;
            break;
          case 'bearer':
          case 'jwt':
            requestConfig.auth.token = formData.auth.token;
            break;
          case 'apikey':
            requestConfig.auth.apiKey = formData.auth.apiKey;
            requestConfig.auth.apiKeyName = formData.auth.apiKeyName;
            requestConfig.auth.apiKeyLocation = formData.auth.apiKeyLocation;
            break;
          case 'oauth':
            requestConfig.auth.clientId = formData.auth.clientId;
            requestConfig.auth.clientSecret = formData.auth.clientSecret;
            requestConfig.auth.tokenEndpoint = formData.auth.tokenEndpoint;
            requestConfig.auth.scope = formData.auth.scope;
            break;
          case 'jwt_auth':
            // JWT auth is handled separately, but we'll include the token if it exists
            if (formData.auth.token) {
              requestConfig.auth.token = formData.auth.token;
            }
            break;
          default:
            break;
        }
      }

      console.log('Request config:', requestConfig);

      // Use the testCourierApi function to make the request
      const response = await testCourierApi(requestConfig);

      console.log('API response:', response);

      // Check if the response contains an error
      if (response.error) {
        throw {
          message: response.message || 'API request failed',
          status: response.status,
          statusText: response.statusText,
          details: response.details
        };
      }

      // Extract couriers from the response
      const couriers = await fetchCourierData(url.trim(), requestConfig);

      console.log('Extracted couriers:', couriers);

      if (!couriers || couriers.length === 0) {
        setError({
          message: 'No couriers found in the API response'
        });
      } else {
        setCouriersFound({
          count: couriers.length,
          couriers: couriers.map(c => c.name).join(', ')
        });
        toast.success(`Found ${couriers.length} couriers in the API response`);
      }
    } catch (err) {
      console.error('Error testing API URL:', err);
      console.error('Detailed error object:', JSON.stringify(err, null, 2));

      if (err.stack) {
        console.error('Error stack:', err.stack);
      }

      // Check if it's a network error
      const isNetworkError = err.isNetworkError ||
                            err.message?.includes('Network Error') ||
                            err.code === 'ECONNABORTED' ||
                            err.code === 'ERR_NETWORK';

      if (isNetworkError) {
        setError({
          message: 'Network Error: Unable to connect to the API',
          details: {
            status: err.status,
            statusText: err.statusText,
            code: err.code,
            hint: 'This could be due to CORS restrictions, network connectivity issues, or the API server being unavailable. Try using a different API URL or check your network connection.',
            details: err.details,
            url: err.url
          },
          operation: err.operation || 'testApiUrl',
          timestamp: err.timestamp || new Date().toISOString()
        });
      } else {
        setError({
          message: err.message || 'Failed to fetch couriers from API',
          details: {
            status: err.status,
            statusText: err.statusText,
            code: err.code,
            hint: err.hint,
            details: err.details,
            url: err.url
          },
          operation: err.operation || 'testApiUrl',
          timestamp: err.timestamp || new Date().toISOString()
        });
      }
    } finally {
      setFetchingCouriers(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    console.log('Form submitted with data:', data);

    if (!data.courier_name.trim()) {
      setError({
        message: 'Please enter a client name'
      });
      return;
    }

    if (!data.url.trim()) {
      setError({
        message: 'Please enter an API URL'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Submitting client with name:', data.courier_name.trim(), 'and API URL:', data.url.trim());

      // Create request config from form data
      const requestConfig = {
        url: data.url.trim(),
        method: data.method || 'GET',
        apiIntent: 'fetch_courier_data',
        headers: data.headers || [],
        queryParams: data.queryParams || [],
        body: data.body || {}
      };

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
          case 'apikey':
            requestConfig.auth.apiKey = data.auth.apiKey;
            requestConfig.auth.apiKeyName = data.auth.apiKeyName;
            requestConfig.auth.apiKeyLocation = data.auth.apiKeyLocation;
            break;
          case 'oauth':
            requestConfig.auth.clientId = data.auth.clientId;
            requestConfig.auth.clientSecret = data.auth.clientSecret;
            requestConfig.auth.tokenEndpoint = data.auth.tokenEndpoint;
            requestConfig.auth.scope = data.auth.scope;
            break;
          case 'jwt_auth':
            // JWT auth is handled separately, but we'll include the token if it exists
            if (data.auth.token) {
              requestConfig.auth.token = data.auth.token;
            }
            break;
          default:
            break;
        }
      }

      // Make real API call to add client
      const result = await addClient({
        name: data.courier_name.trim(),
        api_url: data.url.trim(),
        request_config: JSON.stringify(requestConfig) // Store the request config for future use
      });

      console.log('Client add result:', result);

      // Fetch and store courier data from the API using the request config
      console.log('About to fetch and store courier data for client ID:', result.id);
      const couriers = await fetchAndStoreCourierData(result.id, data.url.trim(), requestConfig);
      console.log('Fetch and store result:', couriers);

      if (couriers && couriers.length > 0) {
        toast.success(`Added ${couriers.length} couriers for ${data.courier_name.trim()}`);
      }

      // Show success message
      toast.success(`Client "${data.courier_name.trim()}" added successfully!`);

      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error adding client:', err);
      console.error('Detailed error object:', JSON.stringify(err, null, 2));

      if (err.stack) {
        console.error('Error stack:', err.stack);
      }

      // Check if it's a network error
      const isNetworkError = err.isNetworkError ||
                            err.message?.includes('Network Error') ||
                            err.code === 'ECONNABORTED' ||
                            err.code === 'ERR_NETWORK';

      if (isNetworkError) {
        setError({
          message: 'Network Error: Unable to connect to the API',
          details: {
            status: err.status,
            statusText: err.statusText,
            code: err.code,
            hint: 'This could be due to CORS restrictions, network connectivity issues, or the API server being unavailable. Try using a different API URL or check your network connection.',
            details: err.details,
            url: err.url
          },
          operation: err.operation || 'addClient',
          timestamp: err.timestamp || new Date().toISOString()
        });
      } else {
        // Create a more detailed error object
        setError({
          message: err.message || 'Failed to add client',
          details: {
            status: err.status,
            statusText: err.statusText,
            code: err.code,
            hint: err.hint,
            details: err.details,
            url: err.url
          },
          operation: err.operation || 'addClient',
          timestamp: err.timestamp || new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-end mb-6">
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {loading && !error && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4 text-center">
          <div className="animate-pulse text-blue-600">Saving client...</div>
        </div>
      )}

      {fetchingCouriers && !error && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4 text-center">
          <div className="animate-pulse text-blue-600">Fetching couriers from API...</div>
        </div>
      )}

      {couriersFound && !error && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
          <h3 className="text-green-700 font-medium">Couriers Found</h3>
          <p className="text-green-600">Found {couriersFound.count} couriers in the API response.</p>
          <p className="text-sm text-green-600 mt-1">Couriers: {couriersFound.couriers}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>

          {error.details && (
            <div className="mt-2">
              {error.details.status && (
                <p className="text-sm text-red-500">
                  Status: {error.details.status} {error.details.statusText}
                </p>
              )}

              {error.details.code && (
                <p className="text-sm text-red-500">
                  Code: {error.details.code}
                </p>
              )}

              {error.details.hint && (
                <p className="text-sm text-red-500">
                  Hint: {error.details.hint}
                </p>
              )}

              {error.operation && (
                <p className="text-sm text-red-500">
                  Operation: {error.operation}
                </p>
              )}

              {error.details.details && (
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer">Show more details</summary>
                  <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                    {JSON.stringify(error.details.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Client</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Add a new client to the system. The client name will be used to identify the client in the system.
          </p>

          {/* Client Name Field */}
          <div className="mb-6">
            <FormField
              control={formMethods.control}
              name="courier_name"
              rules={{ required: "Client name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Use the RequestBuilder component with correct labels and subheading */}
          <RequestBuilder
            formMethods={formMethods}
            onSubmit={onSubmit}
            loading={loading || fetchingCouriers}
            showCurlInput={true}
            showApiIntents={false}
            customSubmitLabel="Save Client"
            showNameField={false} // Hide the name field since we're showing it separately
            showApiSubheading={true}
            apiSubheadingText="Add Available Couriers"
            subheadingPosition="beforeCurl" // Show subheading before cURL section
          />

          {/* Add a Test API button */}
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={testApiUrl}
              disabled={loading || fetchingCouriers || !formMethods.getValues().url.trim()}
              className="mr-2"
            >
              {fetchingCouriers ? 'Testing...' : 'Test API Connection Only'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClient;
