'use client'

import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: AuthError | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: { full_name?: string, username?: string }) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  verifyOtp: (email: string, token: string, type?: 'email' | 'recovery') => Promise<any>;
  signInWithGoogle: () => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<AuthError | null>(null)
  const router = useRouter()

  // createBrowserClient from @supabase/ssr stores the session in cookies,
  // making it visible to the Next.js middleware for server-side auth checks.
  const supabase = useMemo(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => {
    let isMounted = true

    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching session:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (event === 'SIGNED_OUT') {
            router.push('/login')
          }
          
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setAuthError(error)
        throw error
      }
      return data
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, metadata?: { full_name?: string, username?: string }) => {
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: metadata
        }
      })
      if (error) {
        setAuthError(error)
        throw error
      }
      return data
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    }
  }

  const signOut = async () => {
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error && error.message !== 'Auth session missing!') {
        setAuthError(error)
        throw error
      }
    } catch (error: any) {
      if (error?.message !== 'Auth session missing!') {
        console.error('Error signing out:', error)
      }
    } finally {
      setUser(null)
      setSession(null)
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('onboarded')
      }
      router.push('/login')
    }
  }

  const resetPassword = async (email: string) => {
    setAuthError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) {
        setAuthError(error)
        throw error
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  const updatePassword = async (newPassword: string) => {
    setAuthError(null)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) {
        setAuthError(error)
        throw error
      }
    } catch (error) {
      console.error('Error updating password:', error)
      throw error
    }
  }

  const verifyOtp = async (email: string, token: string, type: 'email' | 'recovery' = 'email') => {
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.verifyOtp({ 
        email, 
        token, 
        type 
      })
      if (error) {
        setAuthError(error)
        throw error
      }
      return data
    } catch (error) {
      console.error('Error verifying OTP:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) {
        setAuthError(error)
        throw error
      }
      return data
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      authError,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      verifyOtp,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  )
} 
