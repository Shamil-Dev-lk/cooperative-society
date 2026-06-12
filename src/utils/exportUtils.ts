import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(204, 0, 0);
  doc.text(options.settings?.society_name || 'Cooperative Society', doc.internal.pageSize.width / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  doc.text(options.title, doc.internal.pageSize.width / 2, 23, { align: 'center' });

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, doc.internal.pageSize.width / 2, 30, { align: 'center' });
  }

  const generatedAt = `Generated: ${new Date().toLocaleString('en-LK')}`;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(generatedAt, 14, 30);

  // Table
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Member No', 'Name', 'NIC', 'Joined Date', 'Division', 'Category', 'Share Amount']],
    body: members.map((m, i) => [
      i + 1,
      m.member_no,
      m.name,
      m.nic,
      formatDate(m.joined_date),
      m.electoral_division?.division_name || '',
      m.category?.category_name || '',
      `Rs. ${(m.share_amount || 0).toLocaleString('en-LK')}`,
    ]),
    headStyles: {
      fillColor: [204, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [51, 51, 51] },
    alternateRowStyles: { fillColor: [255, 245, 245] },
    styles: { font: 'helvetica', cellPadding: 2 },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const currentPage = data.pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 5,
        { align: 'center' }
      );
      doc.text(
        options.settings?.society_name || '',
        14,
        doc.internal.pageSize.height - 5
      );
    },
  });

  const filename = `${options.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
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
