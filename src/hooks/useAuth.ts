import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<AuthError | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Get session from Supabase
    const fetchSession = async () => {
      try {
        console.log('Fetching initial session')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Initial session:', session ? 'Found' : 'Not found')
        setSession(session)
        setUser(session?.user ?? null)
        
        // If user is already logged in and on login page, redirect to dashboard
        if (session?.user && window.location.pathname === '/login') {
          console.log('User already logged in, redirecting to dashboard')
          window.location.href = '/dashboard'
        }
        setLoading(false)
      } catch (error) {
        console.error('Error fetching session:', error)
        setLoading(false)
      }
    }

    fetchSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session')
        setSession(session)
        setUser(session?.user ?? null)
        
        // Handle auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email)
          if (window.location.pathname === '/login' || window.location.pathname === '/auth/callback') {
            console.log('Redirecting to dashboard after sign in')
            window.location.href = '/dashboard'
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          window.location.href = '/login'
        } else if (event === 'USER_UPDATED') {
          console.log('User updated')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed')
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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
      // Navigation will be handled by onAuthStateChange
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
      const { error } = await supabase.auth.signOut()
      if (error) {
        setAuthError(error)
        throw error
      }
      // Navigation will be handled by onAuthStateChange
      console.log('Signed out')
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
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

  return {
    user,
    session,
    loading,
    authError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    verifyOtp
  }
} 