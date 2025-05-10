import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import CourierCsvUploadForm from '../courier-upload/CourierCsvUploadForm';
import CourierJsonUploadForm from '../courier-upload/CourierJsonUploadForm';
import EnhancedCourierApiIntegrationForm from '../courier-upload/EnhancedCourierApiIntegrationForm';

/**
 * A redesigned dialog for adding available couriers with improved layout and overflow handling
 */
const RedesignedAvailableCouriersDialog = ({
  open,
  onOpenChange,
  client,
  onCouriersAdded
}) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState('api');

  // Handle success callback
  const handleSuccess = (couriers) => {
    toast.success(`Added ${couriers.length} couriers successfully`);

    // Notify parent component that couriers were added
    if (onCouriersAdded) {
      onCouriersAdded();
    }

    // Close the dialog after a short delay
    setTimeout(() => {
      onOpenChange(false);
    }, 1500);
  };

  // Handle error callback
  const handleError = (error) => {
    toast.error('Failed to add couriers: ' + (error.message || 'Unknown error'));
  };

  // Handle parsed data callback
  const handleParsedData = (couriers) => {
    console.log('Parsed couriers:', couriers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden dialog-content">
        <DialogHeader>
          <DialogTitle>Add Available Couriers for {client?.company_name || client?.name}</DialogTitle>
          <DialogDescription>
            Upload couriers via CSV, JSON, or API integration.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            <TabsTrigger value="json">JSON Upload</TabsTrigger>
            <TabsTrigger value="api">API Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-0 w-full">
            <CourierCsvUploadForm
              clientId={client?.id}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </TabsContent>

          <TabsContent value="json" className="mt-0 w-full">
            <CourierJsonUploadForm
              clientId={client?.id}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </TabsContent>

          <TabsContent value="api" className="mt-0 w-full">
            <EnhancedCourierApiIntegrationForm
              clientId={client?.id}
              clientName={client?.name}
              onSuccess={handleSuccess}
              onError={handleError}
              onParsedData={handleParsedData}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RedesignedAvailableCouriersDialog;
