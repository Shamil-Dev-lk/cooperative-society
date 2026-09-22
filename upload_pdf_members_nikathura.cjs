const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnzkownqbkhifenzsgxf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NTEzOCwiZXhwIjoyMDk2NzQxMTM4fQ.cje1YyRyrNyONlwhbE0pg655J2rwI2dXf5KLHIXW5Wo';

const supabase = createClient(supabaseUrl, serviceKey);

const pdfPath = 'C:\\Users\\USER\\Downloads\\01 නික-උතුර   +.pdf';

async function run() {
  console.log('=== Reading PDF: 01 නික-උතුර +.pdf ===');

  if (!fs.existsSync(pdfPath)) {
    console.log('PDF file not found:', pdfPath);
    return;
  }

  const divisionId = 'a16d8049-a5ad-4dfc-9f5f-68c3beb688f6'; // ID for නික - උතුර
  console.log(`Target Division ID: ${divisionId} (නික - උතුර)`);

  const { data: catData } = await supabase.from('categories').select('id').limit(1).single();
  const categoryId = catData ? catData.id : null;

  const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
  console.log(`Processing ${pdf.numPages} pages...`);

  const membersToUpload = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();

    const itemsByY = {};
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!itemsByY[y]) itemsByY[y] = [];
      itemsByY[y].push({ x: item.transform[4], text: item.str });
    }

    const sortedY = Object.keys(itemsByY).map(Number).sort((a, b) => b - a);

    for (const y of sortedY) {
      const lineItems = itemsByY[y].sort((a, b) => a.x - b.x);
      const rowText = lineItems.map(i => i.text.trim()).join(' ');

      const match = rowText.match(/(01\/\d+\s?[A-Z]?)/);
      if (match) {
        const memberNo = match[1].trim();
        let cleanText = rowText.replace(match[0], '').replace(/^\d+\s+/, '').trim();

        if (cleanText) {
          membersToUpload.push({
            member_no: memberNo,
            name: cleanText,
            electoral_division_id: divisionId,
            category_id: categoryId,
            share_amount: 10,
            joined_date: new Date().toISOString().split('T')[0]
          });
        }
      }
    }
  }

  console.log(`Extracted ${membersToUpload.length} members from PDF.`);

  let uploaded = 0;
  for (let i = 0; i < membersToUpload.length; i += 200) {
    const batch = membersToUpload.slice(i, i + 200);
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

  console.log(`🎉 PDF IMPORT COMPLETE! ${uploaded} Members Uploaded to Division: නික - උතුර`);
}

run();
