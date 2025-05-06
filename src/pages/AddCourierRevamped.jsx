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

const AddCourierRevamped = () => {
  // State variables
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  // apiError is used in setApiError but not directly in the component
  const [, setApiError] = useState(null);
  const [courier, setCourier] = useState(null);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [tmsFields, setTmsFields] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [jsFileGenerated, setJsFileGenerated] = useState(false);

  // Define the steps for the stepper
  const steps = [
    { label: "API Details", description: "Configure API request" },
    { label: "Response", description: "View API response" },
    { label: "Mapping", description: "Map fields & generate JS" }
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

        // Show a more visible alert to the user
        alert('Please enter a test docket number for shipment tracking');
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

      // If using JWT Token Auth, update the UI to show loading state
      if (data.auth.type === 'jwt_auth') {
        // Find the RequestBuilder component and update its state
        // This is a workaround since we can't directly access the component's state
        const jwtTokenStatusElement = document.querySelector('.text-amber-600.animate-pulse');
        if (jwtTokenStatusElement) {
          jwtTokenStatusElement.textContent = 'Fetching token...';
          jwtTokenStatusElement.style.display = 'inline';
        }
      }

      // Reset any previous API errors
      setApiError(null);

      // Test API connection with real API calls
      console.log('Making real API call for testing');
      const response = await testCourierApi(requestConfig);

      // Check if the response contains an error
      if (response.error) {
        setApiError(response);
        setApiResponse(response);
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
          } else {
            paths = extractFieldPaths(response);
          }
        } else {
          paths = extractFieldPaths(response);
        }

        console.log('Extracted paths:', paths);

        if (paths.length === 0) {
          console.log('No paths extracted, using fallback approach');
          // Fallback: If no paths were extracted, create some basic ones
          paths = Object.keys(response).filter(key =>
            typeof response[key] !== 'function' &&
            key !== 'error' &&
            key !== 'status' &&
            key !== 'statusText'
          );
          console.log('Fallback paths:', paths);
        }
      } catch (error) {
        console.error('Error extracting field paths:', error);
        paths = [];
      }

      // Create field mappings
      const newMappings = paths.map(path => ({
        api_field: path,
        tms_field: '',
        courier_id: savedCourier.id,
        api_type: data.apiIntent
      }));

      console.log('Setting field mappings:', newMappings);
      setFieldMappings(newMappings);

      // Move to step 2 (Response)
      setCurrentStep(2);
    } catch (error) {
      console.error('Error testing API:', error);
      setApiError(error);
    } finally {
      setLoading(false);
    }
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
        alert('Please map at least one field before saving.');
        setLoading(false);
        return;
      }

      // Save each mapping
      for (const mapping of validMappings) {
        await addFieldMapping(mapping);
      }

      alert('Mappings saved successfully!');
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert(`Error saving mappings: ${error.message}`);
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
        alert('Please map at least one field before generating a JS file.');
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
        if (result.message) {
          console.log('Success message:', result.message);
          alert(`JS file generated and downloaded successfully! ${result.message}`);
        } else {
          alert('JS file generated and downloaded successfully!');
        }
      } else if (result && result.warning) {
        // Show warning but still consider it a success since the file was generated
        console.log('Warning:', result.warning);
        alert(`JS file generated successfully! Note: ${result.warning}`);
      } else {
        // Generic success message
        alert('JS file generated and downloaded successfully!');
      }
    } catch (error) {
      console.error('Error generating JS file:', error);
      alert(`Error generating JS file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change in ResponseViewer
  const handleTabChange = (tab) => {
    // If switching to mapping tab, update step to 3
    if (tab === 'mapping') {
      setCurrentStep(3);
    } else if (tab === 'response') {
      setCurrentStep(2);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Add New Courier</h1>
        <Link to="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {/* Stepper */}
      <Stepper
        currentStep={currentStep}
        steps={steps}
        className="mb-6"
      />

      {/* Success Message after JS file generation */}
      {jsFileGenerated && (
        <div className="mb-6 p-4 border border-green-200 bg-green-50 rounded-md">
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

      {/* Request Builder - Step 1 */}
      {!apiResponse && (
        <RequestBuilder
          formMethods={formMethods}
          onSubmit={onSubmit}
          loading={loading}
        />
      )}

      {/* Response Viewer - Steps 2 & 3 */}
      {apiResponse && !jsFileGenerated && (
        <ResponseViewer
          apiResponse={apiResponse}
          fieldMappings={fieldMappings}
          tmsFields={tmsFields}
          onMappingChange={handleMappingChange}
          onSaveMappings={saveMappings}
          onGenerateJs={generateJsFile}
          onTabChange={handleTabChange}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AddCourierRevamped;
