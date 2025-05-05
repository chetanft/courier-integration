import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateJsConfig } from '../lib/js-generator';
import { getCouriers, getCourierMappings, getCourierClients } from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const ViewCouriers = () => {
  const [couriers, setCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [clients, setClients] = useState([]);

  // Fetch couriers on component mount
  useEffect(() => {
    const fetchCouriers = async () => {
      setLoading(true);
      setError(null);

      try {
        const couriersData = await getCouriers();
        setCouriers(couriersData);
      } catch (err) {
        console.error('Error fetching couriers:', err);
        setError({
          message: 'Failed to load couriers',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCouriers();
  }, []);

  // Fetch courier details when a courier is selected
  useEffect(() => {
    if (!selectedCourier) return;

    const fetchCourierDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch mappings and clients in parallel
        const [mappingsData, clientsData] = await Promise.all([
          getCourierMappings(selectedCourier.id),
          getCourierClients(selectedCourier.id)
        ]);

        setMappings(mappingsData);
        setClients(clientsData);
      } catch (err) {
        console.error('Error fetching courier details:', err);
        setError({
          message: 'Failed to load courier details',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourierDetails();
  }, [selectedCourier]);

  // Handle courier selection
  const handleCourierSelect = (courier) => {
    setSelectedCourier(courier);
    setActiveTab('details');
  };

  // Generate and download JS file
  const generateJsFile = () => {
    try {
      // Generate JS code
      const jsCode = generateJsConfig(selectedCourier, mappings);

      // Create download link
      const blob = new Blob([jsCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCourier.name.toLowerCase()}_mapping.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('JS file generated successfully!');
    } catch (error) {
      console.error('Error generating JS file:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">View Couriers</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
          {error.details && error.details.status && (
            <p className="text-sm text-red-500 mt-1">
              Status: {error.details.status} {error.details.statusText}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Courier List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Couriers</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && couriers.length === 0 && (
                <div className="py-4 text-center">
                  <div className="animate-pulse text-blue-600">Loading couriers...</div>
                </div>
              )}

              {!loading && couriers.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-gray-500">No couriers found</p>
                  <Link to="/add-courier" className="text-blue-600 hover:underline mt-2 inline-block">
                    Add a courier
                  </Link>
                </div>
              )}

              {couriers.length > 0 && (
                <ul className="space-y-2">
                  {couriers.map(courier => (
                    <li
                      key={courier.id}
                      className={`p-2 rounded cursor-pointer ${
                        selectedCourier?.id === courier.id
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                      onClick={() => handleCourierSelect(courier)}
                    >
                      {courier.name}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Courier Details */}
        {selectedCourier ? (
          <div className="md:col-span-3">
            <Card>
              <CardHeader className="border-b p-0">
                <nav className="flex">
                  <button
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === 'details'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('details')}
                  >
                    Details
                  </button>
                  <button
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === 'mappings'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('mappings')}
                  >
                    Field Mappings
                  </button>
                  <button
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === 'clients'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('clients')}
                  >
                    Linked Clients
                  </button>
                </nav>
              </CardHeader>

              <CardContent className="p-4">
                {loading && (
                  <div className="py-4 text-center">
                    <div className="animate-pulse text-blue-600">Loading data...</div>
                  </div>
                )}

                {!loading && activeTab === 'details' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">{selectedCourier.name}</h2>

                    <div className="mb-4">
                      <h3 className="text-md font-medium mb-2">Authentication Configuration</h3>
                      <div className="bg-gray-50 p-4 rounded border overflow-auto max-h-40">
                        <pre className="text-sm text-gray-700">
                          {JSON.stringify(selectedCourier.auth_config, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-md font-medium mb-2">API Endpoint</h3>
                      <div className="bg-gray-50 p-4 rounded border">
                        <code className="text-sm text-gray-700">
                          {selectedCourier.api_endpoint}
                        </code>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-md font-medium mb-2">API Intent</h3>
                      <div className="bg-gray-50 p-4 rounded border">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {selectedCourier.api_intent || 'track_shipment'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={generateJsFile}
                        disabled={loading}
                      >
                        Generate JS File
                      </Button>
                    </div>
                  </div>
                )}

                {!loading && activeTab === 'mappings' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Field Mappings</h2>

                    {mappings.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded border">
                        <p className="text-gray-500">No field mappings found for this courier</p>
                        <Link to="/add-courier" className="text-blue-600 hover:underline mt-2 inline-block">
                          Add mappings
                        </Link>
                      </div>
                    ) : (
                      <div className="border rounded overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">API Field</th>
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">TMS Field</th>
                              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">API Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {mappings.map((mapping, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="py-2 px-4 text-sm font-mono">{mapping.api_field}</td>
                                <td className="py-2 px-4 text-sm">{mapping.tms_field}</td>
                                <td className="py-2 px-4 text-sm">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    {mapping.api_type}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {!loading && activeTab === 'clients' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Linked Clients</h2>

                    {clients.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded border">
                        <p className="text-gray-500">No clients linked to this courier</p>
                        <Link to="/add-client" className="text-blue-600 hover:underline mt-2 inline-block">
                          Link clients
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clients.map(client => (
                          <div key={client.id} className="p-4 bg-white rounded border">
                            <h3 className="font-medium">{client.name}</h3>
                            <p className="text-sm text-gray-500">Client ID: {client.id}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">Select a courier to view details</p>
                  <Link to="/add-courier" className="text-blue-600 hover:underline">
                    Or add a new courier
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCouriers;
