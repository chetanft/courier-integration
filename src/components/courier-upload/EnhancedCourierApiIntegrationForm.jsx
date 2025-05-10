/**
 * Enhanced Courier API Integration Form
 *
 * This component provides an enhanced version of the CourierApiIntegrationForm
 * that uses the centralized API integration system.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { parseCurl } from '../../lib/enhanced-curl-parser';
import { makeApiRequest } from '../../lib/api-client';
import ApiResponseDisplay from '../api/ApiResponseDisplay';
import SimplifiedKeyValueDisplay from '../ui/simplified-key-value-display';
import AuthenticationForm from '../api/AuthenticationForm';

/**
 * Enhanced version of CourierApiIntegrationForm that uses the centralized API integration system
 * @param {Object} props - Component props
 * @param {string} props.clientId - The client ID
 * @param {string} props.clientName - The client name
 * @param {Function} props.onSuccess - Callback for success
 * @param {Function} props.onError - Callback for error
 * @param {Function} props.onParsedData - Callback for parsed data
 * @returns {JSX.Element} The component
 */
const EnhancedCourierApiIntegrationForm = ({
  clientId,
  // clientName is used for display purposes in some implementations
  // eslint-disable-next-line no-unused-vars
  clientName,
  onSuccess,
  onError,
  onParsedData
}) => {
  // State for API tab
  const [curlCommand, setCurlCommand] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [couriersFound, setCouriersFound] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiUrl, setApiUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState([]);
  const [queryParams, setQueryParams] = useState([]);
  const [showParsedData, setShowParsedData] = useState(false);
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

  // Handle parsed data callback
  const handleParsedData = (couriers) => {
    if (onParsedData) {
      onParsedData(couriers);
    }
  };

  // Handle success callback
  const handleSuccess = (couriers) => {
    if (onSuccess) {
      onSuccess(couriers);
    }
  };

  // Handle error callback
  const handleError = (error) => {
    setError({
      message: error.message || 'Unknown error'
    });

    if (onError) {
      onError(error);
    }
  };

  // Handle curl command parsing
  const handleParseCurl = () => {
    try {
      if (!curlCommand.trim()) {
        setError({ message: 'Please enter a cURL command' });
        return;
      }

      const parsed = parseCurl(curlCommand);
      console.log('Successfully parsed cURL command:', parsed);

      // Log query parameters specifically for debugging
      console.log('Query parameters from parsed cURL:', parsed.queryParams);

      // Update state with parsed data
      setApiUrl(parsed.url);
      setMethod(parsed.method);
      setHeaders(parsed.headers || []);
      setQueryParams(parsed.queryParams || []);
      setParsedData(parsed);
      setShowParsedData(true);
      setError(null);

      // Set input mode to curl
      setInputMode('curl');

      // Update authentication state based on parsed data
      if (parsed.auth) {
        setAuthType(parsed.auth.type || 'none');

        // Update auth config based on auth type
        const newAuthConfig = { ...authConfig };

        if (parsed.auth.type === 'basic') {
          newAuthConfig.username = parsed.auth.username || '';
          newAuthConfig.password = parsed.auth.password || '';
        } else if (parsed.auth.type === 'bearer' || parsed.auth.type === 'jwt') {
          newAuthConfig.token = parsed.auth.token || '';
        } else if (parsed.auth.type === 'apikey') {
          newAuthConfig.apiKey = parsed.auth.apiKey || '';
          newAuthConfig.apiKeyName = parsed.auth.apiKeyName || 'X-API-Key';
        }

        setAuthConfig(newAuthConfig);
      }
    } catch (e) {
      console.error('Error parsing cURL command:', e);
      setError({
        message: `Error parsing cURL command: ${e.message}`
      });
    }
  };

  // Handle manual input changes
  const handleApiUrlChange = (e) => {
    setApiUrl(e.target.value);
  };

  const handleMethodChange = (e) => {
    setMethod(e.target.value);
  };

  const handleAuthTypeChange = (newAuthType) => {
    setAuthType(newAuthType);
  };

  const handleAuthConfigChange = (newAuthConfig) => {
    setAuthConfig(newAuthConfig);
  };

  // Build request config from current state
  const buildRequestConfig = () => {
    // Start with basic config
    const config = {
      url: apiUrl.trim(),
      method: method || 'GET',
      apiIntent: 'fetch_courier_data',
      headers: [...headers], // Clone to avoid modifying the original
      queryParams: [...queryParams], // Include query parameters
      body: parsedData?.body || null,
      auth: {
        type: authType,
        ...authConfig
      }
    };

    return config;
  };

  // Handle fetching couriers
  const handleFetchCouriers = async () => {
    if (!apiUrl) {
      setError({ message: 'Please enter an API URL' });
      return;
    }

    setLoading(true);
    setError(null);
    setCouriersFound(null);
    setApiResponse(null);

    try {
      // Create request config from current state
      const requestConfig = buildRequestConfig();
      console.log('Request config:', requestConfig);

      // Make the API request using the centralized API client
      const response = await makeApiRequest(requestConfig);

      // Store the API response
      setApiResponse(response);

      // Extract couriers from the response
      const couriers = extractCouriersFromResponse(response);

      if (!couriers || couriers.length === 0) {
        setError({
          message: 'No couriers found in the API response'
        });
      } else {
        setCouriersFound({
          count: couriers.length,
          couriers: couriers.map(c => c.name).join(', ')
        });

        // Call parsed data callback
        handleParsedData(couriers);

        // Call success callback
        handleSuccess(couriers);
      }
    } catch (err) {
      console.error('Error fetching couriers:', err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Extract couriers from API response
  const extractCouriersFromResponse = (data) => {
    if (!data) return [];

    let couriers = [];

    try {
      // Check if the response is an array
      if (Array.isArray(data)) {
        couriers = data.map(item => ({
          name: item.name || item.courier_name || item.courierName || 'Unknown Courier',
          client_id: clientId
        }));
      }
      // Check if the response has a couriers array
      else if (data.couriers && Array.isArray(data.couriers)) {
        couriers = data.couriers.map(item => ({
          name: item.name || item.courier_name || item.courierName || 'Unknown Courier',
          client_id: clientId
        }));
      }
      // Check if the response has a data array
      else if (data.data && Array.isArray(data.data)) {
        couriers = data.data.map(item => ({
          name: item.name || item.courier_name || item.courierName || 'Unknown Courier',
          client_id: clientId
        }));
      }
      // Check if the response has a results array
      else if (data.results && Array.isArray(data.results)) {
        couriers = data.results.map(item => ({
          name: item.name || item.courier_name || item.courierName || 'Unknown Courier',
          client_id: clientId
        }));
      }
      // Try to extract from any array property in the response as a last resort
      else {
        // Find the first property that is an array
        const arrayProps = Object.keys(data).filter(key =>
          Array.isArray(data[key]) && data[key].length > 0
        );

        if (arrayProps.length > 0) {
          couriers = data[arrayProps[0]].map(item => ({
            name: item.name || item.courier_name || item.courierName || 'Unknown Courier',
            client_id: clientId
          }));
        }
      }

      return couriers;
    } catch (error) {
      console.error('Error extracting couriers from response:', error);
      setError({
        message: `Error extracting couriers: ${error.message}`
      });
      return [];
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <h3 className="text-red-700 font-medium">Error</h3>
          </div>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      )}

      {couriersFound && (
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <div className="flex items-center mb-2">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <h3 className="text-green-700 font-medium">Success</h3>
          </div>
          <p className="text-green-600 text-sm">
            Found {couriersFound.count} couriers: {couriersFound.couriers}
          </p>
        </div>
      )}

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
                Configure the API endpoint to fetch couriers
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
                      value={method}
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
                      placeholder="https://api.example.com/couriers"
                      value={apiUrl}
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
                <div className="space-y-2">
                  <Label htmlFor="curl-command">Paste cURL Command</Label>
                  <Textarea
                    id="curl-command"
                    placeholder="curl -X GET 'https://api.example.com/couriers' -H 'Authorization: Bearer token'"
                    className="curl-input"
                    value={curlCommand}
                    onChange={(e) => setCurlCommand(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleParseCurl}
                      variant="outline"
                    >
                      Parse cURL
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {showParsedData && (
            <Card>
              <CardHeader>
                <CardTitle>Parsed Request Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <label className="text-sm font-medium block mb-1">Method</label>
                      <div className="text-sm p-2 border rounded-md bg-gray-50">
                        {method}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <label className="text-sm font-medium block mb-1">URL</label>
                      <div className="text-sm p-2 border rounded-md bg-gray-50 break-all">
                        {apiUrl}
                      </div>
                    </div>
                  </div>

                  {headers && headers.length > 0 && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Headers</label>
                      <SimplifiedKeyValueDisplay pairs={headers} />
                    </div>
                  )}

                  {queryParams && queryParams.length > 0 && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Query Parameters</label>
                      <SimplifiedKeyValueDisplay pairs={queryParams} />
                    </div>
                  )}

                  {parsedData?.body && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Body</label>
                      <div className="json-display">
                        {JSON.stringify(parsedData.body, null, 2)}
                      </div>
                    </div>
                  )}

                  {parsedData?.auth && parsedData.auth.type !== 'none' && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Authentication</label>
                      <div className="text-sm p-2 border rounded-md bg-gray-50">
                        <p><strong>Type:</strong> {parsedData.auth.type}</p>
                        {parsedData.auth.type === 'basic' && (
                          <p><strong>Username:</strong> {parsedData.auth.username}</p>
                        )}
                        {(parsedData.auth.type === 'bearer' || parsedData.auth.type === 'jwt') && (
                          <p><strong>Token:</strong> {parsedData.auth.token.substring(0, 10)}...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {apiResponse && (
        <ApiResponseDisplay
          response={apiResponse}
          title="API Response"
          expandable={true}
        />
      )}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={handleFetchCouriers}
          disabled={loading || !apiUrl}
        >
          {loading ? (
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
  );
};

export default EnhancedCourierApiIntegrationForm;
