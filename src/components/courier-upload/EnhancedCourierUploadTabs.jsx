/**
 * Enhanced Courier Upload Tabs
 * 
 * This component provides an enhanced version of the SimplifiedCourierUploadTabs
 * that uses the centralized API integration system.
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import EnhancedCourierApiIntegrationForm from './EnhancedCourierApiIntegrationForm';
import CourierCsvUploadForm from './CourierCsvUploadForm';
import CourierJsonUploadForm from './CourierJsonUploadForm';

/**
 * Enhanced version of SimplifiedCourierUploadTabs that uses the centralized API integration system
 * @param {Object} props - Component props
 * @param {string} props.clientId - The client ID
 * @param {string} props.clientName - The client name
 * @param {Function} props.onSuccess - Callback for success
 * @param {Function} props.onError - Callback for error
 * @param {string} props.initialTab - The initial active tab
 * @param {Function} props.onParsedData - Callback for parsed data
 * @returns {JSX.Element} The component
 */
const EnhancedCourierUploadTabs = ({
  clientId,
  clientName,
  onSuccess,
  onError,
  initialTab = 'api',
  onParsedData
}) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState(initialTab);

  // Handle parsed data callback
  const handleParsedData = (couriers) => {
    if (onParsedData) {
      onParsedData(couriers);
    }
  };

  // Handle success callback
  const handleSuccess = (couriers) => {
    if (onSuccess) {
      onSuccess(couriers);
    }
  };

  // Handle error callback
  const handleError = (error) => {
    if (onError) {
      onError(error);
    }
  };

  return (
    <Tabs defaultValue={initialTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="csv">CSV Upload</TabsTrigger>
        <TabsTrigger value="json">JSON Upload</TabsTrigger>
        <TabsTrigger value="api">API Integration</TabsTrigger>
      </TabsList>

      <TabsContent value="csv" className="mt-0 w-full">
        <CourierCsvUploadForm
          clientId={clientId}
          onSuccess={handleSuccess}
          onError={handleError}
          onParsedData={handleParsedData}
        />
      </TabsContent>

      <TabsContent value="json" className="mt-0 w-full">
        <CourierJsonUploadForm
          clientId={clientId}
          onSuccess={handleSuccess}
          onError={handleError}
          onParsedData={handleParsedData}
        />
      </TabsContent>

      <TabsContent value="api" className="mt-0 w-full">
        <EnhancedCourierApiIntegrationForm
          clientId={clientId}
          clientName={clientName}
          onSuccess={handleSuccess}
          onError={handleError}
          onParsedData={handleParsedData}
        />
      </TabsContent>
    </Tabs>
  );
};

export default EnhancedCourierUploadTabs;
