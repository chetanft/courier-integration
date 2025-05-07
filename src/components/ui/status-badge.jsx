import React from 'react';
import { cn } from '../../lib/utils';

/**
 * A component for displaying status milestones
 *
 * @param {Object} props
 * @param {string} props.status - The status to display
 * @param {string} props.className - Additional CSS classes
 */
const StatusBadge = ({
  status,
  className
}) => {
  // Define status types and their styles
  const statusStyles = {
    'configured': 'bg-green-100 text-green-800 border-green-200',
    'setup-required': 'bg-amber-100 text-amber-800 border-amber-200',
    'error': 'bg-red-100 text-red-800 border-red-200',
    'pending': 'bg-blue-100 text-blue-800 border-blue-200',
    'complete': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'in-progress': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'client': 'bg-blue-100 text-blue-800 border-blue-200',
    'courier': 'bg-amber-100 text-amber-800 border-amber-200',
    'default': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  // Map status to display text
  const statusText = {
    'configured': 'Configured',
    'setup-required': 'Setup Required',
    'error': 'Error',
    'pending': 'Pending',
    'complete': 'Complete',
    'in-progress': 'In Progress',
    'client': 'Client',
    'courier': 'Courier',
    'default': status
  };

  const style = statusStyles[status] || statusStyles.default;
  const text = statusText[status] || statusText.default;

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      style,
      className
    )}>
      {text}
    </span>
  );
};

export { StatusBadge };
