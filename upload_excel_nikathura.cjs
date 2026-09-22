const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnzkownqbkhifenzsgxf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NTEzOCwiZXhwIjoyMDk2NzQxMTM4fQ.cje1YyRyrNyONlwhbE0pg655J2rwI2dXf5KLHIXW5Wo';

const supabase = createClient(supabaseUrl, serviceKey);

const excelPath = 'C:\\Users\\USER\\Downloads\\01 නික-උතුර   + (1).xlsx';

async function run() {
  console.log('=== Reading Excel File: 01 නික-උතුර + (1).xlsx ===');

  if (!fs.existsSync(excelPath)) {
    console.log('Excel file not found:', excelPath);
    return;
  }

  const divisionId = '24203ac6-fff0-46f2-9a71-a39b55ca6b06'; // Exact ID for නික - උතුර
  console.log(`Target Division ID: ${divisionId} (නික - උතුර)`);

  const { data: catData } = await supabase.from('categories').select('id').limit(1).single();
  const categoryId = catData ? catData.id : null;

  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Total Rows in Sheet: ${data.length}`);

  const membersToUpload = [];

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length < 3) continue;

    let memberNo = String(row[1] || '').trim();
    let rawName = String(row[2] || '').trim();
    let rawAddress = String(row[3] || '').trim();

    if (!memberNo || !rawName || rawName === 'නම' || rawName.includes('kdu')) continue;

    if (!memberNo.startsWith('01/')) {
      if (/^\d+$/.test(memberNo)) {
        memberNo = `01/${memberNo}`;
      }
    }

    membersToUpload.push({
      member_no: memberNo,
      name: rawName,
      address: rawAddress || '',
      electoral_division_id: divisionId,
      category_id: categoryId,
      share_amount: 10,
      joined_date: new Date().toISOString().split('T')[0]
    });
  }

  console.log(`Extracted ${membersToUpload.length} members from Excel.`);

  let uploaded = 0;
  for (let i = 0; i < membersToUpload.length; i += 500) {
    const batch = membersToUpload.slice(i, i + 500);
    const { error } = await supabase
      .from('members')
      .upsert(batch, { onConflict: 'member_no', ignoreDuplicates: true });

    if (error) {
      console.log(`Error batch ${i}: ${error.message}`);
    } else {
      uploaded += batch.length;
      console.log(`Uploaded ${uploaded} / ${membersToUpload.length}...`);
    }
  }

  console.log(`🎉 HIGH-SPEED EXCEL UPLOAD COMPLETE! ${uploaded} Members Uploaded to Division: නික - උතුර`);
}

run();
