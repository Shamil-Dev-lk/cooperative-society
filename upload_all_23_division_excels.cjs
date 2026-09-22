const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnzkownqbkhifenzsgxf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NTEzOCwiZXhwIjoyMDk2NzQxMTM4fQ.cje1YyRyrNyONlwhbE0pg655J2rwI2dXf5KLHIXW5Wo';

const supabase = createClient(supabaseUrl, serviceKey);

const divisionMap = {
  '01': { id: '24203ac6-fff0-46f2-9a71-a39b55ca6b06', name: 'නික - උතුර' },
  '02': { id: 'eb6b1039-082d-4588-a735-ca959245248d', name: 'කටගමුව' },
  '03': { id: 'e86dc7db-98ea-490f-a440-8978e75a0a3e', name: 'හල්මිල්ලෑව' },
  '04': { id: '7de6da7b-2124-47d4-b0f0-3956b0c37a6b', name: 'දන්ඩුවාව' },
  '05': { id: 'ecaf0eb1-b085-42f8-862e-54fddd76a641', name: 'හීලෝගම' },
  '06': { id: '8fe51dae-4227-4765-92f9-8a2e3998a497', name: 'කිවුලේගම' },
  '07': { id: '0cad6b7b-5fef-4900-932a-a906f80cf0b7', name: 'රස්නායකපුර' },
  '08': { id: '0ed918ba-b4e6-4a7e-8d78-9486deb7de1c', name: 'මොන්නෑකුලම' },
  '09': { id: '6d746ac5-62f2-4e7d-86c5-0ce2baa659e2', name: 'තඹරොඹුව' },
  '10': { id: 'ee151fa0-2811-44fa-bdcf-aad6f5ca3331', name: 'මීවැල්ලෑව' },
  '11': { id: '12514d8b-05dc-408b-a1c5-08f793409e99', name: 'ගිරිල්ල' },
  '12': { id: 'd0ca3bd3-04fc-429c-889d-c21fee10a63b', name: 'මහකිරින්ද' },
  '14': { id: '540e3bc7-68c0-4a26-bbed-89397cb89483', name: 'වම්බටුවැව' },
  '15': { id: 'dd3e845e-c502-4bc6-b401-baab0dc24c95', name: 'පින්නපොලේගම' },
  '16': { id: '0ef91ae2-5165-4c22-ac08-d20d0df1b135', name: 'කඩිගාව' },
  '17': { id: '09383267-d569-4900-8413-121e8b13f17c', name: 'එළගම්මිල්ලව' },
  '18': { id: '30a6a3da-5127-47f8-a92b-4e42d14732e3', name: 'නාවාන' },
  '19': { id: 'df12b02e-c973-4578-ae02-56997a49eb04', name: 'දළුක්ගොල්ල' },
  '21': { id: 'd14d2380-60cf-4a8b-82e4-9943133c202b', name: 'කැබැල්ලෑව' },
  '28': { id: '8d23a4e7-2445-48bd-866d-64d645ac6e3e', name: 'නික - දකුණ' },
  '29': { id: 'f003fe3b-b820-4b95-b3ce-b191cccfcfb2', name: 'නීරාලියද්ද' },
  '30': { id: '828379b4-8af7-439b-9778-8384bf0d521a', name: 'මහමිතව' },
  '40': { id: '6d605efe-fb82-44b0-aa5d-636962cb2645', name: 'කිරිදිගල්ල' },
};

function convertFmToUnicode(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  const map = [
    ['fI', 'ශී'], ['fS', 'ෂී'], ['fõ', 'වේ'], ['fÜ', 'ටේ'], ['f¾', 'රේ'], ['fº', 'රේ'],
    ['fÄ', 'ඛේ'], ['fé', 'චේ'], ['fÉ', 'ඡේ'], ['fÖ', 'ජේ'], ['fÒ', 'ඣේ'], ['fඤ', 'ඤේ'],
    ['fඥ', 'ඥේ'], ['fඨ', 'ඨේ'], ['fඩ', 'ඩේ'], ['fඪ', 'ඪේ'], ['fණ', 'ණේ'], ['fත', 'තේ'],
    ['fථ', 'ථේ'], ['fද', 'දේ'], ['fධ', 'ධේ'], ['fන', 'නේ'], ['fප', 'පේ'], ['fඵ', 'ඵේ'],
    ['fබ', 'බේ'], ['fභ', 'භේ'], ['fම', 'මේ'], ['fය', 'යේ'], ['fර', 'රේ'], ['fල', 'ලේ'],
    ['fව', 'වේ'], ['fශ', 'ශේ'], ['fෂ', 'ෂේ'], ['fස', 'සේ'], ['fහ', 'හේ'], ['fළ', 'ළේ'],
    ['fෆ', 'ෆේ'], ['fග', 'ගේ'], ['fක', 'කේ'],
    ['fm', 'පෙ'], ['f', 'ෙ'], ['=', 'ඃ'], ['%', '්‍ර'], ['&', '්‍ය'],
    ['a', '්'], ['s', 'ි'], ['d', 'ා'], ['f', 'ෙ'], ['g', 'ට'], ['h', 'ය'],
    ['j', 'ව'], ['k', 'න'], ['l', 'ක'], [';', 'ත'], ['z', 'ූ'], ['x', 'ං'],
    ['c', 'ජ'], ['v', 'ඩ'], ['b', 'ඉ'], ['n', 'බ'], ['m', 'ප'], ['q', 'ු'],
    ['w', 'අ'], ['e', 'ැ'], ['r', 'ර'], ['t', 'ඔ'], ['y', 'හ'], ['u', 'ම'],
    ['i', 'ස'], ['o', 'ද'], ['p', 'ච'], ['[', 'ඤ'], [']', 'ඡ'], ['\\', 'ඝ'],
    ['A', '්'], ['S', 'ී'], ['D', 'ෘ'], ['F', 'ේ'], ['G', 'ඨ'], ['H', '්‍ය'],
    ['J', 'ළු'], ['K', 'ණ'], ['L', 'ඛ'], [':', 'ථ'], ['"', 'ඡ'], ['Z', 'ූ'],
    ['X', 'ං'], ['C', 'ඣ'], ['V', 'ඪ'], ['B', 'ඊ'], ['N', 'භ'], ['M', 'ඵ'],
    ['Q', 'ූ'], ['W', 'උ'], ['E', 'ෑ'], ['R', 'ඍ'], ['T', 'ඕ'], ['Y', 'ශ'],
    ['U', 'ඹ'], ['I', 'ෂ'], ['O', 'ධ'], ['P', 'ඡ'], ['{', 'ඥ'], ['}', 'ළු'],
    ['|', 'ඬ']
  ];

  for (const [from, to] of map) {
    str = str.split(from).join(to);
  }
  return str;
}

async function run() {
  console.log('=== Master 23 Division Excel Uploader Starting ===');

  const { data: catData } = await supabase.from('categories').select('id').limit(1).single();
  const categoryId = catData ? catData.id : null;

  const coopFolder = 'C:\\Users\\USER\\Downloads\\Co-op';
  const files = fs.readdirSync(coopFolder).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

  console.log(`Found ${files.length} division Excel files in Downloads/Co-op`);

  let grandTotalUploaded = 0;

  for (const f of files) {
    const codeMatch = f.match(/^(\d{2})/);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    const divInfo = divisionMap[code];
    if (!divInfo) continue;

    console.log(`\n--------------------------------------------------`);
    console.log(`Processing Division ${code}: ${divInfo.name} (File: ${f})`);

    const filePath = path.join(coopFolder, f);
    try {
      const wb = XLSX.readFile(filePath);
      const membersToUpload = [];

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!data || data.length === 0) continue;

        for (let r = 0; r < data.length; r++) {
          const row = data[r];
          if (!row || row.length < 3) continue;

          let memberNo = String(row[1] || '').trim();
          let rawName = String(row[2] || '').trim();
          let rawAddress = String(row[3] || '').trim();

          if (!memberNo || !rawName || rawName === 'නම' || rawName.includes('kdu')) continue;

          if (!memberNo.startsWith(`${code}/`)) {
            if (/^\d+$/.test(memberNo)) {
              memberNo = `${code}/${memberNo}`;
            }
          }

          let cleanName = rawName;
          let cleanAddress = rawAddress;

          if (/[a-zA-Z]/.test(rawName) && !/[a-zA-Z]{6,}/.test(rawName)) {
            cleanName = convertFmToUnicode(rawName);
          }
          if (/[a-zA-Z]/.test(rawAddress) && !/[a-zA-Z]{8,}/.test(rawAddress)) {
            cleanAddress = convertFmToUnicode(rawAddress);
          }

          membersToUpload.push({
            member_no: memberNo,
            name: cleanName,
            address: cleanAddress || '',
            electoral_division_id: divInfo.id,
            category_id: categoryId,
            share_amount: 10,
            joined_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      console.log(`Extracted ${membersToUpload.length} members for ${divInfo.name}`);

      if (membersToUpload.length > 0) {
        let divUploaded = 0;
        for (let i = 0; i < membersToUpload.length; i += 500) {
          const batch = membersToUpload.slice(i, i + 500);
          const { error } = await supabase
            .from('members')
            .upsert(batch, { onConflict: 'member_no', ignoreDuplicates: true });

          if (!error) {
            divUploaded += batch.length;
          } else {
            console.log(`Error batch: ${error.message}`);
          }
        }
        grandTotalUploaded += divUploaded;
        console.log(`✅ Uploaded ${divUploaded} members to Division ${divInfo.name}!`);
      }
    } catch (err) {
      console.log(`Error processing file ${f}: ${err.message}`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 ALL DIVISIONS UPLOADED SUCCESSFULLY! Total Members: ${grandTotalUploaded}`);
}

run();
