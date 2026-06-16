'use client'

import { useMemo } from 'react'

interface MiniSparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
  color?: string
  negativeColor?: string
}

export default function MiniSparkline({
  data,
  width = 80,
  height = 28,
  className = '',
  color = '#6366f1',
  negativeColor = '#ef4444',
}: MiniSparklineProps) {
  const { path, fillPath, isPositive } = useMemo(() => {
    if (!data.length || data.length < 2) return { path: '', fillPath: '', isPositive: true }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 2

    const w = width - padding * 2
    const h = height - padding * 2

    const points = data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - ((v - min) / range) * h,
    }))

    // Build SVG path
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      // Bezier smoothing
      const prev = points[i - 1]
      const curr = points[i]
      const cx = (prev.x + curr.x) / 2
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
    }

    // Fill path (close at bottom)
    const fill = `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

    return {
      path: d,
      fillPath: fill,
      isPositive: data[data.length - 1] >= data[0],
    }
  }, [data, width, height])

  if (!data.length || data.length < 2) return null

  const strokeColor = isPositive ? color : negativeColor

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`spark-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={fillPath}
        fill={`url(#spark-${strokeColor.replace('#', '')})`}
      />
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
