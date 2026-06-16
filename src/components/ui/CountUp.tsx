'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

interface CountUpProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export default function CountUp({
  end,
  duration = 2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return

    let start = 0
    const increment = end / (duration * 60) // 60fps
    let frame: number

    const animate = () => {
      start += increment
      if (start >= end) {
        setCount(end)
        return
      }
      setCount(start)
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [isInView, end, duration])

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {prefix}{count.toFixed(decimals)}{suffix}
    </motion.span>
  )
}
