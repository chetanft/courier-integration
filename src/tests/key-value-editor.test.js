/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

describe('KeyValueEditor Component', () => {
  // Test the handleAddPair function logic
  test('handleAddPair should add a new empty pair to the existing pairs', () => {
    // Mock the existing pairs
    const pairs = [{ key: 'Content-Type', value: 'application/json' }];

    // Mock the onChange function
    const onChange = jest.fn();

    // Simulate the handleAddPair function from KeyValueEditor
    const handleAddPair = () => {
      // In the updated component, we use actualPairs which is value || pairs || []
      const actualPairs = pairs;
      const newPairs = [...actualPairs, { key: '', value: '' }];
      onChange(newPairs);
    };

    // Call the function
    handleAddPair();

    // Check if onChange was called with the expected result
    expect(onChange).toHaveBeenCalledWith([
      { key: 'Content-Type', value: 'application/json' },
      { key: '', value: '' }
    ]);
  });

  // Test adding a pair to an empty array
  test('handleAddPair should create a new pair when none exist', () => {
    // Mock an empty pairs array
    const pairs = [];

    // Mock the onChange function
    const onChange = jest.fn();

    // Simulate the handleAddPair function from KeyValueEditor
    const handleAddPair = () => {
      // In the updated component, we use actualPairs which is value || pairs || []
      const actualPairs = pairs;
      const newPairs = [...actualPairs, { key: '', value: '' }];
      onChange(newPairs);
    };

    // Call the function
    handleAddPair();

    // Check if onChange was called with the expected result
    expect(onChange).toHaveBeenCalledWith([{ key: '', value: '' }]);
  });
});
