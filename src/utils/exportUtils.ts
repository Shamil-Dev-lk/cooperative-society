// PDF export uses browser HTML print (supports Sinhala Unicode via Noto Sans Sinhala)
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { Member, Settings } from '@/types';
import { formatDate } from './dateUtils';

// ============================================================
// PDF Export
// ============================================================

interface PDFOptions {
  title: string;
  subtitle?: string;
  settings?: Settings;
}

export function exportToPDF(members: Member[], options: PDFOptions): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableRows = members.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${m.member_no || ''}</td>
      <td>${m.name || ''}</td>
      <td>${m.nic || ''}</td>
      <td>${formatDate(m.joined_date)}</td>
      <td>${m.electoral_division?.division_name || ''}</td>
      <td>${m.category?.category_name || ''}</td>
      <td class="amount">Rs. ${(m.share_amount || 0).toLocaleString('en-LK')}</td>
    </tr>`).join('');

  const totalCapital = members.reduce((s, m) => s + (m.share_amount || 0), 0);

  printWindow.document.write(`<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8" />
  <title>${options.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Noto Sans Sinhala", "Noto Sans", "Nirmala UI", "Iskoola Pota", "Arial Unicode MS", sans-serif;
      font-size: 9.5px;
      color: #222;
      background: white;
    }
    .page { padding: 12mm 14mm; }
    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #CC0000; padding-bottom: 8px; }
    .header h1 { font-size: 17px; font-weight: 700; color: #CC0000; margin-bottom: 3px; }
    .header h2 { font-size: 12px; font-weight: 600; color: #444; margin-bottom: 3px; }
    .header .meta { font-size: 8.5px; color: #777; }
    .summary { display: flex; gap: 20px; justify-content: center; margin: 8px 0; font-size: 9px; color: #555; }
    .summary span { background: #fff0f0; border: 1px solid #ffcccc; border-radius: 4px; padding: 3px 10px; }
    .summary strong { color: #CC0000; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      background: #CC0000;
      color: white;
      padding: 5px 6px;
      font-size: 9px;
      font-weight: 700;
      text-align: left;
      border: 1px solid #aa0000;
    }
    td {
      padding: 4px 6px;
      border: 1px solid #e0e0e0;
      font-size: 9px;
      vertical-align: middle;
    }
    tr:nth-child(even) td { background: #fff8f8; }
    tr:hover td { background: #ffe8e8; }
    .amount { text-align: right; font-weight: 600; color: #1a7a1a; }
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px solid #eee;
      font-size: 8px;
      color: #999;
    }
    @media print {
      @page { size: A4 landscape; margin: 10mm 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${options.settings?.society_name || 'Cooperative Society'}</h1>
      <h2>${options.title}</h2>
      <div class="meta">Generated: ${new Date().toLocaleString('si-LK')}</div>
    </div>
    <div class="summary">
      <span>මුළු සාමාජිකයන්: <strong>${members.length}</strong></span>
      <span>මුළු ප්‍රාග්ධනය: <strong>Rs. ${totalCapital.toLocaleString('en-LK')}</strong></span>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>සාමාජික අංකය</th>
          <th>නම</th>
          <th>ජා.හැ.අංකය</th>
          <th>සාමාජිකවූ දිනය</th>
          <th>ඡන්ද කොට්ඨාශය</th>
          <th>වර්ගය</th>
          <th>කොටස් ප්‍රාග්ධනය</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    <div class="footer">
      ${options.settings?.society_name || ''} &nbsp;|&nbsp; ${new Date().toLocaleDateString('si-LK')} &nbsp;|&nbsp; Total ${members.length} members
    </div>
  </div>
  <script>
    document.fonts.ready.then(function() {
      setTimeout(function() { window.print(); }, 500);
    });
  </script>
</body>
</html>`);
  printWindow.document.close();
}



// ============================================================
// Excel Export
// ============================================================

export function exportToExcel(members: Member[], title: string): void {
  const wsData = [
    [title],
    [`Generated: ${new Date().toLocaleString('en-LK')}`],
    [],
    ['#', 'Member No', 'Name', 'NIC', 'Joined Date', 'Division', 'Category', 'Share Amount'],
    ...members.map((m, i) => [
      i + 1,
      m.member_no,
      m.name,
      m.nic,
      formatDate(m.joined_date),
      m.electoral_division?.division_name || '',
      m.category?.category_name || '',
      m.share_amount || 0,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
    { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Members');

  const filename = `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================================
// CSV Export
// ============================================================

export function exportToCSV(members: Member[], title: string): void {
  const rows = members.map((m) => ({
    'Member No': m.member_no,
    'Name': m.name,
    'NIC': m.nic,
    'Address': m.address,
    'Joined Date': formatDate(m.joined_date),
    'Division': m.electoral_division?.division_name || '',
    'Category': m.category?.category_name || '',
    'Share Amount': m.share_amount || 0,
  }));

  const csv = Papa.unparse(rows);
  const bom = '\uFEFF'; // UTF-8 BOM for Sinhala support
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Print
// ============================================================

export function printReport(title: string, htmlContent: string, societyName: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="si">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        body {
          font-family: "Nirmala UI", "Noto Sans Sinhala", "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #333;
          margin: 20px;
        }
        h1 { color: #CC0000; text-align: center; font-size: 18px; margin-bottom: 4px; }
        h2 { text-align: center; font-size: 13px; font-weight: normal; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #CC0000; color: #fff; padding: 6px 8px; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #fff5f5; }
        .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #666; }
        @media print {
          @page { margin: 15mm; }
        }
      </style>
    </head>
    <body>
      <h1>${societyName}</h1>
      <h2>${title}</h2>
      ${htmlContent}
      <div class="footer">
        Generated on ${new Date().toLocaleString('en-LK')} — ${societyName}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// ============================================================
// Division & Category Summary Reports
// ============================================================

export function exportDivisionReportToExcel(
  data: { division: string; count: number; shareCapital: number }[],
  title: string
): void {
  const wsData = [
    [title],
    [`Generated: ${new Date().toLocaleString('en-LK')}`],
    [],
    ['Division', 'Member Count', 'Total Share Capital'],
    ...data.map((d) => [d.division, d.count, d.shareCapital]),
    [],
    ['Total', data.reduce((s, d) => s + d.count, 0), data.reduce((s, d) => s + d.shareCapital, 0)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Division Report');
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
}
