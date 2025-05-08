import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { AlertCircle, Info } from 'lucide-react';

/**
 * Component for configuring API response filtering options
 */
const ApiFilterOptions = ({ onChange }) => {
  const [enableFiltering, setEnableFiltering] = useState(false);
  const [filterPath, setFilterPath] = useState('');
  const [filterFields, setFilterFields] = useState('');
  const [error, setError] = useState(null);

  // Handle changes to the filter options
  const handleChange = () => {
    try {
      // Parse the filter fields
      let parsedFields = [];
      if (filterFields.trim()) {
        parsedFields = filterFields
          .split('\n')
          .map(field => field.trim())
          .filter(field => field.length > 0);
      }

      // Create the options object
      const options = enableFiltering
        ? {
            filterPath: filterPath.trim() || null,
            filterFields: parsedFields
          }
        : {};

      // Call the onChange callback with the options
      onChange(options);
      setError(null);
    } catch (error) {
      setError('Invalid filter options: ' + error.message);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <span>API Response Filtering</span>
          <Info className="ml-2 h-4 w-4 text-gray-400" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-filtering"
              checked={enableFiltering}
              onCheckedChange={(checked) => {
                setEnableFiltering(checked);
                handleChange();
              }}
            />
            <Label htmlFor="enable-filtering">
              Enable filtering of API response
            </Label>
          </div>

          {enableFiltering && (
            <>
              <div className="space-y-2">
                <Label htmlFor="filter-path">
                  Filter Path (optional)
                </Label>
                <Input
                  id="filter-path"
                  placeholder="e.g., data.results"
                  value={filterPath}
                  onChange={(e) => {
                    setFilterPath(e.target.value);
                    handleChange();
                  }}
                />
                <p className="text-sm text-gray-500">
                  Path to the array of items to filter (e.g., 'data.results'). Leave empty to filter the entire response.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-fields">
                  Fields to Extract (one per line)
                </Label>
                <Textarea
                  id="filter-fields"
                  placeholder="name\nid\nservices\napi_url"
                  value={filterFields}
                  onChange={(e) => {
                    setFilterFields(e.target.value);
                    handleChange();
                  }}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-gray-500">
                  List the fields you want to extract from each item, one per line. You can use dot notation for nested fields (e.g., 'address.city').
                </p>
              </div>

              {error && (
                <div className="bg-red-50 p-3 rounded-md border border-red-200">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiFilterOptions;
