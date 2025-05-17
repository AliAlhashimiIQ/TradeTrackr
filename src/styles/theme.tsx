/**
 * Modern color theme for the trading application
 * This theme uses a sophisticated slate color palette with indigo accents
 */

export const theme = {
  colors: {
    // Base colors
    background: {
      primary: '#0f172a', // Main background
      secondary: '#1e293b', // Card backgrounds
      tertiary: '#334155', // Darker elements
    },
    text: {
      primary: '#f1f5f9', // Main text
      secondary: '#94a3b8', // Secondary text
      muted: '#64748b', // Muted text 
    },
    border: {
      primary: '#334155',
      secondary: '#1e293b', 
      light: 'rgba(148, 163, 184, 0.1)', // Subtle borders
    },
    
    // Primary brand colors
    brand: {
      primary: '#6366f1', // Indigo
      secondary: '#0ea5e9', // Light blue
      accent: '#8b5cf6', // Purple
    },
    
    // Status colors
    status: {
      success: '#10b981', // Green
      warning: '#f59e0b', // Amber
      danger: '#ef4444', // Red
      info: '#0ea5e9', // Blue
    },
    
    // Trading specific colors
    trading: {
      profit: '#10b981', // Green
      loss: '#ef4444', // Red
      long: '#818cf8', // Light indigo
      short: '#fb7185', // Pink
    },
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(to right, #6366f1, #0ea5e9)',
      card: 'linear-gradient(to bottom, #1e293b, #0f172a)',
      button: 'linear-gradient(to right, #4f46e5, #3b82f6)',
      profit: 'linear-gradient(to right, #059669, #10b981)',
      loss: 'linear-gradient(to right, #dc2626, #ef4444)',
    }
  },
  
  // Border radius values
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  
  // Shadow styles
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },
  
  // Transition speeds
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  }
} 