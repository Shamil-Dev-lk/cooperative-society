const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msvcwhqvsqtdtwqequkq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDI2MSwiZXhwIjoyMTAzOTkwMjYxfQ.1UeK3NaD7q92lXTRSW2qtORjSx8GYQgOSnZdHk57uZg';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: members } = await supabase
    .from('members')
    .select('id, member_no, name, address')
    .limit(20);

  console.log('=== Sample 20 Members in Database ===');
  if (members) {
    members.forEach(m => {
      console.log(`Member No: ${m.member_no} | Name: ${m.name} | Address: ${m.address}`);
    });
  }
}

run();
