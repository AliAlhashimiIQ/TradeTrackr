'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import React from 'react'

interface PageTransitionProviderProps {
  children: React.ReactNode
}

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      key={pathname}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex flex-col flex-grow"
    >
      {children}
    </motion.div>
  )
}


