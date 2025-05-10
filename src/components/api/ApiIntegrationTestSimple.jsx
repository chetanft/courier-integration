/**
 * Simple API Integration Test Component
 * 
 * This component is used to test the centralized API integration system with a real API.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { makeApiRequest } from '../../lib/api-client';
import ApiResponseDisplay from './ApiResponseDisplay';

const ApiIntegrationTestSimple = () => {
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [method, setMethod] = useState('GET');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const result = await makeApiRequest({
        url,
        method,
        headers: [
          { key: 'Content-Type', value: 'application/json' }
        ]
      });
      
      setResponse(result);
    } catch (err) {
      console.error('Error making API request:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple API Integration Test</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="url">API URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            
            <div>
              <Label htmlFor="method">Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {(response || error) && (
        <ApiResponseDisplay
          response={response || error}
          title={error ? 'API Error' : 'API Response'}
        />
      )}
    </div>
  );
};

export default ApiIntegrationTestSimple;
