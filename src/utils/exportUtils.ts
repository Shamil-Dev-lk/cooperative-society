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
  const tableRows = members.map((m, i) => `<tr>
    <td>${i + 1}</td>
    <td>${m.member_no || ''}</td>
    <td>${m.name || ''}</td>
    <td>${m.address || ''}</td>
    <td>${m.nic || ''}</td>
    <td>${formatDate(m.joined_date)}</td>
    <td>${m.electoral_division?.division_name || ''}</td>
    <td>${m.category?.category_name || ''}</td>
    <td style="text-align:right;font-weight:600;color:#1a7a1a">Rs. ${(m.share_amount || 0).toLocaleString('en-LK')}</td>
  </tr>`).join('');

  const totalCapital = members.reduce((s, m) => s + (m.share_amount || 0), 0);
  const societyName = options.settings?.society_name || 'Cooperative Society';

  const html = `<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8"/>
  <title>${options.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Noto Sans Sinhala','Noto Sans','Nirmala UI','Iskoola Pota',Arial,sans-serif;
      font-size:10px;color:#222;background:#fff;
    }
    .no-print{background:#CC0000;color:#fff;border:none;padding:10px 28px;font-size:14px;
      border-radius:6px;cursor:pointer;display:block;margin:16px auto;font-weight:700}
    .no-print:hover{background:#aa0000}
    .page{padding:10mm 14mm}
    .header{text-align:center;border-bottom:2.5px solid #CC0000;padding-bottom:8px;margin-bottom:8px}
    .header h1{font-size:17px;font-weight:700;color:#CC0000;margin-bottom:3px}
    .header h2{font-size:12px;color:#444;font-weight:600;margin-bottom:2px}
    .header small{font-size:8px;color:#888}
    .stats{display:flex;gap:16px;justify-content:center;margin:8px 0;font-size:9px}
    .stat{background:#fff0f0;border:1px solid #ffcccc;border-radius:4px;padding:3px 10px}
    .stat b{color:#CC0000}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    thead{display:table-header-group}
    tr{page-break-inside:avoid}
    th{background:#CC0000;color:#fff;padding:5px 5px;font-size:8.5px;font-weight:700;
      text-align:left;border:1px solid #aa0000}
    td{padding:4px 5px;border:1px solid #ddd;font-size:9px;vertical-align:middle}
    tr:nth-child(even) td{background:#fff8f8}
    .footer{text-align:center;margin-top:10px;font-size:8px;color:#aaa;border-top:1px solid #eee;padding-top:6px}
    @media print{
      .no-print{display:none!important}
      @page{size:A4 landscape;margin:8mm 12mm}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="page">
    <div class="header">
      <h1>${societyName}</h1>
      <h2>${options.title}</h2>
      <small>Generated: ${new Date().toLocaleString('en-LK')}</small>
    </div>
    <div class="stats">
      <div class="stat">Total Members: <b>${members.length}</b></div>
      <div class="stat">Total Share Capital: <b>Rs. ${totalCapital.toLocaleString('en-LK')}</b></div>
    </div>
    <table>
      <thead><tr>
        <th>#</th>
        <th>Member No</th>
        <th>Name</th>
        <th>ලිපිනය</th>
        <th>NIC</th>
        <th>Joined Date</th>
        <th>Division</th>
        <th>Category</th>
        <th>Share Amount</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">${societyName} | ${new Date().toLocaleDateString('en-LK')} | ${members.length} members</div>
  </div>
</body>
</html>`;

  // Use blob URL — avoids popup blocker, works in all browsers
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}


// ============================================================
// Excel Export
// ============================================================


export function exportToExcel(members: Member[], title: string): void {
  const wsData = [
    [title],
    [`Generated: ${new Date().toLocaleString('en-LK')}`],
    [],
    ['#', 'Member No', 'Name', 'ලිපිනය', 'NIC', 'Joined Date', 'Division', 'Category', 'Share Amount'],
    ...members.map((m, i) => [
      i + 1,
      m.member_no,
      m.name,
      m.address || '',
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
    { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 35 },
    { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
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

// ============================================================
// System Users Export
// ============================================================

export interface SystemUserExportItem {
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export function exportUsersToPDF(users: SystemUserExportItem[], societyName: string = 'Cooperative Society'): void {
  const tableRows = users.map((u, i) => `<tr>
    <td>${i + 1}</td>
    <td><b>${u.email}</b></td>
    <td><span style="padding:2px 8px;border-radius:12px;font-size:8px;font-weight:700;background:${u.role === 'ADMIN' ? '#f3e8ff;color:#7e22ce' : '#dbeafe;color:#1d4ed8'}">${u.role}</span></td>
    <td>${formatDate(u.created_at)}</td>
    <td>${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('en-LK') : 'Never'}</td>
  </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8"/>
  <title>System Users Account List</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans Sinhala','Noto Sans',sans-serif;font-size:10px;color:#222;background:#fff;padding:12mm}
    .no-print{background:#CC0000;color:#fff;border:none;padding:10px 24px;font-size:13px;border-radius:6px;cursor:pointer;display:block;margin:0 auto 16px;font-weight:700}
    .header{text-align:center;border-bottom:2px solid #CC0000;padding-bottom:10px;margin-bottom:12px}
    .header h1{font-size:18px;color:#CC0000;margin-bottom:2px}
    .header h2{font-size:12px;color:#444;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#CC0000;color:#fff;padding:6px;font-size:9px;text-align:left}
    td{padding:6px;border-bottom:1px solid #eee;font-size:9.5px}
    tr:nth-child(even) td{background:#fafafa}
    .footer{text-align:center;margin-top:16px;font-size:8px;color:#888}
    @media print{.no-print{display:none!important}}
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="header">
    <h1>${societyName}</h1>
    <h2>System User Accounts List (පරිශීලක ගිණුම් ලේඛනය)</h2>
    <small>Generated: ${new Date().toLocaleString('en-LK')} | Total Users: ${users.length}</small>
  </div>
  <table>
    <thead><tr>
      <th>#</th>
      <th>User Email</th>
      <th>Role</th>
      <th>Created Date</th>
      <th>Last Sign In</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">${societyName} Management System</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function exportUsersToExcel(users: SystemUserExportItem[], societyName: string = 'Cooperative Society'): void {
  const wsData = [
    [`${societyName} — System User Accounts List`],
    [`Generated: ${new Date().toLocaleString('en-LK')}`],
    [],
    ['#', 'User Email', 'Role', 'Created Date', 'Last Sign In'],
    ...users.map((u, i) => [
      i + 1,
      u.email,
      u.role,
      formatDate(u.created_at),
      u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('en-LK') : 'Never',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 25 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'User Accounts');
  XLSX.writeFile(wb, `User_Accounts_${Date.now()}.xlsx`);
}

export function exportUsersToCSV(users: SystemUserExportItem[]): void {
  const rows = users.map((u) => ({
    'Email': u.email,
    'Role': u.role,
    'Created Date': formatDate(u.created_at),
    'Last Sign In': u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('en-LK') : 'Never',
  }));

  const csv = Papa.unparse(rows);
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `User_Accounts_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Download Login Credentials Slip PDF / HTML
export function downloadAccountSlip(
  email: string,
  role: string,
  password?: string,
  societyName: string = 'Cooperative Society'
): void {
  const portalUrl = 'https://shamil-dev-lk.github.io/login';
  const html = `<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8"/>
  <title>Login Credentials — ${email}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans Sinhala','Noto Sans',sans-serif;background:#f8fafc;padding:30px;color:#1e293b}
    .card{max-width:500px;margin:0 auto;background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:28px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1)}
    .header{text-align:center;border-bottom:2px dashed #cbd5e1;padding-bottom:16px;margin-bottom:20px}
    .header h1{color:#CC0000;font-size:20px;margin-bottom:4px}
    .header p{font-size:12px;color:#64748b;font-weight:600}
    .field{margin-bottom:14px;background:#f1f5f9;padding:12px 16px;border-radius:10px}
    .label{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:700;margin-bottom:2px}
    .val{font-size:14px;font-weight:700;color:#0f172a;word-break:break-all}
    .val-pwd{font-family:monospace;font-size:16px;color:#CC0000;letter-spacing:1px}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;background:${role === 'ADMIN' ? '#f3e8ff;color:#7e22ce' : '#dbeafe;color:#1d4ed8'}}
    .notice{margin-top:20px;background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:10px;font-size:10.5px;color:#991b1b;line-height:1.4}
    .btn-print{background:#CC0000;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;width:100%;margin-top:20px}
    @media print{.btn-print{display:none!important}body{padding:0;background:#fff}.card{box-shadow:none;border-color:#ccc}}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${societyName}</h1>
      <p>System User Access & Login Slip</p>
      <p style="font-size:10px;color:#94a3b8;margin-top:2px">පරිශීලක ගිණුම් පිවිසුම් පත්‍රිකාව</p>
    </div>

    <div class="field">
      <div class="label">Login Portal Web Address</div>
      <div class="val" style="color:#0284c7;font-size:13px">${portalUrl}</div>
    </div>

    <div class="field">
      <div class="label">User Account Email / විද්‍යුත් තැපෑල</div>
      <div class="val">${email}</div>
    </div>

    ${password ? `<div class="field" style="background:#fff1f1;border:1px solid #ffe4e4">
      <div class="label" style="color:#991b1b">Password / මුරපදය</div>
      <div class="val val-pwd">${password}</div>
    </div>` : ''}

    <div class="field">
      <div class="label">User Role / තනතුර</div>
      <div style="margin-top:2px"><span class="badge">${role}</span></div>
    </div>

    <div class="field">
      <div class="label">Issued Date & Time</div>
      <div class="val" style="font-size:11px;font-weight:600;color:#475569">${new Date().toLocaleString('en-LK')}</div>
    </div>

    <div class="notice">
      <b>⚠️ SECURITY NOTICE:</b> Please change your password upon your first login. Do not share your login credentials with unauthorized personnel.
    </div>

    <button class="btn-print" onclick="window.print()">Print / Download Slip (PDF)</button>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

