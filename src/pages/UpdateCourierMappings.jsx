import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Import TMS fields from the Edge Functions service
import { getTmsFields } from '../lib/edge-functions-service';
// Import other functions from the proxy service
import { getCouriers, getCourierMappings, addFieldMapping } from '../lib/supabase-service-proxy';
import { extractFieldPaths, formatFieldPath } from '../lib/field-extractor';
import { testCourierApi } from '../lib/api-utils';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { InfoIcon, CheckCircleIcon } from 'lucide-react';

const UpdateCourierMappings = () => {
  const navigate = useNavigate();
  const [couriers, setCouriers] = useState([]);
  const [tmsFields, setTmsFields] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [apiResponse, setApiResponse] = useState(null);
  const [fieldMappings, setFieldMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingLoading, setSavingLoading] = useState(false);
  const [testingLoading, setTestingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch couriers and TMS fields on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch couriers and TMS fields in parallel
        const [couriersData, tmsFieldsData] = await Promise.all([
          getCouriers(),
          getTmsFields()
        ]);

        setCouriers(couriersData || []);
        setTmsFields(tmsFieldsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError({
          message: 'Failed to load data',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // When a courier is selected, fetch its existing mappings
  useEffect(() => {
    if (!selectedCourier) return;

    const fetchCourierMappings = async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        // Get existing mappings for the courier
        const mappingsData = await getCourierMappings(selectedCourier.id);

        // Determine which TMS fields are missing
        const existingTmsFields = mappingsData.map(m => m.tms_field);
        const allTmsFieldNames = tmsFields.map(f => f.name);
        const missingTmsFields = allTmsFieldNames.filter(field => !existingTmsFields.includes(field));

        setMissingFields(missingTmsFields);

        // Reset field mappings and API response
        setFieldMappings([]);
        setApiResponse(null);
      } catch (err) {
        console.error('Error fetching courier mappings:', err);
        setError({
          message: 'Failed to load courier mappings',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourierMappings();
  }, [selectedCourier, tmsFields]);

  // Test the courier API to get response data
  const handleTestApi = async () => {
    if (!selectedCourier) return;

    setTestingLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Call the courier's API to get a response
      const response = await testCourierApi(selectedCourier);
      setApiResponse(response);

      // Create mapping objects for missing fields
      setFieldMappings(missingFields.map(field => ({
        tms_field: field,
        api_field: '',
        courier_id: selectedCourier.id,
        api_type: selectedCourier.api_intent || 'track_shipment'
      })));
    } catch (err) {
      console.error('Error testing API:', err);
      setError({
        message: 'Failed to test courier API',
        details: err
      });
    } finally {
      setTestingLoading(false);
    }
  };

  // Handle field mapping changes
  const handleMappingChange = (tmsField, apiField) => {
    setFieldMappings(prevMappings =>
      prevMappings.map(mapping =>
        mapping.tms_field === tmsField
          ? { ...mapping, api_field: apiField }
          : mapping
      )
    );
  };

  // Save the new mappings
  const handleSaveMappings = async () => {
    if (!selectedCourier || fieldMappings.length === 0) return;

    setSavingLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Filter out mappings with empty API fields
      const validMappings = fieldMappings.filter(mapping => mapping.api_field);

      if (validMappings.length === 0) {
        throw new Error('No valid mappings to save');
      }

      // Save each mapping
      for (const mapping of validMappings) {
        await addFieldMapping(mapping);
      }

      setSuccess(true);

      // Reset form
      setSelectedCourier(null);
      setMissingFields([]);
      setApiResponse(null);
      setFieldMappings([]);
    } catch (err) {
      console.error('Error saving mappings:', err);
      setError({
        message: 'Failed to save mappings',
        details: err
      });
    } finally {
      setSavingLoading(false);
    }
  };

  if (loading && couriers.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse text-blue-600 text-center p-12">
          Loading data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error.message}</p>

          {error.details && (
            <div className="mt-4 p-4 bg-red-100 rounded text-sm">
              <h4 className="font-medium mb-2">Error Details:</h4>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 flex space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/settings')}
            >
              Back to Settings
            </Button>
            <Button
              variant="default"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Update Courier Mappings</h1>
        <Button
          variant="outline"
          onClick={() => navigate('/settings')}
        >
          Back to Settings
        </Button>
      </div>

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            Mappings have been successfully saved.
            <Button
              variant="link"
              className="ml-2 p-0 h-auto text-green-700 underline"
              onClick={() => navigate(`/courier/${selectedCourier.id}`)}
            >
              View Courier Details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Courier to Update</CardTitle>
          <CardDescription>
            Choose a courier to update with new TMS field mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <Select
                value={selectedCourier?.id || ''}
                onValueChange={(value) => {
                  const courier = couriers.find(c => c.id === value);
                  setSelectedCourier(courier || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a courier" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map(courier => (
                    <SelectItem key={courier.id} value={courier.id}>
                      {courier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                className="w-full"
                disabled={!selectedCourier || testingLoading}
                onClick={handleTestApi}
              >
                {testingLoading ? 'Testing...' : 'Test API'}
              </Button>
            </div>
          </div>

          {selectedCourier && missingFields.length === 0 && (
            <div className="mt-6 p-4 bg-green-50 rounded border border-green-200">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-green-800 font-medium">No Missing Fields</p>
                  <p className="text-green-700 text-sm mt-1">
                    This courier already has mappings for all TMS fields.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedCourier && missingFields.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Missing TMS Fields</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {missingFields.map(field => (
                  <span key={field} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                    {field}
                  </span>
                ))}
              </div>

              <div className="p-4 bg-blue-50 rounded border border-blue-200 mb-4">
                <div className="flex items-start">
                  <InfoIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-medium">How to Update</p>
                    <p className="text-blue-700 text-sm mt-1">
                      Click "Test API" to fetch the courier's API response, then map the missing TMS fields to the appropriate API fields.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {apiResponse && fieldMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Map Missing Fields</CardTitle>
            <CardDescription>
              Map the missing TMS fields to fields from the API response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6">
              <div className="border rounded overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">TMS Field</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">API Field Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fieldMappings.map((mapping, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-4 text-sm font-medium">
                          {mapping.tms_field}
                          <span className="ml-2 text-xs text-gray-500">
                            ({tmsFields.find(f => f.name === mapping.tms_field)?.data_type || 'string'})
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <Select
                            value={mapping.api_field}
                            onValueChange={(value) => handleMappingChange(mapping.tms_field, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-- Select API Field --" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-- Select API Field --</SelectItem>
                              {extractFieldPaths(apiResponse).map(path => (
                                <SelectItem key={path} value={path}>
                                  {formatFieldPath(path)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveMappings}
                  disabled={savingLoading || fieldMappings.every(m => !m.api_field)}
                >
                  {savingLoading ? 'Saving...' : 'Save Mappings'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UpdateCourierMappings;
