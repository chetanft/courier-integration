import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { JsonViewer } from './ui/json-viewer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatFieldPath } from '../lib/field-extractor';

/**
 * A component for viewing API responses and mapping fields
 */
const ResponseViewer = ({
  apiResponse,
  fieldMappings = [],
  tmsFields = [],
  onMappingChange,
  onSaveMappings,
  onGenerateJs,
  onTabChange,
  loading = false
}) => {
  // Track the active tab
  const [activeTab, setActiveTab] = useState('response');

  console.log('ResponseViewer rendering with activeTab:', activeTab);
  console.log('Field mappings:', fieldMappings);

  // Call the onTabChange callback when the active tab changes
  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  // Handle field mapping change
  const handleMappingChange = (index, tmsField) => {
    console.log('Mapping change:', index, tmsField);
    const newMappings = [...fieldMappings];

    // Convert "none" to empty string for the backend
    const finalValue = tmsField === 'none' ? '' : tmsField;

    newMappings[index] = { ...newMappings[index], tms_field: finalValue };
    onMappingChange(newMappings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="response"
          value={activeTab}
          onValueChange={(value) => {
            console.log('Tab changed to:', value);
            setActiveTab(value);
          }}
          className="w-full"
        >
          <TabsList className="hidden">
            <TabsTrigger value="response" onClick={() => setActiveTab('response')}>
              Response Data
            </TabsTrigger>
            <TabsTrigger value="mapping" onClick={() => setActiveTab('mapping')}>
              Field Mapping
            </TabsTrigger>
          </TabsList>

          <TabsContent value="response">
            {apiResponse.error ? (
              <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
                <p className="text-red-600 mb-2">{apiResponse.message}</p>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-800 mb-1">Details:</h4>
                  <JsonViewer data={apiResponse} className="bg-white p-2 rounded border" />
                </div>
                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Back to API Details
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setActiveTab('mapping')}
                  >
                    Continue to Field Mapping
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-green-200 bg-green-50 rounded-md">
                <h3 className="text-lg font-medium text-green-800 mb-2">Success</h3>
                <div className="mt-2">
                  <JsonViewer data={apiResponse} className="bg-white p-2 rounded border" />
                </div>
                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Back to API Details
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setActiveTab('mapping')}
                  >
                    Continue to Field Mapping
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mapping">
            {fieldMappings && fieldMappings.length > 0 ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Field Mapping</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Map API response fields to your TMS fields. Select a TMS field for each API field you want to use.
                  </p>
                </div>

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
                              value={mapping.tms_field || "none"}
                              onValueChange={(value) => handleMappingChange(index, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select TMS field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- None --</SelectItem>
                                {tmsFields && tmsFields.length > 0 ? (
                                  tmsFields.map((field) => (
                                    <SelectItem key={field.id} value={field.name}>
                                      {field.display_name || field.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no_fields_available" disabled>No TMS fields available</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('response')}
                  >
                    Back to Response
                  </Button>
                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={onSaveMappings}
                      disabled={loading}
                    >
                      Save Mappings
                    </Button>
                    <Button
                      variant="default"
                      onClick={onGenerateJs}
                      disabled={loading}
                    >
                      {loading ? 'Generating...' : 'Generate JS File'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 border rounded-md bg-gray-50">
                <h3 className="text-lg font-medium mb-2">No Fields Available</h3>
                <p className="text-gray-500 mb-4">
                  No fields could be extracted from the API response. This might happen if:
                </p>
                <ul className="list-disc pl-5 text-gray-500 mb-4">
                  <li>The API response is empty or has an unexpected format</li>
                  <li>The response contains only primitive values (strings, numbers)</li>
                  <li>There was an error in the API response</li>
                </ul>
                <p className="text-gray-500">
                  Try modifying your API request or check the console for more details.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ResponseViewer;
