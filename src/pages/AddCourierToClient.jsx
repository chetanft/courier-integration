import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { getClientById, addCourier, linkClientsToCourier, getCouriersByClientId, updateCourierJsFileStatus } from '../lib/supabase-service';
import { fetchCourierData } from '../lib/courier-api-service';
import { testCourierApi } from '../lib/api-utils';
import { extractFieldPaths } from '../lib/field-extractor';
import { generateJsConfig } from '../lib/js-generator';
import { parseCurl } from '../lib/curl-parser';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { KeyValueEditor } from '../components/ui/key-value-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
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
  const [searchParams] = useSearchParams();
  const courierParam = searchParams.get('courier');

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  // Courier state is set after successful API test and form submission
  const [, setCourier] = useState(null);
  const [fieldMappings, setFieldMappings] = useState([]);
  // Start with Authentication step (step 1) since courier selection is skipped
  const [currentStep, setCurrentStep] = useState(1);
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  // jsFileGenerated is used in the UI to show success message after JS file generation
  const [jsFileGenerated, setJsFileGenerated] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  // Track if the response is an auth token response
  const [isAuthResponse, setIsAuthResponse] = useState(false);

  // Define the steps for the stepper (removed first step since courier is pre-selected)
  const steps = [
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

        // If courier name is provided in the URL, set it in the form
        if (courierParam) {
          console.log(`Setting courier name from URL parameter: ${courierParam}`);
          form.setValue('courier_name', courierParam);
        }

        // Check if client has an API URL
        if (clientData.api_url) {
          try {
            // Log the API URL for debugging
            console.log(`Original API URL: ${clientData.api_url}`);

            // Check if the URL is encoded and decode it if necessary
            let apiUrl = clientData.api_url;
            if (apiUrl.includes('%')) {
              try {
                const decodedUrl = decodeURIComponent(apiUrl);
                console.log(`Decoded API URL: ${decodedUrl}`);
                apiUrl = decodedUrl;
              } catch (decodeError) {
                console.warn('Error decoding URL, will use original:', decodeError);
              }
            }

            // Directly fetch couriers from the client's API
            console.log(`Fetching couriers from API: ${apiUrl}`);
            const allCouriers = await fetchCourierData(apiUrl);

            if (allCouriers && allCouriers.length > 0) {
              console.log(`Found ${allCouriers.length} couriers in API response:`, allCouriers);

              // Get couriers already linked to this client to filter them out
              const linkedCouriers = await getCouriersByClientId(clientId);
              console.log(`Found ${linkedCouriers.length} linked couriers:`, linkedCouriers);

              const linkedCourierNames = linkedCouriers.map(c => c.name.toLowerCase());
              console.log('Linked courier names (lowercase):', linkedCourierNames);

              // Filter out already linked couriers
              const availableCouriersList = allCouriers.filter(c => {
                const courierName = (c.name || '').toLowerCase();
                const isLinked = linkedCourierNames.includes(courierName);
                console.log(`Courier ${courierName} is ${isLinked ? 'already linked' : 'available'}`);
                return !isLinked;
              });

              console.log(`After filtering, found ${availableCouriersList.length} available couriers`);

              if (availableCouriersList && availableCouriersList.length > 0) {
                // Set the available couriers
                setAvailableCouriers(availableCouriersList);
                console.log(`${availableCouriersList.length} couriers available to add`);

                // Pre-select the first courier
                form.setValue('courier_name', availableCouriersList[0].name);

                // If the courier has an API URL, pre-fill it
                if (availableCouriersList[0].api_base_url) {
                  form.setValue('url', availableCouriersList[0].api_base_url);
                }
              } else {
                console.log('All couriers from API are already linked to this client');
                toast.info('All couriers from API are already linked to this client');
              }
            } else {
              console.log('No couriers found in API response');
              toast.warning('No couriers found in the API response');
            }
          } catch (apiError) {
            console.error('Error fetching couriers from API:', apiError);
            console.error('Error details:', apiError);
            toast.error(`Error fetching couriers: ${apiError.message}`);
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
  }, [clientId, form, courierParam]);

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

      // Store the token in the form data for future use
      form.setValue('auth.token', token);
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
      // Log the API URL for debugging
      console.log(`Original API URL: ${client.api_url}`);

      // Check if the URL is encoded and decode it if necessary
      let apiUrl = client.api_url;
      if (apiUrl.includes('%')) {
        try {
          const decodedUrl = decodeURIComponent(apiUrl);
          console.log(`Decoded API URL: ${decodedUrl}`);
          apiUrl = decodedUrl;
        } catch (decodeError) {
          console.warn('Error decoding URL, will use original:', decodeError);
        }
      }

      // Directly fetch couriers from the client's API
      console.log(`Fetching couriers from API: ${apiUrl}`);
      const allCouriers = await fetchCourierData(apiUrl);

      if (!allCouriers || allCouriers.length === 0) {
        toast.warning('No couriers found in the API response');
        setAvailableCouriers([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${allCouriers.length} couriers in API response:`, allCouriers);

      // Get couriers already linked to this client
      const linkedCouriers = await getCouriersByClientId(clientId);
      console.log(`Found ${linkedCouriers.length} linked couriers:`, linkedCouriers);

      const linkedCourierNames = linkedCouriers.map(c => c.name.toLowerCase());
      console.log('Linked courier names (lowercase):', linkedCourierNames);

      // Filter out already linked couriers
      const refreshedCouriers = allCouriers.filter(c => {
        const courierName = (c.name || '').toLowerCase();
        const isLinked = linkedCourierNames.includes(courierName);
        console.log(`Courier ${courierName} is ${isLinked ? 'already linked' : 'available'}`);
        return !isLinked;
      });

      console.log(`After filtering, found ${refreshedCouriers.length} available couriers`);

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
      console.error('Error details:', err);

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

  // Check if the response contains an authentication token
  const checkIfAuthResponse = (response) => {
    if (!response || response.error) return false;

    // Check for common token fields in the response
    const tokenFields = ['token', 'access_token', 'id_token', 'jwt', 'auth_token', 'bearer_token'];

    // Check if any of these fields exist in the response
    for (const field of tokenFields) {
      if (response[field] ||
          (response.data && response.data[field]) ||
          (typeof response === 'string' && response.includes(field))) {
        return true;
      }
    }

    // Check if the response is a string that looks like a JWT token
    if (typeof response === 'string' &&
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(response)) {
      return true;
    }

    // Check if the response has a data property that looks like a JWT token
    if (response.data && typeof response.data === 'string' &&
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(response.data)) {
      return true;
    }

    return false;
  };

  // Extract token from response
  const extractTokenFromResponse = (response) => {
    if (!response) return null;

    // Common token field names
    const tokenFields = ['token', 'access_token', 'id_token', 'jwt', 'auth_token', 'bearer_token'];

    // Check direct properties
    for (const field of tokenFields) {
      if (response[field]) {
        return response[field];
      }
    }

    // Check nested data property
    if (response.data) {
      if (typeof response.data === 'string') {
        // Check if data is a JWT token
        if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(response.data)) {
          return response.data;
        }
      } else if (typeof response.data === 'object') {
        // Check data object for token fields
        for (const field of tokenFields) {
          if (response.data[field]) {
            return response.data[field];
          }
        }
      }
    }

    // If response itself is a string and looks like a JWT token
    if (typeof response === 'string' &&
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(response)) {
      return response;
    }

    return null;
  };

  // Handle field mapping changes
  const handleMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
  };

  // Generate JS file
  const generateJsFile = async () => {
    try {
      if (!courier) {
        toast.error('No courier data available');
        return;
      }

      // Filter out mappings without TMS fields
      const validMappings = fieldMappings.filter(mapping =>
        mapping.tms_field && mapping.tms_field !== ''
      );

      if (validMappings.length === 0) {
        toast.warning('Please map at least one field before generating a JS file');
        return;
      }

      setSubmitting(true);

      // Generate JS code
      const jsCode = generateJsConfig(courier, validMappings);
      const fileName = `${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_mapping.js`;

      // Create download link
      const blob = new Blob([jsCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update courier status in database
      await updateCourierJsFileStatus(courier.id, fileName, jsCode);

      // Show success message with navigation option
      toast.success(
        'JS file generated and downloaded successfully!',
        {
          action: {
            label: 'View Client',
            onClick: () => navigate(`/client/${clientId}`)
          },
          duration: 5000
        }
      );

      // Set a flag to show success message in the UI
      setJsFileGenerated(true);
    } catch (error) {
      console.error('Error generating JS file:', error);
      toast.error(`Error generating JS file: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
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

      // Create a patched version of testCourierApi that handles token refreshing
      const patchedTestCourierApi = async (config) => {
        try {
          return await testCourierApi(config);
        } catch (error) {
          // Check if this is an authentication error
          const isAuthError = error.response?.status === 401 ||
                             (error.response?.data?.error &&
                              (error.response?.data?.message?.toLowerCase().includes('unauthorized') ||
                               error.response?.data?.message?.toLowerCase().includes('token expired') ||
                               error.response?.data?.message?.toLowerCase().includes('invalid token')));

          if (isAuthError && config.auth?.jwtAuthEndpoint) {
            setTokenRefreshing(true);
            toast.info('Token expired. Attempting to refresh...');

            try {
              // Let the original function handle the refresh
              const result = await testCourierApi(config);
              setTokenRefreshing(false);
              toast.success('Token refreshed successfully');
              return result;
            } catch (refreshError) {
              setTokenRefreshing(false);
              toast.error('Failed to refresh token');
              throw refreshError;
            }
          }

          throw error;
        }
      };

      const response = await patchedTestCourierApi(requestConfig);

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
        setCurrentStep(3); // Move to Field Mapping step (now step 3)
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
        <h1 className="text-2xl font-bold">Configure {courierParam || 'Courier'} for {client.name}</h1>
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
          {/* Step 1: Authentication (first step now) */}
          {currentStep === 1 && (
            <>
              {/* API URL and cURL Command Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <p className="text-sm text-gray-500">
                    Enter the API URL or paste a cURL command to configure the API request.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* URL and Method */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      {/* HTTP Method */}
                      <FormField
                        control={form.control}
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
                          control={form.control}
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

                    {/* cURL Command */}
                    <FormField
                      control={form.control}
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
                                onClick={() => {
                                  try {
                                    if (!field.value.trim()) {
                                      toast.warning('Empty cURL command, skipping parse');
                                      return;
                                    }

                                    console.log('Raw cURL command:', field.value);

                                    // Check for --header parameter
                                    if (field.value.includes('--header')) {
                                      console.log('Command contains --header parameter');
                                    }

                                    const parsed = parseCurl(field.value);
                                    console.log('Successfully parsed cURL command:', parsed);

                                    // Log detailed information for debugging
                                    console.log('Parsed URL:', parsed.url);
                                    console.log('Parsed method:', parsed.method);
                                    console.log('Parsed headers:', parsed.headers);
                                    console.log('Parsed auth:', parsed.auth);
                                    console.log('Parsed body:', parsed.body);

                                    // Update form values with parsed data
                                    form.setValue('method', parsed.method);
                                    form.setValue('url', parsed.url);

                                    // Set auth type
                                    form.setValue('auth.type', parsed.auth.type);

                                    // Set auth credentials based on type
                                    form.setValue('auth.username', parsed.auth.username);
                                    form.setValue('auth.password', parsed.auth.password);
                                    form.setValue('auth.token', parsed.auth.token);

                                    // Set headers
                                    if (parsed.headers && parsed.headers.length > 0) {
                                      console.log('Setting headers in form:', parsed.headers);
                                      form.setValue('headers', parsed.headers);

                                      // Force a re-render of the headers section
                                      setTimeout(() => {
                                        const currentHeaders = form.getValues('headers');
                                        console.log('Current headers after setting:', currentHeaders);
                                      }, 100);
                                    } else {
                                      console.log('No headers found in parsed cURL');

                                      // Check if we need to add a Content-Type header for form-urlencoded data
                                      if (parsed.isFormUrlEncoded) {
                                        console.log('Adding Content-Type header for form-urlencoded data');
                                        form.setValue('headers', [
                                          { key: 'Content-Type', value: 'application/x-www-form-urlencoded' }
                                        ]);

                                        setTimeout(() => {
                                          const currentHeaders = form.getValues('headers');
                                          console.log('Current headers after adding Content-Type:', currentHeaders);
                                        }, 100);
                                      }
                                    }

                                    // Set body for POST/PUT/PATCH
                                    if (['POST', 'PUT', 'PATCH'].includes(parsed.method) && parsed.body) {
                                      console.log('Setting body in form:', parsed.body);
                                      form.setValue('body', parsed.body);

                                      // If body is form-urlencoded, set the flag
                                      if (parsed.isFormUrlEncoded) {
                                        console.log('Setting isFormUrlEncoded to true');
                                        form.setValue('isFormUrlEncoded', true);
                                      }
                                    }

                                    toast.success('cURL command parsed successfully');
                                  } catch (e) {
                                    console.error('Error parsing cURL command:', e);
                                    toast.error('Error parsing cURL command: ' + e.message);
                                  }
                                }}
                                className="self-end"
                              >
                                Parse
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Paste a cURL command to automatically fill the form
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Headers */}
                    <FormField
                      control={form.control}
                      name="headers"
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
                          <FormDescription>
                            Add HTTP headers for the request
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Query Parameters */}
                    <FormField
                      control={form.control}
                      name="queryParams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Query Parameters</FormLabel>
                          <FormControl>
                            <KeyValueEditor
                              value={field.value || []}
                              onChange={field.onChange}
                              keyPlaceholder="Parameter name"
                              valuePlaceholder="Parameter value"
                            />
                          </FormControl>
                          <FormDescription>
                            Add query parameters for the request
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Request Body (for POST/PUT/PATCH) */}
                    {['POST', 'PUT', 'PATCH'].includes(form.watch('method')) && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="isFormUrlEncoded"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Use form URL encoded</FormLabel>
                                <FormDescription>
                                  Send data as application/x-www-form-urlencoded instead of JSON
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />



                        <FormField
                          control={form.control}
                          name="body"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Request Body</FormLabel>
                              <FormControl>
                                {form.watch('isFormUrlEncoded') ? (
                                  <KeyValueEditor
                                    value={Object.entries(field.value || {}).map(([key, value]) => ({ key, value }))}
                                    onChange={(items) => {
                                      const bodyObj = {};
                                      items.forEach(item => {
                                        if (item.key) bodyObj[item.key] = item.value;
                                      });
                                      field.onChange(bodyObj);
                                    }}
                                    keyPlaceholder="Field name"
                                    valuePlaceholder="Field value"
                                  />
                                ) : (
                                  <Textarea
                                    placeholder='{"key": "value"}'
                                    className="font-mono min-h-[150px]"
                                    value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : field.value || ''}
                                    onChange={(e) => {
                                      try {
                                        const value = e.target.value.trim() ? JSON.parse(e.target.value) : {};
                                        field.onChange(value);
                                      } catch (err) {
                                        // Allow invalid JSON during typing
                                        field.onChange(e.target.value);
                                      }
                                    }}
                                  />
                                )}
                              </FormControl>
                              <FormDescription>
                                {form.watch('isFormUrlEncoded')
                                  ? 'Add form fields to send in the request body'
                                  : 'Enter JSON data to send in the request body'}
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* API Intent (for tracking APIs) */}
                    <FormField
                      control={form.control}
                      name="apiIntent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Intent</FormLabel>
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
                              <SelectItem value="authentication">Authentication</SelectItem>
                              <SelectItem value="track_shipment">Track Shipment</SelectItem>
                              <SelectItem value="create_shipment">Create Shipment</SelectItem>
                              <SelectItem value="cancel_shipment">Cancel Shipment</SelectItem>
                              <SelectItem value="generate_label">Generate Label</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the purpose of this API call
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Test Docket Number (for tracking APIs) */}
                    {form.watch('apiIntent') === 'track_shipment' && (
                      <FormField
                        control={form.control}
                        name="testDocket"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Docket/AWB Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter a test tracking number" {...field} />
                            </FormControl>
                            <FormDescription>
                              This will be used to test the tracking API
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Test Button */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => {
                          // Create request config from form data
                          const data = form.getValues();
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

                          // Test the API
                          setSubmitting(true);
                          setApiError(null);

                          testCourierApi(requestConfig)
                            .then(response => {
                              setApiResponse(response);

                              // Check if this is an auth token response
                              const isAuthResponse = checkIfAuthResponse(response);
                              setIsAuthResponse(isAuthResponse);

                              if (response.error) {
                                setApiError(response);
                                toast.error(`API test failed: ${response.message}`);
                              } else {
                                toast.success('API test successful!');
                              }
                            })
                            .catch(error => {
                              console.error('Error testing API:', error);
                              toast.error(`Error testing API: ${error.message}`);
                              setApiError({
                                error: true,
                                message: error.message,
                                status: 'Error',
                                timestamp: new Date().toISOString()
                              });
                            })
                            .finally(() => {
                              setSubmitting(false);
                            });
                        }}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Test API'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Response Card */}
              {apiResponse && (
                <Card className="mb-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>API Response</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Copy response to clipboard
                        navigator.clipboard.writeText(JSON.stringify(apiResponse, null, 2))
                          .then(() => toast.success('Response copied to clipboard'))
                          .catch(err => toast.error('Failed to copy: ' + err.message));
                      }}
                    >
                      Copy Response
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ResponseViewer apiResponse={apiResponse} />
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              {apiResponse && (
                <div className="flex justify-between mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/client/${clientId}`)}
                  >
                    Back to Client
                  </Button>
                  <div className="space-x-2">
                    {/* If it's an auth response, offer to add another API or move to field mapping */}
                    {isAuthResponse ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            // Save the auth token for later use
                            const token = extractTokenFromResponse(apiResponse);
                            if (token) {
                              form.setValue('auth.token', token);
                              form.setValue('auth.type', 'bearer');

                              // Add Authorization header if not already present
                              const currentHeaders = form.getValues('headers') || [];
                              const hasAuthHeader = currentHeaders.some(h => h.key.toLowerCase() === 'authorization');

                              if (!hasAuthHeader) {
                                const updatedHeaders = [
                                  ...currentHeaders,
                                  { key: 'Authorization', value: `Bearer ${token}` }
                                ];
                                form.setValue('headers', updatedHeaders);
                              }

                              // Clear the form for a new API request
                              form.setValue('url', '');
                              form.setValue('method', 'GET');
                              form.setValue('curlCommand', '');
                              setApiResponse(null);

                              toast.success('Auth token saved and applied to headers');
                            }
                          }}
                        >
                          Use Token & Add Another API
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            // Clear the form for a new API request
                            form.setValue('url', '');
                            form.setValue('method', 'GET');
                            form.setValue('curlCommand', '');
                            setApiResponse(null);
                          }}
                        >
                          Add Another API
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      onClick={() => {
                        // Extract field paths from response
                        try {
                          let paths = extractFieldPaths(apiResponse);

                          // Create mapping objects
                          const mappings = paths.map(path => ({
                            api_field: path,
                            tms_field: '',
                            courier_id: null,
                            api_type: form.getValues('apiIntent')
                          }));

                          setFieldMappings(mappings);
                          setCurrentStep(3); // Skip to Field Mapping step
                        } catch (error) {
                          console.error('Error extracting field paths:', error);
                          toast.error('Error extracting field paths: ' + error.message);
                        }
                      }}
                    >
                      Next: Map Fields
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}



          {/* Step 2: API Testing */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test API</CardTitle>
                  {tokenGenerated && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700">
                          <span className="font-medium">Authentication Token:</span> Successfully generated in the previous step and automatically included in headers
                          {tokenRefreshing && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Refreshing token...
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-green-600">
                        <p>• The token has been added as an Authorization header</p>
                        <p>• If the token expires during testing, the system will attempt to refresh it automatically</p>
                        <p>• The token configuration will be saved in the generated JS file for future use</p>
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
                    <ResponseViewer apiResponse={apiResponse} />
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

          {/* Step 3: Field Mapping */}
          {currentStep === 3 && (
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
                          variant="outline"
                          onClick={() => navigate(`/client/${clientId}`)}
                        >
                          Return to Client
                        </Button>
                        <Button
                          variant="default"
                          onClick={generateJsFile}
                          disabled={submitting || fieldMappings.filter(m => m.tms_field).length === 0}
                        >
                          {submitting ? 'Generating...' : 'Generate JS File'}
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
