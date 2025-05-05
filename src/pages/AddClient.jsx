import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { getCouriers, getClients, getCourierClients, linkClientToCourier } from '../lib/supabase';

const AddClient = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [couriers, setCouriers] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [existingClients, setExistingClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch couriers and clients on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [couriersData, clientsData] = await Promise.all([
          getCouriers(),
          getClients()
        ]);
        setCouriers(couriersData);
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch existing clients for selected courier
  const handleCourierChange = async (courierId) => {
    setSelectedCourier(courierId);
    setSelectedClients([]);
    
    if (!courierId) {
      setExistingClients([]);
      return;
    }
    
    try {
      setLoading(true);
      const clientIds = await getCourierClients(courierId);
      setExistingClients(clientIds);
    } catch (error) {
      console.error('Error fetching courier clients:', error);
      toast.error('Failed to fetch courier clients');
    } finally {
      setLoading(false);
    }
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
  const onSubmit = async () => {
    if (!selectedCourier) {
      toast.error('Please select a courier');
      return;
    }
    
    if (selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create client-courier links
      for (const clientId of selectedClients) {
        await linkClientToCourier({
          courier_id: selectedCourier,
          client_id: clientId
        });
      }
      
      toast.success('Clients linked to courier successfully!');
      
      // Update existing clients
      const clientIds = await getCourierClients(selectedCourier);
      setExistingClients(clientIds);
      setSelectedClients([]);
    } catch (error) {
      console.error('Error linking clients to courier:', error);
      toast.error(error.message || 'Failed to link clients to courier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Client to Courier</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Select Courier</label>
          <select
            {...register('courier_id', { required: 'Please select a courier' })}
            className="w-full p-2 border rounded"
            onChange={(e) => handleCourierChange(e.target.value)}
            value={selectedCourier}
          >
            <option value="">-- Select Courier --</option>
            {couriers.map(courier => (
              <option key={courier.id} value={courier.id}>{courier.name}</option>
            ))}
          </select>
          {errors.courier_id && <p className="text-red-500 mt-1">{errors.courier_id.message}</p>}
        </div>
        
        {selectedCourier && (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Select Clients</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-2 border rounded">
              {clients.map(client => {
                const isExisting = existingClients.includes(client.id);
                return (
                  <div key={client.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`client-${client.id}`}
                      checked={selectedClients.includes(client.id) || isExisting}
                      onChange={() => !isExisting && handleClientChange(client.id)}
                      disabled={isExisting}
                      className="mr-2"
                    />
                    <label htmlFor={`client-${client.id}`} className={isExisting ? 'text-gray-400' : ''}>
                      {client.name}
                      {isExisting && ' (Already linked)'}
                    </label>
                  </div>
                );
              })}
            </div>
            {clients.length === 0 && (
              <p className="text-gray-500 mt-2">No clients available. Please add clients first.</p>
            )}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading || !selectedCourier || selectedClients.length === 0}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Saving...' : 'Link Clients to Courier'}
        </button>
      </form>
    </div>
  );
};

export default AddClient;
