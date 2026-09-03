const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const coopFolder = 'C:\\Users\\USER\\Downloads\\Co-op';
const file14Path = path.join(coopFolder, '14 වම්බටුවැව @.xlsx');

if (fs.existsSync(file14Path)) {
  const wb = XLSX.readFile(file14Path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`File 14 Total Rows: ${data.length}`);
  for (let r = 0; r < Math.min(20, data.length); r++) {
    if (data[r] && data[r].length > 0) {
      console.log(`Row ${r}:`, data[r].filter(Boolean));
    }
  }
} else {
  console.log('File 14 not found.');
}
