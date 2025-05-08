import { Loader2 } from 'lucide-react';

const ProgressIndicator = ({ 
  currentStep, 
  totalSteps, 
  stepName, 
  progress = 0, 
  message = '',
  isIndeterminate = false
}) => {
  // Calculate percentage for the progress bar
  const percentage = isIndeterminate ? 100 : Math.min(100, Math.max(0, progress * 100));
  
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
          <span className="font-medium text-sm">
            Step {currentStep} of {totalSteps}: {stepName}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {isIndeterminate ? 'Processing...' : `${Math.round(percentage)}%`}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${isIndeterminate ? 'animate-pulse bg-blue-400' : 'bg-blue-600'}`}
          style={{ 
            width: `${percentage}%`,
            transition: 'width 0.3s ease-in-out'
          }}
        ></div>
      </div>
      
      {message && (
        <p className="text-sm text-gray-600 mt-1">{message}</p>
      )}
    </div>
  );
};

export default ProgressIndicator;
