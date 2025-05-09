import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, getCouriersByClientId } from '../lib/supabase-service';
import { Button } from '../components/ui/button';
import { PlusCircle, Package, Loader2 } from 'lucide-react';
import { SearchBar } from '../components/ui/search-bar';
import { FilterDropdown } from '../components/ui/filter-dropdown';
import { SortDropdown } from '../components/ui/sort-dropdown';
import { StatusBadge } from '../components/ui/status-badge';
import { GradientCard, CardContent } from '../components/ui/gradient-card';

const Dashboard = () => {
  const [clients, setClients] = useState([]);
  const [clientCouriers, setClientCouriers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [sortValue, setSortValue] = useState({ field: 'name', direction: 'asc' });

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);

      try {
        const clientsData = await getClients();
        setClients(clientsData || []);

        // Fetch couriers for each client
        const couriersMap = {};
        for (const client of clientsData || []) {
          try {
            const couriers = await getCouriersByClientId(client.id);
            couriersMap[client.id] = couriers || [];
          } catch (courierErr) {
            console.error(`Error fetching couriers for client ${client.id}:`, courierErr);
            couriersMap[client.id] = [];
          }
        }

        setClientCouriers(couriersMap);
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

  // Get client status based on API URL and couriers
  const getClientStatus = (client, couriers = []) => {
    if (!client.api_url) {
      return 'setup-required';
    }

    if (couriers.length > 0) {
      const configuredCouriers = couriers.filter(c => c.api_base_url);
      if (configuredCouriers.length === couriers.length) {
        return 'configured';
      }
      if (configuredCouriers.length > 0) {
        return 'in-progress';
      }
    }

    return 'pending';
  };

  // Filter, sort, and search clients
  const filteredClients = useMemo(() => {
    return clients
      .filter(client => {
        // Apply search filter
        const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (client.api_url && client.api_url.toLowerCase().includes(searchQuery.toLowerCase()));

        // Apply status filter
        const status = getClientStatus(client, clientCouriers[client.id] || []);
        const matchesFilter =
          filterValue === 'all' ||
          (filterValue === 'configured' && status === 'configured') ||
          (filterValue === 'setup-required' && status === 'setup-required') ||
          (filterValue === 'in-progress' && status === 'in-progress') ||
          (filterValue === 'pending' && status === 'pending');

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Apply sorting
        const direction = sortValue.direction === 'asc' ? 1 : -1;

        switch (sortValue.field) {
          case 'name':
            return direction * a.name.localeCompare(b.name);
          case 'created_at':
            return direction * (new Date(a.created_at) - new Date(b.created_at));
          case 'couriers':
            return direction * ((clientCouriers[a.id]?.length || 0) - (clientCouriers[b.id]?.length || 0));
          default:
            return 0;
        }
      });
  }, [clients, clientCouriers, searchQuery, filterValue, sortValue]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/bulk-upload-clients')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => navigate('/add-client')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Search, filter, and sort controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search clients..."
          className="md:w-1/3"
        />

        <div className="flex gap-2 ml-auto">
          <FilterDropdown
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'configured', label: 'Configured' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'pending', label: 'Pending' },
              { value: 'setup-required', label: 'Setup Required' }
            ]}
            value={filterValue}
            onChange={setFilterValue}
            label="Filter"
          />

          <SortDropdown
            options={[
              { value: 'name', label: 'Name' },
              { value: 'created_at', label: 'Date Added' },
              { value: 'couriers', label: 'Couriers Count' }
            ]}
            value={sortValue}
            onChange={setSortValue}
          />
        </div>
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
      ) : filteredClients.length === 0 && clients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Clients Found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first client.</p>
          <Button onClick={() => navigate('/add-client')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Clients</h3>
          <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria.</p>
          <Button variant="outline" onClick={() => {
            setSearchQuery('');
            setFilterValue('all');
            setSortValue({ field: 'name', direction: 'asc' });
          }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const couriers = clientCouriers[client.id] || [];
            const status = getClientStatus(client, couriers);

            // Use theme based on status
            let cardTheme;

            // Generate a hash from client name to get consistent theme
            const nameHash = client.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const themes = ['lavender', 'peach', 'cyan'];

            // Use status-based theme or a consistent theme based on name
            switch (status) {
              case 'configured':
                cardTheme = 'configured';
                break;
              case 'in-progress':
                cardTheme = 'in-progress';
                break;
              case 'pending':
                cardTheme = 'pending';
                break;
              case 'setup-required':
                cardTheme = 'setup-required';
                break;
              default:
                cardTheme = themes[nameHash % themes.length];
            }

            return (
              <GradientCard
                key={client.id}
                className="cursor-pointer"
                onClick={() => handleClientClick(client.id)}
                theme={cardTheme}
                glassmorphic={true}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{client.name}</h3>
                    <StatusBadge status={status} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      Added {new Date(client.created_at).toLocaleDateString()}
                    </p>

                    {client.api_url && (
                      <p className="text-xs text-gray-500 truncate max-w-[200px]" title={client.api_url}>
                        API: {client.api_url}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        {couriers.length > 0 ? (
                          <>
                            <span className="font-medium">{couriers.filter(c => c.api_base_url).length}</span>
                            <span> of </span>
                            <span className="font-medium">{couriers.length}</span>
                            <span> couriers configured</span>
                          </>
                        ) : (
                          <span>No couriers added</span>
                        )}
                      </div>

                      <StatusBadge
                        status="client"
                        className="bg-blue-100 text-blue-800 border-blue-200"
                      />
                    </div>
                  </div>
                </CardContent>
              </GradientCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
