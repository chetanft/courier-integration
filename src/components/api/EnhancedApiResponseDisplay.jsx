/**
 * Enhanced API Response Display
 * 
 * This component provides an enhanced display for API responses with
 * better error messages, filtering, and performance optimizations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Clipboard, Filter, AlertCircle, CheckCircle, X, Search, Download } from 'lucide-react';
import LazyJsonViewer from '../ui/lazy-json-viewer';
import { extractFieldPaths } from '../../lib/field-extractor';
import { createMemoizedFieldPathsExtractor } from '../../lib/cache-utils';

// Create a memoized version of extractFieldPaths
const memoizedExtractFieldPaths = createMemoizedFieldPathsExtractor(extractFieldPaths);

/**
 * Enhanced API Response Display component
 * @param {Object} props - Component props
 * @param {Object} props.response - The API response to display
 * @param {string} props.title - The title of the response display
 * @param {boolean} props.expandable - Whether the response display is expandable
 * @param {boolean} props.showCopy - Whether to show the copy button
 * @param {boolean} props.showDownload - Whether to show the download button
 * @param {boolean} props.showFilter - Whether to show the filter input
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The component
 */
const EnhancedApiResponseDisplay = ({
  response,
  title = 'API Response',
  expandable = true,
  showCopy = true,
  showDownload = true,
  showFilter = true,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(!expandable);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('formatted');
  const [filterText, setFilterText] = useState('');
  const [filteredResponse, setFilteredResponse] = useState(response);
  const [fieldPaths, setFieldPaths] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  // Extract field paths from the response
  useEffect(() => {
    if (!response) return;

    try {
      // Use the memoized version of extractFieldPaths
      const paths = memoizedExtractFieldPaths(response);
      setFieldPaths(paths);
    } catch (error) {
      console.error('Error extracting field paths:', error);
    }
  }, [response]);

  // Filter the response based on the filter text
  useEffect(() => {
    if (!response) {
      setFilteredResponse(null);
      return;
    }

    if (!filterText && selectedFields.length === 0) {
      setFilteredResponse(response);
      return;
    }

    try {
      // Create a filtered copy of the response
      const filtered = JSON.parse(JSON.stringify(response));

      // Apply field selection if any fields are selected
      if (selectedFields.length > 0) {
        // Filter the response to only include selected fields
        const filterObject = (obj, prefix = '') => {
          if (!obj || typeof obj !== 'object') return obj;

          if (Array.isArray(obj)) {
            return obj.map(item => filterObject(item, prefix));
          }

          const result = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const newPrefix = prefix ? `${prefix}.${key}` : key;
              
              // Check if this field or any of its children are selected
              const isSelected = selectedFields.some(field => 
                field === newPrefix || field.startsWith(`${newPrefix}.`) || 
                (Array.isArray(obj[key]) && field.startsWith(`${newPrefix}[`))
              );
              
              if (isSelected) {
                result[key] = filterObject(obj[key], newPrefix);
              }
            }
          }
          return result;
        };

        const filteredByFields = filterObject(filtered);
        setFilteredResponse(filteredByFields);
        return;
      }

      // Apply text filtering
      if (filterText) {
        const filterRegex = new RegExp(filterText, 'i');
        
        // Filter the response based on the filter text
        const filterObjectByText = (obj) => {
          if (!obj || typeof obj !== 'object') {
            return JSON.stringify(obj).match(filterRegex) ? obj : undefined;
          }

          if (Array.isArray(obj)) {
            const filteredArray = obj
              .map(filterObjectByText)
              .filter(item => item !== undefined);
            
            return filteredArray.length > 0 ? filteredArray : undefined;
          }

          const result = {};
          let hasMatch = false;

          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              // Check if the key matches the filter
              const keyMatches = key.match(filterRegex);
              
              // Filter the value
              const filteredValue = filterObjectByText(obj[key]);
              
              // Include the key-value pair if either the key matches or the value has a match
              if (keyMatches || filteredValue !== undefined) {
                result[key] = filteredValue !== undefined ? filteredValue : obj[key];
                hasMatch = true;
              }
            }
          }

          return hasMatch ? result : undefined;
        };

        const filteredByText = filterObjectByText(filtered);
        setFilteredResponse(filteredByText || {});
      }
    } catch (error) {
      console.error('Error filtering response:', error);
      setFilteredResponse(response);
    }
  }, [response, filterText, selectedFields]);

  // Handle copy button click
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(
        activeTab === 'raw' 
          ? JSON.stringify(filteredResponse) 
          : JSON.stringify(filteredResponse, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Handle download button click
  const handleDownload = () => {
    try {
      const blob = new Blob(
        [JSON.stringify(filteredResponse, null, 2)], 
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-response-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading response:', error);
    }
  };

  // Toggle field selection
  const toggleFieldSelection = (field) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  // Clear all selected fields
  const clearSelectedFields = () => {
    setSelectedFields([]);
  };

  // Determine if the response is an error
  const isError = useMemo(() => {
    if (!response) return false;
    return response.error === true || response.status >= 400;
  }, [response]);

  // Render the component
  return (
    <Card className={`${className} ${isError ? 'border-red-200' : ''}`}>
      <CardHeader className={`${isError ? 'bg-red-50' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {isError && (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex space-x-2">
            {showFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFieldSelector(!showFieldSelector)}
                className={showFieldSelector ? 'bg-blue-50' : ''}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            )}
            {showCopy && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            )}
            {showDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
            {expandable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Collapse' : 'Expand'}
              </Button>
            )}
          </div>
        </div>
        {isError && (
          <CardDescription className="text-red-600">
            {response.message || 'An error occurred'}
          </CardDescription>
        )}
      </CardHeader>

      {expanded && (
        <CardContent>
          {showFieldSelector && (
            <div className="mb-4 p-3 border rounded-md bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Filter Response</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFieldSelector(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Filter by text..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                {selectedFields.length > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-500">
                      {selectedFields.length} field(s) selected
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectedFields}
                      className="text-xs h-6 px-2"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
              
              {fieldPaths.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-1">
                    {fieldPaths.map((path) => (
                      <div
                        key={path}
                        className={`
                          text-xs p-1 rounded cursor-pointer flex items-center
                          ${selectedFields.includes(path) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}
                        `}
                        onClick={() => toggleFieldSelection(path)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(path)}
                          onChange={() => {}}
                          className="mr-1"
                        />
                        <span className="truncate">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-2">
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>
            
            <TabsContent value="formatted" className="mt-0">
              <div className="bg-gray-50 p-3 rounded-md border overflow-auto max-h-[500px]">
                {filteredResponse ? (
                  <LazyJsonViewer
                    data={filteredResponse}
                    collapsed={false}
                    maxInitialDepth={2}
                  />
                ) : (
                  <div className="text-gray-500 italic">No response data</div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="raw" className="mt-0">
              <div className="bg-gray-50 p-3 rounded-md border overflow-auto max-h-[500px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {filteredResponse ? JSON.stringify(filteredResponse, null, 2) : 'No response data'}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default EnhancedApiResponseDisplay;
