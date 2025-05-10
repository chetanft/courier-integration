/**
 * API Integration Test Component
 * 
 * This component is used to test the centralized API integration system.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MultiStepApiIntegration } from './index';

const ApiIntegrationTest = () => {
  const [result, setResult] = useState(null);
  
  // Sample FT fields for testing
  const ftFields = [
    { key: 'trackingNumber', label: 'Tracking Number' },
    { key: 'status', label: 'Status' },
    { key: 'origin', label: 'Origin' },
    { key: 'destination', label: 'Destination' },
    { key: 'estimatedDelivery', label: 'Estimated Delivery' },
    { key: 'actualDelivery', label: 'Actual Delivery' }
  ];
  
  // Sample steps for testing
  const steps = [
    { 
      id: 'auth', 
      title: 'Authentication Setup', 
      config: { 
        apiIntent: 'generate_auth_token',
        url: 'https://api.example.com/auth',
        method: 'POST',
        body: { username: 'test', password: 'test' }
      } 
    },
    { 
      id: 'tracking', 
      title: 'Tracking API', 
      config: { 
        apiIntent: 'tracking',
        url: 'https://api.example.com/tracking',
        method: 'GET',
        useAuthToken: true
      } 
    },
    {
      id: 'mapping',
      title: 'Field Mapping',
      config: {}
    },
    {
      id: 'generate',
      title: 'Generate JS File',
      config: {}
    }
  ];
  
  // Handle workflow completion
  const handleComplete = (result) => {
    setResult(result);
    console.log('Workflow complete:', result);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Integration Test</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiStepApiIntegration
            steps={steps}
            ftFields={ftFields}
            courierName="Test Courier"
            clientName="Test Client"
            onComplete={handleComplete}
          />
        </CardContent>
      </Card>
      
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-3 rounded-md border overflow-auto max-h-[300px] text-sm font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApiIntegrationTest;
