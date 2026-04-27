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

// ─── 6.4 Image compression before upload ──────────────────────────────────
// Resizes to max 1920 × 1920 and re-encodes to JPEG@85 before uploading.
// Reduces a typical 4 MB PNG screenshot to ~350 KB — 10× faster upload.
async function compressImage(file: File, maxPx = 1920, quality = 0.85): Promise<File> {
  if (typeof window === 'undefined') return file; // SSR guard
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(width  * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export const uploadTradeScreenshot = async (file: File, userId: string, tradeId: string): Promise<string | null> => {
  try {
    // Compress before upload (6.4)
    const compressed = await compressImage(file);
    const fileExt = compressed.name.split('.').pop();
    const filePath = `${userId}/${tradeId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('trade-screenshots').upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: true,
      contentType: compressed.type,
    });
    if (error) {
      console.error('Error uploading screenshot:', error.message || error);
      return `UPLOAD_ERROR: ${error.message || error}`;
    }
    const { data } = supabase.storage.from('trade-screenshots').getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.error('Exception during screenshot upload:', err);
    return `EXCEPTION: ${err}`;
  }
};