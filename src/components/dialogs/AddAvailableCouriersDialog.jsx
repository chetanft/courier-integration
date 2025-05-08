import React from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import CourierUploadTabs from '../courier-upload/CourierUploadTabs';

const AddAvailableCouriersDialog = ({
  open,
  onOpenChange,
  client,
  onCouriersAdded
}) => {
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

  const handleError = (error) => {
    toast.error('Failed to add couriers: ' + (error.message || 'Unknown error'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Available Couriers for {client?.name}</DialogTitle>
          <DialogDescription>
            Upload couriers via CSV, JSON, or API integration.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <CourierUploadTabs
            clientId={client?.id}
            clientName={client?.name}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAvailableCouriersDialog;
