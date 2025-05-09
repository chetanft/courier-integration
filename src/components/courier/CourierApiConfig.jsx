import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { KeyValueEditor } from '../ui/key-value-editor';
import { JsonEditor } from '../ui/json-editor';
import { JsonViewer } from '../ui/json-viewer';
import { Loader2, PlusCircle, Trash2, RefreshCw } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../ui/tabs';

const CourierApiConfig = ({ onComplete, authToken, loading }) => {
  const { control, watch, setValue, handleSubmit } = useFormContext();

  // Local state
  const [apiResponses, setApiResponses] = useState([]);
  const [testingApi, setTestingApi] = useState(false);
  const [currentApiIndex, setCurrentApiIndex] = useState(0);

  // Watch APIs
  const apis = watch('apis') || [];

  // Add a new API
  const addApi = () => {
    const currentApis = watch('apis') || [];
    setValue('apis', [
      ...currentApis,
      {
        label: `API ${currentApis.length + 1}`,
        method: 'GET',
        url: '',
        headers: [],
        body: {},
        queryParams: [],
        rootDataPath: ''
      }
    ]);
  };

  // Remove an API
  const removeApi = (index) => {
    const currentApis = watch('apis') || [];
    if (currentApis.length <= 1) {
      toast.error('You must have at least one API');
      return;
    }

    setValue('apis', currentApis.filter((_, i) => i !== index));

    // Update API responses
    setApiResponses(prev => prev.filter((_, i) => i !== index));

    // Update current API index if needed
    if (currentApiIndex >= index && currentApiIndex > 0) {
      setCurrentApiIndex(currentApiIndex - 1);
    }
  };

  // Handle cURL parsing for an API
  const handleCurlParse = (curlCommand, index) => {
    try {
      const parsed = parseCurl(curlCommand);

      // Update form values with parsed data
      const currentApis = [...watch('apis')];
      currentApis[index] = {
        ...currentApis[index],
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers || [],
        queryParams: parsed.queryParams || [],
        body: parsed.body || {}
      };

      setValue('apis', currentApis);
      toast.success('cURL command parsed successfully');
    } catch (error) {
      console.error('Error parsing cURL command:', error);
      toast.error('Failed to parse cURL command');
    }
  };

  // Test an API
  const testApi = async (index) => {
    try {
      setTestingApi(true);
      setCurrentApiIndex(index);

      const api = watch(`apis.${index}`);

      // Process URL and query parameters
      let url = api.url;
      const queryParams = api.queryParams || [];

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
        method: api.method,
        apiIntent: 'test_api',
        headers: api.headers || [],
        body: api.body || {}
      };

      // Add auth token if available
      if (authToken) {
        requestConfig.headers = [
          ...requestConfig.headers,
          { key: 'Authorization', value: `Bearer ${authToken}` }
        ];
      }

      // Make API request
      const response = await testCourierApi(requestConfig);

      // Update API responses
      const newResponses = [...apiResponses];
      newResponses[index] = response;
      setApiResponses(newResponses);

      // Check for errors
      if (response.error) {
        toast.error(`API test failed: ${response.message || 'Unknown error'}`);
      } else {
        toast.success('API test successful');
      }
    } catch (error) {
      console.error('Error testing API:', error);
      toast.error('Failed to test API');
    } finally {
      setTestingApi(false);
    }
  };

  // Handle form submission
  const onSubmit = async () => {
    try {
      // Check if all APIs have been tested
      const untested = apis.findIndex((_, index) => !apiResponses[index]);
      if (untested !== -1) {
        toast.error(`Please test API ${untested + 1} before continuing`);
        return;
      }

      // Check if any API test failed
      const failed = apiResponses.findIndex(response => response?.error);
      if (failed !== -1) {
        toast.error(`API ${failed + 1} test failed. Please fix the issues before continuing.`);
        return;
      }

      // Proceed to next step
      onComplete(apiResponses);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to proceed to next step');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Courier APIs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Accordion type="single" collapsible defaultValue="api-0">
            {apis.map((api, index) => (
              <AccordionItem key={index} value={`api-${index}`}>
                <AccordionTrigger className="hover:bg-gray-50 px-4 py-2 rounded-md">
                  <div className="flex items-center justify-between w-full">
                    <span>{api.label || `API ${index + 1}`}</span>
                    <div className="flex items-center space-x-2">
                      {apiResponses[index] && !apiResponses[index].error && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Tested
                        </span>
                      )}
                      {apiResponses[index] && apiResponses[index].error && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-2">
                  <div className="space-y-4">
                    {/* API Label */}
                    <FormField
                      control={control}
                      name={`apis.${index}.label`}
                      rules={{ required: "API label is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Label</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Tracking API" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this API (e.g., Tracking API, EPOD API)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* cURL Command */}
                    <FormField
                      control={control}
                      name={`apis.${index}.curlCommand`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>cURL Command (Optional)</FormLabel>
                          <FormControl>
                            <div className="flex flex-col space-y-2">
                              <Textarea
                                placeholder="curl -X GET 'https://api.example.com/tracking?id=123' -H 'Authorization: Bearer token'"
                                {...field}
                                className="min-h-[80px]"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCurlParse(field.value, index)}
                                className="self-end"
                              >
                                Parse cURL
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Paste a cURL command to automatically fill the fields below
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* HTTP Method */}
                      <FormField
                        control={control}
                        name={`apis.${index}.method`}
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
                          name={`apis.${index}.url`}
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

                    {/* Headers */}
                    <FormField
                      control={control}
                      name={`apis.${index}.headers`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Headers</FormLabel>
                          <FormControl>
                            <KeyValueEditor
                              pairs={field.value || []}
                              onChange={field.onChange}
                              keyPlaceholder="Header name"
                              valuePlaceholder="Header value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Query Parameters */}
                    <FormField
                      control={control}
                      name={`apis.${index}.queryParams`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Query Parameters</FormLabel>
                          <FormControl>
                            <KeyValueEditor
                              pairs={field.value || []}
                              onChange={field.onChange}
                              keyPlaceholder="Parameter name"
                              valuePlaceholder="Parameter value"
                            />
                          </FormControl>
                          <FormDescription>
                            Query parameters will be appended to the URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Body (for POST, PUT, PATCH) */}
                    {['POST', 'PUT', 'PATCH'].includes(watch(`apis.${index}.method`)) && (
                      <FormField
                        control={control}
                        name={`apis.${index}.body`}
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

                    {/* Root Data Path */}
                    <FormField
                      control={control}
                      name={`apis.${index}.rootDataPath`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Root Data Path (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., data.shipment"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            JSONPath to the root data node in the response (for nested fields)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test API Button */}
                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeApi(index)}
                        disabled={apis.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove API
                      </Button>

                      <Button
                        type="button"
                        onClick={() => testApi(index)}
                        disabled={testingApi && currentApiIndex === index}
                      >
                        {testingApi && currentApiIndex === index ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Test API
                          </>
                        )}
                      </Button>
                    </div>

                    {/* API Response */}
                    {apiResponses[index] && (
                      <div className={`mt-4 p-4 border rounded-md ${apiResponses[index].error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                        <h3 className={`text-lg font-medium mb-2 ${apiResponses[index].error ? 'text-red-800' : 'text-green-800'}`}>
                          {apiResponses[index].error ? 'Error Response' : 'Success Response'}
                        </h3>
                        <div className="bg-white p-2 rounded border">
                          <JsonViewer data={apiResponses[index]} />
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Add API Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addApi}
            className="w-full"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Another API
          </Button>
        </form>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Back
        </Button>
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
            'Continue to Field Mapping'
          )}
        </Button>
      </div>
    </div>
  );
};

export default CourierApiConfig;
