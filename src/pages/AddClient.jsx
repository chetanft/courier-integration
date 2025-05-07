import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addClient, fetchAndStoreCourierData } from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const AddClient = () => {
  const [clientName, setClientName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCouriers, setFetchingCouriers] = useState(false);
  const [error, setError] = useState(null);
  const [couriersFound, setCouriersFound] = useState(null);
  const navigate = useNavigate();

  // Handle testing the API URL
  const testApiUrl = async () => {
    if (!apiUrl.trim()) {
      setError({
        message: 'Please enter an API URL'
      });
      return;
    }

    setFetchingCouriers(true);
    setError(null);
    setCouriersFound(null);

    try {
      // Import the courier API service
      const { fetchCourierData } = await import('../lib/courier-api-service.js');

      // Fetch couriers from the API URL
      const couriers = await fetchCourierData(apiUrl.trim());

      if (!couriers || couriers.length === 0) {
        setError({
          message: 'No couriers found in the API response'
        });
      } else {
        setCouriersFound({
          count: couriers.length,
          couriers: couriers.map(c => c.name).join(', ')
        });
        toast.success(`Found ${couriers.length} couriers in the API response`);
      }
    } catch (err) {
      console.error('Error testing API URL:', err);

      setError({
        message: err.message || 'Failed to fetch couriers from API',
        details: {
          status: err.status,
          statusText: err.statusText,
          code: err.code,
          hint: err.hint,
          details: err.details
        },
        operation: err.operation,
        timestamp: err.timestamp || new Date().toISOString()
      });
    } finally {
      setFetchingCouriers(false);
    }
  };

  // Handle form submission
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setError({
        message: 'Please enter a client name'
      });
      return;
    }

    if (!apiUrl.trim()) {
      setError({
        message: 'Please enter an API URL'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Submitting client with name:', clientName.trim(), 'and API URL:', apiUrl.trim());

      // Make real API call to add client
      const result = await addClient({
        name: clientName.trim(),
        api_url: apiUrl.trim()
      });

      console.log('Client add result:', result);

      // Fetch and store courier data from the API
      const couriers = await fetchAndStoreCourierData(result.id, apiUrl.trim());

      if (couriers && couriers.length > 0) {
        toast.success(`Added ${couriers.length} couriers for ${clientName.trim()}`);
      }

      // Show success message
      toast.success(`Client "${clientName.trim()}" added successfully!`);

      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error adding client:', err);

      // Create a more detailed error object
      setError({
        message: err.message || 'Failed to add client',
        details: {
          status: err.status,
          statusText: err.statusText,
          code: err.code,
          hint: err.hint,
          details: err.details
        },
        operation: err.operation,
        timestamp: err.timestamp || new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-end mb-6">
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {loading && !error && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4 text-center">
          <div className="animate-pulse text-blue-600">Saving client...</div>
        </div>
      )}

      {fetchingCouriers && !error && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4 text-center">
          <div className="animate-pulse text-blue-600">Fetching couriers from API...</div>
        </div>
      )}

      {couriersFound && !error && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
          <h3 className="text-green-700 font-medium">Couriers Found</h3>
          <p className="text-green-600">Found {couriersFound.count} couriers in the API response.</p>
          <p className="text-sm text-green-600 mt-1">Couriers: {couriersFound.couriers}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>

          {error.details && (
            <div className="mt-2">
              {error.details.status && (
                <p className="text-sm text-red-500">
                  Status: {error.details.status} {error.details.statusText}
                </p>
              )}

              {error.details.code && (
                <p className="text-sm text-red-500">
                  Code: {error.details.code}
                </p>
              )}

              {error.details.hint && (
                <p className="text-sm text-red-500">
                  Hint: {error.details.hint}
                </p>
              )}

              {error.operation && (
                <p className="text-sm text-red-500">
                  Operation: {error.operation}
                </p>
              )}

              {error.details.details && (
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer">Show more details</summary>
                  <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                    {JSON.stringify(error.details.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="mb-6">
              <Label htmlFor="clientName" className="mb-2 block font-medium">Client Name</Label>
              <Input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                disabled={loading || fetchingCouriers}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the name of the client to add to the system.
              </p>
            </div>

            <div className="mb-6">
              <Label htmlFor="apiUrl" className="mb-2 block font-medium">Courier API URL</Label>
              <div className="flex gap-2">
                <Input
                  id="apiUrl"
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.client.com/couriers"
                  disabled={loading || fetchingCouriers}
                  className="flex-1 border-2 border-gray-300"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={testApiUrl}
                  disabled={loading || fetchingCouriers || !apiUrl.trim()}
                >
                  {fetchingCouriers ? 'Testing...' : 'Test API'}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Enter the URL to fetch courier information for this client. The API should return a list of couriers.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                variant="default"
                type="submit"
                disabled={loading || fetchingCouriers || !clientName.trim() || !apiUrl.trim()}
              >
                {loading ? 'Saving...' : 'Add Client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClient;
