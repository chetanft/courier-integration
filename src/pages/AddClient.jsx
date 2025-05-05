import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add Client to Courier</h1>
        <Link to="/" className="text-blue-500 hover:text-blue-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Select Courier</label>
          <div className="relative">
            <select
              {...register('courier_id', { required: 'Please select a courier' })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white pr-10"
              onChange={(e) => handleCourierChange(e.target.value)}
              value={selectedCourier}
            >
              <option value="">-- Select Courier --</option>
              {couriers.map(courier => (
                <option key={courier.id} value={courier.id}>{courier.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
          {errors.courier_id && <p className="text-red-500 mt-1 text-sm">{errors.courier_id.message}</p>}
        </div>

        {selectedCourier && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-gray-700 font-medium">Select Clients</label>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                {selectedClients.length} selected
              </span>
            </div>
            <div className="border border-gray-200 rounded-lg shadow-sm p-4 mb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {clients.map(client => {
                  const isExisting = existingClients.includes(client.id);
                  return (
                    <div key={client.id} className={`flex items-center p-3 rounded-lg ${isExisting ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        id={`client-${client.id}`}
                        checked={selectedClients.includes(client.id) || isExisting}
                        onChange={() => !isExisting && handleClientChange(client.id)}
                        disabled={isExisting}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <label
                        htmlFor={`client-${client.id}`}
                        className={`flex-1 cursor-pointer ${isExisting ? 'text-gray-400' : 'text-gray-700'}`}
                      >
                        {client.name}
                        {isExisting && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                            Already linked
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            {clients.length === 0 && (
              <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-500">No clients available. Please add clients first.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !selectedCourier || selectedClients.length === 0}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center font-medium transition-colors shadow-md"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Saving...' : 'Link Clients to Courier'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddClient;
