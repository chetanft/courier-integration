import React from 'react';
import { Input } from './input';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * A reusable search bar component
 * 
 * @param {Object} props
 * @param {string} props.value - The current search value
 * @param {Function} props.onChange - Function called when search value changes
 * @param {string} props.placeholder - Placeholder text for the search input
 * @param {string} props.className - Additional CSS classes
 */
const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  className 
}) => {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 w-full"
      />
    </div>
  );
};

export { SearchBar };
