import React from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { FormDescription } from './form';

/**
 * A component for editing key-value pairs
 * @param {Object} props
 * @param {Array<{key: string, value: string}>} props.pairs - The key-value pairs
 * @param {Function} props.onChange - Called when pairs change
 * @param {string} props.keyPlaceholder - Placeholder for key input
 * @param {string} props.valuePlaceholder - Placeholder for value input
 * @param {string} props.description - Optional description text
 */
const KeyValueEditor = ({
  pairs = [],
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  description
}) => {
  // Add a new empty pair
  const handleAddPair = () => {
    const newPairs = [...pairs, { key: '', value: '' }];
    onChange(newPairs);
  };

  // Remove a pair at the specified index
  const handleRemovePair = (index) => {
    const newPairs = [...pairs];
    newPairs.splice(index, 1);
    onChange(newPairs);
  };

  // Update a pair at the specified index
  const handlePairChange = (index, field, value) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange(newPairs);
  };

  return (
    <div className="space-y-2">
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder={keyPlaceholder}
            value={pair.key}
            onChange={(e) => handlePairChange(index, 'key', e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder={valuePlaceholder}
            value={pair.value}
            onChange={(e) => handlePairChange(index, 'value', e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemovePair(index)}
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
        Add {pairs.length === 0 ? 'a' : 'another'} pair
      </Button>

      {description && (
        <FormDescription>{description}</FormDescription>
      )}
    </div>
  );
};

export { KeyValueEditor };
