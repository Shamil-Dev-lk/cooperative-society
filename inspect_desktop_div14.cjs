const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const desktopFolder = 'C:\\Users\\USER\\Desktop\\2025.12.31 දිනට පියවන ලද ඡන්ද හිමි සාමාජික නාම ලේඛනය මහව';
const files = fs.readdirSync(desktopFolder).filter(f => f.startsWith('14 '));

if (files.length > 0) {
  const filePath = path.join(desktopFolder, files[0]);
  console.log(`Found file on Desktop: ${files[0]}`);

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Total Rows on Desktop File 14: ${data.length}`);
  for (let r = 0; r < Math.min(15, data.length); r++) {
    if (data[r] && data[r].length > 0) {
      console.log(`Row ${r}:`, data[r].filter(Boolean).slice(0, 4));
    }
  }
} else {
  console.log('File 14 not found on Desktop.');
}
