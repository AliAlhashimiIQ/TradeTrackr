/**
 * Format a number as a currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get color class based on positive/negative value
 */
export function getValueColorClass(value: number): string {
  return value >= 0 ? 'text-green-400' : 'text-red-400';
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * Resolves a TradingView chart sharing URL (e.g. https://www.tradingview.com/x/pCPdcgL4/)
 * into a direct static image URL (e.g. https://s3.tradingview.com/snapshots/p/pCPdcgL4.png).
 */
export function resolveTradingViewUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Match tradingview.com/x/[id]/ or tradingview.com/x/[id]
  const match = trimmed.match(/(?:tradingview\.com\/x\/)([a-zA-Z0-9_-]+)/i);
  if (match) {
    const id = match[1];
    const firstChar = id.charAt(0).toLowerCase();
    return `https://s3.tradingview.com/snapshots/${firstChar}/${id}.png`;
  }
  return trimmed;
}

export const TAG_COLORS = [
  { name: 'Default', hex: '#4b5563', bg: 'rgba(75,85,99,0.15)', text: '#d1d5db', border: 'rgba(75,85,99,0.3)' },
  { name: 'Gray', hex: '#9ca3af', bg: 'rgba(156,163,175,0.15)', text: '#f3f4f6', border: 'rgba(156,163,175,0.3)' },
  { name: 'Brown', hex: '#a16207', bg: 'rgba(161,98,7,0.2)', text: '#fef08a', border: 'rgba(161,98,7,0.4)' },
  { name: 'Orange', hex: '#ea580c', bg: 'rgba(234,88,12,0.2)', text: '#ffedd5', border: 'rgba(234,88,12,0.4)' },
  { name: 'Yellow', hex: '#eab308', bg: 'rgba(234,179,8,0.15)', text: '#fef9c3', border: 'rgba(234,179,8,0.3)' },
  { name: 'Green', hex: '#10b981', bg: 'rgba(16,185,129,0.15)', text: '#d1fae5', border: 'rgba(16,185,129,0.3)' },
  { name: 'Blue', hex: '#3b82f6', bg: 'rgba(59,130,246,0.15)', text: '#dbeafe', border: 'rgba(59,130,246,0.3)' },
  { name: 'Purple', hex: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', text: '#ede9fe', border: 'rgba(139,92,246,0.3)' },
  { name: 'Pink', hex: '#ec4899', bg: 'rgba(236,72,153,0.15)', text: '#fce7f3', border: 'rgba(236,72,153,0.3)' },
  { name: 'Red', hex: '#ef4444', bg: 'rgba(239,68,68,0.15)', text: '#fee2e2', border: 'rgba(239,68,68,0.3)' }
];

export function getTagStyle(hexColor: string | null | undefined, isMistake = false) {
  const defaultHex = isMistake ? '#ef4444' : '#6366f1';
  const color = hexColor || defaultHex;
  const preset = TAG_COLORS.find(
    c => c.hex.toLowerCase() === color.toLowerCase() || c.name.toLowerCase() === color.toLowerCase()
  );
  
  if (preset) {
    return {
      backgroundColor: preset.bg,
      color: preset.text,
      borderColor: preset.border
    };
  }

  // Fallback to dynamic hex values (using hex transparency)
  return {
    backgroundColor: color.startsWith('#') ? `${color}26` : 'rgba(99,102,241,0.15)', // 15% opacity
    color: color,
    borderColor: color.startsWith('#') ? `${color}4d` : 'rgba(99,102,241,0.3)', // 30% opacity
  };
}


