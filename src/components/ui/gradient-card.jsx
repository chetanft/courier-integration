import React from 'react';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from './card';
import { cn } from '../../lib/utils';

/**
 * A card component with a subtle gradient background
 * 
 * @param {Object} props
 * @param {string} props.gradientFrom - Starting gradient color
 * @param {string} props.gradientTo - Ending gradient color
 * @param {string} props.gradientDirection - Direction of gradient ('to-r', 'to-b', etc.)
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 */
const GradientCard = ({
  gradientFrom = 'from-white',
  gradientTo = 'to-gray-50',
  gradientDirection = 'to-br',
  className,
  children,
  ...props
}) => {
  return (
    <Card 
      className={cn(
        `bg-gradient-${gradientDirection} ${gradientFrom} ${gradientTo}`,
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
};

// Export the GradientCard component along with the original Card subcomponents
export { 
  GradientCard,
  CardContent, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription 
};
