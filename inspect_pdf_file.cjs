const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const pdfPath = 'C:\\Users\\USER\\Downloads\\01 නික-උතුර   +.pdf';

async function run() {
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF file not found:', pdfPath);
    return;
  }

  const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
  console.log(`Total Pages in PDF: ${pdf.numPages}`);

  for (let p = 1; p <= Math.min(3, pdf.numPages); p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    
    console.log(`\n--- Page ${p} ---`);
    const lines = textContent.items.map(i => i.str).filter(Boolean);
    console.log(lines.slice(0, 15).join(' | '));
  }
}

run();
