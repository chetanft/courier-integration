import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCurl } from '../../lib/curl-parser';
import { fetchCourierData } from '../../lib/courier-api-service';
import { updateClientApiUrl, fetchAndStoreCourierData } from '../../lib/supabase-service';
import SimplifiedKeyValueDisplay from '../ui/simplified-key-value-display';
import CourierCsvUploadForm from '../courier-upload/CourierCsvUploadForm';
import CourierJsonUploadForm from '../courier-upload/CourierJsonUploadForm';

/**
 * A redesigned dialog for adding available couriers with improved layout and overflow handling
 */
const RedesignedAvailableCouriersDialog = ({
  open,
  onOpenChange,
  client,
  onCouriersAdded
}) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState('api');

  // State for API tab
  const [curlCommand, setCurlCommand] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [couriersFound, setCouriersFound] = useState(null);
  const [apiUrl, setApiUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState([]);
  const [showParsedData, setShowParsedData] = useState(false);

  // Handle success callback
  const handleSuccess = (couriers) => {
    toast.success(`Added ${couriers.length} couriers successfully`);

    // Notify parent component that couriers were added
    if (onCouriersAdded) {
      onCouriersAdded();
    }

    // Close the dialog after a short delay
    setTimeout(() => {
      onOpenChange(false);
    }, 1500);
  };

  // Handle error callback
  const handleError = (error) => {
    setError({
      message: error.message || 'Unknown error'
    });
    toast.error('Failed to add couriers: ' + (error.message || 'Unknown error'));
  };

  // Handle curl command parsing
  const handleParseCurl = () => {
    try {
      if (!curlCommand.trim()) {
        toast.warning('Please enter a cURL command');
        return;
      }

      const parsed = parseCurl(curlCommand);
      console.log('Successfully parsed cURL command:', parsed);

      // Update state with parsed data
      setApiUrl(parsed.url);
      setMethod(parsed.method);
      setHeaders(parsed.headers || []);
      setParsedData(parsed);
      setShowParsedData(true);
      setError(null);
    } catch (e) {
      console.error('Error parsing cURL command:', e);
      setError({
        message: `Error parsing cURL command: ${e.message}`
      });
      toast.error(`Error parsing cURL command: ${e.message}`);
    }
  };

  // Handle fetching couriers
  const handleFetchCouriers = async () => {
    if (!parsedData && !apiUrl) {
      toast.warning('Please parse a cURL command first or enter API details manually');
      return;
    }

    setLoading(true);
    setError(null);
    setCouriersFound(null);

    try {
      // Create request config from parsed data
      const requestConfig = {
        url: apiUrl.trim(),
        method: method || 'GET',
        apiIntent: 'fetch_courier_data',
        headers: headers || [],
        body: parsedData?.body || {}
      };

      // Extract couriers from the response
      const couriers = await fetchCourierData(apiUrl, requestConfig, {});

      if (!couriers || couriers.length === 0) {
        setError({
          message: 'No couriers found in the API response'
        });
      } else {
        setCouriersFound({
          count: couriers.length,
          couriers: couriers.map(c => c.name).join(', ')
        });

        // If clientId is provided, update client and store courier data
        if (client?.id) {
          await updateClientApiUrl(client.id, apiUrl, requestConfig);
          await fetchAndStoreCourierData(client.id, apiUrl, requestConfig, {});
        }

        // Call success callback
        handleSuccess(couriers);
      }
    } catch (err) {
      console.error('Error fetching couriers:', err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden dialog-content">
        <DialogHeader>
          <DialogTitle>Add Available Couriers for {client?.name}</DialogTitle>
          <DialogDescription>
            Upload couriers via CSV, JSON, or API integration.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            <TabsTrigger value="json">JSON Upload</TabsTrigger>
            <TabsTrigger value="api">API Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-0 w-full">
            <CourierCsvUploadForm
              clientId={client?.id}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </TabsContent>

          <TabsContent value="json" className="mt-0 w-full">
            <CourierJsonUploadForm
              clientId={client?.id}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </TabsContent>

          <TabsContent value="api" className="mt-0 w-full">
            <div className="space-y-4 w-full">
              {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <h3 className="text-red-700 font-medium">Error</h3>
                  </div>
                  <p className="text-red-600 text-sm">{error.message}</p>
                </div>
              )}

              {couriersFound && (
                <div className="bg-green-50 p-4 rounded-md border border-green-200">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <h3 className="text-green-700 font-medium">Success</h3>
                  </div>
                  <p className="text-green-600 text-sm">
                    Found {couriersFound.count} couriers: {couriersFound.couriers}
                  </p>
                </div>
              )}

              <Card className="w-full">
                <CardHeader>
                  <CardTitle>cURL Command</CardTitle>
                </CardHeader>
                <CardContent className="w-full">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Paste cURL Command</label>
                      <Textarea
                        placeholder="curl -X GET 'https://api.example.com/couriers' -H 'Authorization: Bearer token'"
                        className="curl-input"
                        value={curlCommand}
                        onChange={(e) => setCurlCommand(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleParseCurl}
                          variant="outline"
                        >
                          Parse cURL
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {showParsedData && (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Parsed Request Details</CardTitle>
                  </CardHeader>
                  <CardContent className="w-full">
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                          <label className="text-sm font-medium block mb-1">Method</label>
                          <div className="text-sm p-2 border rounded-md bg-gray-50">
                            {method}
                          </div>
                        </div>
                        <div className="col-span-3">
                          <label className="text-sm font-medium block mb-1">URL</label>
                          <div className="text-sm p-2 border rounded-md bg-gray-50 break-all">
                            {apiUrl}
                          </div>
                        </div>
                      </div>

                      {headers && headers.length > 0 && (
                        <div>
                          <label className="text-sm font-medium block mb-1">Headers</label>
                          <SimplifiedKeyValueDisplay pairs={headers} />
                        </div>
                      )}

                      {parsedData?.body && (
                        <div>
                          <label className="text-sm font-medium block mb-1">Body</label>
                          <div className="json-display">
                            {JSON.stringify(parsedData.body, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={handleFetchCouriers}
                disabled={loading || (!parsedData && !apiUrl)}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Couriers...
                  </>
                ) : (
                  'Fetch Couriers'
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RedesignedAvailableCouriersDialog;
