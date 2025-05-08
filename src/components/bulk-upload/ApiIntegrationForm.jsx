import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Loader2, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import RequestBuilder from '../request-builder';
import { useForm } from 'react-hook-form';
import ProgressIndicator from './ProgressIndicator';
import { addClientsInBulk } from '../../lib/supabase-service';
import { extractClientName, normalizeClientName, validateClientName } from '../../lib/client-name-utils';
import { testCourierApi } from '../../lib/api-utils';
import { extractCouriersFromResponse } from '../../lib/courier-api-service';

const ApiIntegrationForm = ({ onSubmit, loading }) => {
  const [apiResponse, setApiResponse] = useState(null);
  const [parsedClients, setParsedClients] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // Initialize form with react-hook-form
  const formMethods = useForm({
    defaultValues: {
      method: 'GET',
      url: '',
      auth: {
        type: 'none',
        username: '',
        password: '',
        token: '',
        apiKey: '',
        apiKeyName: 'X-API-Key',
        apiKeyLocation: 'header',
      },
      headers: [],
      queryParams: [],
      body: {},
      curlCommand: ''
    }
  });

  // Test the API connection
  const testApiConnection = async () => {
    const formData = formMethods.getValues();
    
    if (!formData.url.trim()) {
      setValidationErrors(['Please enter an API URL']);
      return;
    }
    
    setIsTesting(true);
    setValidationErrors([]);
    setApiResponse(null);
    setParsedClients(null);
    
    try {
      // Create request config from form data
      const requestConfig = {
        url: formData.url.trim(),
        method: formData.method || 'GET',
        headers: formData.headers || [],
        queryParams: formData.queryParams || [],
        body: formData.body || {}
      };
      
      // Add authentication if provided
      if (formData.auth && formData.auth.type !== 'none') {
        requestConfig.auth = {
          type: formData.auth.type
        };
        
        // Add auth details based on type
        switch (formData.auth.type) {
          case 'basic':
            requestConfig.auth.username = formData.auth.username;
            requestConfig.auth.password = formData.auth.password;
            break;
          case 'bearer':
          case 'jwt':
            requestConfig.auth.token = formData.auth.token;
            break;
          case 'apikey':
            requestConfig.auth.apiKey = formData.auth.apiKey;
            requestConfig.auth.apiKeyName = formData.auth.apiKeyName;
            requestConfig.auth.apiKeyLocation = formData.auth.apiKeyLocation;
            break;
          default:
            break;
        }
      }
      
      // Make the API request
      const response = await testCourierApi(requestConfig);
      
      // Check if the response contains an error
      if (response.error) {
        throw {
          message: response.message || 'API request failed',
          status: response.status,
          statusText: response.statusText,
          details: response.details
        };
      }
      
      setApiResponse(response);
      
      // Try to extract clients from the response
      const extractedClients = extractClientsFromResponse(response);
      
      if (extractedClients.length === 0) {
        setValidationErrors(['No clients found in the API response']);
      } else {
        setParsedClients({
          clients: extractedClients,
          count: extractedClients.length
        });
      }
    } catch (error) {
      console.error('Error testing API connection:', error);
      setValidationErrors([`API request failed: ${error.message || 'Unknown error'}`]);
    } finally {
      setIsTesting(false);
    }
  };
  
  // Extract clients from API response
  const extractClientsFromResponse = (data) => {
    if (!data) return [];
    
    let clients = [];
    
    try {
      // Check if the response is an array
      if (Array.isArray(data)) {
        clients = data.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim()
        }));
      }
      // Check if the response has a clients array
      else if (data.clients && Array.isArray(data.clients)) {
        clients = data.clients.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim()
        }));
      }
      // Check if the response has a data array
      else if (data.data && Array.isArray(data.data)) {
        clients = data.data.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim()
        }));
      }
      // Check if the response has a results array
      else if (data.results && Array.isArray(data.results)) {
        clients = data.results.map(item => ({
          name: extractClientName(item) || 'Unknown Client',
          api_url: formMethods.getValues().url.trim()
        }));
      }
      // Try to extract from any array property in the response as a last resort
      else {
        // Find the first property that is an array
        const arrayProps = Object.keys(data).filter(key =>
          Array.isArray(data[key]) && data[key].length > 0
        );
        
        if (arrayProps.length > 0) {
          clients = data[arrayProps[0]].map(item => ({
            name: extractClientName(item) || 'Unknown Client',
            api_url: formMethods.getValues().url.trim()
          }));
        }
      }
      
      // Normalize client names and validate
      const validClients = [];
      const errors = [];
      
      clients.forEach((client, index) => {
        const normalizedName = normalizeClientName(client.name);
        const validation = validateClientName(normalizedName);
        
        if (validation.isValid) {
          validClients.push({
            ...client,
            name: normalizedName
          });
        } else {
          errors.push(`Client "${client.name}": ${validation.message}`);
        }
      });
      
      // Check for duplicate names
      const names = validClients.map(c => c.name);
      const uniqueNames = [...new Set(names)];
      
      if (names.length !== uniqueNames.length) {
        errors.push('There are duplicate client names in the API response');
      }
      
      if (errors.length > 0) {
        setValidationErrors(errors);
      }
      
      return validClients;
    } catch (error) {
      console.error('Error extracting clients from response:', error);
      setValidationErrors([`Error extracting clients: ${error.message}`]);
      return [];
    }
  };

  // Handle form submission
  const handleSubmit = async (data) => {
    if (!parsedClients || !parsedClients.clients || parsedClients.clients.length === 0) {
      setValidationErrors(['No valid clients to process']);
      return;
    }
    
    setIsProcessing(true);
    setCurrentStep(1);
    setProgress(0);
    setProgressMessage('Preparing to add clients...');
    
    try {
      // Create request config from form data
      const requestConfig = {
        url: data.url.trim(),
        method: data.method || 'GET',
        headers: data.headers || [],
        queryParams: data.queryParams || [],
        body: data.body || {}
      };
      
      // Add authentication if provided
      if (data.auth && data.auth.type !== 'none') {
        requestConfig.auth = {
          type: data.auth.type
        };
        
        // Add auth details based on type
        switch (data.auth.type) {
          case 'basic':
            requestConfig.auth.username = data.auth.username;
            requestConfig.auth.password = data.auth.password;
            break;
          case 'bearer':
          case 'jwt':
            requestConfig.auth.token = data.auth.token;
            break;
          case 'apikey':
            requestConfig.auth.apiKey = data.auth.apiKey;
            requestConfig.auth.apiKeyName = data.auth.apiKeyName;
            requestConfig.auth.apiKeyLocation = data.auth.apiKeyLocation;
            break;
          default:
            break;
        }
      }
      
      // Add request_config to each client
      const clientsWithConfig = parsedClients.clients.map(client => ({
        ...client,
        request_config: requestConfig
      }));
      
      // Step 1: Add clients to the database
      setCurrentStep(1);
      setProgressMessage('Adding clients to the database...');
      
      const addedClients = await addClientsInBulk(clientsWithConfig);
      setProgress(1);
      setProgressMessage(`Added ${addedClients.length} clients successfully`);
      
      // Call the onSubmit callback with the results
      onSubmit({
        clients: addedClients,
        results: addedClients.map(client => ({
          clientId: client.id,
          clientName: client.name,
          success: true,
          couriers: [],
          count: 0,
          message: 'Client added successfully'
        })),
        successCount: addedClients.length,
        failureCount: 0,
        totalCouriers: 0
      });
    } catch (error) {
      console.error('Error processing clients:', error);
      setValidationErrors([`Error processing clients: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {isProcessing ? (
        <Card>
          <CardContent className="pt-6">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={1}
              stepName="Adding Clients"
              progress={progress}
              message={progressMessage}
              isIndeterminate={progress === 0}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <RequestBuilder
            formMethods={formMethods}
            onSubmit={handleSubmit}
            loading={loading || isTesting}
            showCurlInput={true}
            showApiIntents={false}
            showNameField={false}
            customSubmitLabel="Add Clients"
          />
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={testApiConnection}
              disabled={loading || isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test API Connection'
              )}
            </Button>
          </div>
          
          {validationErrors.length > 0 && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 mt-4">
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
          
          {parsedClients && (
            <div className="bg-green-50 p-3 rounded-md border border-green-200 mt-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <h3 className="text-sm font-medium text-green-800">Clients Found</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">
                Found {parsedClients.count} valid clients in the API response
              </p>
              <div className="bg-white p-2 rounded border border-green-100 max-h-40 overflow-auto">
                <ul className="text-xs space-y-1">
                  {parsedClients.clients.map((client, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-4 h-4 inline-flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs mr-2">
                        {index + 1}
                      </span>
                      {client.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApiIntegrationForm;
