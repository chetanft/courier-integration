import React, { useState, useEffect } from 'react';
import { Textarea } from './textarea';
import { FormDescription, FormMessage } from './form';

/**
 * A component for editing JSON
 * @param {Object} props
 * @param {string} props.value - The JSON string
 * @param {Function} props.onChange - Called when JSON changes
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.description - Optional description text
 * @param {boolean} props.isValid - Whether the JSON is valid
 * @param {string} props.errorMessage - Error message to display when JSON is invalid
 */
const JsonEditor = ({
  value = '',
  onChange,
  placeholder = 'Enter JSON...',
  description,
  isValid = true,
  errorMessage = 'Invalid JSON format'
}) => {
  const [internalValue, setInternalValue] = useState(value);

  // Format the JSON when the component mounts
  useEffect(() => {
    if (value && typeof value === 'string') {
      try {
        // Try to parse and format the JSON
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);
        setInternalValue(formatted);
      } catch (error) {
        // If it's not valid JSON, just use the raw value
        console.error('Error parsing JSON:', error);
        setInternalValue(value);
      }
    } else if (typeof value === 'object') {
      // If it's already an object, stringify it
      try {
        const formatted = JSON.stringify(value, null, 2);
        setInternalValue(formatted);
      } catch (error) {
        console.error('Error stringifying object:', error);
        setInternalValue('');
      }
    }
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Try to parse the JSON to validate it
    try {
      if (newValue.trim()) {
        const parsed = JSON.parse(newValue);
        onChange(parsed);
      } else {
        onChange({});
      }
    } catch (error) {
      // If it's not valid JSON, still update the internal value
      // but let the parent know it's invalid through the isValid prop
      console.error('Invalid JSON input:', error);
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="font-mono min-h-[150px]"
      />

      {!isValid && (
        <FormMessage>{errorMessage}</FormMessage>
      )}

      {description && (
        <FormDescription>{description}</FormDescription>
      )}
    </div>
  );
};

export { JsonEditor };
