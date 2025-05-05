import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCouriers, getClients, linkClientsTocourier } from '../lib/supabase';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const AddClient = () => {
  const [couriers, setCouriers] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch couriers and clients on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch couriers and clients in parallel
        const [couriersData, clientsData] = await Promise.all([
          getCouriers(),
          getClients()
        ]);

        setCouriers(couriersData);
        setClients(clientsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError({
          message: 'Failed to load couriers and clients',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      setError({
        message: 'Please select a courier and at least one client'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Make real API call to link clients to courier
      await linkClientsTocourier(selectedCourier, selectedClients);
      console.log('Linked clients:', selectedClients, 'to courier:', selectedCourier);

      // Reset selection after successful linking
      setSelectedClients([]);

      // Show success message (in a real app, you might use a toast notification)
      alert('Clients linked to courier successfully!');
    } catch (err) {
      console.error('Error linking clients to courier:', err);
      setError({
        message: 'Failed to link clients to courier',
        details: err
      });
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

      {loading && !error && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4 text-center">
          <div className="animate-pulse text-blue-600">Loading data...</div>
        </div>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle>Link Clients to Courier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Select Courier</label>
              <select
                className="w-full px-3 py-2 border rounded"
                onChange={(e) => handleCourierChange(e.target.value)}
                value={selectedCourier}
                disabled={loading || couriers.length === 0}
              >
                <option value="">-- Select Courier --</option>
                {couriers.map(courier => (
                  <option key={courier.id} value={courier.id}>{courier.name}</option>
                ))}
              </select>
              {couriers.length === 0 && !loading && !error && (
                <p className="text-sm text-amber-600 mt-1">No couriers available. Please add a courier first.</p>
              )}
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
                  {clients.length === 0 ? (
                    <p className="text-sm text-amber-600">No clients available. Please add clients first.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clients.map(client => (
                        <div key={client.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            id={`client-${client.id}`}
                            checked={selectedClients.includes(client.id)}
                            onChange={() => handleClientChange(client.id)}
                            className="mr-3"
                            disabled={loading}
                          />
                          <label htmlFor={`client-${client.id}`} className="cursor-pointer">
                            {client.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !selectedCourier || selectedClients.length === 0}
              >
                {loading ? 'Saving...' : 'Link Clients to Courier'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClient;
