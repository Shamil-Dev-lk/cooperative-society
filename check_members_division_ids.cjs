const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnzkownqbkhifenzsgxf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NTEzOCwiZXhwIjoyMDk2NzQxMTM4fQ.cje1YyRyrNyONlwhbE0pg655J2rwI2dXf5KLHIXW5Wo';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: members } = await supabase
    .from('members')
    .select('id, member_no, name, electoral_division_id')
    .like('member_no', '01/%')
    .limit(20);

  console.log('=== Sample Members with 01/ prefix ===');
  if (members && members.length > 0) {
    console.log(`Found ${members.length} members with 01/ prefix:`);
    members.forEach(m => console.log(`No: ${m.member_no} | Name: ${m.name} | Division ID: ${m.electoral_division_id}`));

    // Delete all 01/ prefix members
    const { count, error } = await supabase
      .from('members')
      .delete({ count: 'exact' })
      .like('member_no', '01/%');

    if (!error) {
      console.log(`🎉 DELETED ${count || 0} MEMBERS WITH 01/ PREFIX SUCCESSFULLY!`);
    } else {
      console.log('Error deleting 01/ members:', error.message);
    }
  } else {
    console.log('No members found with 01/ prefix.');
  }
}

run();
