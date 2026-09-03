const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const coopFolder = 'C:\\Users\\USER\\Downloads\\Co-op';
const file14Path = path.join(coopFolder, '14 වම්බටුවැව @.xlsx');

const wb = XLSX.readFile(file14Path);
console.log(`Sheets in File 14: ${wb.SheetNames.join(', ')}`);

wb.SheetNames.forEach((sheetName, sIdx) => {
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Sheet [${sIdx}] '${sheetName}': ${data.length} rows`);
  if (data.length > 0) {
    for (let r = 0; r < Math.min(10, data.length); r++) {
      if (data[r] && data[r].length > 0) {
        console.log(`  Row ${r}:`, data[r].filter(Boolean).slice(0, 4));
      }
    }
  }
});
