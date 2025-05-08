import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClientById,
  getCourierById,
  getCourierMappings,
  getApiTestResults,
  updateCourierJsFileStatus
} from '../lib/supabase-service';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Settings, Code, FileText, Server, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { generateJsConfig } from '../lib/js-generator';
import { toast } from 'sonner';
import CourierCredentialsForm from '../components/forms/CourierCredentialsForm';

const CourierModule = () => {
  const { clientId, courierId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [courier, setCourier] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [apiResults, setApiResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('api');
  const [generatingJs, setGeneratingJs] = useState(false);
  const [jsConfig, setJsConfig] = useState('');

  // Fetch client, courier, and related data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get client and courier details
        const [clientData, courierData, mappingsData, apiResultsData] = await Promise.all([
          getClientById(clientId),
          getCourierById(courierId),
          getCourierMappings(courierId),
          getApiTestResults(courierId)
        ]);

        if (!clientData) {
          throw new Error('Client not found');
        }

        if (!courierData) {
          throw new Error('Courier not found');
        }

        // Check if the JS file has been generated
        // If not, redirect to the add courier form
        if (!courierData.js_file_generated && !courierData.js_file_url) {
          console.log('JS file not generated, redirecting to add courier form');
          // Redirect to /add-courier with courier name as a query parameter
          navigate(`/add-courier?courier=${encodeURIComponent(courierData.name)}`);
          return;
        }

        setClient(clientData);
        setCourier(courierData);
        setMappings(mappingsData || []);
        setApiResults(apiResultsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError({
          message: err.message || 'Failed to load data',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, courierId, navigate]);

  // Handle generating JS configuration
  const handleGenerateJs = async () => {
    setGeneratingJs(true);

    try {
      // Generate JS configuration
      const config = await generateJsConfig(courier, mappings);
      setJsConfig(config);

      // Update courier's JS file status
      try {
        const updatedCourier = await updateCourierJsFileStatus(courier.id, true);
        if (updatedCourier) {
          setCourier(updatedCourier);
        }
      } catch (updateErr) {
        console.error('Error updating courier JS file status:', updateErr);
        // Continue even if the update fails
      }

      toast.success('JS configuration generated successfully');
    } catch (err) {
      console.error('Error generating JS config:', err);
      toast.error('Failed to generate JS configuration: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingJs(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/client/${clientId}`)}>
            Back to Client
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(`/client/${clientId}`)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {client.name}
        </Button>
        <h1 className="text-2xl font-bold">{courier.name}</h1>
        <div className="ml-auto">
          <Button
            variant="outline"
            onClick={handleGenerateJs}
            disabled={generatingJs || mappings.length === 0}
          >
            {generatingJs ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Code className="mr-2 h-4 w-4" />
                Generate JS
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-gray-500">
          This is the isolated courier module for {courier.name} under {client.name}.
          Each client has its own isolated courier configuration.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="api" className="flex items-center">
            <Server className="mr-2 h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="ui" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            UI Config
          </TabsTrigger>
          <TabsTrigger value="utils" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Utils
          </TabsTrigger>
          <TabsTrigger value="js" className="flex items-center">
            <Code className="mr-2 h-4 w-4" />
            JS Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <CourierCredentialsForm
                courierId={courier.id}
                courierName={courier.name}
                onSuccess={() => toast.success('Credentials updated successfully')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {apiResults.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded border">
                  <p className="text-gray-500">No API tests have been run yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/update-courier-mappings')}>
                    Run API Test
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiResults.map((result, index) => (
                    <div key={index} className="border rounded p-4">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-medium">{result.api_intent}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {result.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">Endpoint: {result.api_endpoint}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium mb-1">Request</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(result.request_payload, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1">Response</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(result.response_data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>UI Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">UI configuration for this courier module is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utils" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Field Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded border">
                  <p className="text-gray-500">No field mappings have been configured yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/update-courier-mappings')}>
                    Configure Mappings
                  </Button>
                </div>
              ) : (
                <div className="border rounded overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TMS Field</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Field</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mappings.map((mapping, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{mapping.tms_field}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{mapping.api_field}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{mapping.api_type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{mapping.data_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="js" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated JavaScript Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {!jsConfig ? (
                <div className="text-center py-8 bg-gray-50 rounded border">
                  <p className="text-gray-500">No JS configuration has been generated yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleGenerateJs}
                    disabled={generatingJs || mappings.length === 0}
                  >
                    Generate JS Config
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <pre className="text-xs overflow-auto max-h-96 font-mono">
                      {jsConfig}
                    </pre>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(jsConfig);
                        toast.success('JS configuration copied to clipboard');
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      variant="default"
                      onClick={async () => {
                        try {
                          // Here you would typically save the JS file to your storage
                          // For now, we'll just update the courier's JS file status
                          const updatedCourier = await updateCourierJsFileStatus(courier.id, true);
                          if (updatedCourier) {
                            setCourier(updatedCourier);
                            toast.success('JS file status updated successfully');
                          }
                        } catch (err) {
                          console.error('Error saving JS file:', err);
                          toast.error('Failed to save JS file: ' + (err.message || 'Unknown error'));
                        }
                      }}
                    >
                      Save JS File
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourierModule;
