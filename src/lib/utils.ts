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
  
  // If it's a Supabase storage URL, rewrite it to go through the media proxy
  if (trimmed.includes('/storage/v1/object/public/')) {
    let token = '';
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              token = parsed.access_token || '';
              break;
            }
          } catch (e) {}
        }
      }
    }
    return `/api/media?url=${encodeURIComponent(trimmed)}${token ? `&token=${token}` : ''}`;
  }

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

export interface PLColors {
  text: string;
  text70: string;
  bg10: string;
  ring20: string;
  bg15: string;
  border30: string;
  border50: string;
  shadow: string;
  hexColor: string;
  hexBg: string;
  hexShadow: string;
}

export function getPLColorClasses(value: number, isColorblind = false): PLColors {
  const isPositive = value >= 0;
  if (isColorblind) {
    return {
      text: isPositive ? 'text-blue-400' : 'text-orange-400',
      text70: isPositive ? 'text-blue-500/70' : 'text-orange-500/70',
      bg10: isPositive ? 'bg-blue-500/10' : 'bg-orange-500/10',
      ring20: isPositive ? 'ring-blue-500/20' : 'ring-orange-500/20',
      bg15: isPositive ? 'bg-blue-500/15' : 'bg-orange-500/15',
      border30: isPositive ? 'border-blue-500/30' : 'border-orange-500/30',
      border50: isPositive ? 'border-blue-500/50' : 'border-orange-500/50',
      shadow: isPositive 
        ? 'shadow-[0_0_16px_rgba(59,130,246,0.12)]' 
        : 'shadow-[0_0_16px_rgba(249,115,22,0.12)]',
      hexColor: isPositive ? '#60a5fa' : '#fb923c', // Blue-400 / Orange-400 hex
      hexBg: isPositive ? 'rgba(59,130,246,0.06)' : 'rgba(249,115,22,0.06)',
      hexShadow: isPositive ? 'rgba(59,130,246,0.2)' : 'rgba(249,115,22,0.2)'
    };
  } else {
    return {
      text: isPositive ? 'text-emerald-400' : 'text-red-400',
      text70: isPositive ? 'text-emerald-500/70' : 'text-red-500/70',
      bg10: isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10',
      ring20: isPositive ? 'ring-emerald-500/20' : 'ring-red-500/20',
      bg15: isPositive ? 'bg-emerald-500/15' : 'bg-red-500/15',
      border30: isPositive ? 'border-emerald-500/30' : 'border-red-500/30',
      border50: isPositive ? 'border-emerald-500/50' : 'border-red-500/50',
      shadow: isPositive 
        ? 'shadow-[0_0_16px_rgba(16,185,129,0.12)]' 
        : 'shadow-[0_0_16px_rgba(239,68,68,0.12)]',
      hexColor: isPositive ? '#34d399' : '#f87171', // emerald-400 / red-400 equivalent hex
      hexBg: isPositive ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
      hexShadow: isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.18)'
    };
  }
}

export function toLocalYMD(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toLocalISOString(ymdString: string, existingTimeStr?: string): string {
  if (!ymdString) return new Date().toISOString();
  
  if (ymdString.includes('T')) {
    return ymdString;
  }
  
  const [year, month, day] = ymdString.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year);
  date.setMonth(month - 1);
  date.setDate(day);
  
  if (existingTimeStr) {
    const d = new Date(existingTimeStr);
    if (!isNaN(d.getTime())) {
      date.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    }
  } else {
    const now = new Date();
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  }

  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const offsetHours = pad(Math.floor(Math.abs(tzOffset) / 60));
  const offsetMins = pad(Math.abs(tzOffset) % 60);
  
  const yearStr = date.getFullYear();
  const monthStr = pad(date.getMonth() + 1);
  const dayStr = pad(date.getDate());
  const hoursStr = pad(date.getHours());
  const minsStr = pad(date.getMinutes());
  const secsStr = pad(date.getSeconds());
  
  return `${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minsStr}:${secsStr}${diff}${offsetHours}:${offsetMins}`;
}

export function toLocalDatetimeLocal(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromLocalDatetimeLocal(localDateTimeStr: string): string {
  if (!localDateTimeStr) return new Date().toISOString();
  
  const [datePart, timePart] = localDateTimeStr.split('T');
  if (!datePart || !timePart) return new Date(localDateTimeStr).toISOString();

  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  const date = new Date(year, month - 1, day, hours, minutes, 0);
  
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const offsetHours = pad(Math.floor(Math.abs(tzOffset) / 60));
  const offsetMins = pad(Math.abs(tzOffset) % 60);
  
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${diff}${offsetHours}:${offsetMins}`;
}


