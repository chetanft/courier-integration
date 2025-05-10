/**
 * Authentication Form Component
 *
 * This component provides a UI for configuring different authentication methods.
 */

import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Info } from 'lucide-react';

/**
 * Component for handling different authentication methods
 * @param {Object} props - Component props
 * @param {string} props.authType - The current authentication type
 * @param {Function} props.onAuthTypeChange - Callback for auth type changes
 * @param {Object} props.authConfig - The current authentication configuration
 * @param {Function} props.onAuthConfigChange - Callback for auth config changes
 * @param {boolean} props.showAllOptions - Whether to show all auth options
 * @returns {JSX.Element} The component
 */
const AuthenticationForm = ({
  authType = 'none',
  onAuthTypeChange,
  authConfig = {},
  onAuthConfigChange,
  showAllOptions = true
}) => {
  // Handle auth type change
  const handleAuthTypeChange = (e) => {
    const newType = e.target.value;

    if (onAuthTypeChange) {
      onAuthTypeChange(newType);
    }
  };

  // Handle auth config change
  const handleAuthConfigChange = (field, value) => {
    if (onAuthConfigChange) {
      onAuthConfigChange({
        ...authConfig,
        [field]: value
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Authentication Type Selector */}
          <div>
            <Label htmlFor="auth-type">Authentication Type</Label>
            <select
              id="auth-type"
              value={authType}
              onChange={handleAuthTypeChange}
              className="w-full p-2 border rounded-md mt-1"
            >
              <option value="none">No Authentication</option>
              <option value="basic">Basic Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="jwt">JWT Bearer</option>
              {showAllOptions && (
                <>
                  <option value="apikey">API Key</option>
                  <option value="oauth">OAuth 2.0</option>
                </>
              )}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Select the authentication method required by the API
            </p>
          </div>

          {/* No Auth - Nothing needed */}
          {authType === 'none' && (
            <div className="p-4 border rounded-md bg-gray-50">
              <p className="text-sm text-gray-500">No authentication required. Just provide the API URL.</p>
            </div>
          )}

          {/* Basic Auth */}
          {authType === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="auth-username">Username</Label>
                <Input
                  id="auth-username"
                  placeholder="Username"
                  value={authConfig.username || ''}
                  onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Password"
                  value={authConfig.password || ''}
                  onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Bearer Token */}
          {authType === 'bearer' && (
            <div>
              <Label htmlFor="auth-token">Bearer Token</Label>
              <Input
                id="auth-token"
                placeholder="Enter token"
                value={authConfig.token || ''}
                onChange={(e) => handleAuthConfigChange('token', e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                The token will be sent in the Authorization header as "Bearer [token]"
              </p>
            </div>
          )}

          {/* JWT Bearer */}
          {authType === 'jwt' && (
            <div>
              <Label htmlFor="auth-jwt">JWT Token</Label>
              <Textarea
                id="auth-jwt"
                placeholder="Enter JWT token"
                value={authConfig.token || ''}
                onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                className="font-mono text-xs"
                rows={5}
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the full JWT token (including header, payload, and signature)
              </p>
            </div>
          )}

          {/* API Key */}
          {authType === 'apikey' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="auth-apikey">API Key</Label>
                <Input
                  id="auth-apikey"
                  placeholder="Enter API key"
                  value={authConfig.apiKey || ''}
                  onChange={(e) => handleAuthConfigChange('apiKey', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="auth-apikey-name">Header Name</Label>
                <Input
                  id="auth-apikey-name"
                  placeholder="X-API-Key"
                  value={authConfig.apiKeyName || 'X-API-Key'}
                  onChange={(e) => handleAuthConfigChange('apiKeyName', e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  The name of the header to send the API key in
                </p>
              </div>
            </div>
          )}

          {/* OAuth 2.0 */}
          {authType === 'oauth' && (
            <div className="space-y-4">
              <div className="p-4 border rounded-md bg-yellow-50">
                <p className="text-sm text-yellow-700">
                  OAuth 2.0 authentication requires additional configuration. Please use the cURL command option for OAuth authentication.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthenticationForm;
