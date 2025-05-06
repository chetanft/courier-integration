import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourierMappings, getCourierClients, linkClientsToCourier, getClients, getCourierById, getJsFilesForCourier, getJsFileDownloadUrl } from '../lib/supabase-service';
import { generateJsConfig } from '../lib/js-generator';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { JsonViewer } from '../components/ui/json-viewer';

const CourierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courier, setCourier] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [clients, setClients] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [jsConfig, setJsConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [jsFiles, setJsFiles] = useState([]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Fetch courier details on component mount
  useEffect(() => {
    const fetchCourierDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching courier details for ID:', id);

        // First, try to get the courier data
        const courierData = await getCourierById(id);

        if (!courierData) {
          console.error('Courier not found for ID:', id);
          throw new Error('Courier not found. Please check the courier ID.');
        }

        console.log('Courier data retrieved:', courierData);
        setCourier(courierData);

        // Now fetch the rest of the data in parallel
        const [mappingsData, clientsData, allClientsData, jsFilesData] = await Promise.all([
          getCourierMappings(id),
          getCourierClients(id),
          getClients(),
          getJsFilesForCourier(id)
        ]);

        console.log('Mappings data:', mappingsData);
        console.log('Clients data:', clientsData);

        setMappings(mappingsData || []);
        setClients(clientsData || []);
        setAllClients(allClientsData || []);
        setJsFiles(jsFilesData || []);

        // Generate JS config
        if (courierData && mappingsData) {
          const config = generateJsConfig(courierData, mappingsData);
          setJsConfig(config);
        }
      } catch (err) {
        console.error('Error fetching courier details:', err);
        setError({
          message: err.message || 'Failed to load courier details',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourierDetails();
    }
  }, [id]);

  // Handle client selection
  const handleClientChange = (clientId) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  // Handle mapping clients to courier
  const handleMapClients = async () => {
    if (selectedClients.length === 0) {
      return;
    }

    setMappingLoading(true);
    setError(null);

    try {
      await linkClientsToCourier(id, selectedClients);

      // Refresh clients list
      const clientsData = await getCourierClients(id);
      setClients(clientsData || []);

      // Reset selection and close dialog
      setSelectedClients([]);
      setDialogOpen(false);
    } catch (err) {
      console.error('Error mapping clients to courier:', err);
      setError({
        message: 'Failed to map clients to courier',
        details: err
      });
    } finally {
      setMappingLoading(false);
    }
  };

  // Handle downloading a JS file
  const handleDownloadJsFile = async (filePath, fileName) => {
    try {
      setDownloadLoading(true);
      const downloadUrl = await getJsFileDownloadUrl(filePath);

      // Create and click a download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log('JS file downloaded successfully!');
    } catch (error) {
      console.error('Error downloading JS file:', error);
      alert(`Error downloading JS file: ${error.message}`);
    } finally {
      setDownloadLoading(false);
    }
  };

  // Filter out already mapped clients
  const availableClients = allClients.filter(
    client => !clients.some(c => c.id === client.id)
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse text-blue-600 text-center p-12">
          Loading courier details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error.message}</p>

          {error.details && (
            <div className="mt-4 p-4 bg-red-100 rounded text-sm">
              <h4 className="font-medium mb-2">Error Details:</h4>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 flex space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/view-couriers')}
            >
              Back to Couriers
            </Button>
            <Button
              variant="default"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!courier) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md mb-6">
          <h3 className="text-lg font-medium mb-2">Courier Not Found</h3>
          <p>The courier you're looking for doesn't exist or has been removed.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-end mb-6">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default">Map Client</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Map Clients to {courier.name}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {availableClients.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No available clients to map</p>
                    <Link to="/add-client" className="text-blue-600 hover:underline mt-2 inline-block">
                      Add a new client
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Select Clients</p>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {selectedClients.length} selected
                      </span>
                    </div>
                    <div className="border rounded p-4 max-h-[300px] overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {availableClients.map(client => (
                          <div key={client.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              id={`client-${client.id}`}
                              checked={selectedClients.includes(client.id)}
                              onChange={() => handleClientChange(client.id)}
                              className="mr-3"
                              disabled={mappingLoading}
                            />
                            <label htmlFor={`client-${client.id}`} className="cursor-pointer">
                              {client.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        variant="default"
                        onClick={handleMapClients}
                        disabled={mappingLoading || selectedClients.length === 0}
                      >
                        {mappingLoading ? 'Mapping...' : 'Map Selected Clients'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Courier Details */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">API Base URL</h3>
                <p className="mt-1">{courier.apiBaseUrl}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Authentication Type</h3>
                <p className="mt-1">{courier.authType || 'None'}</p>
              </div>

              {courier.apiKey && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">API Key</h3>
                  <p className="mt-1">••••••••{courier.apiKey.slice(-4)}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p className="mt-1">{new Date(courier.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JS Config */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Generated JS Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
              {jsConfig || 'No configuration generated yet'}
            </pre>
          </CardContent>
        </Card>

        {/* Field Mappings */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Field Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border">
                <p className="text-gray-500">No field mappings defined</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TMS Field
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Courier Field Path
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappings.map((mapping, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {mapping.tmsField}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {mapping.courierFieldPath}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {mapping.dataType || 'string'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated JS Files */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Generated JS Files</CardTitle>
          </CardHeader>
          <CardContent>
            {jsFiles.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border">
                <p className="text-gray-500">No JS files generated yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Generate a JS file by mapping fields and clicking "Generate JS File" button
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jsFiles.map((file) => (
                      <tr key={file.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {file.file_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadJsFile(file.file_path, file.file_name)}
                            disabled={downloadLoading}
                          >
                            {downloadLoading ? 'Downloading...' : 'Download'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Clients */}
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Linked Clients</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Map New Client</Button>
              </DialogTrigger>
            </Dialog>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border">
                <p className="text-gray-500">No clients linked to this courier</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  Map Clients
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {clients.map(client => (
                  <div key={client.id} className="p-4 bg-white rounded border">
                    <h3 className="font-medium">{client.name}</h3>
                    <p className="text-sm text-gray-500">Client ID: {client.id}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourierDetail;
