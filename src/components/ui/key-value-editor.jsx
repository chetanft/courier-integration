import React from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { FormDescription } from './form';

/**
 * A component for editing key-value pairs
 * @param {Object} props
 * @param {Array<{key: string, value: string}>} props.pairs - The key-value pairs
 * @param {Array<{key: string, value: string}>} props.value - Alternative prop name for pairs (for compatibility)
 * @param {Function} props.onChange - Called when pairs change
 * @param {string} props.keyPlaceholder - Placeholder for key input
 * @param {string} props.valuePlaceholder - Placeholder for value input
 * @param {string} props.description - Optional description text
 * @param {Array<string>} props.disabledKeys - Keys that should be disabled from editing
 */
const KeyValueEditor = ({
  pairs = [],
  value,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  description,
  disabledKeys = []
}) => {
  // Handle both 'pairs' and 'value' props for backward compatibility
  const actualPairs = value || pairs || [];
  // Add a new empty pair
  const handleAddPair = () => {
    const newPairs = [...actualPairs, { key: '', value: '' }];
    onChange(newPairs);
  };

  // Remove a pair at the specified index
  const handleRemovePair = (index) => {
    const newPairs = [...actualPairs];
    newPairs.splice(index, 1);
    onChange(newPairs);
  };

  // Update a pair at the specified index
  const handlePairChange = (index, field, value) => {
    const newPairs = [...actualPairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange(newPairs);
  };

  return (
    <div className="space-y-2">
      {actualPairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2 flex-wrap key-value-pair">
          <Input
            placeholder={keyPlaceholder}
            value={pair.key}
            onChange={(e) => handlePairChange(index, 'key', e.target.value)}
            className="flex-1 min-w-[120px] max-w-full"
            disabled={disabledKeys.includes(pair.key)}
          />
          <Input
            placeholder={valuePlaceholder}
            value={pair.value}
            onChange={(e) => handlePairChange(index, 'value', e.target.value)}
            className="flex-1 min-w-[120px] max-w-full truncate"
            title={pair.value} // Show full value on hover
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemovePair(index)}
            disabled={disabledKeys.includes(pair.key)}
            className="flex-shrink-0"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddPair}
        className="mt-2"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Add {actualPairs.length === 0 ? 'a' : 'another'} pair
      </Button>

      {description && (
        <FormDescription>{description}</FormDescription>
      )}
    </div>
  );
};

export { KeyValueEditor };
