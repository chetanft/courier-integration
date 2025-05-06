import React, { useState } from 'react';
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
  loading = false
}) => {
  // We only need setActiveTab since the Tabs component manages the active tab internally
  const [, setActiveTab] = useState('response');

  // Handle field mapping change
  const handleMappingChange = (index, tmsField) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = { ...newMappings[index], tms_field: tmsField };
    onMappingChange(newMappings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Response</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="response" onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="response">Response Data</TabsTrigger>
            <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
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
              </div>
            ) : (
              <div className="p-4 border border-green-200 bg-green-50 rounded-md">
                <h3 className="text-lg font-medium text-green-800 mb-2">Success</h3>
                <div className="mt-2">
                  <JsonViewer data={apiResponse} className="bg-white p-2 rounded border" />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mapping">
            {fieldMappings.length > 0 ? (
              <div>
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
                              onValueChange={(value) => handleMappingChange(index, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select TMS field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">-- None --</SelectItem>
                                {tmsFields.map((field) => (
                                  <SelectItem key={field.id} value={field.name}>
                                    {field.display_name || field.name}
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

                <div className="flex justify-end space-x-4 mt-6">
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                No fields available for mapping. Please check the API response.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ResponseViewer;
