const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msvcwhqvsqtdtwqequkq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDI2MSwiZXhwIjoyMTAzOTkwMjYxfQ.1UeK3NaD7q92lXTRSW2qtORjSx8GYQgOSnZdHk57uZg';

const supabase = createClient(supabaseUrl, serviceKey);

// Legacy FM-Abhaya converter mapping
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
  console.log('=== Ultimate Multi-Sheet Sinhala Member Updater Starting ===');

  const folders = [
    'C:\\Users\\USER\\Downloads\\Co-op',
    'C:\\Users\\USER\\Desktop\\2025.12.31 දිනට පියවන ලද ඡන්ද හිමි සාමාජික නාම ලේඛනය මහව'
  ];

  const memberUpdates = new Map(); // Map member_no -> { name, address }

  for (const coopFolder of folders) {
    if (!fs.existsSync(coopFolder)) continue;
    const files = fs.readdirSync(coopFolder).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

    for (const f of files) {
      const filePath = path.join(coopFolder, f);
      try {
        const wb = XLSX.readFile(filePath);
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length < 3) continue;

            let memberNo = String(row[1] || '').trim();
            let rawName = String(row[2] || '').trim();
            let rawAddress = String(row[3] || '').trim();

            if (!memberNo || !rawName || rawName === 'නම' || rawName.includes('kdu')) continue;

            let cleanName = rawName;
            let cleanAddress = rawAddress;

            if (/[a-zA-Z]/.test(rawName) && !/[a-zA-Z]{6,}/.test(rawName)) {
              cleanName = convertFmToUnicode(rawName);
            }
            if (/[a-zA-Z]/.test(rawAddress) && !/[a-zA-Z]{8,}/.test(rawAddress)) {
              cleanAddress = convertFmToUnicode(rawAddress);
            }

            if (cleanName && !cleanName.includes('?')) {
              memberUpdates.set(memberNo, {
                member_no: memberNo,
                name: cleanName,
                address: cleanAddress,
              });
            }
          }
        }
      } catch (err) {
        console.log(`Error reading ${f}: ${err.message}`);
      }
    }
  }

  const updatesList = Array.from(memberUpdates.values());
  console.log(`Total Unique Clean Sinhala Member Records Found Across All Sheets: ${updatesList.length}`);

  // High-speed parallel updater (10 workers)
  const concurrency = 10;
  let index = 0;
  let totalDone = 0;

  async function worker() {
    while (index < updatesList.length) {
      const i = index;
      index += 50;
      const chunk = updatesList.slice(i, i + 50);
      if (chunk.length === 0) break;

      await Promise.all(
        chunk.map(item =>
          supabase
            .from('members')
            .update({ name: item.name, address: item.address })
            .eq('member_no', item.member_no)
        )
      );

      totalDone += chunk.length;
      const pct = Math.round((totalDone / updatesList.length) * 100);
      console.log(`Progress: ${totalDone} / ${updatesList.length} (${pct}% complete)`);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log(`🎉 ALL ${totalDone} MEMBER NAMES & ADDRESSES RESTORED TO SINHALA UNICODE ACROSS ALL SHEETS!`);
}

run();
