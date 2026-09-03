const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msvcwhqvsqtdtwqequkq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDI2MSwiZXhwIjoyMTAzOTkwMjYxfQ.1UeK3NaD7q92lXTRSW2qtORjSx8GYQgOSnZdHk57uZg';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  // Update Division 07 to "07 තඹරොඹුව"
  await supabase
    .from('electoral_divisions')
    .update({ division_name: '07 තඹරොඹුව' })
    .eq('id', '0ed918ba-b4e6-4a7e-8d78-9486deb7de1c');

  console.log('🎉 Division 07 updated to 07 තඹරොඹුව');
}

run();
