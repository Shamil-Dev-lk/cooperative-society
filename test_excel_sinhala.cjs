const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const desktopFolder = 'C:/Users/USER/Desktop/2025.12.31 දිනට පියවන ලද ඡන්ද හිමි සාමාජික නාම ලේඛනය මහව';
const files = fs.readdirSync(desktopFolder).filter(f => f.endsWith('.xlsx'));

console.log(`Found ${files.length} Excel files!`);

const sampleFile = path.join(desktopFolder, files[0]);
console.log(`Reading: ${files[0]}`);

const wb = XLSX.readFile(sampleFile);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Header row:', data[0]);
console.log('Sample Row 1:', data[1]);
console.log('Sample Row 2:', data[2]);
