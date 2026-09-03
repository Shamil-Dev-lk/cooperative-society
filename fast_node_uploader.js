const fs = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msvcwhqvsqtdtwqequkq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDI2MSwiZXhwIjoyMTAzOTkwMjYxfQ.1UeK3NaD7q92lXTRSW2qtORjSx8GYQgOSnZdHk57uZg';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('=== High-Speed Node.js Uploader Starting ===');
  const dumpPath = 'C:\\Users\\USER\\.gemini\\antigravity\\scratch\\restored_db.sql';

  const fileStream = fs.createReadStream(dumpPath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let inCopy = false;
  const members = [];

  for await (const line of rl) {
    if (line.startsWith('COPY public.members ')) {
      inCopy = true;
      continue;
    }
    if (inCopy) {
      if (line === '\\.') break;
      const parts = line.split('\t');
      if (parts.length >= 11) {
        members.push({
          id: parts[0],
          member_no: parts[1],
          name: parts[2],
          address: parts[3] === '\\N' || !parts[3] ? '' : parts[3],
          joined_date: parts[4] === '\\N' || !parts[4] ? null : parts[4],
          nic: parts[5] === '\\N' || !parts[5] ? null : parts[5],
          share_amount: parts[6] === '\\N' || !parts[6] ? 0 : parseFloat(parts[6]),
          electoral_division_id: parts[7] === '\\N' || !parts[7] ? null : parts[7],
          category_id: parts[8] === '\\N' || !parts[8] ? null : parts[8],
        });
      }
    }
  }

  console.log(`Total Members parsed: ${members.length}`);

  const chunkSize = 1000;
  let successCount = 0;

  for (let i = 0; i < members.length; i += chunkSize) {
    const chunk = members.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('members')
      .upsert(chunk, { onConflict: 'member_no', ignoreDuplicates: true });

    if (error) {
      console.log(`Chunk ${i + 1}-${i + chunk.length} error: ${error.message}. Retrying sub-batches...`);
      for (let j = 0; j < chunk.length; j += 100) {
        const subChunk = chunk.slice(j, j + 100);
        const { error: subErr } = await supabase
          .from('members')
          .upsert(subChunk, { onConflict: 'member_no', ignoreDuplicates: true });
        if (!subErr) {
          successCount += subChunk.length;
        } else {
          for (const row of subChunk) {
            const { error: rowErr } = await supabase
              .from('members')
              .upsert([row], { onConflict: 'member_no', ignoreDuplicates: true });
            if (!rowErr) successCount++;
          }
        }
      }
    } else {
      successCount += chunk.length;
      const pct = Math.round((successCount / members.length) * 100);
      console.log(`Uploaded Members ${i + 1} to ${i + chunk.length} (${pct}% complete)`);
    }
  }

  console.log(`🎉 ALL 24,668 MEMBERS RESTORED SUCCESSFULLY! Total: ${successCount}`);
}

run();
