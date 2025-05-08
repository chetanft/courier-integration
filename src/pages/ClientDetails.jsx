import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClientById, getCouriersByClientId, getCouriers, linkClientsToCourier, deleteClient } from '../lib/supabase-service';
import { Button } from '../components/ui/button';
import { ArrowLeft, PlusCircle, Truck, Loader2, Trash2, Server } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { SearchBar } from '../components/ui/search-bar';
import { FilterDropdown } from '../components/ui/filter-dropdown';
import { SortDropdown } from '../components/ui/sort-dropdown';
import { StatusBadge } from '../components/ui/status-badge';
import { GradientCard, CardContent } from '../components/ui/gradient-card';
import { DeleteConfirmationDialog } from '../components/ui/delete-confirmation-dialog';
import AddAvailableCouriersDialog from '../components/dialogs/AddAvailableCouriersDialog';

const ClientDetails = () => {
  const { id: clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [addingCourier, setAddingCourier] = useState(false);

  // Delete client dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Available Couriers dialog state
  const [addCouriersDialogOpen, setAddCouriersDialogOpen] = useState(false);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [sortValue, setSortValue] = useState({ field: 'name', direction: 'asc' });

  // Fetch client and its couriers on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get client details
        const clientData = await getClientById(clientId);
        if (!clientData) {
          throw new Error('Client not found');
        }
        setClient(clientData);

        // Get couriers for this client
        const clientCouriers = await getCouriersByClientId(clientId);
        setCouriers(clientCouriers || []);

        // Get all couriers to determine which ones are available to add
        const allCouriers = await getCouriers();

        // Filter out couriers that are already linked to this client
        const linkedCourierIds = clientCouriers.map(c => c.id);
        const availableCouriersList = allCouriers.filter(c => !linkedCourierIds.includes(c.id));

        setAvailableCouriers(availableCouriersList);
      } catch (err) {
        console.error('Error fetching client data:', err);
        setError({
          message: err.message || 'Failed to load client data',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  // Handle courier card click
  const handleCourierClick = (courierId) => {
    navigate(`/client/${clientId}/courier/${courierId}`);
  };

  // Get courier status based on API configuration
  const getCourierStatus = (courier) => {
    if (!courier.api_base_url) {
      return 'setup-required';
    }

    if (courier.auth_type && courier.api_intent) {
      return 'configured';
    }

    return 'in-progress';
  };

  // Filter, sort, and search couriers
  const filteredCouriers = useMemo(() => {
    return couriers
      .filter(courier => {
        // Apply search filter
        const matchesSearch = courier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (courier.api_base_url && courier.api_base_url.toLowerCase().includes(searchQuery.toLowerCase()));

        // Apply status filter
        const status = getCourierStatus(courier);
        const matchesFilter =
          filterValue === 'all' ||
          (filterValue === 'configured' && status === 'configured') ||
          (filterValue === 'setup-required' && status === 'setup-required') ||
          (filterValue === 'in-progress' && status === 'in-progress');

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
          case 'status':
            return direction * getCourierStatus(a).localeCompare(getCourierStatus(b));
          default:
            return 0;
        }
      });
  }, [couriers, searchQuery, filterValue, sortValue]);

  // Handle adding a courier to this client
  const handleAddCourier = async () => {
    if (!selectedCourier) {
      return;
    }

    setAddingCourier(true);

    try {
      // Link the selected courier to this client
      await linkClientsToCourier(selectedCourier, [clientId]);

      // Get the courier details to add to the list
      const selectedCourierData = availableCouriers.find(c => c.id === selectedCourier);

      // Add the courier to the list
      setCouriers([...couriers, selectedCourierData]);

      // Remove the courier from available couriers
      setAvailableCouriers(availableCouriers.filter(c => c.id !== selectedCourier));

      // Reset selection and close dialog
      setSelectedCourier('');
      setDialogOpen(false);

      toast.success(`Courier "${selectedCourierData.name}" added to ${client.name}`);
    } catch (err) {
      console.error('Error adding courier to client:', err);
      toast.error('Failed to add courier: ' + (err.message || 'Unknown error'));
    } finally {
      setAddingCourier(false);
    }
  };

  // Handle deleting the client
  const handleDeleteClient = async () => {
    setIsDeleting(true);

    try {
      await deleteClient(clientId);
      toast.success(`Client "${client.name}" has been deleted`);
      navigate('/');
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error('Failed to delete client: ' + (err.message || 'Unknown error'));
      setIsDeleting(false);
    }
  };

  // Refresh data after couriers are added
  const handleCouriersAdded = async () => {
    setLoading(true);

    try {
      // Get client details again to refresh API URL
      const clientData = await getClientById(clientId);
      setClient(clientData);

      // Get updated couriers for this client
      const clientCouriers = await getCouriersByClientId(clientId);
      setCouriers(clientCouriers || []);

      // Get all couriers to determine which ones are available to add
      const allCouriers = await getCouriers();

      // Filter out couriers that are already linked to this client
      const linkedCourierIds = clientCouriers.map(c => c.id);
      const availableCouriersList = allCouriers.filter(c => !linkedCourierIds.includes(c.id));

      setAvailableCouriers(availableCouriersList);

      toast.success('Couriers refreshed successfully');
    } catch (err) {
      console.error('Error refreshing client data:', err);
      toast.error('Failed to refresh data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{client.name}</h1>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="ml-auto"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Client
        </Button>

        {/* Delete Client Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Client"
          entityName={client.name}
          entityType="client"
          onConfirm={handleDeleteClient}
          isDeleting={isDeleting}
        />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Couriers</h2>

        <div className="flex space-x-2">
          {availableCouriers.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Link Existing Courier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Existing Courier to {client.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="courier-select" className="text-sm font-medium">
                        Select Courier
                      </label>
                      <Select
                        value={selectedCourier}
                        onValueChange={setSelectedCourier}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a courier" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCouriers.map((courier) => (
                            <SelectItem key={courier.id} value={courier.id}>
                              {courier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddCourier}
                    disabled={addingCourier || !selectedCourier}
                  >
                    {addingCourier ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      'Link Courier'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Add Available Couriers Dialog */}
          <Button
            variant="outline"
            onClick={() => setAddCouriersDialogOpen(true)}
          >
            <Server className="mr-2 h-4 w-4" />
            Add Available Couriers
          </Button>

          <AddAvailableCouriersDialog
            open={addCouriersDialogOpen}
            onOpenChange={setAddCouriersDialogOpen}
            client={client}
            onCouriersAdded={handleCouriersAdded}
          />

          {availableCouriers.length === 0 && (
            <div className="absolute mt-2 text-xs text-amber-600">
              No available couriers found. Use "Add Available Couriers" to fetch couriers first.
            </div>
          )}

          <Button
            onClick={() => navigate(`/client/${clientId}/add-courier`)}
            disabled={availableCouriers.length === 0}
            title={availableCouriers.length === 0 ? "No available couriers to add" : "Add a new courier"}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Courier
          </Button>
        </div>
      </div>

      {/* Search, filter, and sort controls */}
      {couriers.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search couriers..."
            className="md:w-1/3"
          />

          <div className="flex gap-2 ml-auto">
            <FilterDropdown
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'configured', label: 'Configured' },
                { value: 'in-progress', label: 'In Progress' },
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
                { value: 'status', label: 'Status' }
              ]}
              value={sortValue}
              onChange={setSortValue}
            />
          </div>
        </div>
      )}

      {couriers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Couriers Found</h3>
          <p className="text-gray-500 mb-4">Add a courier to this client to get started.</p>
          <div className="flex flex-col items-center space-y-4">
            <div className="flex justify-center space-x-4">
              {availableCouriers.length > 0 && (
                <Button onClick={() => setDialogOpen(true)} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Link Existing Courier
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setAddCouriersDialogOpen(true)}
              >
                <Server className="mr-2 h-4 w-4" />
                Add Available Couriers
              </Button>
              <Button
                onClick={() => navigate(`/client/${clientId}/add-courier`)}
                disabled={availableCouriers.length === 0}
                title={availableCouriers.length === 0 ? "No available couriers to add" : "Add a new courier"}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Courier
              </Button>
            </div>

            {availableCouriers.length === 0 && (
              <div className="text-xs text-amber-600 mt-2">
                No available couriers found. Use "Add Available Couriers" to fetch couriers first.
              </div>
            )}
          </div>
        </div>
      ) : filteredCouriers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Couriers</h3>
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
          {filteredCouriers.map((courier) => {
            const status = getCourierStatus(courier);

            // Use theme based on status
            let cardTheme;

            // Generate a hash from courier name to get consistent theme
            const nameHash = courier.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const themes = ['lavender', 'peach', 'cyan'];

            // Use status-based theme or a consistent theme based on name
            switch (status) {
              case 'configured':
                cardTheme = 'configured';
                break;
              case 'in-progress':
                cardTheme = 'in-progress';
                break;
              case 'setup-required':
                cardTheme = 'setup-required';
                break;
              default:
                cardTheme = themes[nameHash % themes.length];
            }

            return (
              <GradientCard
                key={courier.id}
                className="cursor-pointer"
                onClick={() => handleCourierClick(courier.id)}
                theme={cardTheme}
                glassmorphic={true}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{courier.name}</h3>
                    <StatusBadge status={status} />
                  </div>

                  <div className="space-y-2">
                    {courier.api_base_url && (
                      <p className="text-xs text-gray-500 truncate max-w-[200px]" title={courier.api_base_url}>
                        API: {courier.api_base_url}
                      </p>
                    )}

                    {courier.auth_type && (
                      <p className="text-xs text-gray-500">
                        Auth: {courier.auth_type.toUpperCase()}
                      </p>
                    )}

                    {/* FreightTiger fields */}
                    {courier.fteid && (
                      <p className="text-xs text-gray-500 truncate max-w-[200px]" title={courier.fteid}>
                        FT ID: {courier.fteid}
                      </p>
                    )}

                    {courier.short_code && (
                      <p className="text-xs text-gray-500">
                        Code: {courier.short_code}
                      </p>
                    )}

                    {courier.tags && courier.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {courier.tags.map((tag, index) => (
                          <span key={index} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        {status === 'configured' ? (
                          <span className="text-green-600">All steps completed</span>
                        ) : status === 'in-progress' ? (
                          <span className="text-blue-600">Configuration in progress</span>
                        ) : (
                          <span className="text-amber-600">Setup needed</span>
                        )}
                      </div>

                      <StatusBadge
                        status="courier"
                        className="bg-amber-100 text-amber-800 border-amber-200"
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

export default ClientDetails;
