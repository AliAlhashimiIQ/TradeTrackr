import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side Supabase auth helper for API routes.
 * Supports both Authorization Bearer tokens and HTTP-only session cookies.
 * Returns { user, supabase } on success, or a NextResponse error on failure.
 */
export async function authenticateRequest(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
    return {
      error: NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      ),
    };
  }

  // 1. Check Authorization Bearer header first
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (token && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return { user, supabase };
    }
  }

  // 2. Fallback to SSR cookies from request
  if (supabaseAnonKey) {
    const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // No-op in route handlers when only reading
        },
      },
    });

    const { data: { user }, error } = await ssrClient.auth.getUser();
    if (!error && user) {
      // Use service-role client for DB queries or ssrClient
      const dbClient = supabaseServiceKey 
        ? createClient(supabaseUrl, supabaseServiceKey)
        : ssrClient;
      return { user, supabase: dbClient };
    }
  }

  return {
    error: NextResponse.json(
      { error: 'Unauthorized: Missing or invalid authentication' },
      { status: 401 }
    ),
  };
}

/**
 * Simple in-memory rate limiter for API routes.
 * Tracks request counts per user within a sliding window.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests: number = 10,
  windowMs: number = 60_000 // 1 minute
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Returns a rate limit exceeded response.
 */
export function rateLimitExceeded(resetIn: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(resetIn / 1000)),
      },
    }
  );
}
