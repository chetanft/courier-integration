import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { addClient, addCouriersToClient } from '../lib/supabase-service';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import SimplifiedCourierUploadTabs from '../components/courier-upload/SimplifiedCourierUploadTabs';
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
      courier_name: '', // We'll use this for company name
      company_id: '',
      old_company_id: '',
      display_id: '',
      types: ''
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
        message: 'Please enter a company name'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Add the client with all fields
      const result = await addClient({
        name: data.courier_name.trim(),
        company_id: data.company_id?.trim() || null,
        company_name: data.courier_name.trim(),
        old_company_id: data.old_company_id?.trim() || null,
        display_id: data.display_id?.trim() || null,
        types: data.types?.trim() || null
      });

      // If we have parsed couriers, add them to the new client
      if (parsedCouriers && parsedCouriers.length > 0) {
        const addedCouriers = await addCouriersToClient(result.id, parsedCouriers);

        if (addedCouriers && addedCouriers.length > 0) {
          toast.success(`Added ${addedCouriers.length} couriers for ${data.courier_name.trim()}`);
        }
      }

      // Show success message
      toast.success(`Company "${data.courier_name.trim()}" added successfully!`);

      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error adding company:', err);

      setError({
        message: err.message || 'Failed to add company'
      });

      toast.error('Failed to add company: ' + (err.message || 'Unknown error'));
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
          <div className="animate-pulse text-blue-600">Saving company...</div>
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
          <CardTitle>Add Company</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Add a new company to the system. The company name will be used to identify the company in the system.
          </p>

          {/* Company Information Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Company Name Field */}
            <FormField
              control={formMethods.control}
              name="courier_name"
              rules={{ required: "Company name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company ID Field */}
            <FormField
              control={formMethods.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Old Company ID Field */}
            <FormField
              control={formMethods.control}
              name="old_company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Old Company ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter old company ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display ID Field */}
            <FormField
              control={formMethods.control}
              name="display_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter display ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Types Field */}
            <FormField
              control={formMethods.control}
              name="types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Types</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter types (e.g., CNR, CNR_CEE)" {...field} />
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

            <SimplifiedCourierUploadTabs
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
              {loading ? 'Saving...' : 'Save Company'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClient;
