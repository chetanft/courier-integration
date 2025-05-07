import React from 'react';
import { ArrowDownAZ, ArrowUpAZ, ArrowDownUp } from 'lucide-react';
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
 * A reusable sort dropdown component
 * 
 * @param {Object} props
 * @param {Array<{value: string, label: string}>} props.options - Sort options
 * @param {Object} props.value - Currently selected sort {field, direction}
 * @param {Function} props.onChange - Function called when sort changes
 * @param {string} props.className - Additional CSS classes
 */
const SortDropdown = ({
  options,
  value = { field: null, direction: 'asc' },
  onChange,
  className
}) => {
  const handleSelect = (field) => {
    // If selecting the same field, toggle direction
    if (field === value.field) {
      onChange({
        field,
        direction: value.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // If selecting a new field, use ascending direction
      onChange({
        field,
        direction: 'asc'
      });
    }
  };

  const getSortIcon = (field) => {
    if (field !== value.field) {
      return <ArrowDownUp className="h-4 w-4 text-gray-400" />;
    }
    
    return value.direction === 'asc' 
      ? <ArrowUpAZ className="h-4 w-4 text-primary" />
      : <ArrowDownAZ className="h-4 w-4 text-primary" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("flex items-center gap-1", className)}>
          <ArrowDownUp className="h-4 w-4" />
          <span>Sort</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className={cn(
                "cursor-pointer flex items-center justify-between",
                option.value === value.field && "text-primary"
              )}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
              {getSortIcon(option.value)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { SortDropdown };
