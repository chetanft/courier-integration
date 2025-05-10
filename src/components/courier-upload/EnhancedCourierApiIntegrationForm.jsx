/**
 * Enhanced Courier API Integration Form
 * 
 * This component provides an enhanced version of the CourierApiIntegrationForm
 * that uses the centralized API integration system.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCurl } from '../../lib/enhanced-curl-parser';
import { makeApiRequest } from '../../lib/api-client';
import ApiResponseDisplay from '../api/ApiResponseDisplay';
import SimplifiedKeyValueDisplay from '../ui/simplified-key-value-display';

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
  const [showParsedData, setShowParsedData] = useState(false);

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

      // Update state with parsed data
      setApiUrl(parsed.url);
      setMethod(parsed.method);
      setHeaders(parsed.headers || []);
      setParsedData(parsed);
      setShowParsedData(true);
      setError(null);
    } catch (e) {
      console.error('Error parsing cURL command:', e);
      setError({
        message: `Error parsing cURL command: ${e.message}`
      });
    }
  };

  // Handle fetching couriers
  const handleFetchCouriers = async () => {
    if (!parsedData && !apiUrl) {
      setError({ message: 'Please parse a cURL command first or enter API details manually' });
      return;
    }

    setLoading(true);
    setError(null);
    setCouriersFound(null);
    setApiResponse(null);

    try {
      // Create request config from parsed data
      const requestConfig = {
        url: apiUrl.trim(),
        method: method || 'GET',
        apiIntent: 'fetch_courier_data',
        headers: headers || [],
        body: parsedData?.body || {}
      };

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

      <Card>
        <CardHeader>
          <CardTitle>cURL Command</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste cURL Command</label>
              <Textarea
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

              {parsedData?.body && (
                <div>
                  <label className="text-sm font-medium block mb-1">Body</label>
                  <div className="json-display">
                    {JSON.stringify(parsedData.body, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
          disabled={loading || (!parsedData && !apiUrl)}
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
