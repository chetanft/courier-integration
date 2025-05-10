/**
 * Multi-Step API Integration Component
 *
 * This component provides a UI for multi-step API workflows, such as authentication
 * followed by API calls, with field mapping and JS file generation.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import AuthenticationForm from './AuthenticationForm';
import ApiResponseDisplay from './ApiResponseDisplay';
import FieldMappingComponent from './FieldMappingComponent';
import JsFileGenerator from './JsFileGenerator';
import { useMultiStepApiIntegration } from '../../hooks/useMultiStepApiIntegration';
import { parseCurl } from '../../lib/enhanced-curl-parser';

/**
 * Component for multi-step API integration
 * @param {Object} props - Component props
 * @param {Array} props.steps - Array of step configurations
 * @param {Array} props.ftFields - Array of FT fields for mapping
 * @param {string} props.courierName - The courier name
 * @param {string} props.clientName - The client name
 * @param {Function} props.onComplete - Callback for when the workflow is complete
 * @returns {JSX.Element} The component
 */
const MultiStepApiIntegration = ({
  steps = [
    { id: 'auth', title: 'Authentication Setup', config: { apiIntent: 'generate_auth_token' } },
    { id: 'api', title: 'API Configuration', config: { apiIntent: 'api_request' } }
  ],
  ftFields = [],
  courierName = '',
  clientName = '',
  onComplete
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('request');

  // Initialize multi-step API integration
  const {
    stepConfigs,
    stepResponses,
    loading,
    errors,
    fieldMappings,
    updateStepConfig,
    executeStep,
    updateFieldMappings,
    getAllResponses
  } = useMultiStepApiIntegration(steps.map(step => step.config));

  // Handle step navigation
  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setActiveTab('request');
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setActiveTab('request');
    }
  };

  // Handle authentication form submission
  const handleAuthSubmit = async (authType, authConfig) => {
    // Update the step configuration
    updateStepConfig(currentStepIndex, {
      auth: {
        type: authType,
        ...authConfig
      }
    });

    // Execute the step
    try {
      await executeStep(currentStepIndex);
      setActiveTab('response');
    } catch (error) {
      console.error('Error executing authentication step:', error);
    }
  };

  // Handle API form submission
  // This function is used when the user submits the API form
  const _handleApiSubmit = async (url, method, headers, body) => {
    // Update the step configuration
    updateStepConfig(currentStepIndex, {
      url,
      method,
      headers,
      body,
      useAuthToken: true // Use the token from the auth step
    });

    // Execute the step
    try {
      await executeStep(currentStepIndex);
      setActiveTab('response');
    } catch (error) {
      console.error('Error executing API step:', error);
    }
  };

  // Handle cURL parsing
  const handleCurlParse = (curlCommand) => {
    try {
      const parsed = parseCurl(curlCommand);

      // Update the step configuration
      updateStepConfig(currentStepIndex, {
        url: parsed.url,
        method: parsed.method,
        headers: parsed.headers,
        body: parsed.body,
        auth: parsed.auth
      });

      return parsed;
    } catch (error) {
      console.error('Error parsing cURL command:', error);
      return null;
    }
  };

  // Handle field mapping
  const handleFieldMappingChange = (mappings) => {
    // Get the API type from the current step
    const apiType = steps[currentStepIndex].id;

    // Update the field mappings
    updateFieldMappings(apiType, mappings);
  };

  // Handle JS file generation
  const handleJsGeneration = (jsFile) => {
    if (onComplete) {
      onComplete({
        jsFile,
        fieldMappings,
        responses: getAllResponses()
      });
    }
  };

  // Render the current step
  const renderStep = () => {
    const currentStep = steps[currentStepIndex];

    switch (currentStep.id) {
      case 'auth':
        return (
          <AuthenticationForm
            authType={stepConfigs[currentStepIndex]?.auth?.type || 'none'}
            authConfig={stepConfigs[currentStepIndex]?.auth || {}}
            onAuthTypeChange={(type) => handleAuthSubmit(type, stepConfigs[currentStepIndex]?.auth || {})}
            onAuthConfigChange={(config) => handleAuthSubmit(stepConfigs[currentStepIndex]?.auth?.type || 'none', config)}
          />
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">cURL Command</label>
              <textarea
                className="w-full p-2 border rounded-md font-mono text-sm"
                rows={5}
                placeholder="curl -X GET 'https://api.example.com/endpoint' -H 'Authorization: Bearer token'"
                onChange={(e) => handleCurlParse(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">API URL</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  value={stepConfigs[currentStepIndex]?.url || ''}
                  onChange={(e) => updateStepConfig(currentStepIndex, { url: e.target.value })}
                  placeholder="https://api.example.com/endpoint"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={stepConfigs[currentStepIndex]?.method || 'GET'}
                  onChange={(e) => updateStepConfig(currentStepIndex, { method: e.target.value })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>

            <Button
              onClick={() => executeStep(currentStepIndex)}
              disabled={loading || !stepConfigs[currentStepIndex]?.url}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </div>
        );

      case 'mapping':
        return (
          <FieldMappingComponent
            apiResponse={stepResponses[currentStepIndex - 1]} // Use the response from the previous step
            ftFields={ftFields}
            initialMappings={fieldMappings[steps[currentStepIndex - 1].id] || {}}
            onMappingChange={handleFieldMappingChange}
            onSaveMappings={() => goToNextStep()}
          />
        );

      case 'generate':
        return (
          <JsFileGenerator
            responses={getAllResponses()}
            courierName={courierName}
            clientName={clientName}
            fieldMappings={fieldMappings}
            onGenerate={handleJsGeneration}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-sm font-medium">Step {currentStepIndex + 1} of {steps.length}:</span>
          <span className="ml-2 text-sm">{steps[currentStepIndex].title}</span>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextStep}
            disabled={currentStepIndex === steps.length - 1 || loading || !stepResponses[currentStepIndex]}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="request">Request</TabsTrigger>
          <TabsTrigger value="response" disabled={!stepResponses[currentStepIndex] && !errors[currentStepIndex]}>
            Response
          </TabsTrigger>
        </TabsList>

        <TabsContent value="request">
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStepIndex].title}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderStep()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response">
          <ApiResponseDisplay
            response={stepResponses[currentStepIndex] || errors[currentStepIndex]}
            title={errors[currentStepIndex] ? 'API Error' : 'API Response'}
          />

          <div className="flex justify-end mt-4">
            <Button onClick={goToNextStep} disabled={currentStepIndex === steps.length - 1}>
              Next Step
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MultiStepApiIntegration;
