/**
 * Unified Color System for Trading Journal Application
 * This provides consistent colors across all components
 */

export const COLORS = {
  // Primary brand colors
  primary: '#3b82f6', // Blue
  primaryHover: '#2563eb',
  primaryLight: '#60a5fa',
  primaryDark: '#1d4ed8',
  
  // State colors
  success: '#10b981', // Green
  successHover: '#059669',
  successLight: '#34d399',
  
  danger: '#ef4444', // Red
  dangerHover: '#dc2626',
  dangerLight: '#f87171',
  
  warning: '#f59e0b', // Amber
  warningHover: '#d97706',
  warningLight: '#fbbf24',
  
  info: '#6366f1', // Indigo
  infoHover: '#4f46e5',
  infoLight: '#818cf8',
  
  // Background colors
  background: {
    page: '#0a0a10', // Very dark background for pages
    dark: '#131825', // Dark background for panels
    medium: '#151823', // Medium background for cards
    light: '#1a1f2c', // Light background for inputs
    lighter: '#252a38', // Lighter background for hover states
  },
  
  // Text colors
  text: {
    primary: '#ffffff', // White for primary text
    secondary: '#9ca3af', // Gray-400 for secondary text
    tertiary: '#6b7280', // Gray-500 for less important text
    disabled: '#4b5563', // Gray-600 for disabled text
  },
  
  // Border colors
  border: {
    primary: '#1c2033', // Primary border color
    light: '#2d3348', // Lighter border for inputs
    focus: '#3b82f6', // Focus border color (matches primary)
  },
  
  // Chart colors
  chart: {
    positive: '#10b981', // Green for profits
    negative: '#ef4444', // Red for losses
    neutral: '#6b7280', // Gray for neutral values
    grid: '#212946', // Grid lines
    long: '#3b82f6', // Blue for long positions
    short: '#ef4444', // Red for short positions
    
    // Gradient opacity settings
    gradientOpacity: {
      low: 0.1,
      medium: 0.5,
      high: 0.8,
    }
  },
  
  // Specific component colors
  tooltip: {
    background: '#1f2937',
    border: '#374151',
  }
};

// Common opacity values
export const OPACITY = {
  hover: 0.8,
  active: 1,
  disabled: 0.5,
  overlay: 0.5,
};

// Common transition settings
export const TRANSITIONS = {
  fast: 'transition-all duration-150',
  medium: 'transition-all duration-300',
  slow: 'transition-all duration-500',
};

// Export the default color system
export default COLORS; 