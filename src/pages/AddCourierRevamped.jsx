import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { testCourierApi } from '../lib/api-utils';
import { extractFieldPaths } from '../lib/field-extractor';
import { generateJsConfig } from '../lib/js-generator';
import { getTmsFields } from '../lib/edge-functions-service';
import { addCourier, addFieldMapping, saveApiTestResult, uploadJsFile } from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../components/ui/form';
import { Stepper } from '../components/ui/stepper';
import RequestBuilder from '../components/request-builder';
import ResponseViewer from '../components/response-viewer';
import TokenGenerator from '../components/token-generator';
import { ToastContainer } from '../components/ui/toast';
import { useToast } from '../components/ui/use-toast';

const AddCourierRevamped = () => {
  // State variables
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [courier, setCourier] = useState(null);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [tmsFields, setTmsFields] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [jsFileGenerated, setJsFileGenerated] = useState(false);
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  // Define the steps for the stepper (updated with token generation step)
  const steps = [
    { label: "Courier Details", description: "Basic information" },
    { label: "Authentication", description: "Configure authentication" },
    { label: "Test API", description: "Test connection" },
    { label: "Map Fields", description: "Map fields & generate JS" }
  ];

  // Initialize form
  const formMethods = useForm({
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

  // Watch for auth type to conditionally show token generator
  const authType = formMethods.watch('auth.type');
  const authToken = formMethods.watch('auth.token');
  // Watch for courier name to validate navigation
  const courierName = formMethods.watch('courier_name');

  // We're using formMethods directly in the components, so we don't need to destructure here

  // Fetch TMS fields on component mount
  useEffect(() => {
    const fetchTmsFields = async () => {
      try {
        const fields = await getTmsFields();
        setTmsFields(fields);
      } catch (error) {
        console.error('Error fetching TMS fields:', error);
      }
    };

    fetchTmsFields();
  }, []);

  // Handle token generation success
  const handleTokenGenerated = (token) => {
    setTokenGenerated(true);
    
    // Add Authorization header if not already present
    const currentHeaders = formMethods.getValues('headers') || [];
    const hasAuthHeader = currentHeaders.some(h => h.key.toLowerCase() === 'authorization');
    
    if (!hasAuthHeader && token) {
      const updatedHeaders = [
        ...currentHeaders,
        { key: 'Authorization', value: `Bearer ${token}` }
      ];
      formMethods.setValue('headers', updatedHeaders);
    }
    
    addToast('Token generated and applied to Authorization header', 'success');
  };

  // Handle form submission
  const onSubmit = async (data) => {
    console.log('Form submitted with data:', data);
    try {
      // Validate test_docket is provided when API intent is track_shipment
      if (data.apiIntent === 'track_shipment' && !data.testDocket) {
        console.log('Validation error: Test docket required for shipment tracking');
        formMethods.setError('testDocket', {
          type: 'required',
          message: 'Test docket number is required for shipment tracking'
        });

        // Manually trigger validation to show the error
        formMethods.trigger('testDocket');

        // Focus on the testDocket field
        const testDocketInput = document.querySelector('input[name="testDocket"]');
        if (testDocketInput) {
          testDocketInput.focus();
        }

        return;
      }

      setLoading(true);
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
        addToast(`API test failed: ${response.message}`, 'error');
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
      
      // Show success toast
      addToast('API test successful!', 'success');

      // Save API test result
      await saveApiTestResult({
        courier_id: savedCourier.id,
        api_endpoint: data.url,
        api_intent: data.apiIntent,
        request_payload: {
          method: data.method,
          headers: data.headers,
          queryParams: data.queryParams,
          body: data.body
        },
        response_data: response,
        success: true,
        error_message: null
      });

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
        addToast('API test successful, but field extraction failed', 'warning');
      }
    } catch (error) {
      console.error('Error testing API:', error);
      if (!apiError) {
        setApiError({
          error: true,
          message: error.message,
          status: 'Error',
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
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
    // Use the watched value instead of getValues to ensure reactivity
    console.log('Courier name validation:', {
      courierName,
      isEmpty: !courierName || courierName.trim() === '',
      isValid: courierName && courierName.trim() !== ''
    });
    return courierName && courierName.trim() !== '';
  };
  
  // Check if the auth details are valid for moving to the next step
  const isAuthValid = () => {
    const authTypeValue = formMethods.getValues('auth.type');
    
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
      const username = formMethods.getValues('auth.username');
      const password = formMethods.getValues('auth.password');
      return username && password;
    }
    
    // For API key, the key is required
    if (authTypeValue === 'apikey') {
      const apiKey = formMethods.getValues('auth.apiKey');
      return apiKey && apiKey.trim() !== '';
    }
    
    // Default case - allow proceeding
    return true;
  };

  // Handle field mapping changes
  const handleMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
  };
  
  // Save field mappings
  const saveMappings = async () => {
    try {
      setLoading(true);
  
      // Filter out mappings without a TMS field or with "none" value
      const validMappings = fieldMappings.filter(mapping =>
        mapping.tms_field && mapping.tms_field !== 'none'
      );
  
      if (validMappings.length === 0) {
        addToast('Please map at least one field before saving.', 'warning');
        setLoading(false);
        return;
      }
  
      // Save each mapping
      for (const mapping of validMappings) {
        await addFieldMapping(mapping);
      }
  
      addToast('Mappings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving mappings:', error);
      addToast(`Error saving mappings: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate, download, and store JS file
  const generateJsFile = async () => {
    try {
      if (!courier) return;
  
      const validMappings = fieldMappings.filter(mapping =>
        mapping.tms_field && mapping.tms_field !== 'none'
      );
      if (validMappings.length === 0) {
        addToast('Please map at least one field before generating a JS file.', 'warning');
        return;
      }
  
      setLoading(true);
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
  
      // Upload to Supabase
      console.log('Uploading JS file to Supabase...');
      const result = await uploadJsFile(courier.id, fileName, jsCode);
      console.log('Upload result:', result);
  
      // Set JS file generated flag to true
      setJsFileGenerated(true);
  
      if (result && result.success) {
        // Success with possible message
        addToast('JS file generated and downloaded successfully!', 'success');
      } else if (result && result.warning) {
        // Show warning but still consider it a success since the file was generated
        addToast(`JS file generated successfully! Note: ${result.warning}`, 'warning');
      } else {
        // Generic success message
        addToast('JS file generated and downloaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error generating JS file:', error);
      addToast(`Error generating JS file: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add Courier</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {/* Stepper navigation */}
      <div className="mb-8">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      <Form formMethods={formMethods} onSubmit={onSubmit} className="space-y-8">
        {/* Step 1: Courier Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Courier Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={formMethods.control}
                name="courier_name"
                rules={{ required: "Courier name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courier Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter courier name" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          // Force validation check after each change
                          formMethods.trigger('courier_name');
                          // Log the current value
                          console.log('Input changed:', e.target.value, {
                            isDirty: formMethods.formState.isDirty,
                            dirtyFields: formMethods.formState.dirtyFields,
                            courierName
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4 mt-6">
                <Button 
                  type="button" 
                  onClick={() => {
                    console.log('Next button clicked, validation state:', isCourierDetailsValid());
                    goToNextStep();
                  }}
                  disabled={!isCourierDetailsValid()}
                >
                  Next: Authentication
                </Button>
              </div>
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
              </CardHeader>
              <CardContent>
                <FormField
                  control={formMethods.control}
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
                      control={formMethods.control}
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
                      control={formMethods.control}
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
                      control={formMethods.control}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={formMethods.control}
                        name="auth.apiKeyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key Name</FormLabel>
                            <FormControl>
                              <Input placeholder="X-API-Key" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={formMethods.control}
                        name="auth.apiKeyLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key Location</FormLabel>
                            <FormControl>
                              <select
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                {...field}
                              >
                                <option value="header">Header</option>
                                <option value="query">Query Parameter</option>
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {authType === 'bearer' && (
                  <div className="mt-4">
                    <FormField
                      control={formMethods.control}
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
            
            {/* Show Token Generator for JWT auth */}
            {authType === 'jwt_auth' && (
              <TokenGenerator 
                formMethods={formMethods}
                onTokenGenerated={handleTokenGenerated}
              />
            )}
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
                  formMethods={formMethods}
                  onSubmit={onSubmit}
                  loading={loading}
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
                                  {tmsFields.map(field => (
                                    <option key={field.id} value={field.name}>
                                      {field.display_name || field.name}
                                    </option>
                                  ))}
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
                        onClick={saveMappings}
                        disabled={loading}
                      >
                        Save Mappings
                      </Button>
                      <Button
                        variant="default"
                        onClick={generateJsFile}
                        disabled={loading}
                      >
                        {loading ? 'Generating...' : 'Generate JS File'}
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
                    <Link to="/">
                      <Button variant="default">Return to Dashboard</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Form>
      
      {/* Toast container for notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default AddCourierRevamped;