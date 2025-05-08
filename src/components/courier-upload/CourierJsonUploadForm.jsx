import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Loader2, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { parseAndValidateJsonCouriers } from '../../lib/courier-upload-utils';
import { addCouriersToClient } from '../../lib/supabase-service';

const CourierJsonUploadForm = ({ clientId, onSuccess, onError, onParsedData }) => {
  const [jsonText, setJsonText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Read the file content
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setJsonText(content);
        validateJson(content);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Handle manual JSON text input
  const handleJsonTextChange = (e) => {
    const content = e.target.value;
    setJsonText(content);
    if (content.trim()) {
      validateJson(content);
    } else {
      setParsedData(null);
      setValidationErrors([]);
    }
  };

  // Validate JSON content
  const validateJson = (content) => {
    setIsProcessing(true);

    try {
      const result = parseAndValidateJsonCouriers(content);

      if (result.isValid) {
        setParsedData(result);
        setValidationErrors([]);

        // If onParsedData is provided, call it with the parsed couriers
        if (onParsedData) {
          onParsedData(result.couriers);
        }
      } else {
        setParsedData(null);
        setValidationErrors(result.errors);
      }
    } catch (error) {
      setParsedData(null);
      setValidationErrors([`Error validating JSON: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!parsedData || !parsedData.couriers || parsedData.couriers.length === 0) {
      setValidationErrors(['No valid couriers to process']);
      return;
    }

    // If clientId is not provided, just call onSuccess with the parsed data
    if (!clientId) {
      if (onSuccess) {
        onSuccess(parsedData.couriers);
      }
      return;
    }

    setIsUploading(true);

    try {
      // Add couriers to the client
      const addedCouriers = await addCouriersToClient(clientId, parsedData.couriers);

      if (onSuccess) {
        onSuccess(addedCouriers);
      }
    } catch (error) {
      console.error('Error adding couriers:', error);
      setValidationErrors([`Error adding couriers: ${error.message}`]);

      if (onError) {
        onError(error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Reset the form
  const handleReset = () => {
    setJsonText('');
    setParsedData(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="json-file">Upload JSON File</Label>
          <Input
            id="json-file"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="mt-1"
            disabled={isProcessing || isUploading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Upload a JSON file containing courier data
          </p>
        </div>

        <div className="my-2 flex items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-2 text-sm text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div>
          <Label htmlFor="json-text">Paste JSON</Label>
          <Textarea
            id="json-text"
            value={jsonText}
            onChange={handleJsonTextChange}
            placeholder={`// Format 1: Array of couriers\n[\n  {\n    "name": "Courier 1",\n    "api_url": "https://example.com/api"\n  }\n]\n\n// Format 2: Object with couriers array\n{\n  "couriers": [\n    {\n      "name": "Courier 2",\n      "api_url": "https://example.com/api2"\n    }\n  ]\n}`}
            className="font-mono text-sm mt-1 min-h-[200px]"
            disabled={isProcessing || isUploading}
          />
          <p className="text-sm text-gray-500 mt-1">
            JSON can be either an array of courier objects or an object with a "couriers" array. Each courier must have at least a "name" property.
          </p>
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-50 p-3 rounded-md border border-red-200">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
            </div>
            <ul className="text-sm text-red-700 list-disc pl-5 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {parsedData && (
          <div className="bg-green-50 p-3 rounded-md border border-green-200">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <h3 className="text-sm font-medium text-green-800">Valid JSON</h3>
            </div>
            <p className="text-sm text-green-700">
              Found {parsedData.count} valid couriers in the JSON
            </p>
            {parsedData.count > 0 && (
              <div className="mt-2 bg-white p-2 rounded border border-green-100 max-h-40 overflow-auto">
                <ul className="text-xs space-y-1">
                  {parsedData.couriers.map((courier, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-4 h-4 inline-flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs mr-2">
                        {index + 1}
                      </span>
                      {courier.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isProcessing || isUploading}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isProcessing || isUploading || !parsedData || parsedData.couriers.length === 0}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {clientId ? 'Upload Couriers' : 'Continue'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CourierJsonUploadForm;
