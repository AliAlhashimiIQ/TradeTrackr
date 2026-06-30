import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMetaApiConnectionStatus(account: any, metaApiToken: string): Promise<string> {
  try {
    const apiHeaders = { 'auth-token': metaApiToken };
    const listRes = await axios.get(
      'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts',
      { headers: apiHeaders, timeout: 5000 }
    );
    const metaAcc = listRes.data.find(
      (a: any) => a.login === account.account_number && a.server === account.server_name
    );
    if (!metaAcc) return 'DISCONNECTED';
    return metaAcc.connectionStatus || 'DEPLOYING';
  } catch (err) {
    console.error('Error checking MetaApi connection status:', err);
    return 'ERROR';
  }
}

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

    // Check status on MetaApi if currently marked as DEPLOYING
    if (data.connection_status === 'DEPLOYING') {
      const metaApiToken = process.env.META_API_TOKEN?.trim();
      if (metaApiToken) {
        const currentStatus = await checkMetaApiConnectionStatus(data, metaApiToken);
        
        if (currentStatus === 'CONNECTED') {
          const { error: updateErr } = await supabase
            .from('trading_accounts')
            .update({
              connection_status: 'CONNECTED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);

          if (!updateErr) {
            data.connection_status = 'CONNECTED';
          }
        } else if (currentStatus === 'ERROR') {
          const { error: updateErr } = await supabase
            .from('trading_accounts')
            .update({
              connection_status: 'ERROR',
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);

          if (!updateErr) {
            data.connection_status = 'ERROR';
          }
        }
      }
    }

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
