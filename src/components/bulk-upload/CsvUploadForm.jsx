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

const CsvUploadForm = ({ onSubmit, loading }) => {
  const [, setFile] = useState(null);
  const [csvText, setCsvText] = useState('');
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
        setCsvText(content);
        validateCsv(content);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Handle manual CSV text input
  const handleCsvTextChange = (e) => {
    const content = e.target.value;
    setCsvText(content);
    if (content.trim()) {
      validateCsv(content);
    } else {
      setParsedData(null);
      setValidationErrors([]);
    }
  };

  // Parse CSV to array of objects
  const parseCsv = (csvContent) => {
    // Split by lines and filter out empty lines
    const lines = csvContent.split(/\\r?\\n/).filter(line => line.trim());

    console.log('CSV lines:', lines);

    if (lines.length === 0) {
      throw new Error('CSV is empty');
    }

    // Parse header row
    const headerRow = lines[0].split(',').map(header =>
      header.trim().replace(/^["'](.*)["']$/, '$1') // Remove quotes if present
    );

    console.log('CSV headers:', headerRow);

    // Check for BOM character in the first header
    if (headerRow[0] && headerRow[0].charCodeAt(0) === 65279) {
      console.warn('BOM character detected in CSV, removing it');
      headerRow[0] = headerRow[0].slice(1);
    }

    // Check for valid headers with case-insensitive comparison
    const validHeaderFound = headerRow.some(header => {
      const lowerHeader = header.toLowerCase();
      return lowerHeader === 'name' ||
             lowerHeader === 'client_name' ||
             lowerHeader === 'company id' ||
             lowerHeader === 'company name';
    });

    if (!validHeaderFound) {
      console.error('No valid header found in:', headerRow);
      throw new Error('CSV must have a "Company ID" or "Company Name" column');
    }

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length !== headerRow.length) {
        throw new Error(`Line ${i + 1} has ${values.length} values, but header has ${headerRow.length} columns`);
      }

      const row = {};
      headerRow.forEach((header, index) => {
        // Store the value with the original header name
        row[header] = values[index];

        // Also store with normalized header name for case-insensitive access
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
        if (normalizedHeader !== header) {
          row[normalizedHeader] = values[index];
        }
      });

      data.push(row);
    }

    return { headers: headerRow, data };
  };

  // Parse a CSV line handling quoted values with commas
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["'](.*)["']$/, '$1'));
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim().replace(/^["'](.*)["']$/, '$1'));
    return result;
  };

  // Validate CSV content
  const validateCsv = (content) => {
    try {
      // Parse the CSV
      const { data } = parseCsv(content);

      // Debug: Log the parsed data to see what we're working with
      console.log('Parsed CSV data:', data);

      if (data.length === 0) {
        console.warn('CSV parsed successfully but contains no data rows');
      }

      // Validate each client
      const errors = [];
      const clients = data.map((row, index) => {
        // Debug: Log each row to see what fields are available
        console.log(`Row ${index + 1}:`, row);

        // Get the client name from the appropriate column
        // Check for case variations and trim whitespace
        const name = row.name || row.client_name ||
                    row.company_id || row.company_name ||
                    row['Company ID'] || row['company id'] || row['COMPANY ID'] ||
                    row['Company Name'] || row['company name'] || row['COMPANY NAME'];

        console.log(`Row ${index + 1} name:`, name);

        if (!name) {
          errors.push(`Client at row ${index + 2} is missing a name`);
          return null;
        }

        // Normalize the client name
        const normalizedName = normalizeClientName(name);
        const validation = validateClientName(normalizedName);

        if (!validation.isValid) {
          errors.push(`Client "${name}" at row ${index + 2}: ${validation.message}`);
          return null;
        }

        // Create a client object
        const client = {
          name: normalizedName
        };

        console.log(`Creating client object with name: ${normalizedName}`);

        // Add new fields if present - check multiple variations of field names
        if (row['Old Company ID'] || row.old_company_id) {
          client.old_company_id = row['Old Company ID'] || row.old_company_id;
          console.log(`Added old_company_id: ${client.old_company_id}`);
        }

        if (row['Display ID'] || row.display_id) {
          client.display_id = row['Display ID'] || row.display_id;
          console.log(`Added display_id: ${client.display_id}`);
        }

        if (row['Types'] || row.types) {
          client.types = row['Types'] || row.types;
          console.log(`Added types: ${client.types}`);
        }

        // Add API URL if present
        if (row.api_url) {
          client.api_url = row.api_url;
        }

        // Add auth type and token if present
        if (row.auth_type) {
          const requestConfig = {
            auth: {
              type: row.auth_type
            }
          };

          if (row.auth_token) {
            requestConfig.auth.token = row.auth_token;
          }

          client.request_config = requestConfig;
        }

        return client;
      }).filter(Boolean);

      // Check for duplicate names
      const names = clients.map(c => c.name);
      const uniqueNames = [...new Set(names)];

      console.log('Final valid clients:', clients);
      console.log(`Found ${clients.length} valid clients`);

      if (names.length !== uniqueNames.length) {
        console.warn('Duplicate client names detected');
        errors.push('There are duplicate client names in the CSV');
      }

      if (errors.length > 0) {
        console.error('Validation errors:', errors);
        setValidationErrors(errors);
        setParsedData(null);
      } else {
        console.log('CSV validation successful');
        setValidationErrors([]);
        setParsedData({
          clients,
          count: clients.length
        });
      }
    } catch (error) {
      setValidationErrors([`Invalid CSV: ${error.message}`]);
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
    setCsvText('');
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
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload a CSV file containing client data
              </p>
            </div>

            <div className="- my-2 flex items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="mx-2 text-sm text-gray-500">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div>
              <Label htmlFor="csv-text">Paste CSV</Label>
              <Textarea
                id="csv-text"
                value={csvText}
                onChange={handleCsvTextChange}
                placeholder="Company ID,Company Name,Old Company ID,Display ID,Types,api_url,auth_type,auth_token\nCLI001,Client 1,OLD001,DISP001,Type1,https://example.com/api,bearer,token123"
                className="font-mono text-sm mt-1 min-h-[200px]"
              />
              <p className="text-sm text-gray-500 mt-1">
                CSV must have a "Company ID" or "Company Name" column. Optional columns: Old Company ID, Display ID, Types, api_url, auth_type, auth_token
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
                  <h3 className="text-sm font-medium text-green-800">Valid CSV</h3>
                </div>
                <p className="text-sm text-green-700">
                  Found {parsedData.count} valid clients in the CSV
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

export default CsvUploadForm;
