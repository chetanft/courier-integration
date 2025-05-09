import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { JsonViewer } from '../ui/json-viewer';
import { Loader2, Search, Check } from 'lucide-react';
import { extractFieldPaths, formatFieldPath } from '../../lib/field-extractor';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../ui/tabs';

const ResponseFieldMapping = ({ onComplete, apiResponses, tmsFields, loading }) => {
  const { watch } = useFormContext();

  // Local state
  const [fieldMappings, setFieldMappings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApiIndex, setSelectedApiIndex] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [extractedFields, setExtractedFields] = useState([]);
  const [requiredFields, setRequiredFields] = useState([]);

  // Watch APIs
  const apis = watch('apis') || [];

  // Extract fields from API responses on component mount
  useEffect(() => {
    if (apiResponses && apiResponses.length > 0) {
      extractAllFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiResponses]);

  // Extract fields from all API responses
  const extractAllFields = () => {
    const allFields = [];

    apiResponses.forEach((response, index) => {
      if (!response || response.error) return;

      // Get root data path from form
      const rootDataPath = apis[index]?.rootDataPath || '';

      // Extract data using root path if specified
      let data = response;
      if (rootDataPath) {
        const pathParts = rootDataPath.split('.');
        for (const part of pathParts) {
          if (data && typeof data === 'object' && part in data) {
            data = data[part];
          } else {
            console.warn(`Root data path "${rootDataPath}" not found in response`);
            data = response;
            break;
          }
        }
      }

      // Extract field paths
      const fields = extractFieldPaths(data);

      // Add API index and label to each field
      const fieldsWithMeta = fields.map(field => ({
        api_index: index,
        api_label: apis[index]?.label || `API ${index + 1}`,
        api_field: field,
        formatted_field: formatFieldPath(field),
        api_type: apis[index]?.label?.toLowerCase().includes('track') ? 'track_shipment' : 'generic'
      }));

      allFields.push(...fieldsWithMeta);
    });

    setExtractedFields(allFields);

    // Initialize field mappings
    const initialMappings = allFields.map(field => ({
      api_index: field.api_index,
      api_label: field.api_label,
      api_field: field.api_field,
      formatted_field: field.formatted_field,
      api_type: field.api_type,
      tms_field: '',
      required: false,
      transform: ''
    }));

    setFieldMappings(initialMappings);
  };

  // Filter fields based on search term
  const filteredFields = fieldMappings.filter(field =>
    field.api_index === selectedApiIndex &&
    (searchTerm === '' ||
     field.api_field.toLowerCase().includes(searchTerm.toLowerCase()) ||
     field.tms_field.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle field mapping change
  const handleMappingChange = (index, tmsField) => {
    const newMappings = [...fieldMappings];
    newMappings[index].tms_field = tmsField === 'none' ? '' : tmsField;
    setFieldMappings(newMappings);
  };

  // Handle required field toggle
  const handleRequiredToggle = (index) => {
    const newMappings = [...fieldMappings];
    newMappings[index].required = !newMappings[index].required;
    setFieldMappings(newMappings);

    // Update required fields list
    if (newMappings[index].required) {
      setRequiredFields([...requiredFields, newMappings[index].api_field]);
    } else {
      setRequiredFields(requiredFields.filter(field => field !== newMappings[index].api_field));
    }
  };

  // Handle transform change
  const handleTransformChange = (index, transform) => {
    const newMappings = [...fieldMappings];
    newMappings[index].transform = transform;
    setFieldMappings(newMappings);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Filter out mappings without TMS field
      const validMappings = fieldMappings.filter(mapping => mapping.tms_field);

      // Check if any mappings exist
      if (validMappings.length === 0) {
        toast.error('Please map at least one field before generating JS file');
        return;
      }

      // Proceed to JS file generation
      onComplete(validMappings);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to generate JS file');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Map Response Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
          {/* API Tabs */}
          <Tabs
            defaultValue={`api-${selectedApiIndex}`}
            onValueChange={(value) => setSelectedApiIndex(parseInt(value.split('-')[1]))}
          >
            <TabsList className="mb-4">
              {apis.map((api, index) => (
                <TabsTrigger key={index} value={`api-${index}`}>
                  {api.label || `API ${index + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>

            {apis.map((api, index) => (
              <TabsContent key={index} value={`api-${index}`}>
                {/* Search */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search fields..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field Mapping Table */}
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">API Field</TableHead>
                        <TableHead className="w-[40%]">TMS Field</TableHead>
                        <TableHead className="w-[10%]">Required</TableHead>
                        <TableHead className="w-[10%]">Transform</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            {searchTerm ? 'No matching fields found' : 'No fields available for this API'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFields.map((field, idx) => {
                          const mappingIndex = fieldMappings.findIndex(
                            m => m.api_index === field.api_index && m.api_field === field.api_field
                          );

                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">
                                {field.formatted_field}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={field.tms_field || 'none'}
                                  onValueChange={(value) => handleMappingChange(mappingIndex, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select TMS field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-- None --</SelectItem>
                                    {tmsFields.map((tmsField, i) => (
                                      <SelectItem key={i} value={tmsField}>
                                        {tmsField}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={field.required}
                                  onCheckedChange={() => handleRequiredToggle(mappingIndex)}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={field.transform || 'none'}
                                  onValueChange={(value) => handleTransformChange(mappingIndex, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Transform" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="toString">ToString</SelectItem>
                                    <SelectItem value="toNumber">ToNumber</SelectItem>
                                    <SelectItem value="toDate">ToDate</SelectItem>
                                    <SelectItem value="toLowerCase">ToLowerCase</SelectItem>
                                    <SelectItem value="toUpperCase">ToUpperCase</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* API Response Preview */}
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">API Response Preview</h3>
                  <div className="bg-gray-50 p-2 rounded border max-h-[300px] overflow-auto">
                    <JsonViewer data={apiResponses[index] || {}} />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Mapping Summary */}
          <div className="bg-gray-50 p-4 rounded-md border">
            <h3 className="text-lg font-medium mb-2">Mapping Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Fields:</span>
                <span>{fieldMappings.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Mapped Fields:</span>
                <span>{fieldMappings.filter(m => m.tms_field).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Required Fields:</span>
                <span>{fieldMappings.filter(m => m.required).length}</span>
              </div>
            </div>
          </div>
          </div>
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
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Generate JS File
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ResponseFieldMapping;
