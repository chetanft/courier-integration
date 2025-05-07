import React, { useState } from 'react';
import { Button } from './button';
import { ClipboardCopy, Check } from 'lucide-react';

const CopyButton = ({ text, className = '', children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          {children || 'Copy'}
        </>
      )}
    </Button>
  );
};

export default CopyButton; 