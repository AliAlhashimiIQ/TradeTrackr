import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkRateLimit, rateLimitExceeded } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { decryptPassword } from '@/lib/crypto';

// Initialize Supabase service role client to insert/update across constraints if needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ParsedMT5Trade {
  symbol: string;
  type: 'Long' | 'Short';
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  lots: number;
  profit_loss: number;
  notes: string;
  account_id: string;
  user_id: string;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ('error' in auth && auth.error) return auth.error;

  const userId = auth.user!.id;

  // Rate Limit: 3 syncs per minute
  const limit = checkRateLimit(userId, 3, 60_000);
  if (!limit.allowed) {
    return rateLimitExceeded(limit.resetIn);
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
    const metaApiToken = process.env.META_API_TOKEN?.trim();

    for (const account of accountsToSync) {
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      let newBalance = Number(account.balance);
      let isConnected = false;

      try {
        let tradesToInsert: ParsedMT5Trade[] = [];

        // Check if MetaApi token is present to do a real cloud sync
        if (account.connection_type === 'API') {
          if (!metaApiToken) {
            errors.push('MetaApi authentication token is not configured on the server. Please add META_API_TOKEN to your environment variables.');
          } else {
            // 1. Fetch MetaApi accounts to find a matching deployed instance
            // (In production, this checks if the account is already provisioned on MetaApi, or provisions it)
            try {
              const apiHeaders = { 'auth-token': metaApiToken };
              
              const decryptedPassword = account.password ? await decryptPassword(account.password) : '';
              
              // Find or provision account on MetaApi
              let metaAccountId = '';
              const listRes = await axios.get(
                'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts',
                { headers: apiHeaders }
              );
              
              const existingMetaAcc = listRes.data.find(
                (a: any) => a.login === account.account_number && a.server === account.server_name
              );

              if (existingMetaAcc) {
                metaAccountId = existingMetaAcc.id || existingMetaAcc._id;
              } else {
                // Provision a new cloud account on MetaApi
                const provRes = await axios.post(
                  'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts',
                  {
                    name: account.name,
                    type: 'cloud',
                    login: account.account_number,
                    password: decryptedPassword,
                    server: account.server_name,
                    platform: account.platform?.toLowerCase() === 'mt4' ? 'mt4' : 'mt5',
                    magic: 0,
                    quoteStreamingIntervalInSeconds: 2.5,
                    reliability: 'regular',
                  },
                  { headers: apiHeaders }
                );
                metaAccountId = provRes.data.id || provRes.data._id;
              }

            // Ensure the account is deployed
            try {
              await axios.post(
                `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaAccountId}/deploy`,
                {},
                { headers: apiHeaders }
              );
            } catch (deployErr: any) {
              const errMsg = deployErr.response?.data?.message || deployErr.message;
              if (errMsg.includes('top up')) {
                throw new Error('Please top up your MetaApi.cloud account to allow account deployment.');
              }
              console.log('[MetaApi Debug] Deploy status/error:', errMsg);
            }

            // Wait until the account is deployed & connected (max 2 attempts to avoid serverless timeout)
            let metaAccountData;
            for (let attempt = 0; attempt < 2; attempt++) {
              const statusRes = await axios.get(
                `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaAccountId}`,
                { headers: apiHeaders }
              );
              metaAccountData = statusRes.data;
              isConnected = metaAccountData.connectionStatus === 'CONNECTED';
              if (isConnected) break;
              await new Promise((r) => setTimeout(r, 1500));
            }

            const isDeploying = metaAccountData?.connectionStatus === 'DEPLOYING' || metaAccountData?.connectionStatus === 'DEPLOYED';

            if (isConnected) {
              const region = metaAccountData.region || 'new-york';
              const clientApiUrl = `https://mt-client-api-v1.${region}.agiliumtrade.ai`;

              // Fetch historical deals
              const dealsRes = await axios.get(
                `${clientApiUrl}/users/current/accounts/${metaAccountId}/history-deals?limit=100`,
                { headers: apiHeaders }
              );

              // Get account details/balance
              const accDetailsRes = await axios.get(
                `${clientApiUrl}/users/current/accounts/${metaAccountId}/account-information`,
                { headers: apiHeaders }
              );
              
              if (accDetailsRes.data?.balance) {
                newBalance = accDetailsRes.data.balance;
              }

              // Map MetaApi deals to Trade schema
              const deals = dealsRes.data || [];
              deals.forEach((deal: any) => {
                // Ignore deposits/withdrawals
                if (deal.entry === 'DEAL_ENTRY_IN' && deal.type === 'DEAL_TYPE_BALANCE') {
                  return;
                }
                
                // MetaApi represents deals. Map entry/exit deals or combine them.
                // For a robust one-to-one or deal mapping:
                if (deal.profit !== 0) {
                  const isBuy = deal.type === 'DEAL_TYPE_BUY';
                  tradesToInsert.push({
                    symbol: deal.symbol,
                    type: isBuy ? 'Long' : 'Short',
                    entry_time: new Date(deal.time).toISOString(),
                    exit_time: new Date(deal.time).toISOString(), // deal mapping simplifies entry/exit
                    entry_price: deal.price,
                    exit_price: deal.price,
                    quantity: deal.volume,
                    lots: deal.volume,
                    profit_loss: deal.profit + (deal.commission || 0) + (deal.swap || 0),
                    notes: `MetaApi Synced Deal #${deal.id} | Comment: ${deal.comment || 'N/A'}`,
                    account_id: account.id,
                    user_id: userId,
                  });
                }
              });
            } else if (isDeploying) {
              // No-op: Not connected yet, but still provisioning cleanly.
              // This is a DEPLOYING state, not a failure.
            } else {
              errors.push(`MetaApi account status: ${metaAccountData?.connectionStatus || 'DISCONNECTED'}`);
            }
          } catch (apiErr: any) {
            console.error('MetaApi request error:', apiErr.response?.data || apiErr.message);
            errors.push(`MetaApi connection error: ${apiErr.response?.data?.message || apiErr.message}`);
          }
        }
      }

        // 2. If no trades parsed from MetaApi, don't run the mock engine anymore
        // We will just log that sync was completed but no new trades were found, unless there's an error.

        // 3. Fetch existing trade keys to check for duplicates
        const { data: existingTrades, error: fetchErr } = await supabase
          .from('trades')
          .select('symbol, entry_time, lots')
          .eq('user_id', userId);

        if (fetchErr) throw fetchErr;

        const existingKeys = new Set<string>();
        (existingTrades || []).forEach((t: any) => {
          existingKeys.add(`${t.symbol}|${t.entry_time}|${t.lots ?? 0}`);
        });

        // Filter out duplicate trades
        const newTrades = tradesToInsert.filter((t) => {
          const key = `${t.symbol}|${t.entry_time}|${t.lots ?? 0}`;
          if (existingKeys.has(key)) {
            skipped++;
            return false;
          }
          return true;
        });

        // 4. Bulk insert new trades
        if (newTrades.length > 0) {
          const rows = newTrades.map((t) => ({
            id: crypto.randomUUID(),
            user_id: userId,
            symbol: t.symbol,
            type: t.type,
            entry_price: t.entry_price,
            exit_price: t.exit_price,
            entry_time: t.entry_time,
            exit_time: t.exit_time,
            quantity: t.quantity,
            lots: t.lots,
            profit_loss: t.profit_loss,
            notes: t.notes,
            account_id: t.account_id,
            mistakes: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          const BATCH = 100;
          for (let i = 0; i < rows.length; i += BATCH) {
            const batch = rows.slice(i, i + BATCH);
            const { error: insertErr } = await supabase.from('trades').insert(batch);
            if (insertErr) {
              errors.push(`Insert batch failed: ${insertErr.message}`);
            } else {
              imported += batch.length;
            }
          }
        }

        // 5. Update account details: balance, last_sync, connection_status
        const hasErrors = errors.length > 0;
        let finalStatus = 'CONNECTED';
        if (hasErrors) {
          finalStatus = 'ERROR';
        } else if (!isConnected) {
          finalStatus = 'DEPLOYING';
        }

        const { error: updateErr } = await supabase
          .from('trading_accounts')
          .update({
            balance: newBalance,
            connection_status: finalStatus,
            ...(finalStatus === 'CONNECTED' ? { last_sync: new Date().toISOString() } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);

        if (updateErr) throw updateErr;

        syncResults.push({
          accountId: account.id,
          name: account.name,
          status: finalStatus,
          imported,
          skipped,
          balance: newBalance,
          errors,
        });

      } catch (err: any) {
        console.error(`Error syncing account ${account.name}:`, err);
        
        // Mark account as ERROR
        await supabase
          .from('trading_accounts')
          .update({
            connection_status: 'ERROR',
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);

        syncResults.push({
          accountId: account.id,
          name: account.name,
          status: 'ERROR',
          imported: 0,
          skipped: 0,
          balance: account.balance,
          errors: [err.message || String(err)],
        });
      }
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
