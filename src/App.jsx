import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';

// Import pages
import AddCourier from './pages/AddCourier';
import AddCourierRevamped from './pages/AddCourierRevamped';
import AddClient from './pages/AddClient';
import CourierDetail from './pages/CourierDetail';
import Settings from './pages/Settings';
import UpdateCourierMappings from './pages/UpdateCourierMappings';

// Import components
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';

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
  const [, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
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
      <Tabs defaultValue="couriers" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="couriers" className="flex-1">Couriers</TabsTrigger>
          <TabsTrigger value="clients" className="flex-1">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="couriers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Couriers</h2>
            <Button variant="default" onClick={() => navigate('/add-courier')}>Add Courier</Button>
          </div>

          {/* Search and Sort Controls */}
          {!loading && couriers.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <div className="relative flex-grow">
                <Input
                  type="text"
                  placeholder="Search couriers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
                <Button variant="default" onClick={() => navigate('/add-courier')}>Add Courier</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {couriers
                .filter(courier =>
                  courier.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .sort((a, b) => {
                  if (sortOrder === 'newest') {
                    return new Date(b.created_at) - new Date(a.created_at);
                  } else if (sortOrder === 'oldest') {
                    return new Date(a.created_at) - new Date(b.created_at);
                  } else if (sortOrder === 'name') {
                    return a.name.localeCompare(b.name);
                  }
                  return 0;
                })
                .map(courier => (
                  <Card key={courier.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/courier/${courier.id}`)}>
                    <CardContent className="p-6">
                      <h3 className="font-medium text-lg mb-2">{courier.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {courier.description || `API Base URL: ${courier.api_base_url}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        Added: {new Date(courier.created_at).toLocaleDateString()} {new Date(courier.created_at).toLocaleTimeString()}
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
            <Button variant="default" onClick={() => navigate('/add-client')}>Add Client</Button>
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
                <Button variant="default" onClick={() => navigate('/add-client')}>Add Client</Button>
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

// This is a test change to trigger a new Netlify deployment
function App() {
  // Main application component
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link to="/" className="font-bold text-lg no-underline text-gray-800">
                Courier Integration
              </Link>
              <div>
                <Link to="/settings" className="text-gray-600 hover:text-gray-900">
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<HomeWithNavigation />} />
            <Route path="/add-courier" element={<AddCourierRevamped />} />
            <Route path="/add-courier-legacy" element={<AddCourier />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/courier/:id" element={<CourierDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/update-courier-mappings" element={<UpdateCourierMappings />} />
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
