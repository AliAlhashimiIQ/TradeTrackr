import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';
import { performAccountSync } from '../syncHelper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ('error' in auth && auth.error) return auth.error;

  const userId = auth.user!.id;

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching account sync status:', error);
      return NextResponse.json({ error: 'Failed to fetch account status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Trading account not found' }, { status: 404 });
    }

    // If status is DEPLOYING, trigger a non-blocking check & sync
    if (data.connection_status === 'DEPLOYING') {
      await performAccountSync(data, userId);
      
      // Reload updated account data
      const { data: updatedData, error: reloadError } = await supabase
        .from('trading_accounts')
        .select('id, name, connection_status, balance, last_sync')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();
      
      if (!reloadError && updatedData) {
        return NextResponse.json({
          success: true,
          account: updatedData,
        });
      }
    }

    // Otherwise, return current status immediately
    const cleanData = {
      id: data.id,
      name: data.name,
      connection_status: data.connection_status,
      balance: data.balance,
      last_sync: data.last_sync,
    };

    return NextResponse.json({
      success: true,
      account: cleanData,
    });

  } catch (err: any) {
    console.error('API sync status error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
