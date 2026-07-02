'use client'

import { ReactNode } from 'react'

interface TooltipProps {
  label: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * Lightweight CSS-only tooltip that wraps any element.
 * Shows a styled floating label on hover — no JS state needed.
 *
 * Usage:
 *   <Tooltip label="Delete trade">
 *     <button>🗑</button>
 *   </Tooltip>
 */
export function Tooltip({ label, children, position = 'top', className = '' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className={`relative inline-flex group ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`
          pointer-events-none absolute z-50 whitespace-nowrap
          px-2.5 py-1.5 rounded-lg text-[11px] font-medium
          bg-gray-900 dark:bg-gray-800 text-white border border-white/10
          shadow-lg shadow-black/20
          opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
          transition-all duration-150 ease-out
          ${positionClasses[position]}
        `}
      >
        {label}
        {/* Arrow */}
        <div
          className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 border-white/10 rotate-45 ${
            position === 'top'
              ? 'border-b border-r -bottom-1 left-1/2 -translate-x-1/2'
              : position === 'bottom'
              ? 'border-t border-l -top-1 left-1/2 -translate-x-1/2'
              : position === 'left'
              ? 'border-t border-r -right-1 top-1/2 -translate-y-1/2'
              : 'border-b border-l -left-1 top-1/2 -translate-y-1/2'
          }`}
        />
      </div>
    </div>
  )
}
