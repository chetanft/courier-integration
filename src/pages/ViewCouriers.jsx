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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">View Couriers</h1>
        <Link to="/" className="text-blue-500 hover:text-blue-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Courier List */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Couriers
            </h2>

            {loading && couriers.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-500">Loading couriers...</span>
              </div>
            ) : couriers.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <p className="text-gray-500">No couriers found. Add a courier first.</p>
                <Link to="/add-courier" className="mt-4 inline-block text-blue-500 hover:text-blue-700">
                  + Add Courier
                </Link>
              </div>
            ) : (
              <ul className="space-y-2 mt-2">
                {couriers.map(courier => (
                  <li
                    key={courier.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCourier?.id === courier.id
                        ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700 font-medium'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                    onClick={() => handleCourierSelect(courier)}
                  >
                    <div className="flex items-center">
                      <span className="flex-1">{courier.name}</span>
                      {selectedCourier?.id === courier.id && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Courier Details */}
        {selectedCourier ? (
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
              <div className="flex border-b">
                <button
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'details'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'mappings'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('mappings')}
                >
                  Field Mappings
                </button>
                <button
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'clients'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('clients')}
                >
                  Clients
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'details' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">{selectedCourier.name}</h2>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        ID: {selectedCourier.id.substring(0, 8)}
                      </span>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3 text-gray-800">Authentication Configuration</h3>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-auto max-h-60">
                        <pre className="text-sm text-gray-700">
                          {JSON.stringify(selectedCourier.auth_config, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={generateJsFile}
                        className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 flex items-center font-medium transition-colors shadow-md"
                      >
                        <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Generate JS File
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'mappings' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">Field Mappings</h2>
                      <Link to="/add-courier" className="text-blue-500 hover:text-blue-700 flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add More Mappings
                      </Link>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center p-12">
                        <svg className="animate-spin h-8 w-8 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-gray-500">Loading mappings...</span>
                      </div>
                    ) : mappings.length === 0 ? (
                      <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-500 mb-4">No mappings found for this courier.</p>
                        <Link to="/add-courier" className="inline-block bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                          Add Mappings
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                        <table className="min-w-full bg-white">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="py-3 px-6 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Field</th>
                              <th className="py-3 px-6 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TMS Field</th>
                              <th className="py-3 px-6 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {mappings.map((mapping, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="py-3 px-6 text-sm font-mono text-gray-700">{mapping.api_field}</td>
                                <td className="py-3 px-6 text-sm text-gray-700">{mapping.tms_field}</td>
                                <td className="py-3 px-6 text-sm">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
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

                {activeTab === 'clients' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">Linked Clients</h2>
                      <Link to="/add-client" className="text-blue-500 hover:text-blue-700 flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Link More Clients
                      </Link>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center p-12">
                        <svg className="animate-spin h-8 w-8 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-gray-500">Loading clients...</span>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-gray-500 mb-4">No clients found in the system.</p>
                        <Link to="/add-client" className="inline-block bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                          Add Clients
                        </Link>
                      </div>
                    ) : clients.filter(client => courierClients.includes(client.id)).length === 0 ? (
                      <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-gray-500 mb-4">No clients linked to this courier.</p>
                        <Link to="/add-client" className="inline-block bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                          Link Clients
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clients
                          .filter(client => courierClients.includes(client.id))
                          .map(client => (
                            <div key={client.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-800">{client.name}</h3>
                                  <p className="text-sm text-gray-500">Client ID: {client.id.substring(0, 8)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-3">
            <div className="bg-white p-12 rounded-xl shadow-md border border-gray-100 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h2 className="text-xl font-semibold mb-2 text-gray-800">No Courier Selected</h2>
              <p className="text-gray-500 mb-6">Select a courier from the list to view its details, mappings, and linked clients.</p>
              <Link to="/add-courier" className="inline-block bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                Add New Courier
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCouriers;
