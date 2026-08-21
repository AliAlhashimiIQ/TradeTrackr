import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let dbStatus = 'unconfigured';
  let latencyMs = 0;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.from('market_data_cache').select('id').limit(1);
      latencyMs = Date.now() - startTime;
      dbStatus = error ? 'degraded' : 'healthy';
    } catch {
      dbStatus = 'unreachable';
      latencyMs = Date.now() - startTime;
    }
  }

  const isHealthy = dbStatus === 'healthy' || dbStatus === 'unconfigured';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      latencyMs,
      services: {
        database: dbStatus,
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
