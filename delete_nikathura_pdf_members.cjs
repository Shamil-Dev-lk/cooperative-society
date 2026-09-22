const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnzkownqbkhifenzsgxf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NTEzOCwiZXhwIjoyMDk2NzQxMTM4fQ.cje1YyRyrNyONlwhbE0pg655J2rwI2dXf5KLHIXW5Wo';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const divisionId = 'a16d8049-a5ad-4dfc-9f5f-68c3beb688f6'; // ID for නික - උතුර
  console.log(`=== Deleting Members in Division ID: ${divisionId} (නික - උතුර) ===`);

  const { data, count, error } = await supabase
    .from('members')
    .delete({ count: 'exact' })
    .eq('electoral_division_id', divisionId);

  if (error) {
    console.log('Error deleting members:', error.message);
  } else {
    console.log(`🎉 REMOVED SUCCESSFULLY! Deleted ${count || 0} members from Division: නික - උතුර`);
  }
}

run();
