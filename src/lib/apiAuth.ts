import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side Supabase auth helper for API routes.
 * Extracts the JWT from the Authorization header and verifies the user.
 * Returns { user, supabase } on success, or a NextResponse error on failure.
 */
export async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      ),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      error: NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      ),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    };
  }

  return { user, supabase };
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
