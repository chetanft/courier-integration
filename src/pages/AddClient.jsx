import { useState } from 'react';
import { Link } from 'react-router-dom';

const AddClient = () => {
  const [couriers] = useState([
    { id: 1, name: 'FedEx' },
    { id: 2, name: 'DHL' },
    { id: 3, name: 'UPS' }
  ]);

  const [clients] = useState([
    { id: 1, name: 'ABC Electronics' },
    { id: 2, name: 'XYZ Retail' },
    { id: 3, name: 'Global Logistics' }
  ]);

  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Handle courier selection
  const handleCourierChange = (courierId) => {
    setSelectedCourier(courierId);
    setSelectedClients([]);
  };

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

  // Handle form submission
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCourier || selectedClients.length === 0) {
      alert('Please select a courier and at least one client');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Linked clients:', selectedClients, 'to courier:', selectedCourier);
      alert('Clients linked to courier successfully!');
      setSelectedClients([]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add Client to Courier</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Select Courier</label>
          <select
            className="w-full px-3 py-2 border rounded"
            onChange={(e) => handleCourierChange(e.target.value)}
            value={selectedCourier}
          >
            <option value="">-- Select Courier --</option>
            {couriers.map(courier => (
              <option key={courier.id} value={courier.id}>{courier.name}</option>
            ))}
          </select>
        </div>

        {selectedCourier && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Select Clients</label>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {selectedClients.length} selected
              </span>
            </div>
            <div className="border rounded p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clients.map(client => (
                  <div key={client.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      id={`client-${client.id}`}
                      checked={selectedClients.includes(client.id)}
                      onChange={() => handleClientChange(client.id)}
                      className="mr-3"
                    />
                    <label htmlFor={`client-${client.id}`} className="cursor-pointer">
                      {client.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !selectedCourier || selectedClients.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Link Clients to Courier'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddClient;
