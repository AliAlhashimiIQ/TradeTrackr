import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// Unified Supabase client that works seamlessly across mobile browsers (cookies) and desktop
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  : createClient<Database>(supabaseUrl, supabaseAnonKey)

// Image compression before upload
export async function compressImage(file: File, maxPx = 1920, quality = 0.85): Promise<File> {
  if (typeof window === 'undefined') return file; // SSR guard
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

// Upload screenshot helper
export async function uploadTradeScreenshot(file: File, userId: string, tradeId?: string): Promise<string> {
  const compressed = await compressImage(file);
  const fileExt = compressed.name.split('.').pop() || 'jpg';
  const fileName = tradeId 
    ? `${userId}/${tradeId}-${Date.now()}.${fileExt}`
    : `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('trade-screenshots')
    .upload(fileName, compressed, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading screenshot:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('trade-screenshots')
    .getPublicUrl(data.path);

  return publicUrl;
}