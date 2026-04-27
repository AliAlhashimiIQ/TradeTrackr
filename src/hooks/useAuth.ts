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
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching session:', error)
        setLoading(false)
      }
    }

    fetchSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_OUT') {
          router.push('/login')
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
      // Use 'local' scope so Supabase won't throw if the server session is
      // already gone (e.g. expired token / tab restored after a long sleep).
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error && error.message !== 'Auth session missing!') {
        setAuthError(error)
        throw error
      }
    } catch (error: any) {
      // Ignore "Auth session missing" — the user is already effectively signed out
      if (error?.message !== 'Auth session missing!') {
        console.error('Error signing out:', error)
      }
    } finally {
      // Always clear local state and redirect regardless of Supabase response
      setUser(null)
      setSession(null)
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
    verifyOtp,
    signInWithGoogle
  }
} 