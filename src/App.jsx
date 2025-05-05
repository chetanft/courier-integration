import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';

// Import pages
import AddCourier from './pages/AddCourier';
import AddClient from './pages/AddClient';
import ViewCouriers from './pages/ViewCouriers';
import CourierDetail from './pages/CourierDetail';

// Import components
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';

// Import API functions
import { getCouriers, getClients } from './lib/supabase-service';

// Home component wrapper to provide navigation context
const HomeWithNavigation = () => {
  return <HomeContent />;
};

// Actual Home component content
const HomeContent = () => {
  const [couriers, setCouriers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

        setCouriers(couriersData || []);
        setClients(clientsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError({
          message: 'Failed to load data',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Courier Integration Platform</h1>

      <Tabs defaultValue="couriers" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="couriers" className="flex-1">Couriers</TabsTrigger>
          <TabsTrigger value="clients" className="flex-1">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="couriers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Couriers</h2>
            <Button onClick={() => navigate('/add-courier')}>Add Courier</Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-pulse text-blue-600">Loading couriers...</div>
              </CardContent>
            </Card>
          ) : couriers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 mb-4">No couriers found</p>
                <p className="text-sm text-gray-500 mb-4">Add a courier to get started with integrations</p>
                <Button onClick={() => navigate('/add-courier')}>Add Courier</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {couriers.map(courier => (
                <Card key={courier.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/courier/${courier.id}`)}>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-lg mb-2">{courier.name}</h3>
                    <p className="text-sm text-gray-500">
                      {courier.description || `API Base URL: ${courier.apiBaseUrl}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Clients</h2>
            <Button onClick={() => navigate('/add-client')}>Add Client</Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-pulse text-blue-600">Loading clients...</div>
              </CardContent>
            </Card>
          ) : clients.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 mb-4">No clients found</p>
                <p className="text-sm text-gray-500 mb-4">Add a client to start mapping to couriers</p>
                <Button onClick={() => navigate('/add-client')}>Add Client</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map(client => (
                <Card key={client.id}>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-lg mb-2">{client.name}</h3>
                    <p className="text-sm text-gray-500">
                      Client ID: {client.id}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link to="/" className="font-bold text-lg no-underline text-gray-800">
                Courier Integration
              </Link>

              <div className="flex space-x-4">
                <Link to="/" className="text-gray-600 hover:text-gray-900 no-underline">Home</Link>
                <Link to="/add-courier" className="text-gray-600 hover:text-gray-900 no-underline">Add Courier</Link>
                <Link to="/add-client" className="text-gray-600 hover:text-gray-900 no-underline">Add Client</Link>
                <Link to="/view-couriers" className="text-gray-600 hover:text-gray-900 no-underline">View Couriers</Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<HomeWithNavigation />} />
            <Route path="/add-courier" element={<AddCourier />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/view-couriers" element={<ViewCouriers />} />
            <Route path="/courier/:id" element={<CourierDetail />} />
          </Routes>
        </main>

        <footer className="bg-white border-t mt-8 py-4">
          <div className="container mx-auto px-4">
            <p className="text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} Courier Integration Platform
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
