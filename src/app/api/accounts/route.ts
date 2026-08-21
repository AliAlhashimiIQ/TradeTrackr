import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkRateLimit, rateLimitExceeded } from '@/lib/apiAuth';
import { encryptPassword } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ('error' in auth && auth.error) return auth.error;

  const { allowed, resetIn } = checkRateLimit(auth.user!.id, 20, 60_000);
  if (!allowed) return rateLimitExceeded(resetIn);
  
  const userId = auth.user!.id;
  const supabase = auth.supabase!;

  try {
    const body = await request.json();
    const { name, account_number, server_name, password, type, platform, connection_type } = body;

    if (!name || !account_number || !server_name || !platform || !connection_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const encPassword = password ? await encryptPassword(password) : '';

    const { data, error } = await supabase
      .from('trading_accounts')
      .insert([
        {
          user_id: userId,
          name,
          account_number,
          server_name,
          password: encPassword,
          type: type || 'DEMO',
          platform,
          balance: 0.00,
          connection_status: 'DISCONNECTED',
          connection_type,
          last_sync: null,
        },
      ])
      .select('id, user_id, name, account_number, server_name, type, platform, balance, connection_status, connection_type, last_sync, created_at, updated_at')
      .single();

    if (error) {
      console.error('Create account database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Create account API error:', err?.message ?? err);
    const message = err?.message?.includes('DB_ENCRYPTION_KEY')
      ? 'Server configuration error: missing encryption key'
      : err?.message || 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ('error' in auth && auth.error) return auth.error;

  const { allowed, resetIn } = checkRateLimit(auth.user!.id, 20, 60_000);
  if (!allowed) return rateLimitExceeded(resetIn);
  
  const userId = auth.user!.id;
  const supabase = auth.supabase!;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const accountUpdates = { ...body };

    // Remove read-only or unauthorized fields
    delete accountUpdates.id;
    delete accountUpdates.user_id;
    delete accountUpdates.created_at;
    delete accountUpdates.updated_at;

    if (accountUpdates.password) {
      accountUpdates.password = await encryptPassword(accountUpdates.password);
    }

    const { data, error } = await supabase
      .from('trading_accounts')
      .update({
        ...accountUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, user_id, name, account_number, server_name, type, platform, balance, connection_status, connection_type, last_sync, created_at, updated_at')
      .single();

    if (error) {
      console.error('Update account database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Update account API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ('error' in auth && auth.error) return auth.error;

  const userId = auth.user!.id;
  const supabase = auth.supabase!;

  try {
    const { data, error } = await supabase
      .from('trading_accounts')
      .select('id, user_id, name, account_number, server_name, type, platform, balance, connection_status, connection_type, last_sync, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch accounts database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Fetch accounts API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
