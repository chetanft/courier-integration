/**
 * JS File Generator Component
 * 
 * This component provides a UI for generating JS files from API responses and field mappings.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Loader2, Download, Copy, Check } from 'lucide-react';
import { generateJsFile } from '../../lib/js-file-generator';

/**
 * Component for generating JS files from API responses and field mappings
 * @param {Object} props - Component props
 * @param {Object} props.responses - API responses from all steps
 * @param {string} props.courierName - The courier name
 * @param {string} props.clientName - The client name
 * @param {Object} props.fieldMappings - Field mappings by API type
 * @param {Function} props.onGenerate - Callback for when a JS file is generated
 * @param {Function} props.onDownload - Callback for when a JS file is downloaded
 * @returns {JSX.Element} The component
 */
const JsFileGenerator = ({ 
  responses, 
  courierName, 
  clientName,
  fieldMappings = {},
  onGenerate,
  onDownload
}) => {
  const [jsFile, setJsFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    includeAuth: true,
    includeTracking: true,
    includeEpod: false
  });
  
  // Handle option change
  const handleOptionChange = (option, value) => {
    setOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };
  
  // Generate JS file
  const handleGenerate = async () => {
    setLoading(true);
    
    try {
      const result = generateJsFile(responses, {
        courierName,
        clientName,
        ...options,
        fieldMappings
      });
      
      setJsFile(result);
      
      if (onGenerate) {
        onGenerate(result);
      }
    } catch (error) {
      console.error('Error generating JS file:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Copy JS file content
  const handleCopy = async () => {
    if (!jsFile || !jsFile.content) return;
    
    try {
      await navigator.clipboard.writeText(jsFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying JS file content:', error);
    }
  };
  
  // Download JS file
  const handleDownload = () => {
    if (!jsFile || !jsFile.content) return;
    
    const blob = new Blob([jsFile.content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${courierName.toLowerCase().replace(/\s+/g, '-')}-integration.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onDownload) {
      onDownload(jsFile);
    }
  };
  
  // Get API types from field mappings
  const apiTypes = Object.keys(fieldMappings);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate JS Integration File</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="courier-name">Courier Name</Label>
              <Input
                id="courier-name"
                value={courierName}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={clientName}
                readOnly
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Include Functionality</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-auth"
                  checked={options.includeAuth}
                  onCheckedChange={(checked) => handleOptionChange('includeAuth', checked)}
                />
                <Label htmlFor="include-auth">Authentication Functions</Label>
              </div>
              
              {/* API Type Options */}
              {apiTypes.map((apiType) => (
                <div key={apiType} className="flex items-center space-x-2">
                  <Checkbox
                    id={`include-${apiType}`}
                    checked={options[`include${apiType.charAt(0).toUpperCase() + apiType.slice(1)}`] !== false}
                    onCheckedChange={(checked) => handleOptionChange(`include${apiType.charAt(0).toUpperCase() + apiType.slice(1)}`, checked)}
                  />
                  <Label htmlFor={`include-${apiType}`}>
                    {apiType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Functions
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {jsFile && jsFile.content && (
            <div className="space-y-2">
              <Label>Generated JS File</Label>
              <div className="relative">
                <pre className="bg-gray-50 p-3 rounded-md border overflow-auto max-h-[300px] text-sm font-mono">
                  {jsFile.content}
                </pre>
                <div className="absolute top-2 right-2 flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              {jsFile.size && (
                <p className="text-xs text-gray-500">
                  File size: {(jsFile.size / 1024).toFixed(2)} KB
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate JS File'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JsFileGenerator;
