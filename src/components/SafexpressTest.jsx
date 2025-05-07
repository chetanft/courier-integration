import React, { useState } from 'react';
import { testSafexpressApi } from '../lib/api-utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from './ui/card';
import { Label } from './ui/label';

/**
 * A component for testing the Safexpress API integration
 */
const SafexpressTest = () => {
  const [trackingNumber, setTrackingNumber] = useState('500704577566');
  const [authToken, setAuthToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    try {
      setLoading(true);
      setError(null);
      setResponse(null);

      console.log('Testing Safexpress API with:', {
        trackingNumber,
        authToken: authToken ? `${authToken.substring(0, 10)}...` : 'Not provided',
        apiKey: apiKey ? `${apiKey.substring(0, 5)}...` : 'Not provided'
      });

      const result = await testSafexpressApi(trackingNumber, authToken, apiKey);
      
      if (result.error) {
        setError(result);
      } else {
        setResponse(result);
      }
    } catch (err) {
      console.error('Error testing Safexpress API:', err);
      setError({
        error: true,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Safexpress API Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tracking-number">Tracking Number</Label>
          <Input
            id="tracking-number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="auth-token">Authorization Token</Label>
          <Input
            id="auth-token"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Bearer eyJraWQiOiJ4ZStWNmxs..."
          />
          <p className="text-xs text-gray-500">
            Include the full token from your cURL command, including "Bearer " prefix if present
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="api-key">X-API-Key</Label>
          <Input
            id="api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter x-api-key value"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            <div className="font-semibold">Error:</div>
            <div>{error.message}</div>
            {error.status && (
              <div className="mt-1">
                Status: {error.status} {error.statusText}
              </div>
            )}
            {error.details && Object.keys(error.details).length > 0 && (
              <div className="mt-1">
                <details>
                  <summary className="cursor-pointer">Error Details</summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-32 p-2 bg-red-100 rounded">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {response && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="font-semibold text-green-700">Response:</div>
            <pre className="mt-2 text-xs overflow-auto max-h-60 p-2 bg-white rounded">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleTest} disabled={loading}>
          {loading ? 'Testing...' : 'Test Safexpress API'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SafexpressTest;
