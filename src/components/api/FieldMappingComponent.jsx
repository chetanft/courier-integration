/**
 * Field Mapping Component
 * 
 * This component provides a UI for mapping API response fields to FT fields.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Plus, Trash, Search } from 'lucide-react';
import { extractFieldPaths, formatFieldPath } from '../../lib/field-extractor';

/**
 * Component for mapping API fields to FT fields
 * @param {Object} props - Component props
 * @param {Object} props.apiResponse - The API response to map fields from
 * @param {Array} props.ftFields - Array of FT fields to map to
 * @param {Object} props.initialMappings - Initial field mappings
 * @param {Function} props.onMappingChange - Callback for mapping changes
 * @param {Function} props.onSaveMappings - Callback for saving mappings
 * @returns {JSX.Element} The component
 */
const FieldMappingComponent = ({
  apiResponse,
  ftFields = [],
  initialMappings = {},
  onMappingChange,
  onSaveMappings
}) => {
  const [fieldPaths, setFieldPaths] = useState([]);
  const [mappings, setMappings] = useState(initialMappings);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customMappings, setCustomMappings] = useState([]);
  const [newFtField, setNewFtField] = useState('');
  const [newApiField, setNewApiField] = useState('');
  
  // Extract field paths from API response
  useEffect(() => {
    if (apiResponse) {
      try {
        setLoading(true);
        const paths = extractFieldPaths(apiResponse);
        setFieldPaths(paths);
      } catch (error) {
        console.error('Error extracting field paths:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [apiResponse]);
  
  // Update mappings when initialMappings change
  useEffect(() => {
    setMappings(initialMappings);
  }, [initialMappings]);
  
  // Handle mapping change
  const handleMappingChange = (ftField, apiField) => {
    const newMappings = {
      ...mappings,
      [ftField]: apiField
    };
    
    setMappings(newMappings);
    
    if (onMappingChange) {
      onMappingChange(newMappings);
    }
  };
  
  // Handle save mappings
  const handleSaveMappings = async () => {
    setLoading(true);
    
    try {
      if (onSaveMappings) {
        await onSaveMappings(mappings);
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding a custom mapping
  const handleAddCustomMapping = () => {
    if (!newFtField || !newApiField) {
      return;
    }
    
    // Add to mappings
    handleMappingChange(newFtField, newApiField);
    
    // Add to custom mappings list
    setCustomMappings([...customMappings, { ftField: newFtField, apiField: newApiField }]);
    
    // Clear inputs
    setNewFtField('');
    setNewApiField('');
  };
  
  // Handle removing a custom mapping
  const handleRemoveCustomMapping = (ftField) => {
    // Remove from mappings
    const newMappings = { ...mappings };
    delete newMappings[ftField];
    setMappings(newMappings);
    
    if (onMappingChange) {
      onMappingChange(newMappings);
    }
    
    // Remove from custom mappings list
    setCustomMappings(customMappings.filter(mapping => mapping.ftField !== ftField));
  };
  
  // Filter field paths by search term
  const filteredFieldPaths = searchTerm
    ? fieldPaths.filter(path => path.toLowerCase().includes(searchTerm.toLowerCase()))
    : fieldPaths;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Map API Fields to FT Fields</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* API Response Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              Map fields from the API response to FreightTiger fields. Select an API field for each FT field.
            </p>
          </div>
          
          {/* API Field Search */}
          <div className="relative">
            <Label htmlFor="field-search">Search API Fields</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="field-search"
                placeholder="Search for API fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {/* Field Mappings */}
          <div className="space-y-2">
            <Label>Field Mappings</Label>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">FT Field</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">API Field Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ftFields.map((ftField, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-medium">{ftField.label || ftField.key}</td>
                      <td className="px-4 py-2">
                        <select
                          value={mappings[ftField.key] || ''}
                          onChange={(e) => handleMappingChange(ftField.key, e.target.value)}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select API field</option>
                          {filteredFieldPaths.map((path, i) => (
                            <option key={i} value={path}>
                              {formatFieldPath(path)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Custom Mappings */}
                  {customMappings.map((mapping, index) => (
                    <tr key={`custom-${index}`} className={(ftFields.length + index) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-medium flex items-center">
                        <span className="flex-1">{mapping.ftField}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCustomMapping(mapping.ftField)}
                          className="ml-2"
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={mappings[mapping.ftField] || ''}
                          onChange={(e) => handleMappingChange(mapping.ftField, e.target.value)}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select API field</option>
                          {filteredFieldPaths.map((path, i) => (
                            <option key={i} value={path}>
                              {formatFieldPath(path)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Custom Mappings */}
          <div className="space-y-2">
            <Label>Add Custom Mapping</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-ft-field">FT Field</Label>
                <Input
                  id="custom-ft-field"
                  placeholder="Enter custom FT field"
                  value={newFtField}
                  onChange={(e) => setNewFtField(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="custom-api-field">API Field Path</Label>
                <Input
                  id="custom-api-field"
                  placeholder="Enter API field path"
                  value={newApiField}
                  onChange={(e) => setNewApiField(e.target.value)}
                  list="api-fields"
                />
                <datalist id="api-fields">
                  {fieldPaths.map((path, i) => (
                    <option key={i} value={path} />
                  ))}
                </datalist>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleAddCustomMapping}
              disabled={!newFtField || !newApiField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Mapping
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSaveMappings}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Mappings'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FieldMappingComponent;
