'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import React from 'react'

// Animation variants for page transitions
const variants = {
  hidden: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

interface PageTransitionProviderProps {
  children: React.ReactNode
}

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="hidden"
        animate="enter"
        exit="exit"
        variants={variants}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
        className="min-h-screen flex flex-col flex-grow"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
} 