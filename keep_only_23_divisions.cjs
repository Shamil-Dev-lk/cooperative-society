const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msvcwhqvsqtdtwqequkq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDI2MSwiZXhwIjoyMTAzOTkwMjYxfQ.1UeK3NaD7q92lXTRSW2qtORjSx8GYQgOSnZdHk57uZg';

const supabase = createClient(supabaseUrl, serviceKey);

const valid23Ids = [
  "eb6b1039-082d-4588-a735-ca959245248d", // 01
  "e86dc7db-98ea-490f-a440-8978e75a0a3e", // 02
  "7de6da7b-2124-47d4-b0f0-3956b0c37a6b", // 03
  "ecaf0eb1-b085-42f8-862e-54fddd76a641", // 04
  "8fe51dae-4227-4765-92f9-8a2e3998a497", // 05
  "0cad6b7b-5fef-4900-932a-a906f80cf0b7", // 06
  "0ed918ba-b4e6-4a7e-8d78-9486deb7de1c", // 07
  "6d746ac5-62f2-4e7d-86c5-0ce2baa659e2", // 08
  "540e3bc7-68c0-4a26-bbed-89397cb89483", // 09
  "ee151fa0-2811-44fa-bdcf-aad6f5ca3331", // 10
  "12514d8b-05dc-408b-a1c5-08f793409e99", // 11
  "d0ca3bd3-04fc-429c-889d-c21fee10a63b", // 12
  "dd3e845e-c502-4bc6-b401-baab0dc24c95", // 14
  "0ef91ae2-5165-4c22-ac08-d20d0df1b135", // 15
  "09383267-d569-4900-8413-121e8b13f17c", // 16
  "30a6a3da-5127-47f8-a92b-4e42d14732e3", // 17
  "df12b02e-c973-4578-ae02-56997a49eb04", // 18
  "d14d2380-60cf-4a8b-82e4-9943133c202b", // 19
  "8d23a4e7-2445-48bd-866d-64d645ac6e3e", // 21
  "f003fe3b-b820-4b95-b3ce-b191cccfcfb2", // 28
  "828379b4-8af7-439b-9778-8384bf0d521a", // 29
  "6d605efe-fb82-44b0-aa5d-636962cb2645", // 30
  "b49b5d0b-ba6b-4543-b6cc-1294b6d08b32"  // 40
];

async function run() {
  console.log('=== Cleaning Divisions Table: Keeping ONLY the 23 Divisions ===');
  
  const { data: allDivisions } = await supabase.from('electoral_divisions').select('*');
  if (!allDivisions) return;

  console.log(`Total divisions found currently: ${allDivisions.length}`);

  let deletedCount = 0;
  for (const d of allDivisions) {
    if (!valid23Ids.includes(d.id)) {
      await supabase.from('electoral_divisions').delete().eq('id', d.id);
      deletedCount++;
    }
  }

  const { data: remaining } = await supabase.from('electoral_divisions').select('id, division_name').order('division_name');
  console.log(`Deleted ${deletedCount} extra divisions.`);
  console.log(`Remaining Divisions Count: ${remaining ? remaining.length : 0}`);
  
  if (remaining) {
    remaining.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.division_name}`);
    });
  }
}

run();
