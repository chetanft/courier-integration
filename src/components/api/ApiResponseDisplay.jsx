/**
 * API Response Display Component
 *
 * This component displays API responses with copy functionality and handles large responses.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

/**
 * Component for displaying API responses with copy functionality
 * @param {Object} props - Component props
 * @param {Object} props.response - The API response to display
 * @param {string} props.title - Title for the response card
 * @param {boolean} props.showCopyButton - Whether to show the copy button
 * @param {boolean} props.expandable - Whether the response is expandable
 * @param {string} props.maxHeight - Maximum height for the response container
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The component
 */
const ApiResponseDisplay = ({
  response,
  title = 'API Response',
  showCopyButton = true,
  expandable = true,
  maxHeight = '400px',
  className = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // If no response, don't render anything
  if (!response) {
    return null;
  }

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  // Determine if the response is an error
  const isError = response && response.error;

  // Determine if the response is truncated
  const isTruncated = response && response._truncated;

  // Format JSON for display
  const formatJson = (json) => {
    try {
      if (typeof json === 'string') {
        return JSON.stringify(JSON.parse(json), null, 2);
      }
      return JSON.stringify(json, null, 2);
    } catch (error) {
      return String(json);
    }
  };

  // Get the display data (handle truncated responses)
  const getDisplayData = () => {
    if (isTruncated && response.data) {
      return response.data;
    }
    return response;
  };

  return (
    <Card className={`mt-4 ${isError ? 'border-red-200' : ''} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className={isError ? 'text-red-600' : ''}>
          {isError ? 'API Error' : title}
        </CardTitle>
        <div className="flex space-x-2">
          {expandable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
          {showCopyButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Truncated Response Warning */}
        {isTruncated && (
          <div className="p-3 mb-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-700">Large Response Detected</p>
              <p className="text-sm text-yellow-600">
                The API response was truncated to fit within size limits.
              </p>
              {response._originalSize && (
                <p className="text-sm text-yellow-600">
                  Original size: {(response._originalSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
              {response._warning && (
                <p className="text-sm font-medium text-yellow-700 mt-1">
                  Warning: {response._warning}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Details */}
        {isError && response.details && (
          <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-md">
            <p className="font-medium text-red-700">Error Details:</p>
            <p className="text-sm text-red-600">{response.message || 'Unknown error'}</p>
            {response.status && (
              <p className="text-sm text-red-600">Status: {response.status}</p>
            )}
          </div>
        )}

        {/* Response Data */}
        <div
          className={`bg-gray-50 p-2 rounded border overflow-auto ${
            !expanded ? `max-h-[${maxHeight}]` : ''
          }`}
        >
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {formatJson(getDisplayData())}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiResponseDisplay;
