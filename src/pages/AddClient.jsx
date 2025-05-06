import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addClient } from '../lib/supabase-service';
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
      console.log('Submitting client with name:', clientName.trim());

      // Make real API call to add client
      const result = await addClient({ name: clientName.trim() });

      console.log('Client add result:', result);

      // Show success message
      alert('Client added successfully!');

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
                variant="default"
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
