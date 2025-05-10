/**
 * Enhanced Field Mapping Component
 * 
 * This component provides an enhanced interface for mapping API response fields
 * to FT fields with better tooltips, guidance, and search functionality.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { Search, Plus, Trash2, HelpCircle, Check, AlertTriangle } from 'lucide-react';
import { extractFieldPaths, getValueByPath } from '../../lib/field-extractor';
import { createMemoizedFieldPathsExtractor } from '../../lib/cache-utils';

// Create a memoized version of extractFieldPaths
const memoizedExtractFieldPaths = createMemoizedFieldPathsExtractor(extractFieldPaths);

/**
 * Enhanced Field Mapping Component
 * @param {Object} props - Component props
 * @param {Object} props.apiResponse - The API response to map fields from
 * @param {Array} props.ftFields - The FT fields to map to
 * @param {Object} props.initialMappings - Initial field mappings
 * @param {Function} props.onMappingChange - Callback for mapping changes
 * @param {Function} props.onSaveMappings - Callback for saving mappings
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The component
 */
const EnhancedFieldMappingComponent = ({
  apiResponse,
  ftFields = [],
  initialMappings = {},
  onMappingChange,
  onSaveMappings,
  className = ''
}) => {
  const [mappings, setMappings] = useState(initialMappings);
  const [fieldPaths, setFieldPaths] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFtField, setSelectedFtField] = useState('');
  const [customMappings, setCustomMappings] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [previewValues, setPreviewValues] = useState({});

  // Extract field paths from the API response
  useEffect(() => {
    if (!apiResponse) return;

    try {
      // Use the memoized version of extractFieldPaths
      const paths = memoizedExtractFieldPaths(apiResponse);
      setFieldPaths(paths);
    } catch (error) {
      console.error('Error extracting field paths:', error);
    }
  }, [apiResponse]);

  // Update preview values when mappings change
  useEffect(() => {
    if (!apiResponse) return;

    const newPreviewValues = {};
    
    // Get preview values for standard mappings
    Object.entries(mappings).forEach(([ftField, apiField]) => {
      if (apiField) {
        try {
          newPreviewValues[ftField] = getValueByPath(apiResponse, apiField);
        } catch (error) {
          console.error(`Error getting preview value for ${ftField}:`, error);
        }
      }
    });
    
    // Get preview values for custom mappings
    customMappings.forEach(({ ftField, apiField }) => {
      if (apiField) {
        try {
          newPreviewValues[ftField] = getValueByPath(apiResponse, apiField);
        } catch (error) {
          console.error(`Error getting preview value for ${ftField}:`, error);
        }
      }
    });
    
    setPreviewValues(newPreviewValues);
  }, [apiResponse, mappings, customMappings]);

  // Filter field paths based on search query
  const filteredFieldPaths = useMemo(() => {
    if (!searchQuery) return fieldPaths;
    
    return fieldPaths.filter(path => 
      path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fieldPaths, searchQuery]);

  // Handle mapping change
  const handleMappingChange = (ftField, apiField) => {
    const newMappings = { ...mappings, [ftField]: apiField };
    setMappings(newMappings);
    
    // Clear validation error for this field
    if (validationErrors[ftField]) {
      const newErrors = { ...validationErrors };
      delete newErrors[ftField];
      setValidationErrors(newErrors);
    }
    
    if (onMappingChange) {
      onMappingChange(newMappings);
    }
  };

  // Handle custom mapping change
  const handleCustomMappingChange = (index, field, value) => {
    const newCustomMappings = [...customMappings];
    newCustomMappings[index] = { ...newCustomMappings[index], [field]: value };
    setCustomMappings(newCustomMappings);
    
    // Clear validation error for this field
    if (validationErrors[`custom_${index}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`custom_${index}`];
      setValidationErrors(newErrors);
    }
  };

  // Add a new custom mapping
  const addCustomMapping = () => {
    setCustomMappings([...customMappings, { ftField: '', apiField: '' }]);
  };

  // Remove a custom mapping
  const removeCustomMapping = (index) => {
    const newCustomMappings = [...customMappings];
    newCustomMappings.splice(index, 1);
    setCustomMappings(newCustomMappings);
    
    // Remove validation error for this field
    if (validationErrors[`custom_${index}`]) {
      const newErrors = { ...validationErrors };
      delete newErrors[`custom_${index}`];
      setValidationErrors(newErrors);
    }
  };

  // Validate mappings
  const validateMappings = () => {
    const errors = {};
    
    // Validate required FT fields
    ftFields.forEach(field => {
      if (field.required && !mappings[field.name]) {
        errors[field.name] = 'This field is required';
      }
    });
    
    // Validate custom mappings
    customMappings.forEach((mapping, index) => {
      if (!mapping.ftField) {
        errors[`custom_${index}_ftField`] = 'FT field name is required';
      }
      if (!mapping.apiField) {
        errors[`custom_${index}_apiField`] = 'API field path is required';
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save mappings
  const handleSaveMappings = () => {
    if (!validateMappings()) {
      return;
    }
    
    // Combine standard and custom mappings
    const allMappings = { ...mappings };
    
    customMappings.forEach(({ ftField, apiField }) => {
      if (ftField && apiField) {
        allMappings[ftField] = apiField;
      }
    });
    
    if (onSaveMappings) {
      onSaveMappings(allMappings);
    }
  };

  // Render the component
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Field Mapping</CardTitle>
        <CardDescription>
          Map API response fields to FreightTiger fields
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Search for API fields */}
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search API fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            
            {searchQuery && filteredFieldPaths.length > 0 && (
              <div className="mt-2 p-2 border rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                <div className="text-xs text-gray-500 mb-1">
                  {filteredFieldPaths.length} field(s) found
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {filteredFieldPaths.map((path) => (
                    <div
                      key={path}
                      className="text-xs p-1 rounded cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => {
                        if (selectedFtField) {
                          handleMappingChange(selectedFtField, path);
                          setSelectedFtField('');
                        }
                      }}
                    >
                      <span className="truncate">{path}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const value = getValueByPath(apiResponse, path);
                                alert(`Value: ${JSON.stringify(value, null, 2)}`);
                              }}
                            >
                              <HelpCircle className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View value</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Standard FT fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Standard Fields</h3>
            
            {ftFields.map((field) => (
              <div key={field.name} className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-4">
                  <div className="flex items-center">
                    <Label className="text-sm font-medium">
                      {field.label || field.name}
                    </Label>
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                    {field.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 ml-1"
                            >
                              <HelpCircle className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{field.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  {validationErrors[field.name] && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors[field.name]}
                    </div>
                  )}
                </div>
                
                <div className="col-span-6">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={mappings[field.name] || ''}
                      onValueChange={(value) => handleMappingChange(field.name, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select API field" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Search fields..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredFieldPaths.map((path) => (
                          <SelectItem key={path} value={path}>
                            {path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className={selectedFtField === field.name ? 'bg-blue-100' : ''}
                      onClick={() => setSelectedFtField(selectedFtField === field.name ? '' : field.name)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="col-span-2">
                  {previewValues[field.name] !== undefined && (
                    <div className="text-xs text-gray-500 truncate">
                      {typeof previewValues[field.name] === 'object'
                        ? JSON.stringify(previewValues[field.name]).substring(0, 20) + '...'
                        : String(previewValues[field.name])}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Custom mappings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Custom Fields</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomMapping}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Custom Field
              </Button>
            </div>
            
            {customMappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-4">
                  <Input
                    placeholder="FT Field Name"
                    value={mapping.ftField}
                    onChange={(e) => handleCustomMappingChange(index, 'ftField', e.target.value)}
                    className="w-full"
                  />
                  {validationErrors[`custom_${index}_ftField`] && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors[`custom_${index}_ftField`]}
                    </div>
                  )}
                </div>
                
                <div className="col-span-6">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={mapping.apiField}
                      onValueChange={(value) => handleCustomMappingChange(index, 'apiField', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select API field" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Search fields..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredFieldPaths.map((path) => (
                          <SelectItem key={path} value={path}>
                            {path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomMapping(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  {validationErrors[`custom_${index}_apiField`] && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors[`custom_${index}_apiField`]}
                    </div>
                  )}
                </div>
                
                <div className="col-span-2">
                  {mapping.ftField && previewValues[mapping.ftField] !== undefined && (
                    <div className="text-xs text-gray-500 truncate">
                      {typeof previewValues[mapping.ftField] === 'object'
                        ? JSON.stringify(previewValues[mapping.ftField]).substring(0, 20) + '...'
                        : String(previewValues[mapping.ftField])}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div>
          {Object.keys(validationErrors).length > 0 && (
            <div className="flex items-center text-red-500 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Please fix the validation errors
            </div>
          )}
        </div>
        <Button onClick={handleSaveMappings}>
          <Check className="h-4 w-4 mr-1" />
          Save Mappings
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EnhancedFieldMappingComponent;
