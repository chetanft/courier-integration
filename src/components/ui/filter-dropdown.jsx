import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '../../lib/utils';

/**
 * A reusable filter dropdown component
 * 
 * @param {Object} props
 * @param {Array<{value: string, label: string}>} props.options - Filter options
 * @param {string|Array<string>} props.value - Currently selected filter value(s)
 * @param {Function} props.onChange - Function called when filter changes
 * @param {string} props.label - Label for the dropdown
 * @param {boolean} props.multiSelect - Whether multiple options can be selected
 * @param {string} props.className - Additional CSS classes
 */
const FilterDropdown = ({
  options,
  value,
  onChange,
  label = 'Filter',
  multiSelect = false,
  className
}) => {
  const handleSelect = (optionValue) => {
    if (multiSelect) {
      // For multi-select, toggle the selected value
      const newValue = Array.isArray(value) ? [...value] : [];
      if (newValue.includes(optionValue)) {
        onChange(newValue.filter(v => v !== optionValue));
      } else {
        onChange([...newValue, optionValue]);
      }
    } else {
      // For single select, just set the value
      onChange(optionValue);
    }
  };

  const isSelected = (optionValue) => {
    if (multiSelect) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("flex items-center gap-1", className)}>
          <Filter className="h-4 w-4" />
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className={cn(
                "cursor-pointer flex items-center justify-between",
                isSelected(option.value) && "bg-accent text-accent-foreground"
              )}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
              {isSelected(option.value) && (
                <span className="h-2 w-2 rounded-full bg-primary"></span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { FilterDropdown };
