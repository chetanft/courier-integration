import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { KeyValueEditor } from '../ui/key-value-editor';
import { JsonEditor } from '../ui/json-editor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Loader2, CheckCircle } from 'lucide-react';
import { parseCurl } from '../../lib/curl-parser';
import { testCourierApi } from '../../lib/api-utils';
import { toast } from 'sonner';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';

const AuthenticationSetup = ({ onComplete, createCourier, loading }) => {
  const { control, watch, setValue, handleSubmit, formState: { errors } } = useFormContext();

  // Local state
  const [authType, setAuthType] = useState('none');
  const [tokenResponse, setTokenResponse] = useState(null);
  const [token, setToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenGenerated, setTokenGenerated] = useState(false);

  // Watch auth type
  const watchAuthType = watch('auth.type');

  // Update local state when auth type changes
  useEffect(() => {
    setAuthType(watchAuthType);
  }, [watchAuthType]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      // If auth type is none, just proceed to next step
      if (data.auth.type === 'none') {
        // Create courier in database
        const courier = await createCourier(data);
        onComplete('');
        return;
      }

      // If token is already generated, proceed to next step
      if (tokenGenerated && token) {
        // Create courier in database
        const courier = await createCourier(data);
        onComplete(token);
        return;
      }

      // Otherwise, show error
      toast.error('Please generate a token first');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to proceed to next step');
    }
  };

  // Handle curl parsing
  const handleCurlParse = (curlCommand) => {
    try {
      const parsed = parseCurl(curlCommand);

      // Update form values with parsed data
      setValue('auth.method', parsed.method);
      setValue('auth.url', parsed.url);

      // Set headers
      if (parsed.headers && parsed.headers.length > 0) {
        setValue('auth.headers', parsed.headers);
      }

      // Set body
      if (parsed.body) {
        setValue('auth.body', parsed.body);
      }

      // Check for auth
      if (parsed.auth && parsed.auth.type !== 'none') {
        if (parsed.auth.type === 'basic') {
          setValue('auth.username', parsed.auth.username);
          setValue('auth.password', parsed.auth.password);
        } else if (parsed.auth.type === 'bearer' || parsed.auth.type === 'jwt') {
          setToken(parsed.auth.token);
          setTokenGenerated(true);
          toast.success('Token extracted from cURL command');
        }
      }

      toast.success('cURL command parsed successfully');
    } catch (error) {
      console.error('Error parsing cURL command:', error);
      toast.error('Failed to parse cURL command');
    }
  };

  // Generate token
  const generateToken = async () => {
    try {
      setTokenLoading(true);

      const formData = watch();
      const { auth } = formData;

      // Create request config
      const requestConfig = {
        url: auth.url,
        method: auth.method,
        apiIntent: 'generate_auth_token',
        headers: auth.headers,
        body: auth.body
      };

      // Make API request
      const response = await testCourierApi(requestConfig);

      // Check for errors
      if (response.error) {
        throw new Error(response.message || 'Failed to generate token');
      }

      setTokenResponse(response);

      // Extract token from response using token path
      const tokenPath = auth.tokenPath || 'access_token';
      const pathParts = tokenPath.split('.');

      let extractedToken = response;
      for (const part of pathParts) {
        if (extractedToken && typeof extractedToken === 'object' && part in extractedToken) {
          extractedToken = extractedToken[part];
        } else {
          throw new Error(`Token path "${tokenPath}" not found in response`);
        }
      }

      if (typeof extractedToken !== 'string') {
        throw new Error('Extracted token is not a string');
      }

      setToken(extractedToken);
      setTokenGenerated(true);
      toast.success('Token generated successfully');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error(error.message || 'Failed to generate token');
    } finally {
      setTokenLoading(false);
    }
  };

  // Copy token to clipboard
  const copyToken = () => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Courier Name */}
          <FormField
            control={control}
            name="courier_name"
            rules={{ required: "Courier name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Courier Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., SafeExpress" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Authentication Type */}
          <FormField
            control={control}
            name="auth.type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setAuthType(value);
                    setTokenGenerated(false);
                    setToken('');
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Authentication (Public API)</SelectItem>
                    <SelectItem value="form">Auth via Form (Manual Auth API)</SelectItem>
                    <SelectItem value="curl">Auth via cURL (Auth cURL Parser)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how you want to authenticate with the courier API
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Auth via Form */}
          {authType === 'form' && (
            <div className="space-y-4 border p-4 rounded-md">
              <h3 className="text-lg font-medium">Auth API Configuration</h3>

              {/* Auth URL */}
              <FormField
                control={control}
                name="auth.url"
                rules={{ required: "Auth URL is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com/auth" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Auth Method */}
              <FormField
                control={control}
                name="auth.method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Headers */}
              <FormField
                control={control}
                name="auth.headers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headers</FormLabel>
                    <FormControl>
                      <KeyValueEditor
                        value={field.value || []}
                        onChange={field.onChange}
                        keyPlaceholder="Header name"
                        valuePlaceholder="Header value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Body (for POST) */}
              {watch('auth.method') === 'POST' && (
                <FormField
                  control={control}
                  name="auth.body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Body</FormLabel>
                      <FormControl>
                        <JsonEditor
                          value={field.value || {}}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Token Path */}
              <FormField
                control={control}
                name="auth.tokenPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Path</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="access_token"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Path to the token in the response (e.g., "access_token" or "data.token")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Generate Token Button */}
              <Button
                type="button"
                onClick={generateToken}
                disabled={tokenLoading}
              >
                {tokenLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Token'
                )}
              </Button>
            </div>
          )}

          {/* Auth via cURL */}
          {authType === 'curl' && (
            <div className="space-y-4 border p-4 rounded-md">
              <h3 className="text-lg font-medium">cURL Command Parser</h3>

              {/* cURL Command */}
              <FormField
                control={control}
                name="auth.curlCommand"
                rules={{ required: "cURL command is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>cURL Command</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="curl -X POST https://api.example.com/auth -H 'Content-Type: application/json' -d '{...}'"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Paste a complete cURL command including headers and body
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parse cURL Button */}
              <Button
                type="button"
                onClick={() => handleCurlParse(watch('auth.curlCommand'))}
              >
                Parse cURL Command
              </Button>
            </div>
          )}

          {/* Token Display */}
          {token && (
            <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-md">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-green-800">Token Generated</h3>
              </div>

              <div className="bg-white p-2 rounded border border-gray-200 flex items-center">
                <div className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm">
                  {token.length > 50 ? `${token.substring(0, 50)}...` : token}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyToken}
                  className="ml-2"
                >
                  Copy
                </Button>
              </div>

              <p className="text-sm text-green-700 mt-2">
                This token will be used for API requests in the next step
              </p>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div></div>
        <Button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Continue to API Setup'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthenticationSetup;
