const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnzkownqbkhifenzsgxf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NTEzOCwiZXhwIjoyMDk2NzQxMTM4fQ.cje1YyRyrNyONlwhbE0pg655J2rwI2dXf5KLHIXW5Wo';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: divisions } = await supabase.from('electoral_divisions').select('*');
  console.log('=== Divisions in qnzkownqbkhifenzsgxf.supabase.co ===');
  if (divisions) {
    divisions.forEach(d => console.log(`ID: ${d.id} | Name: ${d.division_name}`));
  } else {
    console.log('No divisions found.');
  }
}

run();
