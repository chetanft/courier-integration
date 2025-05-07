import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from 'lucide-react';

export const Toast = ({ message, type = 'default', duration = 3000, onClose }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => {
        onClose && onClose();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-100 border-amber-200 text-amber-800';
      case 'info':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const baseStyles = 'fixed top-4 right-4 p-4 rounded-md border shadow-md transition-all duration-300 z-50 max-w-md';
  const animationStyles = show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-20px]';

  return createPortal(
    <div className={`${baseStyles} ${getTypeStyles()} ${animationStyles}`}>
      <div className="flex items-center justify-between">
        <div className="mr-4">{message}</div>
        <button
          onClick={() => {
            setShow(false);
            setTimeout(() => onClose && onClose(), 300);
          }}
          className="p-1 rounded-full hover:bg-black/10"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
};

export const ToastContainer = ({ toasts, removeToast }) => {
  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
}; 