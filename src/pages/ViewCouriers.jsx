import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getCouriers, getFieldMappings, getClients, getCourierClients } from '../lib/supabase';
import { generateJsConfig } from '../lib/js-generator';

const ViewCouriers = () => {
  const [couriers, setCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [clients, setClients] = useState([]);
  const [courierClients, setCourierClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Fetch couriers on component mount
  useEffect(() => {
    const fetchCouriers = async () => {
      try {
        setLoading(true);
        const data = await getCouriers();
        setCouriers(data);
      } catch (error) {
        console.error('Error fetching couriers:', error);
        toast.error('Failed to fetch couriers');
      } finally {
        setLoading(false);
      }
    };

    fetchCouriers();
  }, []);

  // Fetch courier details when selected
  const handleCourierSelect = async (courier) => {
    setSelectedCourier(courier);
    setActiveTab('details');
    
    try {
      setLoading(true);
      
      // Fetch mappings for track_docket API type
      const mappingsData = await getFieldMappings(courier.id, 'track_docket');
      setMappings(mappingsData);
      
      // Fetch all clients
      const clientsData = await getClients();
      setClients(clientsData);
      
      // Fetch courier clients
      const clientIds = await getCourierClients(courier.id);
      setCourierClients(clientIds);
    } catch (error) {
      console.error('Error fetching courier details:', error);
      toast.error('Failed to fetch courier details');
    } finally {
      setLoading(false);
    }
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
      a.download = `${selectedCourier.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_mapping.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('JS file generated successfully!');
    } catch (error) {
      console.error('Error generating JS file:', error);
      toast.error(error.message || 'Failed to generate JS file');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">View Couriers</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Courier List */}
        <div className="md:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Couriers</h2>
            
            {loading && couriers.length === 0 ? (
              <p className="text-gray-500">Loading couriers...</p>
            ) : couriers.length === 0 ? (
              <p className="text-gray-500">No couriers found. Add a courier first.</p>
            ) : (
              <ul className="space-y-2">
                {couriers.map(courier => (
                  <li 
                    key={courier.id}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${selectedCourier?.id === courier.id ? 'bg-blue-100' : ''}`}
                    onClick={() => handleCourierSelect(courier)}
                  >
                    {courier.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Courier Details */}
        {selectedCourier && (
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 ${activeTab === 'details' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button
                  className={`px-4 py-2 ${activeTab === 'mappings' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setActiveTab('mappings')}
                >
                  Field Mappings
                </button>
                <button
                  className={`px-4 py-2 ${activeTab === 'clients' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setActiveTab('clients')}
                >
                  Clients
                </button>
              </div>
              
              <div className="p-4">
                {activeTab === 'details' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">{selectedCourier.name}</h2>
                    
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Authentication Config</h3>
                      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
                        {JSON.stringify(selectedCourier.auth_config, null, 2)}
                      </pre>
                    </div>
                    
                    <button
                      onClick={generateJsFile}
                      className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
                    >
                      Generate JS File
                    </button>
                  </div>
                )}
                
                {activeTab === 'mappings' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Field Mappings</h2>
                    
                    {loading ? (
                      <p className="text-gray-500">Loading mappings...</p>
                    ) : mappings.length === 0 ? (
                      <p className="text-gray-500">No mappings found for this courier.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                          <thead>
                            <tr>
                              <th className="py-2 px-4 border-b text-left">API Field</th>
                              <th className="py-2 px-4 border-b text-left">TMS Field</th>
                              <th className="py-2 px-4 border-b text-left">API Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mappings.map((mapping, index) => (
                              <tr key={index}>
                                <td className="py-2 px-4 border-b">{mapping.api_field}</td>
                                <td className="py-2 px-4 border-b">{mapping.tms_field}</td>
                                <td className="py-2 px-4 border-b">{mapping.api_type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'clients' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Linked Clients</h2>
                    
                    {loading ? (
                      <p className="text-gray-500">Loading clients...</p>
                    ) : clients.length === 0 ? (
                      <p className="text-gray-500">No clients found.</p>
                    ) : (
                      <ul className="space-y-2">
                        {clients
                          .filter(client => courierClients.includes(client.id))
                          .map(client => (
                            <li key={client.id} className="p-2 bg-gray-100 rounded">
                              {client.name}
                            </li>
                          ))}
                      </ul>
                    )}
                    
                    {clients.filter(client => courierClients.includes(client.id)).length === 0 && (
                      <p className="text-gray-500">No clients linked to this courier.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCouriers;
