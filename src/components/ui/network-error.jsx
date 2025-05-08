import React from 'react';
import { AlertCircle, ExternalLink, RefreshCw, Server, Wifi, WifiOff } from 'lucide-react';
import { Button } from './button';

/**
 * Component to display network errors in a user-friendly way
 */
const NetworkError = ({
  error,
  onRetry,
  showDetails = false,
  className = ''
}) => {
  // Determine the error type and message
  const is502Error = error?.status === 502;
  const isNetworkError = is502Error || error?.isNetworkError;

  // Check for response size too large error
  const isResponseTooLarge = error?.details?.errorType === 'Function.ResponseSizeTooLarge' ||
                            error?.details?.message?.includes('payload size exceeded') ||
                            error?.message?.includes('payload size exceeded');

  // Get error code if available
  const errorCode = error?.code ||
                   (error?.details?.networkDetails?.errorCode) ||
                   (error?.networkDetails?.errorCode) ||
                   (isResponseTooLarge ? 'RESPONSE_TOO_LARGE' : null);

  // Get hostname if available
  const hostname = error?.details?.hostname ||
                  error?.details?.url && new URL(error?.details?.url).hostname ||
                  error?.url && new URL(error?.url).hostname;

  // Determine the icon to show
  const getIcon = () => {
    if (errorCode === 'RESPONSE_TOO_LARGE') return Server;
    if (errorCode === 'ENOTFOUND') return Server;
    if (errorCode === 'ECONNREFUSED') return Server;
    if (errorCode === 'ETIMEDOUT') return RefreshCw;
    if (errorCode === 'ECONNRESET') return RefreshCw;
    if (isNetworkError) return WifiOff;
    return AlertCircle;
  };

  const Icon = getIcon();

  // Determine the title to show
  const getTitle = () => {
    if (isResponseTooLarge) return 'API Response Too Large';
    if (is502Error) return 'Cannot Connect to API Server';
    if (isNetworkError) return 'Network Connection Error';
    return 'API Request Failed';
  };

  // Determine the message to show
  const getMessage = () => {
    // Use the provided message if available and it's not a generic message
    if (error?.message &&
        !error.message.includes('Request failed with status code') &&
        !error.message.includes('Network Error')) {
      return error.message;
    }

    // Otherwise, generate a message based on the error code
    if (errorCode === 'RESPONSE_TOO_LARGE') {
      return `The API response is too large for Netlify Functions to handle (exceeds 6MB limit). You need to filter or paginate the API response.`;
    }
    if (errorCode === 'ENOTFOUND') {
      return `The hostname "${hostname || 'unknown'}" could not be resolved. Please check if the URL is correct.`;
    }
    if (errorCode === 'ECONNREFUSED') {
      return `The connection to "${hostname || 'the server'}" was refused. The server might be down or not accepting connections.`;
    }
    if (errorCode === 'ETIMEDOUT') {
      return `The connection to "${hostname || 'the server'}" timed out. The server might be slow or unreachable.`;
    }
    if (errorCode === 'ECONNRESET') {
      return `The connection to "${hostname || 'the server'}" was reset. The server might have closed the connection unexpectedly.`;
    }
    if (is502Error) {
      return `Cannot connect to the API server. Please check if the server is running and accessible.`;
    }
    if (isNetworkError) {
      return `Network error. Please check your internet connection and try again.`;
    }

    return 'An unknown error occurred while making the API request.';
  };

  // Get suggestions for fixing the error
  const getSuggestions = () => {
    const suggestions = [];

    if (errorCode === 'RESPONSE_TOO_LARGE') {
      suggestions.push('Add filter parameters to your API request to reduce the response size');
      suggestions.push('Use pagination to retrieve data in smaller chunks');
      suggestions.push('Modify the API to return only essential fields');
      suggestions.push('Consider using the API filtering feature in the form below');
    }
    else if (errorCode === 'ENOTFOUND') {
      suggestions.push('Check if the URL is spelled correctly');
      suggestions.push('Verify that the domain exists and is accessible');
    }
    else if (errorCode === 'ECONNREFUSED') {
      suggestions.push('Verify the server is running and accepting connections');
      suggestions.push('Check if a firewall is blocking the connection');
      suggestions.push('Confirm the port number is correct');
    }
    else if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNRESET') {
      suggestions.push('The server might be overloaded or temporarily down');
      suggestions.push('Try again later or contact the API provider');
    }
    else if (isNetworkError) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify the API endpoint is accessible from Netlify');
    }

    // Add any suggestions from the error object
    if (error?.details?.suggestion) {
      suggestions.push(error.details.suggestion);
    }

    return suggestions;
  };

  return (
    <div className={`bg-red-50 p-4 rounded-md border border-red-200 ${className}`}>
      <div className="flex items-start">
        <Icon className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-red-800 font-medium text-base">{getTitle()}</h3>
          <p className="text-red-700 mt-1">{getMessage()}</p>

          {getSuggestions().length > 0 && (
            <div className="mt-3">
              <h4 className="text-red-800 font-medium text-sm">Suggestions:</h4>
              <ul className="mt-1 list-disc pl-5 text-sm text-red-700 space-y-1">
                {getSuggestions().map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="bg-white hover:bg-red-50 text-red-700 border-red-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {showDetails && error?.details && (
            <details className="mt-3">
              <summary className="text-sm text-red-700 cursor-pointer">Technical Details</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkError;
