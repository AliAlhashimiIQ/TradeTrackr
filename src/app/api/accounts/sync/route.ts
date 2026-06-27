import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkRateLimit, rateLimitExceeded } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';
import { performAccountSync } from './syncHelper';

// Initialize Supabase service role client to insert/update across constraints if needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ('error' in auth && auth.error) return auth.error;

  const userId = auth.user!.id;

  // Rate Limit: 3 syncs per minute
  const limit = checkRateLimit(userId, 3, 60_000);
  if (!limit.allowed) {
    return rateLimitExceeded(limit.resetIn);
  }

  const metaApiToken = process.env.META_API_TOKEN?.trim();
  if (!metaApiToken) {
    return NextResponse.json({ 
      error: 'MetaApi authentication token is not configured on the server. Please define META_API_TOKEN in your environment configuration.' 
    }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { accountId, all } = body;

    let accountsToSync = [];

    if (all) {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      accountsToSync = data || [];
    } else {
      if (!accountId) {
        return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!data) {
        return NextResponse.json({ error: 'Trading account not found' }, { status: 404 });
      }
      accountsToSync = [data];
    }

    if (accountsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No accounts to sync',
        synced: [],
      });
    }

    const syncResults = [];

    for (const account of accountsToSync) {
      const syncRes = await performAccountSync(account, userId);
      syncResults.push({
        accountId: account.id,
        name: account.name,
        status: syncRes.status,
        imported: syncRes.imported,
        skipped: syncRes.skipped,
        balance: syncRes.balance,
        errors: syncRes.errors,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      results: syncResults,
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
