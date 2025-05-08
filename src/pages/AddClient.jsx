import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { addClient, addCouriersToClient } from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import CourierUploadTabs from '../components/courier-upload/CourierUploadTabs';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../components/ui/form';

const AddClient = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedCouriers, setParsedCouriers] = useState(null);
  const navigate = useNavigate();

  // Initialize form with react-hook-form
  const formMethods = useForm({
    defaultValues: {
      courier_name: '' // We'll use this for client name
    }
  });

  // Handle parsed courier data from the upload components
  const handleParsedCouriers = (couriers) => {
    setParsedCouriers(couriers);
  };

  // Handle form submission
  const onSubmit = async (data) => {
    if (!data.courier_name.trim()) {
      setError({
        message: 'Please enter a client name'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Add the client
      const result = await addClient({
        name: data.courier_name.trim()
      });

      // If we have parsed couriers, add them to the new client
      if (parsedCouriers && parsedCouriers.length > 0) {
        const addedCouriers = await addCouriersToClient(result.id, parsedCouriers);

        if (addedCouriers && addedCouriers.length > 0) {
          toast.success(`Added ${addedCouriers.length} couriers for ${data.courier_name.trim()}`);
        }
      }

      // Show success message
      toast.success(`Client "${data.courier_name.trim()}" added successfully!`);

      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error adding client:', err);

      setError({
        message: err.message || 'Failed to add client'
      });

      toast.error('Failed to add client: ' + (err.message || 'Unknown error'));
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
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Client</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Add a new client to the system. The client name will be used to identify the client in the system.
          </p>

          {/* Client Name Field */}
          <div className="mb-6">
            <FormField
              control={formMethods.control}
              name="courier_name"
              rules={{ required: "Client name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Add Available Couriers Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Add Available Couriers</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload couriers via CSV, JSON, or API integration.
            </p>

            <CourierUploadTabs
              onParsedData={handleParsedCouriers}
              onError={(error) => setError(error)}
            />
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={formMethods.handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Client'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClient;
