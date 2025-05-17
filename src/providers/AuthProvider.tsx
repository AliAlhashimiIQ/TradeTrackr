'use client'

import React, { createContext, ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <>
      {children}
    </>
  )
} 