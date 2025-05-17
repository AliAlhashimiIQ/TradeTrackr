import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Simple storage implementation that works in both browser and server
const createStorage = () => {
  if (typeof window === 'undefined') {
    // Server-side implementation (no-op)
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  }
  
  // Browser-side implementation
  return {
    getItem: (key: string) => {
      try {
        const item = localStorage.getItem(key)
        if (key === 'supabase.auth.pkce.code_verifier' && !item) {
          console.debug('Code verifier requested but not found in localStorage')
        }
        return item
      } catch (error) {
        console.error('Error accessing localStorage:', error)
        return null
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value)
        if (key === 'supabase.auth.pkce.code_verifier') {
          console.debug('Code verifier saved to localStorage')
        }
      } catch (error) {
        console.error('Error setting localStorage item:', error)
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error('Error removing localStorage item:', error)
      }
    }
  }
}

// Create fetch implementation with better timeout handling
const customFetch = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const timeoutDuration = 15000; // 15 seconds timeout
  
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create a timeout function that aborts the fetch
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutDuration);
  
  // Add the abort signal to the fetch options
  const fetchOptions = {
    ...options,
    signal,
  };
  
  // Return a Promise that handles the timeout cleanup
  return new Promise((resolve, reject) => {
    fetch(url, fetchOptions)
      .then(response => {
        clearTimeout(timeout);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          reject(new Error('Request timed out'));
        } else {
          reject(error);
        }
      });
  });
};

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: createStorage()
  },
  global: {
    fetch: customFetch,
    headers: {
      'X-Client-Info': 'trading-app-web',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  }
}) 