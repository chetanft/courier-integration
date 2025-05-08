import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Loader2 } from 'lucide-react';

/**
 * A reusable delete confirmation dialog component that requires typing "delete" to confirm
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onOpenChange - Function called when the open state changes
 * @param {string} props.title - The title of the dialog
 * @param {string} props.entityName - The name of the entity being deleted
 * @param {string} props.entityType - The type of entity being deleted (e.g., "client", "courier")
 * @param {Function} props.onConfirm - Function called when deletion is confirmed
 * @param {boolean} props.isDeleting - Whether deletion is in progress
 */
const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  title = 'Delete Confirmation',
  entityName,
  entityType = 'item',
  onConfirm,
  isDeleting = false
}) => {
  const [confirmText, setConfirmText] = useState('');
  
  const handleOpenChange = (newOpen) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Reset the confirmation text when dialog is closed
      setConfirmText('');
    }
  };
  
  const handleConfirm = () => {
    if (confirmText !== 'delete') return;
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-4">
            This action cannot be undone. This will permanently delete the {entityType}
            <span className="font-semibold"> {entityName} </span>
            and all associated data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            To confirm, type <span className="font-semibold">delete</span> in the field below:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type 'delete' to confirm"
            className="mb-2"
          />
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== 'delete' || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${entityType}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DeleteConfirmationDialog };
