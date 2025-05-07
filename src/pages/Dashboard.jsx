import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients } from '../lib/supabase-service';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PlusCircle, Package, Loader2 } from 'lucide-react';
// toast is used in other parts of the component

const Dashboard = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);

      try {
        const clientsData = await getClients();
        setClients(clientsData || []);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError({
          message: 'Failed to load clients',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Handle client card click
  const handleClientClick = (clientId) => {
    navigate(`/client/${clientId}`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>

        <Button onClick={() => navigate('/add-client')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Clients Found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first client.</p>
          <Button onClick={() => navigate('/add-client')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleClientClick(client.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{client.name}</h3>
                    <p className="text-sm text-gray-500">
                      Added {new Date(client.created_at).toLocaleDateString()}
                    </p>
                    {client.api_url && (
                      <p className="text-xs text-gray-400 truncate max-w-[200px]" title={client.api_url}>
                        API: {client.api_url}
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Client
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
