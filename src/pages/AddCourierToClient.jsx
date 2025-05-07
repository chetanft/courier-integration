import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { getClientById, addCourier, linkClientsToCourier } from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../components/ui/form';

const AddCourierToClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const form = useForm({
    defaultValues: {
      name: '',
      api_base_url: '',
      auth_type: 'basic',
      api_intent: 'track_shipment'
    }
  });

  // Fetch client details on component mount
  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      setError(null);

      try {
        const clientData = await getClientById(clientId);
        if (!clientData) {
          throw new Error('Client not found');
        }
        setClient(clientData);
      } catch (err) {
        console.error('Error fetching client:', err);
        setError({
          message: err.message || 'Failed to load client',
          details: err
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  // Handle form submission
  const onSubmit = async (data) => {
    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Add the courier to the system
      const courierResult = await addCourier({
        name: data.name,
        api_base_url: data.api_base_url,
        auth_type: data.auth_type || 'basic',
        api_intent: data.api_intent || 'track_shipment'
      });

      // Step 2: Link the courier to this client
      await linkClientsToCourier(courierResult.id, [clientId]);

      // Show success message
      toast.success(`Courier "${data.name}" added to ${client.name}`);

      // Navigate back to client details
      navigate(`/client/${clientId}`);
    } catch (err) {
      console.error('Error adding courier:', err);
      setError({
        message: err.message || 'Failed to add courier',
        details: err
      });
      toast.error('Failed to add courier: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
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

  if (error && !client) {
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
        <Button variant="ghost" onClick={() => navigate(`/client/${clientId}`)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {client.name}
        </Button>
        <h1 className="text-2xl font-bold">Add Courier to {client.name}</h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Courier Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courier Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Safexpress, DHL, FedEx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the name of the courier service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="api_base_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Base URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      The base URL for the courier's API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full md:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Courier'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddCourierToClient;
