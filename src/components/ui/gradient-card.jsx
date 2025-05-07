import React from 'react';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from './card';
import { cn } from '../../lib/utils';

/**
 * A card component with a soft gradient background
 *
 * @param {Object} props
 * @param {string} props.gradientFrom - Starting gradient color
 * @param {string} props.gradientTo - Ending gradient color
 * @param {string} props.gradientDirection - Direction of gradient ('to-r', 'to-b', etc.)
 * @param {string} props.theme - Predefined theme ('lavender', 'peach', 'cyan', or custom)
 * @param {boolean} props.glassmorphic - Whether to apply glassmorphic effect
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 */
const GradientCard = ({
  gradientFrom,
  gradientTo,
  // eslint-disable-next-line no-unused-vars
  gradientDirection = 'to-br', // Kept for backward compatibility
  theme,
  glassmorphic = true,
  className,
  children,
  ...props
}) => {
  // Define theme-based gradients with direct color values
  const themeGradients = {
    lavender: {
      from: '#f1e2ff',
      to: '#dfd8fd',
      overlay: 'rgba(255,255,255,0.6)'
    },
    peach: {
      from: '#ffe8e8',
      to: '#fff4f4',
      overlay: 'rgba(255,255,255,0.5)'
    },
    cyan: {
      from: '#e6f4ff',
      to: '#d9f2ff',
      overlay: 'rgba(255,255,255,0.6)'
    },
    // Use these for status-based cards
    configured: {
      from: '#e6ffea',
      to: '#d1f7d9',
      overlay: 'rgba(255,255,255,0.6)'
    },
    'in-progress': {
      from: '#e6f4ff',
      to: '#d9f2ff',
      overlay: 'rgba(255,255,255,0.6)'
    },
    'setup-required': {
      from: '#fff2e6',
      to: '#ffe8d1',
      overlay: 'rgba(255,255,255,0.6)'
    },
    pending: {
      from: '#fff8e6',
      to: '#fff4d1',
      overlay: 'rgba(255,255,255,0.6)'
    }
  };

  // Set up default colors
  let fromColor = '#ffffff';
  let toColor = '#f9fafb';
  let overlayColor = 'rgba(255,255,255,0.6)';

  // If a theme is provided, use its gradient values
  if (theme && themeGradients[theme]) {
    fromColor = themeGradients[theme].from;
    toColor = themeGradients[theme].to;
    overlayColor = themeGradients[theme].overlay;
  }
  // If direct gradient colors are provided
  else if (gradientFrom && gradientTo) {
    // Handle both Tailwind class names and direct color values
    fromColor = gradientFrom.startsWith('from-[')
      ? gradientFrom.replace('from-[', '').replace(']', '')
      : gradientFrom.startsWith('from-')
        ? gradientFrom.replace('from-', '')
        : gradientFrom;

    toColor = gradientTo.startsWith('to-[')
      ? gradientTo.replace('to-[', '').replace(']', '')
      : gradientTo.startsWith('to-')
        ? gradientTo.replace('to-', '')
        : gradientTo;
  }

  // Generate a random theme if requested
  if (!theme && !gradientFrom && props.randomTheme) {
    const themes = Object.keys(themeGradients).filter(t =>
      !['configured', 'in-progress', 'setup-required', 'pending'].includes(t)
    );
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    fromColor = themeGradients[randomTheme].from;
    toColor = themeGradients[randomTheme].to;
    overlayColor = themeGradients[randomTheme].overlay;
  }

  // Apply glassmorphic effect if enabled
  const glassmorphicClasses = glassmorphic ?
    'backdrop-blur-sm border border-white/20 shadow-sm' : '';

  // Create a direct style object for the gradient to ensure it's applied correctly
  const gradientStyle = {
    background: `linear-gradient(135deg, ${overlayColor}, rgba(255,255,255,0.2)),
                 linear-gradient(135deg, ${fromColor}, ${toColor})`
  };

  return (
    <Card
      className={cn(
        'rounded-2xl hover:brightness-105 active:scale-[0.98] transition-all duration-200',
        glassmorphicClasses,
        className
      )}
      style={gradientStyle}
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
