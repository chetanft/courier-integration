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
  const [curlDetected, setCurlDetected] = useState(false);
  const { addToast } = useToast();
  
  // Watch auth configuration values
  const authEndpoint = watch('auth.jwtAuthEndpoint') || '';
  const authMethod = watch('auth.jwtAuthMethod') || 'POST';
  const authHeaders = watch('auth.jwtAuthHeaders') || [];
  const authBody = watch('auth.jwtAuthBody') || {};
  const tokenPath = watch('auth.jwtTokenPath') || 'access_token';
  
  // Parse curl command if provided
  const parseCurl = (curlCommand) => {
    try {
      // Normalize input for better parsing
      const normalizedCurl = curlCommand.replace(/\s+/g, ' ').trim();
      console.log('Normalized curl:', normalizedCurl);
      
      // Extract the URL using a more robust pattern
      // This pattern tries to match the full URL including query parameters
      let urlMatch = normalizedCurl.match(/curl\s+(['"])(https?:\/\/[^'"]+)\1/i);
      
      // Fallback to unquoted URL pattern if the quoted pattern doesn't match
      if (!urlMatch) {
        // This gets everything after curl and before the first flag/option
        urlMatch = normalizedCurl.match(/curl\s+(https?:\/\/[^\s"'-]+[\w/])/i);
      }
      
      // Final fallback - try to extract any URL
      if (!urlMatch) {
        const anyUrlMatch = normalizedCurl.match(/(https?:\/\/[^\s"']+)/i);
        if (anyUrlMatch) {
          urlMatch = anyUrlMatch;
        }
      }
      
      // Extract method
      const methodMatch = normalizedCurl.match(/-X\s+([A-Z]+)/i);
      
      // Extract URL
      const url = urlMatch ? urlMatch[1] || urlMatch[2] : '';
      
      // Log the extracted URL for debugging
      console.log('Extracted URL:', url);
      
      // Extract method
      const method = methodMatch ? methodMatch[1] : 'POST';
      
      // Extract headers
      // Normalize whitespace and line breaks for better regex matching
      const headerMatches = Array.from(normalizedCurl.matchAll(/-H\s+(['"])(.*?)\1/gi));
      const headers = [];
      
      for (const match of headerMatches) {
        const headerStr = match[2];
        const colonIndex = headerStr.indexOf(':');
        if (colonIndex > -1) {
          const key = headerStr.slice(0, colonIndex).trim();
          const value = headerStr.slice(colonIndex + 1).trim();
          headers.push({ key, value });
        }
      }
      
      // Extract body if present
      let body = {};
      // Handle both single and double quotes, as well as the --data flag variation
      const dataMatch = normalizedCurl.match(/(?:-d|--data)\s+(['"])(.*?)\1/i);
      if (dataMatch) {
        const dataContent = dataMatch[2];
        try {
          body = JSON.parse(dataContent);
        } catch (error) {
          console.log('Failed to parse JSON body, trying form data format:', error.message);
          // If not valid JSON, try to parse as form data
          const formData = dataContent.split('&').reduce((acc, pair) => {
            const [key, value] = pair.split('=');
            if (key && value) {
              acc[decodeURIComponent(key)] = decodeURIComponent(value);
            }
            return acc;
          }, {});
          body = formData;
        }
      }
      
      return { url, method, headers, body };
    } catch (error) {
      console.error('Error parsing curl command:', error);
      return null;
    }
  };
  
  // Handle auth endpoint input change - detect and parse curl commands
  const handleAuthEndpointChange = (value) => {
    setValue('auth.jwtAuthEndpoint', value);
    
    // Check if this looks like a curl command
    if (value.trim().toLowerCase().startsWith('curl ')) {
      setCurlDetected(true);
      console.log('Detected curl command, parsing...');
      const parsedCurl = parseCurl(value);
      
      if (parsedCurl && parsedCurl.url) {
        console.log('Parsed curl results:', parsedCurl);
        
        // Auto-fill the form with the parsed curl data
        setValue('auth.jwtAuthEndpoint', parsedCurl.url);
        setValue('auth.jwtAuthMethod', parsedCurl.method);
        
        if (parsedCurl.headers.length > 0) {
          setValue('auth.jwtAuthHeaders', parsedCurl.headers);
          console.log('Set headers:', parsedCurl.headers);
        }
        
        if (Object.keys(parsedCurl.body).length > 0) {
          setValue('auth.jwtAuthBody', parsedCurl.body);
          console.log('Set body:', parsedCurl.body);
        }
        
        addToast('Curl command parsed successfully', 'success');
      } else {
        console.error('Failed to parse curl command or extract URL');
        addToast('Could not parse curl command correctly', 'error');
      }
    } else {
      setCurlDetected(false);
    }
  };
  
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
          Use this tool to generate an authentication token from courier API authentication endpoints.
          This token will be automatically carried forward to the next step for your tracking API request.
        </p>
        {!isExpanded && tokenResult?.token && (
          <div className="text-sm text-green-600">Token generated successfully</div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Auth Endpoint URL or Curl Command</label>
              <div className="relative">
                <Input
                  placeholder="https://api.example.com/oauth/token or curl command"
                  value={authEndpoint}
                  onChange={(e) => handleAuthEndpointChange(e.target.value)}
                  className={curlDetected ? "pr-20 border-blue-300" : ""}
                />
                {curlDetected && (
                  <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded h-full flex items-center">
                    curl detected
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the authentication endpoint URL or paste a curl command to auto-fill all fields
              </p>
              <details className="text-xs text-gray-500 mt-1">
                <summary className="cursor-pointer font-medium">Example curl command</summary>
                <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto text-xs">
                  curl https://api.example.com/oauth/token -X POST -H "Content-Type: application/json" -d {"{\"grant_type\":\"client_credentials\",\"client_id\":\"your_client_id\",\"client_secret\":\"your_client_secret\"}"}
                </pre>
              </details>
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
            <p className="text-xs text-gray-500 mt-1">
              Common examples: {"{ \"grant_type\": \"client_credentials\", \"client_id\": \"YOUR_CLIENT_ID\", \"client_secret\": \"YOUR_CLIENT_SECRET\" }"} 
              or {"{ \"username\": \"YOUR_USERNAME\", \"password\": \"YOUR_PASSWORD\" }"}
            </p>
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