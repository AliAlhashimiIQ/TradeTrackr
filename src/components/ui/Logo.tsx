import React, { useId } from 'react'

interface LogoProps {
  className?: string
  size?: number | string
  useGradient?: boolean
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 24, useGradient = true }) => {
  const uniqueId = useId()
  const gradientId = `logo-gradient-${uniqueId.replace(/:/g, '')}`
  const strokeColor = useGradient ? `url(#${gradientId})` : 'currentColor';

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Monogram T & R with Up-trending stock chart arrow (Favicon style) */}
      <path
        d="M 6 11.5 V 6 H 12"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 12 6 V 18"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 9.5 18 H 14.5"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 6 15.5 L 11.5 10 L 14 12.5 L 18 5.5"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 14.5 5.5 H 18 V 9"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default Logo

