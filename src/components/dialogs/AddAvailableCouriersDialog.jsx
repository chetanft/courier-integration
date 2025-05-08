import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import RequestBuilder from '../request-builder';
import { updateClientApiUrl, fetchAndStoreCourierData } from '../../lib/supabase-service';
import { fetchCourierData } from '../../lib/courier-api-service';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { parseCurl } from '../../lib/curl-parser';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../ui/form';

const AddAvailableCouriersDialog = ({
  open,
  onOpenChange,
  client,
  onCouriersAdded
}) => {
  const [loading, setLoading] = useState(false);
  const [fetchingCouriers, setFetchingCouriers] = useState(false);
  const [couriersFound, setCouriersFound] = useState(null);
  const [error, setError] = useState(null);

  // Initialize form with react-hook-form
  const formMethods = useForm({
    defaultValues: {
      method: 'GET',
      url: '',
      apiIntent: 'fetch_courier_data', // Custom intent for fetching couriers
      auth: {
        type: 'none',
        username: '',
        password: '',
        token: '',
        clientId: '',
        clientSecret: '',
        tokenEndpoint: '',
        scope: '',
        apiKey: '',
        apiKeyName: 'X-API-Key',
        apiKeyLocation: 'header',
        // JWT Token Auth fields
        jwtAuthEndpoint: '',
        jwtAuthMethod: 'POST',
        jwtAuthHeaders: [],
        jwtAuthBody: {},
        jwtTokenPath: 'access_token'
      },
      headers: [],
      queryParams: [],
      body: {},
      curlCommand: ''
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setCouriersFound(null);

    try {
      // Create request config from form data
      const requestConfig = {
        url: data.url.trim(),
        method: data.method || 'GET',
        apiIntent: 'fetch_courier_data',
        headers: data.headers || [],
        queryParams: data.queryParams || [],
        body: data.body || {}
      };

      // Add authentication if provided
      if (data.auth && data.auth.type !== 'none') {
        requestConfig.auth = {
          type: data.auth.type
        };

        // Add auth details based on type
        switch (data.auth.type) {
          case 'basic':
            requestConfig.auth.username = data.auth.username;
            requestConfig.auth.password = data.auth.password;
            break;
          case 'bearer':
          case 'jwt':
            requestConfig.auth.token = data.auth.token;
            break;
          case 'jwt_auth':
            requestConfig.auth.jwtAuthEndpoint = data.auth.jwtAuthEndpoint;
            requestConfig.auth.jwtAuthMethod = data.auth.jwtAuthMethod;
            requestConfig.auth.jwtAuthHeaders = data.auth.jwtAuthHeaders;
            requestConfig.auth.jwtAuthBody = data.auth.jwtAuthBody;
            requestConfig.auth.jwtTokenPath = data.auth.jwtTokenPath;
            break;
          case 'oauth':
            requestConfig.auth.clientId = data.auth.clientId;
            requestConfig.auth.clientSecret = data.auth.clientSecret;
            requestConfig.auth.tokenEndpoint = data.auth.tokenEndpoint;
            requestConfig.auth.scope = data.auth.scope;
            break;
          case 'apikey':
            requestConfig.auth.apiKey = data.auth.apiKey;
            requestConfig.auth.apiKeyName = data.auth.apiKeyName;
            requestConfig.auth.apiKeyLocation = data.auth.apiKeyLocation;
            break;
        }
      }

      // Test the API URL first
      setFetchingCouriers(true);
      const url = data.url.trim();

      // Extract couriers from the response
      const couriers = await fetchCourierData(url, requestConfig);

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

        // Update client with API URL
        await updateClientApiUrl(client.id, url);

        // Store the courier data
        await fetchAndStoreCourierData(client.id, url, requestConfig);

        // Notify parent component that couriers were added
        if (onCouriersAdded) {
          onCouriersAdded();
        }

        // Close the dialog after a short delay
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Error testing API URL:', err);
      setError({
        message: err.message || 'Failed to fetch couriers from API',
        details: err
      });
      toast.error('Failed to fetch couriers: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setFetchingCouriers(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Available Couriers for {client?.name}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            Configure the API URL and authentication details to fetch couriers for this client.
            This will update the client's API information and fetch available couriers.
          </p>

          {error && (
            <div className="bg-red-50 p-4 rounded-md mb-4 border border-red-200">
              <h3 className="text-red-700 font-medium">Error</h3>
              <p className="text-red-600">{error.message}</p>
            </div>
          )}

          {couriersFound && (
            <div className="bg-green-50 p-4 rounded-md mb-4 border border-green-200">
              <h3 className="text-green-700 font-medium">Success</h3>
              <p className="text-green-600">
                Found {couriersFound.count} couriers: {couriersFound.couriers}
              </p>
            </div>
          )}

          {/* Custom RequestBuilder without courier name field */}
          <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-6">
            {/* cURL Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>cURL Command</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <FormField
                    control={formMethods.control}
                    name="curlCommand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paste cURL Command</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="curl -X GET 'https://api.example.com/couriers' -H 'Authorization: Bearer token'"
                              className="font-mono flex-1"
                              {...field}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                try {
                                  if (!field.value.trim()) {
                                    console.log('Empty cURL command, skipping parse');
                                    return;
                                  }

                                  const parsed = parseCurl(field.value);
                                  console.log('Successfully parsed cURL command:', parsed);

                                  // Update form values with parsed data
                                  formMethods.setValue('method', parsed.method);
                                  formMethods.setValue('url', parsed.url);

                                  // Set auth type
                                  formMethods.setValue('auth.type', parsed.auth.type);

                                  formMethods.setValue('auth.username', parsed.auth.username);
                                  formMethods.setValue('auth.password', parsed.auth.password);
                                  formMethods.setValue('auth.token', parsed.auth.token);

                                  // Set headers
                                  if (parsed.headers && parsed.headers.length > 0) {
                                    formMethods.setValue('headers', parsed.headers);
                                  } else {
                                    formMethods.setValue('headers', []);
                                  }

                                  // Set body
                                  if (parsed.body) {
                                    formMethods.setValue('body', parsed.body);
                                  }
                                } catch (e) {
                                  console.error('Error parsing cURL command:', e);
                                  alert('Error parsing cURL command: ' + e.message);
                                }
                              }}
                              className="self-end"
                            >
                              Parse
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Paste a cURL command to automatically fill the form below
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Use the rest of the RequestBuilder component without name field */}
            <RequestBuilder
              formMethods={formMethods}
              onSubmit={onSubmit}
              loading={loading || fetchingCouriers}
              showCurlInput={false} // Hide the cURL input since we have our own
              showApiIntents={false}
              customSubmitLabel={fetchingCouriers ? "Fetching Couriers..." : "Fetch Couriers"}
              showNameField={false} // Hide the name field since we're fetching multiple couriers
            />
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAvailableCouriersDialog;
