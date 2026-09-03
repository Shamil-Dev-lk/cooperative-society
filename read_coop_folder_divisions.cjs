const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const coopFolder = 'C:\\Users\\USER\\Downloads\\Co-op';

if (!fs.existsSync(coopFolder)) {
  console.log('Folder not found:', coopFolder);
  process.exit(1);
}

const files = fs.readdirSync(coopFolder).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
console.log(`Found ${files.length} Excel files in C:\\Users\\USER\\Downloads\\Co-op :`);

const divisionsFound = [];

files.forEach((f, idx) => {
  console.log(`\nFile ${idx + 1}: ${f}`);
  const filePath = path.join(coopFolder, f);
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Print first 5 rows to identify division name
    for (let r = 0; r < Math.min(5, data.length); r++) {
      if (data[r] && data[r].length > 0) {
        console.log(`  Row ${r}:`, data[r].filter(Boolean).slice(0, 3).join(' | '));
      }
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
});
