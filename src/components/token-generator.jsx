import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { KeyValueEditor } from './ui/key-value-editor';
import { JsonEditor } from './ui/json-editor';
import { useToast } from './ui/use-toast';
import CopyButton from './ui/copy-button';
import axios from 'axios';
import _ from 'lodash';

const TokenGenerator = ({ formMethods, onTokenGenerated }) => {
  const { watch, setValue } = formMethods;
  const [loading, setLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const { addToast } = useToast();
  
  // Watch auth configuration values
  const authEndpoint = watch('auth.jwtAuthEndpoint') || '';
  const authMethod = watch('auth.jwtAuthMethod') || 'POST';
  const authHeaders = watch('auth.jwtAuthHeaders') || [];
  const authBody = watch('auth.jwtAuthBody') || {};
  const tokenPath = watch('auth.jwtTokenPath') || 'access_token';
  
  const generateToken = async () => {
    try {
      setLoading(true);
      setTokenError(null);
      
      // Validate required fields
      if (!authEndpoint) {
        setTokenError('Auth endpoint URL is required');
        addToast('Auth endpoint URL is required', 'error');
        return;
      }
      
      // Create a request to your proxy
      const response = await axios.post('/.netlify/functions/db-courier-proxy', {
        url: authEndpoint,
        method: authMethod,
        headers: authHeaders,
        body: authBody,
        apiIntent: 'generate_auth_token'
      });
      
      // Process the response
      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to generate token');
      }
      
      // Extract the token using the provided path
      let token = response.data;
      try {
        if (tokenPath) {
          token = _.get(response.data, tokenPath);
        }
        
        if (!token) {
          throw new Error(`Could not find token at path: ${tokenPath}`);
        }
        
        // Save the token in the form
        setValue('auth.token', token);
        
        // Save the full response for reference
        setTokenResult({
          token,
          fullResponse: response.data
        });
        
        // Notify success
        addToast('Token generated successfully', 'success');
        
        // Notify parent component
        onTokenGenerated && onTokenGenerated(token);
        
      } catch (err) {
        console.error('Token path error:', err);
        setTokenError(`Failed to extract token using path "${tokenPath}". Please check the path and try again.`);
        setTokenResult({
          token: null,
          fullResponse: response.data
        });
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setTokenError(error.message || 'Failed to generate token');
      addToast(error.message || 'Failed to generate token', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate token header for display and copying
  const tokenHeader = tokenResult?.token ? `Authorization: Bearer ${tokenResult.token}` : '';
  
  return (
    <Card className="mb-6">
      <CardHeader className="relative pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Authentication Token Generator</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Generate an authentication token that will be used for the tracking API in the next step.
          This token will be automatically added as an "Authorization" header.
        </p>
        {!isExpanded && tokenResult?.token && (
          <div className="text-sm text-green-600">Token generated successfully</div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Auth Endpoint URL</label>
              <Input
                placeholder="https://api.example.com/oauth/token"
                value={authEndpoint}
                onChange={(e) => setValue('auth.jwtAuthEndpoint', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HTTP Method</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={authMethod}
                onChange={(e) => setValue('auth.jwtAuthMethod', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Headers</label>
            <KeyValueEditor
              value={authHeaders}
              onChange={(headers) => setValue('auth.jwtAuthHeaders', headers)}
              keyPlaceholder="Content-Type"
              valuePlaceholder="application/json"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Request Body</label>
            <JsonEditor
              value={authBody}
              onChange={(body) => setValue('auth.jwtAuthBody', body)}
              height="120px"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Token Path in Response (e.g., "data.access_token" or "access_token")
            </label>
            <Input
              placeholder="access_token"
              value={tokenPath}
              onChange={(e) => setValue('auth.jwtTokenPath', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify the JSON path to extract the token from the response
            </p>
          </div>
          
          {tokenError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {tokenError}
            </div>
          )}
          
          {tokenResult?.token && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-green-700">Generated Token</label>
                <CopyButton text={tokenResult.token}>Copy Token</CopyButton>
              </div>
              <Textarea
                value={tokenResult.token}
                readOnly
                className="font-mono text-xs"
                rows={2}
              />
              <div className="mt-2 flex justify-between items-center">
                <label className="text-sm font-medium text-green-700">Authorization Header</label>
                <CopyButton text={tokenHeader}>Copy Header</CopyButton>
              </div>
              <Input
                value={tokenHeader}
                readOnly
                className="font-mono text-xs"
              />
            </div>
          )}
          
          <div className="flex justify-end">
            <Button
              onClick={generateToken}
              disabled={loading}
              className={loading ? 'opacity-70' : ''}
            >
              {loading ? 'Generating Token...' : 'Generate Token'}
            </Button>
          </div>
          
          {tokenResult?.fullResponse && (
            <div className="mt-4">
              <details className="bg-gray-50 border border-gray-200 rounded-md">
                <summary className="px-4 py-2 cursor-pointer font-medium text-sm">
                  View Full Response
                </summary>
                <div className="p-4 border-t border-gray-200">
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(tokenResult.fullResponse, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default TokenGenerator; 