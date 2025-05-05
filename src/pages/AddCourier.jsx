import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { testCourierApi } from '../lib/api-utils';
import { extractFieldPaths, formatFieldPath } from '../lib/field-extractor';
import { generateJsConfig } from '../lib/js-generator';
import { addCourier, addFieldMapping } from '../lib/supabase';
import { isValidUrl } from '../lib/utils';

// Import ShadCN UI components
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { JsonViewer } from '../components/ui/json-viewer';

const AddCourier = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [courier, setCourier] = useState(null);
  const [apiType, setApiType] = useState('track_docket');
  const [tmsFields, setTmsFields] = useState([
    'docket_number',
    'status',
    'tracking_details',
    'event_date',
    'event_details_message',
    'event_status',
    'origin',
    'destination',
    'l2_status'
  ]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      toast.info('Testing API connection...');

      // Create auth config object
      const authConfig = {
        username: data.username,
        password: data.password,
        api_key: data.api_key,
        identifier: data.identifier,
        auth_endpoint: data.auth_endpoint,
        auth_method: data.auth_method || 'POST',
        auth_content_type: data.auth_content_type || 'application/json',
        token_path: data.token_path || 'access_token'
      };

      // Create courier object
      const courierData = {
        name: data.courier_name,
        auth_config: authConfig,
        created_at: new Date()
      };

      // Test API connection first before saving to database
      let response;
      try {
        response = await testCourierApi(
          authConfig,
          data.api_endpoint,
          { docNo: data.test_docket, docType: 'WB' }
        );

        // If API test is successful, save courier to Supabase
        const savedCourier = await addCourier(courierData);
        setCourier(savedCourier);

        setApiResponse(response);

        // Extract field paths from response
        const paths = extractFieldPaths(response);
        if (paths.length === 0) {
          toast.warning('No fields found in the API response. Please check the response format.');
        }

        setFieldMappings(paths.map(path => ({
          api_field: path,
          tms_field: '',
          courier_id: savedCourier.id,
          api_type: apiType
        })));

        toast.success('Courier added successfully!');
      } catch (apiError) {
        console.error('API test failed:', apiError);
        toast.error(`API test failed: ${apiError.message || 'Unknown error'}`);
        throw new Error(`API test failed: ${apiError.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding courier:', error);
      toast.error(error.message || 'Failed to add courier');
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

  // Save mappings to Supabase
  const saveMappings = async () => {
    try {
      setLoading(true);

      // Filter out mappings without TMS field
      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);

      if (validMappings.length === 0) {
        toast.warning('No mappings to save. Please map at least one field.');
        setLoading(false);
        return;
      }

      toast.info(`Saving ${validMappings.length} field mappings...`);

      // Save each mapping
      const savedMappings = [];
      const failedMappings = [];

      for (const mapping of validMappings) {
        try {
          const savedMapping = await addFieldMapping(mapping);
          savedMappings.push(savedMapping);
        } catch (mappingError) {
          console.error('Error saving mapping:', mappingError, mapping);
          failedMappings.push(mapping.api_field);
        }
      }

      if (failedMappings.length > 0) {
        toast.warning(`${savedMappings.length} mappings saved, but ${failedMappings.length} failed. Please try again for the failed mappings.`);
      } else {
        toast.success(`${savedMappings.length} mappings saved successfully!`);
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error(error.message || 'Failed to save mappings');
    } finally {
      setLoading(false);
    }
  };

  // Generate and download JS file
  const generateJsFile = () => {
    try {
      if (!courier) {
        toast.error('Courier information is missing. Please try again.');
        return;
      }

      // Filter out mappings without TMS field
      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);

      if (validMappings.length === 0) {
        toast.warning('No field mappings found. Please map at least one field before generating the JS file.');
        return;
      }

      // Generate JS code
      const jsCode = generateJsConfig(courier, validMappings);

      if (!jsCode) {
        toast.error('Failed to generate JS code. Please check the mappings and try again.');
        return;
      }

      // Create download link
      const blob = new Blob([jsCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_mapping.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('JS file generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating JS file:', error);
      toast.error(error.message || 'Failed to generate JS file');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add New Courier</h1>
        <Button variant="outline" asChild>
          <Link to="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Courier Form */}
      {!apiResponse && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Courier Information</CardTitle>
              <CardDescription>Enter the basic information about the courier service.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="courier_name">Courier Name</Label>
                  <Input
                    id="courier_name"
                    {...register('courier_name', {
                      required: 'Courier name is required',
                      minLength: { value: 2, message: 'Courier name must be at least 2 characters' },
                      maxLength: { value: 50, message: 'Courier name must be less than 50 characters' }
                    })}
                    placeholder="Enter courier name"
                  />
                  {errors.courier_name && <p className="text-sm font-medium text-destructive mt-1">{errors.courier_name.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible defaultValue="authentication" className="w-full">
            <AccordionItem value="authentication">
              <AccordionTrigger className="text-lg font-semibold">Authentication Details</AccordionTrigger>
              <AccordionContent>
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username <span className="text-muted-foreground text-sm">(optional)</span></Label>
                        <Input
                          id="username"
                          {...register('username')}
                          placeholder="Enter username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password <span className="text-muted-foreground text-sm">(optional)</span></Label>
                        <Input
                          id="password"
                          type="password"
                          {...register('password')}
                          placeholder="Enter password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api_key">API Key <span className="text-muted-foreground text-sm">(optional)</span></Label>
                        <Input
                          id="api_key"
                          {...register('api_key')}
                          placeholder="Enter API key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="identifier">Identifier <span className="text-muted-foreground text-sm">(optional)</span></Label>
                        <Input
                          id="identifier"
                          {...register('identifier')}
                          placeholder="Enter identifier"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="auth_endpoint">
              <AccordionTrigger className="text-lg font-semibold">Auth Endpoint <span className="text-muted-foreground text-sm">(optional)</span></AccordionTrigger>
              <AccordionContent>
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="auth_endpoint">Auth Endpoint URL</Label>
                        <Input
                          id="auth_endpoint"
                          {...register('auth_endpoint', {
                            validate: {
                              validUrlOrEmpty: value => !value || isValidUrl(value) || 'Please enter a valid URL'
                            }
                          })}
                          placeholder="https://api.example.com/auth"
                        />
                        {errors.auth_endpoint && <p className="text-sm font-medium text-destructive mt-1">{errors.auth_endpoint.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auth_method">Auth Method</Label>
                        <select
                          id="auth_method"
                          {...register('auth_method')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="token_path">Token Path</Label>
                        <Input
                          id="token_path"
                          {...register('token_path')}
                          placeholder="e.g., access_token or data.token"
                        />
                        <p className="text-sm text-muted-foreground">Specify the path to extract the token from the response</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="api_testing">
              <AccordionTrigger className="text-lg font-semibold">API Testing</AccordionTrigger>
              <AccordionContent>
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="api_endpoint">API Endpoint</Label>
                        <Input
                          id="api_endpoint"
                          {...register('api_endpoint', {
                            required: 'API endpoint is required',
                            validate: {
                              validUrl: value => isValidUrl(value) || 'Please enter a valid URL'
                            }
                          })}
                          placeholder="https://api.example.com/tracking"
                        />
                        {errors.api_endpoint && <p className="text-sm font-medium text-destructive mt-1">{errors.api_endpoint.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api_type">API Type</Label>
                        <select
                          id="api_type"
                          value={apiType}
                          onChange={(e) => setApiType(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="track_docket">Track Docket</option>
                          <option value="epod">EPOD</option>
                          <option value="track_multiple_dockets">Track Multiple Dockets</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="test_docket">Test Docket Number</Label>
                        <Input
                          id="test_docket"
                          {...register('test_docket', {
                            required: 'Test docket is required',
                            minLength: { value: 3, message: 'Test docket must be at least 3 characters' },
                            pattern: {
                              value: /^[A-Za-z0-9-]+$/,
                              message: 'Test docket should only contain letters, numbers, and hyphens'
                            }
                          })}
                          placeholder="ABC123456"
                        />
                        {errors.test_docket && <p className="text-sm font-medium text-destructive mt-1">{errors.test_docket.message}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Testing API...' : 'Test API & Continue'}
            </Button>
          </div>
        </form>
      )}

      {/* Field Mapping */}
      {apiResponse && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Field Mapping</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Map API fields to TMS fields
              </div>
            </div>
            <CardDescription>
              Map the courier API fields to your internal TMS fields. Select the appropriate TMS field for each API field.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">API Response</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      View Full Response
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>API Response</DialogTitle>
                      <DialogDescription>
                        Full JSON response from the {apiType} API endpoint
                      </DialogDescription>
                    </DialogHeader>
                    <JsonViewer data={apiResponse} />
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Response Preview</span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                      {apiType}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-auto rounded border bg-card p-2">
                    <pre className="text-xs text-muted-foreground font-mono">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Map Fields</h3>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  {fieldMappings.filter(m => m.tms_field).length} of {fieldMappings.length} fields mapped
                </span>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">API Field Path</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">TMS Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fieldMappings.map((mapping, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="py-2 px-4 text-sm font-mono text-muted-foreground">
                          {formatFieldPath(mapping.api_field)}
                        </td>
                        <td className="py-2 px-4">
                          <select
                            value={mapping.tms_field}
                            onChange={(e) => handleMappingChange(mapping.api_field, e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">-- Select TMS Field --</option>
                            {tmsFields.map(field => (
                              <option key={field} value={field}>{field}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={saveMappings}
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Saving...' : 'Save Mappings'}
            </Button>

            <Button
              onClick={generateJsFile}
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Generate JS File
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default AddCourier;
