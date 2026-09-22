const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnzkownqbkhifenzsgxf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NTEzOCwiZXhwIjoyMDk2NzQxMTM4fQ.cje1YyRyrNyONlwhbE0pg655J2rwI2dXf5KLHIXW5Wo';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('=== Clearing ALL Members from Database (Keeping Divisions) ===');

  const { count, error } = await supabase
    .from('members')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.log('Error clearing members:', error.message);
  } else {
    console.log(`🎉 ALL MEMBERS REMOVED SUCCESSFULLY! Deleted ${count || 0} member records.`);
  }

  const { count: divCount } = await supabase.from('electoral_divisions').select('*', { count: 'exact', head: true });
  console.log(`Verified Divisions Remaining in Database: ${divCount} Divisions.`);
}

run();
