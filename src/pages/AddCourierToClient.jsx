import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { getClientById, addCourier, linkClientsToCourier, getAvailableCouriersForClient } from '../lib/supabase-service';
import { testCourierApi } from '../lib/api-utils';
import { extractFieldPaths } from '../lib/field-extractor';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Stepper } from '../components/ui/stepper';
import RequestBuilder from '../components/request-builder';
import ResponseViewer from '../components/response-viewer';
import TokenGenerator from '../components/token-generator';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../components/ui/form';

const AddCourierToClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [courier, setCourier] = useState(null);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const [jsFileGenerated, setJsFileGenerated] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState([]);

  // Define the steps for the stepper
  const steps = [
    { label: "Courier Details", description: "Basic information" },
    { label: "Authentication", description: "Configure authentication" },
    { label: "Test API", description: "Test connection" },
    { label: "Map Fields", description: "Map fields & generate JS" }
  ];

  const form = useForm({
    defaultValues: {
      courier_name: '',
      method: 'GET',
      url: '',
      apiIntent: 'track_shipment',
      testDocket: '',
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

  // Fetch client details and available couriers on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get client details
        const clientData = await getClientById(clientId);
        if (!clientData) {
          throw new Error('Client not found');
        }
        setClient(clientData);

        // Check if client has an API URL
        if (clientData.api_url) {
          try {
            // Get available couriers from the client's API
            const availableCouriers = await getAvailableCouriersForClient(clientId, clientData.api_url);

            if (availableCouriers && availableCouriers.length > 0) {
              // Set the available couriers
              setAvailableCouriers(availableCouriers);

              // Pre-select the first courier
              form.setValue('courier_name', availableCouriers[0].name);

              // If the courier has an API URL, pre-fill it
              if (availableCouriers[0].api_base_url) {
                form.setValue('url', availableCouriers[0].api_base_url);
              }
            } else {
              console.log('No available couriers found for this client');
            }
          } catch (apiError) {
            console.error('Error fetching couriers from API:', apiError);
            // Don't fail the whole component if API fetch fails
          }
        }
      } catch (err) {
        console.error('Error fetching client:', err);
        setError({
          message: err.message || 'Failed to load client',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, form]);

  // Watch for auth type to conditionally show token generator
  const authType = form.watch('auth.type');
  const authToken = form.watch('auth.token');
  // Watch for courier name to validate navigation
  const courierName = form.watch('courier_name');

  // Handle token generation success
  const handleTokenGenerated = (token) => {
    setTokenGenerated(true);

    // Add Authorization header if not already present
    const currentHeaders = form.getValues('headers') || [];
    const hasAuthHeader = currentHeaders.some(h => h.key.toLowerCase() === 'authorization');

    if (!hasAuthHeader && token) {
      const updatedHeaders = [
        ...currentHeaders,
        { key: 'Authorization', value: `Bearer ${token}` }
      ];
      form.setValue('headers', updatedHeaders);
    }

    toast.success('Token generated and applied to Authorization header');
  };

  // Navigate to the next step
  const goToNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Navigate to the previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if the courier details are valid for moving to the next step
  const isCourierDetailsValid = () => {
    return courierName && courierName.trim() !== '';
  };

  // Handle refreshing the courier list
  const handleRefreshCouriers = async () => {
    if (!client || !client.api_url) {
      toast.error('Client does not have an API URL configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get available couriers from the client's API
      const refreshedCouriers = await getAvailableCouriersForClient(clientId, client.api_url);

      if (refreshedCouriers && refreshedCouriers.length > 0) {
        setAvailableCouriers(refreshedCouriers);
        toast.success(`Found ${refreshedCouriers.length} available couriers`);

        // Pre-select the first courier
        form.setValue('courier_name', refreshedCouriers[0].name);

        // If the courier has an API URL, pre-fill it
        if (refreshedCouriers[0].api_base_url) {
          form.setValue('url', refreshedCouriers[0].api_base_url);
        }
      } else {
        toast.warning('No available couriers found for this client');
        setAvailableCouriers([]);
      }
    } catch (err) {
      console.error('Error refreshing couriers:', err);
      setError({
        message: err.message || 'Failed to refresh couriers',
        details: err
      });
      toast.error('Failed to refresh couriers: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Check if the auth details are valid for moving to the next step
  const isAuthValid = () => {
    const authTypeValue = form.getValues('auth.type');

    // If auth type is 'none', we can always proceed
    if (authTypeValue === 'none') {
      return true;
    }

    // If JWT auth is selected, check if token is generated
    if (authTypeValue === 'jwt_auth') {
      return tokenGenerated || (authToken && authToken.trim() !== '');
    }

    // For Bearer or JWT token, just check if a token is provided
    if (authTypeValue === 'bearer' || authTypeValue === 'jwt') {
      return authToken && authToken.trim() !== '';
    }

    // For basic auth, both username and password are required
    if (authTypeValue === 'basic') {
      const username = form.getValues('auth.username');
      const password = form.getValues('auth.password');
      return username && password;
    }

    // For API key, the key is required
    if (authTypeValue === 'apikey') {
      const apiKey = form.getValues('auth.apiKey');
      return apiKey && apiKey.trim() !== '';
    }

    // Default case - allow proceeding
    return true;
  };

  // Handle field mapping changes
  const handleMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
  };

  // Handle form submission
  const onSubmit = async (data) => {
    console.log('Form submitted with data:', data);
    try {
      // Validate test_docket is provided when API intent is track_shipment
      if (data.apiIntent === 'track_shipment' && !data.testDocket) {
        console.log('Validation error: Test docket required for shipment tracking');
        form.setError('testDocket', {
          type: 'required',
          message: 'Test docket number is required for shipment tracking'
        });

        // Manually trigger validation to show the error
        form.trigger('testDocket');

        // Focus on the testDocket field
        const testDocketInput = document.querySelector('input[name="testDocket"]');
        if (testDocketInput) {
          testDocketInput.focus();
        }

        return;
      }

      setSubmitting(true);
      console.log('Testing API connection...', data);

      // Create request config object
      const requestConfig = {
        url: data.url,
        method: data.method,
        apiIntent: data.apiIntent,
        auth: data.auth,
        headers: data.headers,
        queryParams: data.queryParams,
        body: data.body,
        testDocket: data.testDocket,
        isFormUrlEncoded: data.isFormUrlEncoded
      };

      // Reset any previous API errors
      setApiError(null);

      // Test API connection with real API calls
      console.log('Making real API call for testing');
      const response = await testCourierApi(requestConfig);

      // Check if the response contains an error
      if (response.error) {
        setApiError(response);
        setApiResponse(response);
        toast.error(`API test failed: ${response.message}`);
        throw new Error(`API call failed: ${response.message}`);
      }

      // Create courier object for saving
      let apiKey = null;
      let username = null;
      let password = null;
      let authEndpoint = null;

      // Set auth-related fields based on auth type
      switch (data.auth.type) {
        case 'basic':
          username = data.auth.username;
          password = data.auth.password;
          break;

        case 'bearer':
        case 'jwt':
          apiKey = data.auth.token;
          break;

        case 'jwt_auth':
          // Store JWT auth configuration in username field as JSON
          username = JSON.stringify({
            endpoint: data.auth.jwtAuthEndpoint,
            method: data.auth.jwtAuthMethod,
            headers: data.auth.jwtAuthHeaders,
            body: data.auth.jwtAuthBody,
            tokenPath: data.auth.jwtTokenPath
          });
          // If we already fetched a token during testing, store it
          if (data.auth.token) {
            apiKey = data.auth.token;
          }
          authEndpoint = data.auth.jwtAuthEndpoint;
          break;

        case 'oauth':
          username = data.auth.clientId;
          password = data.auth.clientSecret;
          authEndpoint = data.auth.tokenEndpoint;
          break;

        case 'apikey':
          apiKey = data.auth.apiKey;
          // Store API key name and location in username field as JSON
          username = JSON.stringify({
            name: data.auth.apiKeyName,
            location: data.auth.apiKeyLocation
          });
          break;
      }

      const courierData = {
        name: data.courier_name,
        api_base_url: new URL(data.url).origin,
        auth_type: data.auth.type,
        api_key: apiKey,
        username: username,
        password: password,
        auth_endpoint: authEndpoint,
        auth_method: data.method,
        api_intent: data.apiIntent
      };

      // Save courier
      const savedCourier = await addCourier(courierData);
      setCourier(savedCourier);
      setApiResponse(response);

      // Link the courier to this client
      await linkClientsToCourier(savedCourier.id, [clientId]);

      // Show success message
      toast.success(`API test successful! Courier "${data.courier_name}" added to ${client.name}`);

      // Extract field paths from response
      console.log('Extracting field paths from API response');
      let paths = [];

      try {
        // If this is an error response, try to extract fields from the details
        if (response.error === true) {
          console.log('API response contains an error, extracting fields from error details');
          if (response.details && typeof response.details === 'object') {
            paths = extractFieldPaths(response.details);
          }
        } else {
          // For successful responses, extract fields from the data
          paths = extractFieldPaths(response);
        }

        // Create mapping objects with courier ID
        const mappings = paths.map(path => ({
          api_field: path,
          tms_field: '',
          courier_id: savedCourier.id,
          api_type: data.apiIntent
        }));

        setFieldMappings(mappings);
        console.log(`Extracted ${mappings.length} field paths from response`);

        // Move to the next step
        setCurrentStep(4); // Move to Field Mapping step
      } catch (extractError) {
        console.error('Error extracting field paths from response:', extractError);
        // If field extraction fails, still show success for the API test
        toast.warning('API test successful, but field extraction failed');
      }
    } catch (err) {
      console.error('Error testing API:', err);
      setError({
        message: err.message || 'Failed to add courier',
        details: err
      });
      toast.error('Failed to add courier: ' + (err.message || 'Unknown error'));
      if (!apiError) {
        setApiError({
          error: true,
          message: err.message,
          status: 'Error',
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(`/client/${clientId}`)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {client.name}
        </Button>
        <h1 className="text-2xl font-bold">Add Courier to {client.name}</h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      )}

      {/* Stepper navigation */}
      <div className="mb-8">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Courier Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Courier</CardTitle>
                {client?.api_url && (
                  <p className="text-sm text-gray-500">
                    Select a courier from the list of available couriers for {client.name}.
                    These couriers were fetched from the client's API.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {availableCouriers.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded border">
                    <p className="text-gray-500 mb-4">No available couriers found for this client</p>
                    <p className="text-sm text-gray-500 mb-4">
                      All couriers from the client's API may already be linked to this client.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button
                        variant="outline"
                        onClick={handleRefreshCouriers}
                        disabled={loading || !client?.api_url}
                      >
                        {loading ? 'Refreshing...' : 'Refresh Couriers'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/client/${clientId}`)}
                      >
                        Return to Client
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="courier_name"
                    rules={{ required: "Please select a courier" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Courier</FormLabel>
                        <FormControl>
                          <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Force validation check after each change
                              form.trigger('courier_name');

                              // Auto-fill other fields based on selection
                              const selectedCourier = availableCouriers.find(c => c.name === e.target.value);
                              if (selectedCourier) {
                                if (selectedCourier.api_base_url) {
                                  form.setValue('url', selectedCourier.api_base_url);
                                }
                                if (selectedCourier.auth_type) {
                                  form.setValue('auth.type', selectedCourier.auth_type);
                                }
                              }
                            }}
                          >
                            <option value="">-- Select a Courier --</option>
                            {availableCouriers.map((courier) => (
                              <option key={courier.name} value={courier.name}>
                                {courier.name} {courier.supportsPTL ? '(Supports PTL)' : ''}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormDescription>
                          Select a courier from the list to configure its integration.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {availableCouriers.length > 0 && (
                  <div className="flex justify-between items-center space-x-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRefreshCouriers}
                      disabled={loading}
                    >
                      {loading ? 'Refreshing...' : 'Refresh Couriers'}
                    </Button>
                    <Button
                      type="button"
                      onClick={goToNextStep}
                      disabled={!isCourierDetailsValid()}
                    >
                      Next: Authentication
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Authentication */}
          {currentStep === 2 && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Authentication Details</CardTitle>
                  <p className="text-sm text-gray-500">
                    Select the authentication method required by the courier API.
                    If no authentication is needed, select "No Authentication" or use the "Skip Authentication" button.
                  </p>
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                    <p className="text-blue-700">
                      <strong>For token authentication:</strong> Select "JWT Authentication (Generate Token)"
                      from the dropdown below, then enter the auth endpoint URL
                      in the form that will appear. This will allow you to generate a token that will be used in the next step.
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="auth.type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication Type</FormLabel>
                        <FormControl>
                          <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            {...field}
                          >
                            <option value="none">No Authentication</option>
                            <option value="basic">Basic Authentication</option>
                            <option value="apikey">API Key</option>
                            <option value="bearer">Bearer Token</option>
                            <option value="jwt_auth">JWT Authentication (Generate Token)</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Render different auth fields based on selected type */}
                  {authType === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="auth.username"
                        rules={{ required: "Username is required for Basic Auth" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="auth.password"
                        rules={{ required: "Password is required for Basic Auth" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {authType === 'apikey' && (
                    <div className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="auth.apiKey"
                        rules={{ required: "API Key is required" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter API key" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {authType === 'bearer' && (
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="auth.token"
                        rules={{ required: "Bearer token is required" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bearer Token</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter bearer token" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Show Token Generator for JWT auth inside the card */}
                  {authType === 'jwt_auth' && (
                    <div className="mt-6 mb-6 border-t border-gray-200 pt-6">
                      <TokenGenerator
                        formMethods={form}
                        onTokenGenerated={handleTokenGenerated}
                      />
                    </div>
                  )}

                  <div className="flex justify-between mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToPreviousStep}
                    >
                      Back
                    </Button>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          console.log('Skipping authentication step');
                          setCurrentStep(3);  // Skip to Test API step
                        }}
                      >
                        Skip Authentication
                      </Button>
                      <Button
                        type="button"
                        onClick={goToNextStep}
                        disabled={!isAuthValid()}
                      >
                        Next: Test API
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 3: API Testing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test API</CardTitle>
                  {tokenGenerated && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700">
                          <span className="font-medium">Authentication Token:</span> Successfully generated in the previous step and automatically included in headers
                        </span>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <RequestBuilder
                    formMethods={form}
                    onSubmit={onSubmit}
                    loading={submitting}
                    showCurlInput={true}
                    showApiIntents={true}
                  />
                </CardContent>
              </Card>

              {apiResponse && (
                <Card>
                  <CardHeader>
                    <CardTitle>API Response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponseViewer response={apiResponse} />
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                >
                  Back
                </Button>
                {apiResponse && !apiResponse.error && (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                  >
                    Next: Map Fields
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Field Mapping */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Field Mapping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {apiResponse && (
                  <>
                    <div>
                      <h3 className="text-md font-medium mb-2">API Response</h3>
                      <div className="bg-gray-50 p-4 rounded border overflow-auto max-h-40">
                        <pre className="text-xs text-gray-600 font-mono">
                          {JSON.stringify(apiResponse, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-md font-medium mb-2">Map Fields</h3>
                      <div className="border rounded overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">API Field Path</th>
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">TMS Field</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {fieldMappings.map((mapping, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="py-2 px-4 text-sm font-mono text-gray-500">
                                  {mapping.api_field}
                                </td>
                                <td className="py-2 px-4">
                                  <select
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    value={mapping.tms_field || ''}
                                    onChange={(e) => {
                                      const updatedMappings = [...fieldMappings];
                                      updatedMappings[index].tms_field = e.target.value;
                                      handleMappingChange(updatedMappings);
                                    }}
                                  >
                                    <option value="">-- Select TMS Field --</option>
                                    <option value="tracking_number">Tracking Number</option>
                                    <option value="status">Status</option>
                                    <option value="delivery_date">Delivery Date</option>
                                    <option value="current_location">Current Location</option>
                                    <option value="recipient_name">Recipient Name</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-between space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goToPreviousStep}
                      >
                        Back
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          onClick={() => navigate(`/client/${clientId}`)}
                        >
                          Finish & Return to Client
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Success Message after JS file generation */}
                {jsFileGenerated && (
                  <div className="p-4 border border-green-200 bg-green-50 rounded-md">
                    <h3 className="text-lg font-medium text-green-800 mb-2">JS File Generated Successfully!</h3>
                    <p className="text-green-700 mb-4">
                      The JS file has been generated and saved. You can view it in the courier details page.
                    </p>
                    <div className="flex justify-end">
                      <Link to={`/client/${clientId}`}>
                        <Button variant="default">Return to Client</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
};

export default AddCourierToClient;
