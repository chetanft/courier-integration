import React from 'react';
import { cn } from '../../lib/utils';

/**
 * A horizontal stepper component for multi-step forms
 * 
 * @param {Object} props
 * @param {number} props.currentStep - The current active step (1-based)
 * @param {Array<{label: string, description?: string}>} props.steps - Array of step objects with labels and optional descriptions
 * @param {string} props.className - Additional CSS classes
 */
const Stepper = ({ 
  currentStep, 
  steps, 
  className 
}) => {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          return (
            <React.Fragment key={index}>
              {/* Step circle with number */}
              <div className="flex flex-col items-center">
                <div 
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium border-2",
                    isActive && "border-black bg-black text-white",
                    isCompleted && "border-black bg-black text-white",
                    !isActive && !isCompleted && "border-gray-300 text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className={cn(
                    "text-sm font-medium",
                    isActive && "text-black",
                    isCompleted && "text-black",
                    !isActive && !isCompleted && "text-gray-500"
                  )}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-gray-500 mt-1 max-w-[120px] text-center">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    isCompleted && stepNumber + 1 <= currentStep ? "bg-black" : "bg-gray-300"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { Stepper };
