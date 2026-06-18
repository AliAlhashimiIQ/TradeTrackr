const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gfodubbocdhjckgiualw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmb2R1YmJvY2RoamNrZ2l1YWx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk1NjgxNCwiZXhwIjoyMDkyNTMyODE0fQ.wuqSk6RTWrMkpQv7O4FV6vpwiTLU4F1M-xBFxvmJYks';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying schema for trades table...');
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching trades:', error);
  } else {
    console.log('Success! Columns in trades table:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No data found, but request succeeded.');
    }
  }
}

main();
