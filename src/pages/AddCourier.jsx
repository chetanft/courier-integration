import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { testCourierApi } from '../lib/api-utils';
import { extractFieldPaths, formatFieldPath } from '../lib/field-extractor';
import { generateJsConfig } from '../lib/js-generator';
import { addCourier, addFieldMapping, saveApiTestResult, uploadJsFile } from '../lib/supabase-service';
import { isValidUrl, cn } from '../lib/utils';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../components/ui/form';

const AddCourier = () => {
  const form = useForm({
    defaultValues: {
      courier_name: '',
      username: '',
      password: '',
      api_key: '',
      auth_endpoint: '',
      auth_method: 'POST',
      api_endpoint: '',
      api_intent: 'track_shipment', // Default to track_shipment
      test_docket: ''
    },
    mode: 'onChange' // Enable validation on change
  });
  const { register, handleSubmit, watch, formState: { errors }, control } = form;
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [courier, setCourier] = useState(null);
  const [apiType, setApiType] = useState('track_docket');
  const [tmsFields] = useState([
    'docket_number',
    'status',
    'tracking_details',
    'event_date',
    'event_status',
    'origin',
    'destination'
  ]);

  // State to track API errors
  const [apiError, setApiError] = useState(null);

  // Watch the api_intent field to conditionally render the test docket field
  const apiIntent = watch('api_intent');

  // Update validation rules when API intent changes
  React.useEffect(() => {
    // Reset test_docket validation errors when switching away from track_shipment
    if (apiIntent !== 'track_shipment') {
      form.clearErrors('test_docket');
    } else {
      // Validate test_docket when switching to track_shipment
      const testDocket = form.getValues('test_docket');
      if (!testDocket) {
        form.setError('test_docket', {
          type: 'required',
          message: 'Test docket number is required for shipment tracking'
        });
      }
    }
  }, [apiIntent, form]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      // Validate test_docket is provided when API intent is track_shipment
      if (data.api_intent === 'track_shipment' && !data.test_docket) {
        form.setError('test_docket', {
          type: 'required',
          message: 'Test docket number is required for shipment tracking'
        });
        return;
      }

      setLoading(true);
      console.log('Testing API connection...', data.api_intent);

      // Create auth config object
      const authConfig = {
        username: data.username,
        password: data.password,
        api_key: data.api_key,
        auth_endpoint: data.auth_endpoint,
        auth_method: data.auth_method || 'POST'
      };

      // Create courier object
      const courierData = {
        name: data.courier_name,
        api_base_url: data.api_endpoint.split('/').slice(0, 3).join('/'),
        auth_type: data.api_key ? 'API Key' : (data.username && data.password ? 'Basic Auth' : 'None'),
        api_key: data.api_key,
        username: data.username,
        password: data.password,
        auth_endpoint: data.auth_endpoint,
        auth_method: data.auth_method || 'POST',
        api_intent: data.api_intent
      };

      // Create payload based on API intent
      let payload = {};

      switch (data.api_intent) {
        case 'track_shipment':
          payload = { docNo: data.test_docket };
          break;
        case 'generate_auth_token':
          payload = { grant_type: 'client_credentials' };
          break;
        case 'fetch_static_config':
          payload = { client_id: data.username };
          break;
        case 'fetch_api_schema':
          payload = { format: 'json' };
          break;
        default:
          payload = {};
      }

      // Reset any previous API errors
      setApiError(null);

      // Test API connection with real API calls
      console.log('Making real API call for testing');
      const response = await testCourierApi(
        authConfig,
        data.api_endpoint,
        payload,
        data.api_intent
      );

      // Check if the response contains an error
      if (response.error) {
        setApiError(response);
        throw new Error(`API call failed: ${response.message}`);
      }

      // Save courier
      const savedCourier = await addCourier(courierData);
      setCourier(savedCourier);
      setApiResponse(response);

      // Save API test result
      await saveApiTestResult({
        courier_id: savedCourier.id,
        api_endpoint: data.api_endpoint,
        api_intent: data.api_intent,
        request_payload: payload,
        response_data: response,
        success: true,
        error_message: null
      });

      // Extract field paths from response
      const paths = extractFieldPaths(response);
      setFieldMappings(paths.map(path => ({
        api_field: path,
        tms_field: '',
        courier_id: savedCourier.id,
        api_type: data.api_intent
      })));

      console.log('Courier added successfully!');
    } catch (error) {
      console.error('Error adding courier:', error);

      // If we don't already have API error details, set them from the caught error
      if (!apiError) {
        setApiError({
          error: true,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle field mapping changes
  const handleMappingChange = (apiField, tmsField) => {
    setFieldMappings(prevMappings =>
      prevMappings.map(mapping =>
        mapping.api_field === apiField
          ? { ...mapping, tms_field }
          : mapping
      )
    );
  };

  // Save mappings
  const saveMappings = async () => {
    try {
      setLoading(true);
      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);

      for (const mapping of validMappings) {
        await addFieldMapping(mapping);
      }

      console.log(`${validMappings.length} mappings saved successfully!`);
    } catch (error) {
      console.error('Error saving mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate, download, and store JS file
  const generateJsFile = async () => {
    try {
      if (!courier) return;

      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);
      if (validMappings.length === 0) return;

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
      await uploadJsFile(courier.id, fileName, jsCode);

      console.log('JS file generated, downloaded, and stored successfully!');
      alert('JS file generated, downloaded, and stored successfully!');
    } catch (error) {
      console.error('Error generating JS file:', error);
      alert(`Error generating JS file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add New Courier</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {/* Courier Form */}
      {!apiResponse && (
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Authentication Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter password" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter API key" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Testing</CardTitle>
                {apiError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    <div className="font-semibold">API Error:</div>
                    <div>{apiError.message}</div>
                    {apiError.status && (
                      <div className="mt-1">
                        Status: {apiError.status} {apiError.statusText}
                      </div>
                    )}
                    {apiError.details && Object.keys(apiError.details).length > 0 && (
                      <div className="mt-1">
                        <details>
                          <summary className="cursor-pointer">Error Details</summary>
                          <pre className="mt-2 text-xs overflow-auto max-h-32 p-2 bg-red-100 rounded">
                            {JSON.stringify(apiError.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="api_endpoint"
                  rules={{ required: "API endpoint is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com/tracking" {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL endpoint to test the API connection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="api_intent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="flex items-center gap-2">
                          API Intent
                          <span className="text-xs text-muted-foreground" title="What are you trying to test with this API?">
                            (What are you trying to test with this API?)
                          </span>
                        </span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
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
                        {apiIntent === 'generate_auth_token' && 'Tests authentication by requesting an access token from the API.'}
                        {apiIntent === 'fetch_static_config' && 'Retrieves configuration settings from the API.'}
                        {apiIntent === 'fetch_api_schema' && 'Fetches the API schema or metadata information.'}
                        {apiIntent === 'track_shipment' && 'Tests shipment tracking using the provided docket number.'}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Always render the field but conditionally show/hide it with CSS */}
                <div className={apiIntent === 'track_shipment' ? 'block' : 'hidden'}>
                  <FormField
                    control={control}
                    name="test_docket"
                    rules={{
                      required: apiIntent === 'track_shipment'
                        ? "Test docket number is required for shipment tracking"
                        : false
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <span className="flex items-center gap-2">
                            Test Docket Number
                            <span className="text-xs text-muted-foreground" title="Used only when tracking a specific shipment (AWB/Waybill)">
                              (Used only when tracking a specific shipment)
                            </span>
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="ABC123456" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter a valid tracking/docket number to test the shipment tracking API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Testing API...' : 'Test API & Continue'}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Field Mapping */}
      {apiResponse && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Field Mapping</CardTitle>
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                {fieldMappings.filter(m => m.tms_field).length} of {fieldMappings.length} fields mapped
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
                          {formatFieldPath(mapping.api_field)}
                        </td>
                        <td className="py-2 px-4">
                          <Select
                            value={mapping.tms_field}
                            onValueChange={(value) => handleMappingChange(mapping.api_field, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-- Select TMS Field --" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-- Select TMS Field --</SelectItem>
                              {tmsFields.map(field => (
                                <SelectItem key={field} value={field}>{field}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={saveMappings}
                disabled={loading}
              >
                Save Mappings
              </Button>
              <Button
                onClick={() => generateJsFile()}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate JS File'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddCourier;
