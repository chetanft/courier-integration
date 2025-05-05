import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addClient } from '../lib/supabase';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const AddClient = () => {
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Handle form submission
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setError({
        message: 'Please enter a client name'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Make real API call to add client
      await addClient({ name: clientName.trim() });

      // Show success message
      alert('Client added successfully!');

      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error adding client:', err);
      setError({
        message: 'Failed to add client',
        details: err
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add New Client</h1>
        <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {loading && !error && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4 text-center">
          <div className="animate-pulse text-blue-600">Saving client...</div>
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
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="mb-6">
              <Label htmlFor="clientName" className="mb-2 block">Client Name</Label>
              <Input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                disabled={loading}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the name of the client to add to the system.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !clientName.trim()}
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
