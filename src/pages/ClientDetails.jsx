import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClientById, getCouriersByClientId, getCouriers, linkClientsToCourier } from '../lib/supabase-service';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, PlusCircle, Truck, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

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
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{client.name}</h1>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Couriers</h2>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableCouriers.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Courier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Courier to {client.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {availableCouriers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No available couriers to add</p>
                  <Link to={`/client/${clientId}/add-courier`} className="text-blue-600 hover:underline mt-2 inline-block">
                    Create a new courier
                  </Link>
                </div>
              ) : (
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
              )}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAddCourier}
                disabled={addingCourier || !selectedCourier || availableCouriers.length === 0}
              >
                {addingCourier ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Courier'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {couriers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Couriers Found</h3>
          <p className="text-gray-500 mb-4">Add a courier to this client to get started.</p>
          <Button onClick={() => setDialogOpen(true)} disabled={availableCouriers.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Courier
          </Button>
          {availableCouriers.length === 0 && (
            <div className="mt-4">
              <Link to={`/client/${clientId}/add-courier`} className="text-blue-600 hover:underline">
                Create a new courier first
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {couriers.map((courier) => (
            <Card
              key={courier.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleCourierClick(courier.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{courier.name}</h3>
                    <p className="text-sm text-gray-500">
                      {courier.api_base_url ? (
                        <span className="text-green-600">API Configured</span>
                      ) : (
                        <span className="text-amber-600">Setup Required</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                    Courier
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

export default ClientDetails;
