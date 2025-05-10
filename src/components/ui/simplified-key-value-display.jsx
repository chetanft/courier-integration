import React from 'react';
import { cn } from '../../lib/utils';

/**
 * A simplified component for displaying key-value pairs without editing capabilities
 * Designed to handle long values without causing horizontal overflow
 *
 * @param {Object} props
 * @param {Array<{key: string, value: string}>} props.pairs - The key-value pairs to display
 * @param {string} props.className - Additional CSS classes
 */
const SimplifiedKeyValueDisplay = ({ pairs = [], className }) => {
  // Log the pairs for debugging
  console.log('SimplifiedKeyValueDisplay pairs:', pairs);

  if (!pairs || pairs.length === 0) {
    return (
      <div className={cn("text-sm text-gray-500 italic", className)}>
        No items to display
      </div>
    );
  }

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <table className="key-value-table">
        <thead>
          <tr>
            <th className="w-1/3">Key</th>
            <th className="w-2/3">Value</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="font-medium">{pair.key}</td>
              <td>
                <div className="max-w-full overflow-hidden text-ellipsis" title={pair.value}>
                  {pair.value}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SimplifiedKeyValueDisplay;
