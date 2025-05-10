/**
 * Enhanced Authentication Form
 * 
 * This component provides an enhanced interface for configuring API authentication
 * with better guidance and validation.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { AlertCircle, HelpCircle, Key, Lock, User, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { parseCurl } from '../../lib/enhanced-curl-parser';

/**
 * Enhanced Authentication Form component
 * @param {Object} props - Component props
 * @param {Object} props.initialAuth - Initial authentication configuration
 * @param {Function} props.onAuthChange - Callback for authentication changes
 * @param {Function} props.onSubmit - Callback for form submission
 * @param {boolean} props.loading - Loading state
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The component
 */
const EnhancedAuthenticationForm = ({
  initialAuth = { type: 'none' },
  onAuthChange,
  onSubmit,
  loading = false,
  className = ''
}) => {
  const [auth, setAuth] = useState(initialAuth);
  const [activeTab, setActiveTab] = useState('form');
  const [curlCommand, setCurlCommand] = useState('');
  const [curlError, setCurlError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Handle authentication type change
  const handleAuthTypeChange = (type) => {
    // Create a new auth object with the new type
    const newAuth = { type };
    
    // Add default values based on the type
    switch (type) {
      case 'basic':
        newAuth.username = auth.username || '';
        newAuth.password = auth.password || '';
        break;
      case 'bearer':
        newAuth.token = auth.token || '';
        break;
      case 'jwt':
        newAuth.token = auth.token || '';
        break;
      case 'apikey':
        newAuth.apiKey = auth.apiKey || '';
        newAuth.apiKeyName = auth.apiKeyName || 'X-API-Key';
        newAuth.apiKeyLocation = auth.apiKeyLocation || 'header';
        break;
      default:
        break;
    }
    
    setAuth(newAuth);
    
    if (onAuthChange) {
      onAuthChange(newAuth);
    }
  };

  // Handle field change
  const handleFieldChange = (field, value) => {
    const newAuth = { ...auth, [field]: value };
    setAuth(newAuth);
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
    
    if (onAuthChange) {
      onAuthChange(newAuth);
    }
  };

  // Handle cURL command parsing
  const handleParseCurl = () => {
    try {
      if (!curlCommand.trim()) {
        setCurlError('Please enter a cURL command');
        return;
      }
      
      const parsed = parseCurl(curlCommand);
      
      // Extract authentication from the parsed cURL command
      if (parsed.auth && parsed.auth.type !== 'none') {
        setAuth(parsed.auth);
        setCurlError('');
        
        if (onAuthChange) {
          onAuthChange(parsed.auth);
        }
      } else {
        setCurlError('No authentication found in the cURL command');
      }
    } catch (error) {
      console.error('Error parsing cURL command:', error);
      setCurlError(`Error parsing cURL command: ${error.message}`);
    }
  };

  // Validate the authentication configuration
  const validateAuth = () => {
    const errors = {};
    
    switch (auth.type) {
      case 'basic':
        if (!auth.username) {
          errors.username = 'Username is required';
        }
        if (!auth.password) {
          errors.password = 'Password is required';
        }
        break;
      case 'bearer':
      case 'jwt':
        if (!auth.token) {
          errors.token = 'Token is required';
        }
        break;
      case 'apikey':
        if (!auth.apiKey) {
          errors.apiKey = 'API Key is required';
        }
        if (!auth.apiKeyName) {
          errors.apiKeyName = 'API Key Name is required';
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateAuth()) {
      return;
    }
    
    if (onSubmit) {
      onSubmit(auth);
    }
  };

  // Render the component
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>API Authentication</CardTitle>
        <CardDescription>
          Configure authentication for the API
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="form" className="space-y-6">
            {/* Authentication Type */}
            <div className="space-y-2">
              <Label>Authentication Type</Label>
              <RadioGroup
                value={auth.type}
                onValueChange={handleAuthTypeChange}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="auth-none" />
                  <Label htmlFor="auth-none" className="cursor-pointer">No Authentication</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="basic" id="auth-basic" />
                  <Label htmlFor="auth-basic" className="cursor-pointer">Basic Authentication</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Uses username and password for authentication</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bearer" id="auth-bearer" />
                  <Label htmlFor="auth-bearer" className="cursor-pointer">Bearer Token</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Uses a bearer token for authentication</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jwt" id="auth-jwt" />
                  <Label htmlFor="auth-jwt" className="cursor-pointer">JWT Token</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Uses a JWT token for authentication</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="apikey" id="auth-apikey" />
                  <Label htmlFor="auth-apikey" className="cursor-pointer">API Key</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Uses an API key for authentication</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </RadioGroup>
            </div>
            
            {/* Authentication Fields */}
            {auth.type === 'basic' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      placeholder="Enter username"
                      value={auth.username || ''}
                      onChange={(e) => handleFieldChange('username', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {validationErrors.username && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors.username}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={auth.password || ''}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {validationErrors.password && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors.password}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(auth.type === 'bearer' || auth.type === 'jwt') && (
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <div className="relative">
                  <Key className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="token"
                    placeholder="Enter token"
                    value={auth.token || ''}
                    onChange={(e) => handleFieldChange('token', e.target.value)}
                    className="pl-8"
                  />
                </div>
                {validationErrors.token && (
                  <div className="text-xs text-red-500 mt-1">
                    {validationErrors.token}
                  </div>
                )}
              </div>
            )}
            
            {auth.type === 'apikey' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Key className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="apiKey"
                      placeholder="Enter API key"
                      value={auth.apiKey || ''}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {validationErrors.apiKey && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors.apiKey}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKeyName">API Key Name</Label>
                  <Input
                    id="apiKeyName"
                    placeholder="Enter API key name (e.g., X-API-Key)"
                    value={auth.apiKeyName || ''}
                    onChange={(e) => handleFieldChange('apiKeyName', e.target.value)}
                  />
                  {validationErrors.apiKeyName && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors.apiKeyName}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>API Key Location</Label>
                  <RadioGroup
                    value={auth.apiKeyLocation || 'header'}
                    onValueChange={(value) => handleFieldChange('apiKeyLocation', value)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="header" id="location-header" />
                      <Label htmlFor="location-header" className="cursor-pointer">Header</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="query" id="location-query" />
                      <Label htmlFor="location-query" className="cursor-pointer">Query Parameter</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="curl" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="curlCommand">cURL Command</Label>
              <Textarea
                id="curlCommand"
                placeholder="Paste a cURL command with authentication"
                value={curlCommand}
                onChange={(e) => setCurlCommand(e.target.value)}
                rows={5}
                className="font-mono"
              />
              {curlError && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {curlError}
                </div>
              )}
            </div>
            
            <Button
              type="button"
              onClick={handleParseCurl}
              variant="outline"
            >
              Parse cURL Command
            </Button>
            
            {auth.type !== 'none' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center text-green-700 font-medium mb-1">
                  <Check className="h-4 w-4 mr-1" />
                  Authentication Detected
                </div>
                <div className="text-sm text-green-600">
                  {auth.type === 'basic' && 'Basic Authentication'}
                  {auth.type === 'bearer' && 'Bearer Token'}
                  {auth.type === 'jwt' && 'JWT Token'}
                  {auth.type === 'apikey' && 'API Key'}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div>
          {Object.keys(validationErrors).length > 0 && (
            <div className="flex items-center text-red-500 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              Please fix the validation errors
            </div>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Save Authentication'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EnhancedAuthenticationForm;
