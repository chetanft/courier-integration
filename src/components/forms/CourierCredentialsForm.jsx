import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { saveCourierCredentials, getCourierCredentials } from '../../lib/supabase-service';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

/**
 * Form for entering and managing courier credentials
 * @param {Object} props - Component props
 * @param {string} props.courierId - ID of the courier
 * @param {string} props.courierName - Name of the courier
 * @param {Function} props.onSuccess - Callback when credentials are saved successfully
 */
const CourierCredentialsForm = ({ courierId, courierName, onSuccess }) => {
  const [authType, setAuthType] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [existingCredentials, setExistingCredentials] = useState(null);

  const form = useForm({
    defaultValues: {
      authType: 'basic',
      username: '',
      password: '',
      apiKey: '',
      token: '',
      jwtAuthEndpoint: '',
      jwtTokenPath: 'access_token',
    },
  });

  // Load existing credentials if available
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!courierId) return;
      
      setLoading(true);
      const result = await getCourierCredentials(courierId);
      setLoading(false);
      
      if (result.success) {
        setExistingCredentials(result.credentials);
        
        // Determine auth type from credentials
        let detectedAuthType = 'basic';
        if (result.credentials.apiKey) {
          detectedAuthType = 'api_key';
        } else if (result.credentials.token) {
          detectedAuthType = 'bearer';
        } else if (result.credentials.jwt) {
          detectedAuthType = 'jwt_auth';
        }
        
        setAuthType(detectedAuthType);
        form.reset({
          authType: detectedAuthType,
          username: result.credentials.username || '',
          password: result.credentials.password || '',
          apiKey: result.credentials.apiKey || '',
          token: result.credentials.token || '',
          jwtAuthEndpoint: result.credentials.jwt?.jwtAuthEndpoint || '',
          jwtTokenPath: result.credentials.jwt?.jwtTokenPath || 'access_token',
        });
      }
    };
    
    fetchCredentials();
  }, [courierId, form]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    
    try {
      // Format credentials based on auth type
      let credentials = {};
      
      switch (formData.authType) {
        case 'basic':
          credentials = {
            username: formData.username,
            password: formData.password
          };
          break;
        case 'api_key':
          credentials = {
            apiKey: formData.apiKey
          };
          break;
        case 'bearer':
          credentials = {
            token: formData.token
          };
          break;
        case 'jwt_auth':
          credentials = {
            jwt: {
              jwtAuthEndpoint: formData.jwtAuthEndpoint,
              jwtTokenPath: formData.jwtTokenPath || 'access_token'
            }
          };
          break;
      }
      
      // Save credentials to Supabase
      const result = await saveCourierCredentials(courierId, credentials);
      
      if (result.success) {
        toast.success('Credentials saved successfully');
        if (onSuccess) onSuccess(credentials);
      } else {
        toast.error('Failed to save credentials');
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast.error('An error occurred while saving credentials');
    }
    
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Courier Credentials for {courierName}</CardTitle>
        <CardDescription>
          Add authentication credentials for this courier. These are stored securely and used to make API calls to the courier's services.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="authType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authentication Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setAuthType(value);
                      }}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select authentication type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basic">Basic Auth (Username/Password)</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="jwt_auth">JWT Auth</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose how this courier authenticates API requests
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show appropriate fields based on auth type */}
              {authType === 'basic' && (
                <>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {authType === 'api_key' && (
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter API key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {authType === 'bearer' && (
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bearer Token</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bearer token" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {authType === 'jwt_auth' && (
                <>
                  <FormField
                    control={form.control}
                    name="jwtAuthEndpoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JWT Auth Endpoint</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://api.example.com/oauth/token" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The endpoint to request JWT tokens from
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="jwtTokenPath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JWT Token Path</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="access_token" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Path to token in response (e.g., "access_token" or "data.token")
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            <div className="mt-6">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : existingCredentials ? 'Update Credentials' : 'Save Credentials'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CourierCredentialsForm; 