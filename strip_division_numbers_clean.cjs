const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msvcwhqvsqtdtwqequkq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDI2MSwiZXhwIjoyMTAzOTkwMjYxfQ.1UeK3NaD7q92lXTRSW2qtORjSx8GYQgOSnZdHk57uZg';

const supabase = createClient(supabaseUrl, serviceKey);

const noNumberDivisions = [
  { id: "eb6b1039-082d-4588-a735-ca959245248d", name: "නික-උතුර" },
  { id: "e86dc7db-98ea-490f-a440-8978e75a0a3e", name: "කටගමුව" },
  { id: "7de6da7b-2124-47d4-b0f0-3956b0c37a6b", name: "හල්මිල්ලෑව" },
  { id: "ecaf0eb1-b085-42f8-862e-54fddd76a641", name: "දන්ඩුවාව" },
  { id: "8fe51dae-4227-4765-92f9-8a2e3998a497", name: "හීලෝගම" },
  { id: "0cad6b7b-5fef-4900-932a-a906f80cf0b7", name: "කිවුලේගම" },
  { id: "0ed918ba-b4e6-4a7e-8d78-9486deb7de1c", name: "රස්නායකපුර" },
  { id: "6d746ac5-62f2-4e7d-86c5-0ce2baa659e2", name: "මොන්නෑකුලම" },
  { id: "540e3bc7-68c0-4a26-bbed-89397cb89483", name: "තඹරොඹුව" },
  { id: "ee151fa0-2811-44fa-bdcf-aad6f5ca3331", name: "මීවැල්ලෑව" },
  { id: "12514d8b-05dc-408b-a1c5-08f793409e99", name: "ගිරිල්ල" },
  { id: "d0ca3bd3-04fc-429c-889d-c21fee10a63b", name: "මහකිරින්ද" },
  { id: "dd3e845e-c502-4bc6-b401-baab0dc24c95", name: "වම්බටුවැව" },
  { id: "0ef91ae2-5165-4c22-ac08-d20d0df1b135", name: "පින්නපොලේගම" },
  { id: "09383267-d569-4900-8413-121e8b13f17c", name: "කඩිගාව" },
  { id: "30a6a3da-5127-47f8-a92b-4e42d14732e3", name: "එළගම්මිල්ලව" },
  { id: "df12b02e-c973-4578-ae02-56997a49eb04", name: "නාවාන" },
  { id: "d14d2380-60cf-4a8b-82e4-9943133c202b", name: "දළුක්ගොල්ල" },
  { id: "8d23a4e7-2445-48bd-866d-64d645ac6e3e", name: "කැබැල්ලෑව" },
  { id: "f003fe3b-b820-4b95-b3ce-b191cccfcfb2", name: "නික- දකුණ" },
  { id: "828379b4-8af7-439b-9778-8384bf0d521a", name: "නීරාලියද්ද" },
  { id: "6d605efe-fb82-44b0-aa5d-636962cb2645", name: "මහමිතව" },
  { id: "b49b5d0b-ba6b-4543-b6cc-1294b6d08b32", name: "කිරිදිගල්ල" }
];

async function run() {
  console.log('=== Removing Numbers from all 23 Division Names ===');
  for (const item of noNumberDivisions) {
    await supabase.from('electoral_divisions').update({ division_name: item.name }).eq('id', item.id);
    console.log(`Clean Division: ${item.name}`);
  }
  console.log('🎉 Numbers Removed Successfully from all 23 Divisions!');
}

run();
