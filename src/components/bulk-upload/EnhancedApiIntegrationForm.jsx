/**
 * Enhanced API Integration Form for Bulk Upload
 *
 * This component provides an enhanced version of the ApiIntegrationForm
 * that uses the centralized API integration system.
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Loader2, Upload, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import ProgressIndicator from './ProgressIndicator';
import { addClientsInBulk } from '../../lib/supabase-service';
import { extractClientName, normalizeClientName, validateClientName } from '../../lib/client-name-utils';
import { makeApiRequest } from '../../lib/api-client';
import { parseCurl } from '../../lib/enhanced-curl-parser';
import ApiResponseDisplay from '../api/ApiResponseDisplay';
import NetworkError from '../ui/network-error';
import AuthenticationForm from '../api/AuthenticationForm';

/**
 * Enhanced version of ApiIntegrationForm that uses the centralized API integration system
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Callback for form submission
 * @param {boolean} props.loading - Loading state
 * @returns {JSX.Element} The component
 */
const EnhancedApiIntegrationForm = ({ onSubmit, loading }) => {
  const [apiResponse, setApiResponse] = useState(null);
  const [parsedClients, setParsedClients] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [paginationProgress, setPaginationProgress] = useState(null);
  const [curlCommand, setCurlCommand] = useState('');
  const [parsedCurlData, setParsedCurlData] = useState(null);
  // State for input mode (manual or curl)
  const [_, setInputMode] = useState('manual'); // 'manual' or 'curl'
  const [authType, setAuthType] = useState('none');
  const [authConfig, setAuthConfig] = useState({
    username: '',
    password: '',
    token: '',
    apiKey: '',
    apiKeyName: 'X-API-Key'
  });

  // Initialize form with react-hook-form
  const formMethods = useForm({
    defaultValues: {
      method: 'GET',
      url: '',
      auth: {
        type: 'none',
        username: '',
        password: '',
        token: '',
        apiKey: '',
        apiKeyName: 'X-API-Key',
        apiKeyLocation: 'header',
      },
      headers: [],
      queryParams: [],
      body: {},
      curlCommand: ''
    }
  });

  // State for API errors
  const [apiError, setApiError] = useState(null);

  // Handle curl command parsing
  const handleParseCurl = () => {
    try {
      if (!curlCommand.trim()) {
        setValidationErrors(['Please enter a cURL command']);
        return;
      }

      const parsed = parseCurl(curlCommand);
      console.log('Successfully parsed cURL command:', parsed);

      // Log query parameters specifically for debugging
      console.log('Query parameters from parsed cURL:', parsed.queryParams);

      // Update form values with parsed data
      formMethods.setValue('url', parsed.url);
      formMethods.setValue('method', parsed.method);
      formMethods.setValue('headers', parsed.headers || []);
      formMethods.setValue('queryParams', parsed.queryParams || []);
      formMethods.setValue('body', parsed.body || {});

      // Set input mode to curl
      setInputMode('curl');

      // If auth is present in the parsed data, update auth fields
      if (parsed.auth && parsed.auth.type !== 'none') {
        formMethods.setValue('auth.type', parsed.auth.type);
        setAuthType(parsed.auth.type);

        // Update auth config based on auth type
        const newAuthConfig = { ...authConfig };

        switch (parsed.auth.type) {
          case 'basic':
            formMethods.setValue('auth.username', parsed.auth.username || '');
            formMethods.setValue('auth.password', parsed.auth.password || '');
            newAuthConfig.username = parsed.auth.username || '';
            newAuthConfig.password = parsed.auth.password || '';
            break;
          case 'bearer':
          case 'jwt':
            formMethods.setValue('auth.token', parsed.auth.token || '');
            newAuthConfig.token = parsed.auth.token || '';
            break;
          case 'apikey':
            formMethods.setValue('auth.apiKey', parsed.auth.apiKey || '');
            formMethods.setValue('auth.apiKeyName', parsed.auth.apiKeyName || 'X-API-Key');
            newAuthConfig.apiKey = parsed.auth.apiKey || '';
            newAuthConfig.apiKeyName = parsed.auth.apiKeyName || 'X-API-Key';
            break;
          default:
            break;
        }

        setAuthConfig(newAuthConfig);
      }

      setParsedCurlData(parsed);
      setValidationErrors([]);
    } catch (e) {
      console.error('Error parsing cURL command:', e);
      setValidationErrors([`Error parsing cURL command: ${e.message}`]);
    }
  };

  // Handle manual input changes
  const handleApiUrlChange = (e) => {
    formMethods.setValue('url', e.target.value);
  };

  const handleMethodChange = (e) => {
    formMethods.setValue('method', e.target.value);
  };

  const handleAuthTypeChange = (newAuthType) => {
    setAuthType(newAuthType);
    formMethods.setValue('auth.type', newAuthType);
  };

  const handleAuthConfigChange = (newAuthConfig) => {
    setAuthConfig(newAuthConfig);

    // Update form values based on auth type
    if (newAuthConfig) {
      if (authType === 'basic') {
        formMethods.setValue('auth.username', newAuthConfig.username || '');
        formMethods.setValue('auth.password', newAuthConfig.password || '');
      } else if (authType === 'bearer' || authType === 'jwt') {
        formMethods.setValue('auth.token', newAuthConfig.token || '');
      } else if (authType === 'apikey') {
        formMethods.setValue('auth.apiKey', newAuthConfig.apiKey || '');
        formMethods.setValue('auth.apiKeyName', newAuthConfig.apiKeyName || 'X-API-Key');
      }
    }
  };

  // Test the API connection with pagination support
  const testApiConnection = async () => {
    const formData = formMethods.getValues();

    if (!formData.url.trim()) {
      setValidationErrors(['Please enter an API URL']);
      return;
    }

    setIsTesting(true);
    setValidationErrors([]);
    setApiResponse(null);
    setParsedClients(null);
    setApiError(null);

    try {
      // Create base request config from form data
      const baseRequestConfig = {
        url: formData.url.trim(),
        method: formData.method || 'GET',
        headers: formData.headers || [],
        queryParams: formData.queryParams || [],
        body: formData.body || {},
        auth: formData.auth,
        // Add filter options to limit response size
        filterOptions: {
          // If the API supports pagination, add pagination parameters
          limit: 100, // Limit to 100 items per page
          page: 1,    // Start with the first page
          size: 100,  // Add size parameter to work with APIs that require it
          // Add fields to extract if the API supports field filtering
          fields: 'id,name,company_id,company_name,old_company_id,display_id,types' // All client fields
        }
      };

      // Make the initial API request using the centralized API client
      let currentPage = 1;
      const maxPages = 10; // Limit to 10 pages to prevent infinite loops
      let allClients = [];

      // Initialize pagination progress
      setPaginationProgress({
        currentPage: 1,
        totalPages: '?',
        status: 'Fetching first page...'
      });

      // Make the first API request
      const firstRequestConfig = { ...baseRequestConfig };
      const response = await makeApiRequest(firstRequestConfig);

      // Store the API response
      setApiResponse(response);

      // Check if the response contains an error
      if (response.error) {
        // Store the error for display
        setApiError(response);
      } else {
        // Extract clients from the first page
        const extractedClients = extractClientsFromResponse(response);
        allClients = [...extractedClients];

        // Check if there are more pages
        let hasMore = hasMorePages(response, currentPage);

        // Try to determine total pages from the response
        let totalPages = maxPages;
        if (response.pagination?.total_pages) {
          totalPages = response.pagination.total_pages;
        } else if (response.pagination?.totalPages) {
          totalPages = response.pagination.totalPages;
        } else if (response.total_pages) {
          totalPages = response.total_pages;
        } else if (response.totalPages) {
          totalPages = response.totalPages;
        }

        // Update pagination progress with total pages if available
        setPaginationProgress({
          currentPage: 1,
          totalPages: totalPages !== maxPages ? totalPages : '?',
          status: hasMore ? 'More pages available' : 'Complete'
        });

        // Fetch additional pages if available
        while (hasMore && currentPage < maxPages) {
          currentPage++;
          console.log(`Fetching page ${currentPage}...`);

          // Update progress message and pagination progress
          setProgressMessage(`Fetching page ${currentPage}...`);
          setPaginationProgress({
            currentPage,
            totalPages: totalPages !== maxPages ? totalPages : '?',
            status: `Fetching page ${currentPage}...`
          });

          // Create a new request config for the next page
          const nextPageConfig = {
            ...baseRequestConfig,
            filterOptions: {
              ...baseRequestConfig.filterOptions,
              page: currentPage
            }
          };

          try {
            // Make the API request for the next page
            const nextPageResponse = await makeApiRequest(nextPageConfig);

            // Check if the response contains an error
            if (nextPageResponse.error) {
              console.error(`Error fetching page ${currentPage}:`, nextPageResponse);
              break; // Stop pagination on error
            }

            // Extract clients from this page
            const pageClients = extractClientsFromResponse(nextPageResponse);

            // Add to the total clients
            allClients = [...allClients, ...pageClients];

            // Check if there are more pages
            hasMore = hasMorePages(nextPageResponse, currentPage);

            // If no more clients were found, stop pagination
            if (pageClients.length === 0) {
              hasMore = false;
            }
          } catch (pageError) {
            console.error(`Error fetching page ${currentPage}:`, pageError);
            break; // Stop pagination on error
          }
        }

        // Update pagination progress to complete
        setPaginationProgress({
          currentPage,
          totalPages: totalPages !== maxPages ? totalPages : currentPage,
          status: 'Complete'
        });

        // Set the final results
        if (allClients.length === 0) {
          setValidationErrors(['No clients found in the API response']);
        } else {
          setParsedClients({
            clients: allClients,
            count: allClients.length
          });
        }
      }
    } catch (error) {
      console.error('Error testing API connection:', error);

      // Only set validation errors if we don't have a network error
      if (!apiError) {
        setValidationErrors([`API request failed: ${error.message || 'Unknown error'}`]);
      }
    } finally {
      setIsTesting(false);
      // Reset pagination progress after a short delay to show completion
      setTimeout(() => {
        setPaginationProgress(null);
      }, 2000);
    }
  };

  // Check if there are more pages available in the response
  const hasMorePages = (data, currentPage) => {
    // Common pagination metadata patterns
    if (data.pagination) {
      // Check if there's a total_pages or totalPages property
      if (data.pagination.total_pages && currentPage < data.pagination.total_pages) {
        return true;
      }
      if (data.pagination.totalPages && currentPage < data.pagination.totalPages) {
        return true;
      }
      // Check if there's a next_page or hasNext property
      if (data.pagination.next_page) {
        return true;
      }
      if (data.pagination.hasNext === true) {
        return true;
      }
    }

    // Check for metadata at the root level
    if (data.total_pages && currentPage < data.total_pages) {
      return true;
    }
    if (data.totalPages && currentPage < data.totalPages) {
      return true;
    }
    if (data.hasNext === true) {
      return true;
    }
    if (data.next_page) {
      return true;
    }

    // Check if there's a next_page_url
    if (data.next_page_url) {
      return true;
    }

    // If we have a content array and it's the same size as our page size, assume there might be more
    const pageSize = 100;
    if (Array.isArray(data.content) && data.content.length === pageSize) {
      return true;
    }

    // If we have an array response and it's the same size as our page size, assume there might be more
    if (Array.isArray(data) && data.length === pageSize) {
      return true;
    }

    return false;
  };

  // Extract additional fields from an item
  const extractAdditionalFields = (item) => {
    const fields = {};

    // Extract Company ID
    if (item.company_id || item['Company ID'] || item.companyId) {
      fields.company_id = item.company_id || item['Company ID'] || item.companyId;
    }

    // Extract Company Name
    if (item.company_name || item['Company Name'] || item.companyName) {
      fields.company_name = item.company_name || item['Company Name'] || item.companyName;
    }

    // Extract Old Company ID
    if (item.old_company_id || item['Old Company ID'] || item.oldCompanyId) {
      fields.old_company_id = item.old_company_id || item['Old Company ID'] || item.oldCompanyId;
    }

    // Extract Display ID
    if (item.display_id || item['Display ID'] || item.displayId) {
      fields.display_id = item.display_id || item['Display ID'] || item.displayId;
    }

    // Extract Types
    if (item.types || item['Types'] || item.type) {
      fields.types = item.types || item['Types'] || item.type;
    }

    return fields;
  };

  // Extract clients from API response
  const extractClientsFromResponse = (data) => {
    if (!data) return [];

    let clients = [];

    try {
      // Check if the response is an array
      if (Array.isArray(data)) {
        clients = data.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim(),
          ...extractAdditionalFields(item)
        }));
      }
      // Check if the response has a clients array
      else if (data.clients && Array.isArray(data.clients)) {
        clients = data.clients.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim(),
          ...extractAdditionalFields(item)
        }));
      }
      // Check if the response has a data array
      else if (data.data && Array.isArray(data.data)) {
        clients = data.data.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim(),
          ...extractAdditionalFields(item)
        }));
      }
      // Check if the response has a results array
      else if (data.results && Array.isArray(data.results)) {
        clients = data.results.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim(),
          ...extractAdditionalFields(item)
        }));
      }
      // Check if the response has a content array (common in Spring Boot APIs)
      else if (data.content && Array.isArray(data.content)) {
        clients = data.content.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim(),
          ...extractAdditionalFields(item)
        }));
      }
      // Try to extract from any array property in the response as a last resort
      else {
        // Find the first property that is an array
        const arrayProps = Object.keys(data).filter(key =>
          Array.isArray(data[key]) && data[key].length > 0
        );

        if (arrayProps.length > 0) {
          clients = data[arrayProps[0]].map(item => ({
            name: extractClientName(item) || 'Unknown Client',
            api_url: formMethods.getValues().url.trim(),
            ...extractAdditionalFields(item)
          }));
        }
      }

      // Normalize client names and validate
      const validClients = [];
      const errors = [];

      clients.forEach(client => {
        const normalizedName = normalizeClientName(client.name);
        const validation = validateClientName(normalizedName);

        if (validation.isValid) {
          validClients.push({
            ...client,
            name: normalizedName
          });
        } else {
          errors.push(`Client "${client.name}": ${validation.message}`);
        }
      });

      // Check for duplicate names
      const names = validClients.map(c => c.name);
      const uniqueNames = [...new Set(names)];

      if (names.length !== uniqueNames.length) {
        errors.push('There are duplicate client names in the API response');
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
      }

      return validClients;
    } catch (error) {
      console.error('Error extracting clients from response:', error);
      setValidationErrors([`Error extracting clients: ${error.message}`]);
      return [];
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!parsedClients || !parsedClients.clients || parsedClients.clients.length === 0) {
      setValidationErrors(['No valid clients to process']);
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setProgress(0);
    setProgressMessage('Preparing to add clients...');

    try {
      // Create request config from form data
      const formData = formMethods.getValues();
      const requestConfig = {
        url: formData.url.trim(),
        method: formData.method || 'GET',
        headers: formData.headers || [],
        queryParams: formData.queryParams || [],
        body: formData.body || {},
        auth: formData.auth
      };

      // Add request_config to each client
      const clientsWithConfig = parsedClients.clients.map(client => ({
        ...client,
        request_config: requestConfig
      }));

      // Step 1: Add clients to the database
      setCurrentStep(1);
      setProgressMessage('Adding clients to the database...');

      const addedClients = await addClientsInBulk(clientsWithConfig);
      setProgress(1);
      setProgressMessage(`Added ${addedClients.length} clients successfully`);

      // Call the onSubmit callback with the results
      onSubmit({
        clients: addedClients,
        results: addedClients.map(client => ({
          clientId: client.id,
          clientName: client.name,
          success: true,
          couriers: [],
          count: 0,
          message: 'Client added successfully'
        })),
        successCount: addedClients.length,
        failureCount: 0,
        totalCouriers: 0
      });
    } catch (error) {
      console.error('Error processing clients:', error);
      setValidationErrors([`Error processing clients: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {isProcessing ? (
        <Card>
          <CardContent className="pt-6">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={1}
              stepName="Adding Clients"
              progress={progress}
              message={progressMessage}
              isIndeterminate={progress === 0}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
              <div>
                <h3 className="text-blue-700 font-medium text-sm">API Response Size Limit</h3>
                <p className="text-sm text-blue-600 mt-1">
                  Netlify Functions have a 6MB response size limit. If your API returns a large amount of data,
                  you may need to filter or paginate the results. We've added some default filtering parameters
                  to help reduce the response size.
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="manual" onValueChange={setInputMode} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="manual">Manual Input</TabsTrigger>
              <TabsTrigger value="curl">cURL Command</TabsTrigger>
            </TabsList>

            {/* Manual Input Tab */}
            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Configure the API endpoint to fetch clients
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-1">
                        <Label htmlFor="method">Method</Label>
                        <select
                          id="method"
                          className="w-full p-2 border rounded-md mt-1"
                          value={formMethods.getValues().method}
                          onChange={handleMethodChange}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <Label htmlFor="api-url">API URL</Label>
                        <Input
                          id="api-url"
                          placeholder="https://api.example.com/clients"
                          value={formMethods.getValues().url}
                          onChange={handleApiUrlChange}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AuthenticationForm
                authType={authType}
                onAuthTypeChange={handleAuthTypeChange}
                authConfig={authConfig}
                onAuthConfigChange={handleAuthConfigChange}
                showAllOptions={true}
              />
            </TabsContent>

            {/* cURL Command Tab */}
            <TabsContent value="curl" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>cURL Command</CardTitle>
                  <CardDescription>
                    Paste a cURL command to configure the API request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="curl-command">Paste cURL Command</Label>
                      <textarea
                        id="curl-command"
                        className="w-full p-2 border rounded-md font-mono text-sm mt-1"
                        rows={5}
                        placeholder="curl -X GET 'https://api.example.com/clients' -H 'Authorization: Bearer token'"
                        value={curlCommand}
                        onChange={(e) => setCurlCommand(e.target.value)}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleParseCurl}
                        >
                          Parse cURL
                        </Button>
                      </div>
                    </div>

                    {parsedCurlData && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Parsed Request Details</label>
                        <div className="bg-gray-50 p-3 rounded-md border">
                          <div className="grid grid-cols-4 gap-4 mb-2">
                            <div className="col-span-1">
                              <label className="text-xs font-medium block mb-1">Method</label>
                              <div className="text-sm p-2 border rounded-md bg-white">
                                {parsedCurlData.method}
                              </div>
                            </div>
                            <div className="col-span-3">
                              <label className="text-xs font-medium block mb-1">URL</label>
                              <div className="text-sm p-2 border rounded-md bg-white break-all">
                                {parsedCurlData.url}
                              </div>
                            </div>
                          </div>

                          {/* Headers Section */}
                          {parsedCurlData.headers && parsedCurlData.headers.length > 0 && (
                            <div className="mb-2">
                              <label className="text-xs font-medium block mb-1">Headers</label>
                              <div className="text-sm p-2 border rounded-md bg-white">
                                {parsedCurlData.headers.map((header, index) => (
                                  <div key={index} className="flex mb-1">
                                    <span className="font-medium mr-2">{header.key}:</span>
                                    <span>{header.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Query Parameters Section */}
                          {parsedCurlData.queryParams && parsedCurlData.queryParams.length > 0 && (
                            <div className="mb-2">
                              <label className="text-xs font-medium block mb-1">Query Parameters</label>
                              <div className="text-sm p-2 border rounded-md bg-white">
                                {parsedCurlData.queryParams.map((param, index) => (
                                  <div key={index} className="flex mb-1">
                                    <span className="font-medium mr-2">{param.key}:</span>
                                    <span>{param.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Body Section */}
                          {parsedCurlData.body && (
                            <div className="mb-2">
                              <label className="text-xs font-medium block mb-1">Body</label>
                              <div className="text-sm p-2 border rounded-md bg-white font-mono whitespace-pre-wrap overflow-auto max-h-40">
                                {typeof parsedCurlData.body === 'object'
                                  ? JSON.stringify(parsedCurlData.body, null, 2)
                                  : parsedCurlData.body}
                              </div>
                            </div>
                          )}

                          {/* Authentication Section */}
                          {parsedCurlData.auth && parsedCurlData.auth.type !== 'none' && (
                            <div>
                              <label className="text-xs font-medium block mb-1">Authentication</label>
                              <div className="text-sm p-2 border rounded-md bg-white">
                                <p><strong>Type:</strong> {parsedCurlData.auth.type}</p>
                                {parsedCurlData.auth.type === 'basic' && (
                                  <p><strong>Username:</strong> {parsedCurlData.auth.username}</p>
                                )}
                                {(parsedCurlData.auth.type === 'bearer' || parsedCurlData.auth.type === 'jwt') && (
                                  <p><strong>Token:</strong> {parsedCurlData.auth.token.substring(0, 10)}...</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* API Response */}
          {apiResponse && (
            <ApiResponseDisplay
              response={apiResponse}
              title="API Response"
              expandable={true}
            />
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
              </div>
              <ul className="text-sm text-red-700 list-disc pl-5 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Network errors */}
          {apiError && (apiError.status === 502 || apiError.isNetworkError) && (
            <NetworkError
              error={apiError}
              onRetry={testApiConnection}
              showDetails={true}
            />
          )}

          {/* Pagination Progress */}
          {isTesting && paginationProgress && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center mb-2">
                <Info className="h-4 w-4 text-blue-500 mr-2" />
                <h3 className="text-sm font-medium text-blue-800">Fetching Multiple Pages</h3>
              </div>
              <div className="flex items-center justify-between text-sm text-blue-700">
                <span>Page {paginationProgress.currentPage} of {paginationProgress.totalPages}</span>
                <span>{paginationProgress.status}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: paginationProgress.totalPages !== '?' ?
                      `${(paginationProgress.currentPage / paginationProgress.totalPages) * 100}%` :
                      `${(paginationProgress.currentPage / 10) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          )}

          {parsedClients && (
            <div className="bg-green-50 p-3 rounded-md border border-green-200">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <h3 className="text-sm font-medium text-green-800">Clients Found</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">
                Found {parsedClients.count} valid clients in the API response
              </p>
              <div className="bg-white p-2 rounded border border-green-100 max-h-40 overflow-auto">
                <ul className="text-xs space-y-1">
                  {parsedClients.clients.map((client, i) => (
                    <li key={i} className="flex items-center">
                      <span className="w-4 h-4 inline-flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs mr-2">
                        {i + 1}
                      </span>
                      {client.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={testApiConnection}
              disabled={loading || isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {paginationProgress ?
                    `Fetching page ${paginationProgress.currentPage} of ${paginationProgress.totalPages}` :
                    'Testing...'}
                </>
              ) : (
                'Test API Connection'
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isTesting || !parsedClients}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Add Clients
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedApiIntegrationForm;
