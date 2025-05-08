import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import CourierCsvUploadForm from './CourierCsvUploadForm';
import CourierJsonUploadForm from './CourierJsonUploadForm';
import CourierApiIntegrationForm from './CourierApiIntegrationForm';

const CourierUploadTabs = ({
  clientId,
  clientName,
  onSuccess,
  onError,
  initialTab = 'api',
  onParsedData
}) => {
  // eslint-disable-next-line no-unused-vars
  const [_, setActiveTab] = useState(initialTab);
  // eslint-disable-next-line no-unused-vars
  const [__, setParsedCouriers] = useState(null);

  const handleParsedData = (couriers) => {
    setParsedCouriers(couriers);

    if (onParsedData) {
      onParsedData(couriers);
    }
  };

  const handleSuccess = (couriers) => {
    if (onSuccess) {
      onSuccess(couriers);
    }
  };

  const handleError = (error) => {
    if (onError) {
      onError(error);
    }
  };

  return (
    <Tabs defaultValue={initialTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="csv">CSV Upload</TabsTrigger>
        <TabsTrigger value="json">JSON Upload</TabsTrigger>
        <TabsTrigger value="api">API Integration</TabsTrigger>
      </TabsList>

      <TabsContent value="csv">
        <div className="p-1">
          <CourierCsvUploadForm
            clientId={clientId}
            onSuccess={handleSuccess}
            onError={handleError}
            onParsedData={handleParsedData}
          />
        </div>
      </TabsContent>

      <TabsContent value="json">
        <div className="p-1">
          <CourierJsonUploadForm
            clientId={clientId}
            onSuccess={handleSuccess}
            onError={handleError}
            onParsedData={handleParsedData}
          />
        </div>
      </TabsContent>

      <TabsContent value="api">
        <div className="p-1">
          <CourierApiIntegrationForm
            clientId={clientId}
            clientName={clientName}
            onSuccess={handleSuccess}
            onError={handleError}
            onParsedData={handleParsedData}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default CourierUploadTabs;
