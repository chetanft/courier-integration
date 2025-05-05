import { useState } from 'react';
import { Link } from 'react-router-dom';
import { generateJsConfig } from '../lib/js-generator';

const ViewCouriers = () => {
  const [couriers] = useState([
    {
      id: 1,
      name: 'FedEx',
      auth_config: {
        username: 'fedexuser',
        api_key: 'fedex-api-key'
      },
      api_endpoint: 'https://api.fedex.com/tracking',
      created_at: '2023-05-01'
    },
    {
      id: 2,
      name: 'DHL',
      auth_config: {
        username: 'dhluser',
        api_key: 'dhl-api-key'
      },
      api_endpoint: 'https://api.dhl.com/tracking',
      created_at: '2023-05-15'
    },
    {
      id: 3,
      name: 'UPS',
      auth_config: {
        username: 'upsuser',
        api_key: 'ups-api-key'
      },
      api_endpoint: 'https://api.ups.com/tracking',
      created_at: '2023-06-10'
    }
  ]);

  const [selectedCourier, setSelectedCourier] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);

  // Sample mappings for the selected courier
  const mappings = [
    { api_field: 'shipment.waybill', tms_field: 'docket_number', api_type: 'track_docket' },
    { api_field: 'shipment.status', tms_field: 'status', api_type: 'track_docket' },
    { api_field: 'shipment.tracking', tms_field: 'tracking_details', api_type: 'track_docket' }
  ];

  // Sample clients for the selected courier
  const clients = [
    { id: 1, name: 'ABC Electronics' },
    { id: 2, name: 'XYZ Retail' }
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Courier List */}
        <div className="md:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Couriers</h2>

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
          </div>
        </div>

        {/* Courier Details */}
        {selectedCourier ? (
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 ${
                    activeTab === 'details'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button
                  className={`px-4 py-2 ${
                    activeTab === 'mappings'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('mappings')}
                >
                  Field Mappings
                </button>
                <button
                  className={`px-4 py-2 ${
                    activeTab === 'clients'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
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
                      <h3 className="text-md font-medium mb-2">Authentication Configuration</h3>
                      <div className="bg-gray-50 p-4 rounded border overflow-auto max-h-40">
                        <pre className="text-sm text-gray-700">
                          {JSON.stringify(selectedCourier.auth_config, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={generateJsFile}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Generate JS File
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'mappings' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Field Mappings</h2>

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
                  </div>
                )}

                {activeTab === 'clients' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Linked Clients</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clients.map(client => (
                        <div key={client.id} className="p-4 bg-white rounded border">
                          <h3 className="font-medium">{client.name}</h3>
                          <p className="text-sm text-gray-500">Client ID: {client.id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-3">
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h2 className="text-xl font-semibold mb-2">No Courier Selected</h2>
              <p className="text-gray-500 mb-4">Select a courier from the list to view its details.</p>
              <Link to="/add-courier" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block">
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
