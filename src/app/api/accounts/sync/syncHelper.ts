import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { decryptPassword } from '@/lib/crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
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

export async function performAccountSync(account: any, userId: string) {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  let newBalance = Number(account.balance);
  let isConnected = false;
  let finalStatus = 'DEPLOYING';
  const metaApiToken = process.env.META_API_TOKEN?.trim();

  try {
    let tradesToInsert: ParsedMT5Trade[] = [];

    if (account.connection_type === 'API') {
      if (!metaApiToken) {
        throw new Error('MetaApi authentication token is not configured on the server. Please add META_API_TOKEN to your environment variables.');
      }

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
        console.warn('[MetaApi Debug] Deploy status/error:', errMsg);
      }

      // Query actual status once
      const statusRes = await axios.get(
        `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaAccountId}`,
        { headers: apiHeaders }
      );
      const metaAccountData = statusRes.data;
      isConnected = metaAccountData.connectionStatus === 'CONNECTED';

      if (isConnected) {
        finalStatus = 'CONNECTED';
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
        
        if (accDetailsRes.data?.balance !== undefined) {
          newBalance = accDetailsRes.data.balance;
        }

        // Map MetaApi deals to Trade schema
        const deals = dealsRes.data || [];
        deals.forEach((deal: any) => {
          if (deal.entry === 'DEAL_ENTRY_IN' && deal.type === 'DEAL_TYPE_BALANCE') {
            return;
          }
          if (deal.profit !== 0) {
            const isBuy = deal.type === 'DEAL_TYPE_BUY';
            tradesToInsert.push({
              symbol: deal.symbol,
              type: isBuy ? 'Long' : 'Short',
              entry_time: new Date(deal.time).toISOString(),
              exit_time: new Date(deal.time).toISOString(),
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
      } else {
        finalStatus = 'DEPLOYING';
      }
    }

    // Check existing trades and insert
    const { data: existingTrades, error: fetchErr } = await supabase
      .from('trades')
      .select('symbol, entry_time, lots')
      .eq('user_id', userId);

    if (fetchErr) throw fetchErr;

    const existingKeys = new Set<string>();
    (existingTrades || []).forEach((t: any) => {
      existingKeys.add(`${t.symbol}|${t.entry_time}|${t.lots ?? 0}`);
    });

    const newTrades = tradesToInsert.filter((t) => {
      const key = `${t.symbol}|${t.entry_time}|${t.lots ?? 0}`;
      if (existingKeys.has(key)) {
        skipped++;
        return false;
      }
      return true;
    });

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

    // Update account balance & status
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

    return {
      success: true,
      status: finalStatus,
      imported,
      skipped,
      balance: newBalance,
      errors,
    };
  } catch (err: any) {
    console.error(`Error performing sync for account ${account.name}:`, err);
    
    await supabase
      .from('trading_accounts')
      .update({
        connection_status: 'ERROR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    return {
      success: false,
      status: 'ERROR',
      imported: 0,
      skipped: 0,
      balance: account.balance,
      errors: [err.message || String(err)],
    };
  }
}
