import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Loader2, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import ProgressIndicator from './ProgressIndicator';
import { addClientsInBulk, fetchAndStoreCourierData } from '../../lib/supabase-service';
import { normalizeClientName, validateClientName } from '../../lib/client-name-utils';

const JsonUploadForm = ({ onSubmit, loading }) => {
  const [, setFile] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);

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
    try {
      // Parse the JSON
      const data = JSON.parse(content);
      console.log("Parsed JSON data:", data);

      let clientsArray = [];

      // Handle different JSON formats
      if (Array.isArray(data)) {
        // Format: Direct array of clients
        console.log("Detected array format");
        clientsArray = data;
      } else if (data.clients && Array.isArray(data.clients)) {
        // Format: Object with clients array
        console.log("Detected object with clients array format");
        clientsArray = data.clients;
      } else {
        // Neither format is valid
        setValidationErrors(['JSON must be either an array of clients or contain a "clients" array']);
        setParsedData(null);
        return;
      }

      if (clientsArray.length === 0) {
        setValidationErrors(['JSON contains no client data']);
        setParsedData(null);
        return;
      }

      // Validate each client
      const errors = [];
      const clients = clientsArray.map((client, index) => {
        console.log(`Processing client ${index}:`, client);

        // Extract client name from various possible fields
        const name = client.name || client.client_name ||
                    client.company_id || client.company_name ||
                    client['Company ID'] || client['Company Name'];

        console.log(`Client ${index} name:`, name);

        // Check required fields
        if (!name) {
          errors.push(`Client at index ${index} is missing a name`);
          return null;
        }

        // Normalize the client name
        const normalizedName = normalizeClientName(name);
        const validation = validateClientName(normalizedName);

        if (!validation.isValid) {
          errors.push(`Client "${name}": ${validation.message}`);
          return null;
        }

        // Create a normalized client object
        const normalizedClient = {
          ...client,
          name: normalizedName
        };

        // Add special handling for fields with spaces in keys
        if (client['Company ID'] && !normalizedClient.company_id) {
          normalizedClient.company_id = client['Company ID'];
        }

        if (client['Company Name'] && !normalizedClient.company_name) {
          normalizedClient.company_name = client['Company Name'];
        }

        if (client['Old Company ID'] && !normalizedClient.old_company_id) {
          normalizedClient.old_company_id = client['Old Company ID'];
        }

        if (client['Display ID'] && !normalizedClient.display_id) {
          normalizedClient.display_id = client['Display ID'];
        }

        if (client['Types'] && !normalizedClient.types) {
          normalizedClient.types = client['Types'];
        }

        console.log(`Normalized client ${index}:`, normalizedClient);
        return normalizedClient;
      }).filter(Boolean);

      // Check for duplicate names
      const names = clients.map(c => c.name);
      const uniqueNames = [...new Set(names)];

      if (names.length !== uniqueNames.length) {
        errors.push('There are duplicate client names in the JSON');
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        setParsedData(null);
      } else {
        setValidationErrors([]);
        // Always use a consistent format for parsedData
        setParsedData({
          clients,
          count: clients.length
        });
        console.log("Valid clients:", clients);
      }
    } catch (error) {
      setValidationErrors([`Invalid JSON: ${error.message}`]);
      setParsedData(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!parsedData || !parsedData.clients || parsedData.clients.length === 0) {
      setValidationErrors(['No valid clients to process']);
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setProgress(0);
    setProgressMessage('Preparing to add clients...');

    try {
      // Step 1: Add clients to the database
      setCurrentStep(1);
      setProgressMessage('Adding clients to the database...');

      const addedClients = await addClientsInBulk(parsedData.clients);
      setProgress(0.5);
      setProgressMessage(`Added ${addedClients.length} clients successfully`);

      // Step 2: Fetch couriers for each client
      setCurrentStep(2);
      setProgressMessage('Fetching couriers for clients...');

      const results = [];
      let processedCount = 0;

      for (const client of addedClients) {
        try {
          setProgressMessage(`Fetching couriers for ${client.name}...`);

          // Skip clients without API URL
          if (!client.api_url) {
            results.push({
              clientId: client.id,
              clientName: client.name,
              success: true,
              couriers: [],
              count: 0,
              message: 'No API URL provided'
            });
          } else {
            // Parse request_config if it's a string
            let requestConfig = null;
            if (client.request_config) {
              try {
                requestConfig = typeof client.request_config === 'string'
                  ? JSON.parse(client.request_config)
                  : client.request_config;
              } catch (parseError) {
                console.warn(`Error parsing request_config for client ${client.name}:`, parseError);
              }
            }

            // Fetch couriers for this client
            const couriers = await fetchAndStoreCourierData(client.id, client.api_url, requestConfig);

            results.push({
              clientId: client.id,
              clientName: client.name,
              success: true,
              couriers,
              count: couriers.length
            });
          }
        } catch (error) {
          console.error(`Error processing client ${client.name}:`, error);
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: false,
            error: error.message || 'Unknown error',
            details: error
          });
        }

        processedCount++;
        setProgress(0.5 + (processedCount / addedClients.length) * 0.5);
      }

      setProgressMessage('Processing complete!');
      setProgress(1);

      // Call the onSubmit callback with the results
      onSubmit({
        clients: addedClients,
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        totalCouriers: results.reduce((sum, r) => sum + (r.couriers?.length || 0), 0)
      });
    } catch (error) {
      console.error('Error processing clients:', error);
      setValidationErrors([`Error processing clients: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset the form
  const handleReset = () => {
    setFile(null);
    setJsonText('');
    setParsedData(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isProcessing ? (
        <Card>
          <CardContent className="pt-6">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={2}
              stepName={currentStep === 1 ? 'Adding Clients' : 'Fetching Couriers'}
              progress={progress}
              message={progressMessage}
              isIndeterminate={progress === 0}
            />
          </CardContent>
        </Card>
      ) : (
        <>
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
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload a JSON file containing client data
              </p>
            </div>

            <div className="- my-2 flex items-center">
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
                placeholder={`// Format 1: Array of clients\n[\n  {\n    "Company ID": "COM-123",\n    "Company Name": "Client 1",\n    "Old Company ID": "OLD123",\n    "Display ID": "DISP123",\n    "Types": "CNR"\n  }\n]\n\n// Format 2: Object with clients array\n{\n  "clients": [\n    {\n      "Company ID": "COM-123",\n      "Company Name": "Client 1"\n    }\n  ]\n}`}
                className="font-mono text-sm mt-1 min-h-[200px]"
              />
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
                  Found {parsedData.count} valid clients in the JSON
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button
              type="submit"
              disabled={loading || !parsedData || parsedData.clients.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Clients
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

export default JsonUploadForm;
