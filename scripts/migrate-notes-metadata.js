const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local file to get Supabase credentials
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found at', envPath);
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      // Remove quotes if present
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value.trim();
    }
  });
  return env;
}

async function migrate() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not found in .env.local');
    process.exit(1);
  }

  console.log('Connecting to Supabase at:', supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all trades with notes
  const { data: trades, error } = await supabase
    .from('trades')
    .select('id, notes, stop_loss, take_profit, commission, swap');

  if (error) {
    console.error('Error fetching trades:', error);
    process.exit(1);
  }

  console.log(`Found ${trades.length} trades. Scanning for serialized metadata...`);

  let migratedCount = 0;

  for (const trade of trades) {
    if (!trade.notes) continue;

    // Pattern to match: [SL=X;TP=Y;Comm=Z;Swap=W]
    const regex = /\[SL=([\d.-]+);TP=([\d.-]+);Comm=([\d.-]+);Swap=([\d.-]+)\]/;
    const match = trade.notes.match(regex);

    if (match) {
      const sl = parseFloat(match[1]);
      const tp = parseFloat(match[2]);
      const comm = parseFloat(match[3]);
      const swapVal = parseFloat(match[4]);

      // Remove the serialized metadata from notes
      const cleanNotes = trade.notes.replace(regex, '').trim();

      console.log(`Migrating trade ${trade.id}:`, {
        sl,
        tp,
        comm,
        swap: swapVal,
        cleanNotes
      });

      const { error: updateError } = await supabase
        .from('trades')
        .update({
          stop_loss: isNaN(sl) ? null : sl,
          take_profit: isNaN(tp) ? null : tp,
          commission: isNaN(comm) ? 0 : comm,
          swap: isNaN(swapVal) ? 0 : swapVal,
          notes: cleanNotes
        })
        .eq('id', trade.id);

      if (updateError) {
        console.error(`Error updating trade ${trade.id}:`, updateError);
      } else {
        migratedCount++;
      }
    }
  }

  console.log(`Migration complete. Successfully migrated ${migratedCount} trades.`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
});
