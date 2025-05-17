/**
 * Design System for Trading Journal Application
 * Contains standardized UI component styles
 */

import COLORS, { TRANSITIONS } from './colorSystem';

// Card styling
export const CARDS = {
  // Base card styling
  base: `bg-[${COLORS.background.dark}] rounded-lg p-4 border border-[${COLORS.border.primary}]`,
  
  // Content panel/section styling
  panel: `bg-[${COLORS.background.medium}] rounded-xl border border-[${COLORS.border.primary}] p-6 shadow-md`,
  
  // Small cards for stat display
  stat: `bg-[${COLORS.background.light}] p-2 rounded-md`,
  
  // Card with lighter background
  secondary: `bg-[${COLORS.background.light}] rounded-lg p-3`,
  
  // Card with gradient
  gradient: `bg-gradient-to-br from-[${COLORS.background.medium}] to-[${COLORS.background.dark}] rounded-2xl shadow-md border border-[${COLORS.border.primary}] overflow-hidden`,
  
  // Card with hover effect
  interactive: `bg-[${COLORS.background.light}] rounded-lg p-4 hover:bg-[${COLORS.background.lighter}] ${TRANSITIONS.fast} cursor-pointer`,
};

// Button styling
export const BUTTONS = {
  // Primary button
  primary: `px-4 py-2 bg-[${COLORS.primary}] hover:bg-[${COLORS.primaryHover}] text-white rounded-lg text-sm ${TRANSITIONS.fast}`,
  
  // Secondary button
  secondary: `px-4 py-2 bg-[${COLORS.background.light}] hover:bg-[${COLORS.background.lighter}] text-[${COLORS.text.secondary}] hover:text-[${COLORS.text.primary}] rounded-lg text-sm ${TRANSITIONS.fast}`,
  
  // Text button with hover state
  text: `text-[${COLORS.text.secondary}] hover:text-white text-sm ${TRANSITIONS.fast}`,
  
  // Icon button
  icon: `p-2 rounded-full hover:bg-[${COLORS.background.lighter}] text-[${COLORS.text.secondary}] hover:text-[${COLORS.text.primary}] ${TRANSITIONS.fast}`,
  
  // Small button variant
  small: `px-2 py-1 text-xs rounded`,
  
  // Disabled state for buttons
  disabled: `opacity-50 cursor-not-allowed`,
};

// Form element styling
export const FORMS = {
  // Input elements
  input: `w-full bg-[${COLORS.background.light}] text-white border border-[${COLORS.border.light}] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[${COLORS.border.focus}] focus:border-[${COLORS.border.focus}] ${TRANSITIONS.fast}`,
  
  // Checkbox and radio styling
  checkbox: `rounded text-[${COLORS.primary}] focus:ring-[${COLORS.primary}]`,
  
  // Label styling
  label: {
    primary: `block text-sm font-medium text-[${COLORS.text.secondary}] mb-2`,
    secondary: `block text-xs text-[${COLORS.text.tertiary}] mb-1`,
  },
  
  // Form group
  group: `mb-4`,
  
  // Interactive item with hover
  interactiveItem: `flex items-center hover:bg-[${COLORS.background.lighter}]/50 p-1.5 rounded ${TRANSITIONS.fast}`,
};

// Text styling
export const TEXT = {
  // Headings
  heading: {
    h1: `text-3xl font-bold text-white tracking-tight`,
    h2: `text-xl font-bold text-white`,
    h3: `text-lg font-medium text-white`,
    h4: `text-base font-medium text-[${COLORS.text.secondary}]`,
    h5: `text-sm font-medium text-[${COLORS.text.secondary}]`,
  },
  
  // Body text
  body: {
    regular: `text-sm text-[${COLORS.text.secondary}]`,
    small: `text-xs text-[${COLORS.text.tertiary}]`,
    large: `text-base text-[${COLORS.text.secondary}]`,
  },
  
  // Mono text (for numbers, code, etc)
  mono: `font-mono`,
  
  // Special text styles
  special: {
    success: `text-[${COLORS.success}]`,
    danger: `text-[${COLORS.danger}]`,
    warning: `text-[${COLORS.warning}]`,
    info: `text-[${COLORS.info}]`,
  },
};

// Layout styles
export const LAYOUT = {
  container: `max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8`,
  section: `py-6`,
  grid: {
    cols2: `grid grid-cols-1 md:grid-cols-2 gap-6`,
    cols3: `grid grid-cols-1 md:grid-cols-3 gap-6`,
    cols4: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`,
  },
  flexBetween: `flex justify-between items-center`,
  flexCenter: `flex items-center justify-center`,
};

// Chart styling
export const CHARTS = {
  container: `h-64`,
  tooltip: `bg-[${COLORS.tooltip.background}] p-3 rounded-lg shadow-lg border border-[${COLORS.tooltip.border}] text-xs`,
  legendItem: `flex items-center text-xs text-[${COLORS.text.secondary}]`,
  colorDot: (color: string) => `h-3 w-3 rounded-full bg-[${color}] mr-1.5`,
};

// Export all design system components
export default {
  CARDS,
  BUTTONS,
  FORMS,
  TEXT,
  LAYOUT,
  CHARTS,
}; 