import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import type { RawImportRow, ImportRow, ParsedMember } from '@/types';
import { normalizeDate } from '@/utils/dateUtils';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// ============================================================
// Column name mapping (Sinhala + English)
// ============================================================
const COLUMN_MAP: Record<string, keyof ParsedMember | 'ignore'> = {
  // Sinhala
  'සාමාජික අංකය': 'member_no',
  'නම': 'name',
  'ලිපිනය': 'address',
  'සාමාජික වූ දිනය': 'joined_date',
  'ජා.හැ.ප. අංකය': 'nic',
  'කොටස් මුදල': 'share_amount',
  'අනු අංකය': 'ignore',
  // Email and Phone
  'විද්‍යුත් තැපෑල': 'email',
  'email': 'email',
  'e-mail': 'email',
  'e mail': 'email',
  'දුරකථන අංකය': 'phone',
  'දුරකථනය': 'phone',
  'දුරකථන': 'phone',
  'phone': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  'mobile number': 'phone',
  'telephone': 'phone',
  'tel': 'phone',
  // English (normalized lowercase)
  'member_no': 'member_no',
  'member no': 'member_no',
  'memberno': 'member_no',
  'member number': 'member_no',
  'no': 'member_no',
  'sl no': 'member_no',
  'sl.no': 'member_no',
  'serial no': 'member_no',
  'reg no': 'member_no',
  'registration no': 'member_no',
  'name': 'name',
  'full name': 'name',
  'member name': 'name',
  'address': 'address',
  'joined_date': 'joined_date',
  'joined date': 'joined_date',
  'date': 'joined_date',
  'join date': 'joined_date',
  'registration date': 'joined_date',
  'reg date': 'joined_date',
  'nic': 'nic',
  'nic number': 'nic',
  'nic no': 'nic',
  'national id': 'nic',
  'id number': 'nic',
  'share_amount': 'share_amount',
  'share amount': 'share_amount',
  'shares': 'share_amount',
  'amount': 'share_amount',
  'capital': 'share_amount',
  'share capital': 'share_amount',
  'contribution': 'share_amount',
  'total amount': 'share_amount',
  'total capital': 'share_amount',
  'කොටස': 'share_amount',
  'කොටස් ප්‍රාග්ධනය': 'share_amount',
  'ප්‍රාග්ධනය': 'share_amount',
  'මුදල': 'share_amount',
  'කොටස් වටිනාකම': 'share_amount',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapColumn(header: string): keyof ParsedMember | 'ignore' | null {
  if (COLUMN_MAP[header.trim()]) return COLUMN_MAP[header.trim()];
  const norm = normalizeHeader(header);
  if (COLUMN_MAP[norm]) return COLUMN_MAP[norm];
  return null;
}

function buildHeaderMap(headers: string[]): Record<string, keyof ParsedMember | 'ignore' | null> {
  const map: Record<string, keyof ParsedMember | 'ignore' | null> = {};
  for (const h of headers) map[h] = mapColumn(h);
  return map;
}

function isHeaderRow(row: (string | number)[]): boolean {
  let matches = 0;
  for (const cell of row) {
    const val = String(cell ?? '').trim();
    if (val && (COLUMN_MAP[val] !== undefined || COLUMN_MAP[normalizeHeader(val)] !== undefined)) {
      matches++;
    }
  }
  return matches >= 2;
}

function fixMemberNo(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^\d+\.0$/.test(s)) return String(parseInt(s, 10));
  return s;
}

function fixShareAmount(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const cleaned = s
    .replace(/රු\.?/g, '')
    .replace(/Rs\.?/gi, '')
    .replace(/LKR/gi, '')
    .replace(/රුපියල/g, '')
    .replace(/[,\s]/g, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function sanitizePostgresDate(val?: string | number | null): string {
  const fallback = new Date().toISOString().split('T')[0];
  if (!val) return fallback;
  const s = String(val).trim().replace(/\./g, '-');
  const match = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    let y = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);
    let d = parseInt(match[3], 10);
    if (isNaN(y) || y < 1900 || y > 2100) y = 2024;
    if (isNaN(m) || m < 1) m = 1; if (m > 12) m = 12;
    const maxDays = new Date(y, m, 0).getDate();
    if (isNaN(d) || d < 1) d = 1; if (d > maxDays) d = maxDays;
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  const num = parseFloat(s);
  if (!isNaN(num) && num > 25569 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return fallback;
}

function fixExcelDate(val: string | number): string {
  return sanitizePostgresDate(val);
}

function parseRawRow(
  raw: RawImportRow,
  headerMap: Record<string, keyof ParsedMember | 'ignore' | null>,
  divisionId: string,
  categoryId: string,
  rowIndex: number,
  autoMemberNo: string
): ImportRow {
  const errors: string[] = [];
  const parsed: Partial<ParsedMember> = {
    electoral_division_id: divisionId,
    category_id: categoryId,
  };

  for (const [header, value] of Object.entries(raw)) {
    const field = headerMap[header];
    if (!field || field === 'ignore') continue;

    const strVal = String(value ?? '').trim();

    switch (field) {
      case 'member_no':
        parsed.member_no = fixMemberNo(strVal);
        break;
      case 'name':
        parsed.name = strVal;
        break;
      case 'address':
        parsed.address = strVal;
        break;
      case 'email':
        parsed.email = strVal;
        break;
      case 'phone':
        parsed.phone = strVal;
        break;
      case 'nic':
        parsed.nic = strVal;
        break;
      case 'joined_date':
        parsed.joined_date = fixExcelDate(strVal);
        break;
      case 'share_amount': {
        parsed.share_amount = fixShareAmount(value != null ? String(value) : '');
        break;
      }
    }
  }

  if (!parsed.member_no) {
    parsed.member_no = autoMemberNo;
  }

  if (!parsed.address) parsed.address = '';
  if (!parsed.email) parsed.email = '';
  if (!parsed.phone) parsed.phone = '';
  if (!parsed.nic) parsed.nic = '';
  if (!parsed.joined_date) parsed.joined_date = new Date().toISOString().split('T')[0];
  if (parsed.share_amount === undefined) parsed.share_amount = 0;

  if (!parsed.name) errors.push('Name is required');

  const status = errors.length > 0 ? 'invalid' : 'valid';

  return {
    rowIndex,
    raw,
    parsed: errors.length === 0 ? (parsed as ParsedMember) : undefined,
    status,
    errors,
  };
}

// ============================================================
// CSV Parser
// ============================================================
export async function parseCSV(
  file: File,
  divisionId: string,
  categoryId: string
): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const headerMap = buildHeaderMap(headers);

        const rows: ImportRow[] = (results.data as RawImportRow[])
          .filter((row) => {
            const vals = Object.values(row);
            return vals.some((v) => v !== null && v !== undefined && String(v).trim() !== '');
          })
          .map((row, i) =>
            parseRawRow(row, headerMap, divisionId, categoryId, i + 1, `AUTO-${i + 1}`)
          );

        resolve(rows);
      },
      error: reject,
    });
  });
}

// ============================================================
// Excel Parser
// ============================================================
export async function parseExcel(
  file: File,
  divisionId: string,
  categoryId: string
): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          codepage: 65001,
          cellDates: false,
          raw: false,
        });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
          header: 1,
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd',
        });

        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(15, jsonData.length); i++) {
          if (isHeaderRow(jsonData[i] as (string | number)[])) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = (jsonData[headerRowIndex] as (string | number)[]).map((h) =>
          String(h ?? '').trim()
        );
        const headerMap = buildHeaderMap(headerRow);

        let finalHeaderRowIndex = headerRowIndex;

        const rows: ImportRow[] = [];
        for (let i = finalHeaderRowIndex + 1; i < jsonData.length; i++) {
          const rowArr = jsonData[i] as (string | number)[];
          if (!rowArr || rowArr.every((v) => v === '' || v === null || v === undefined)) continue;

          const finalHeaderRow = (jsonData[finalHeaderRowIndex] as (string | number)[]).map((h) =>
            String(h ?? '').trim()
          );
          const raw: RawImportRow = {};
          finalHeaderRow.forEach((h, idx) => {
            raw[h] = rowArr[idx] ?? '';
          });

          const hasData = Object.entries(raw).some(([h, v]) => {
            const field = headerMap[h];
            return field && field !== 'ignore' && String(v ?? '').trim() !== '';
          });
          if (!hasData) continue;

          rows.push(
            parseRawRow(raw, headerMap, divisionId, categoryId, i + 1, `M-${rows.length + 1}`)
          );
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================
// PDF Parser — Extract tables and member lists from PDF
// ============================================================
export async function parsePDF(
  file: File,
  divisionId: string,
  categoryId: string
): Promise<ImportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[][] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();

    const itemsByY: Record<number, { x: number; text: string }[]> = {};

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!itemsByY[y]) itemsByY[y] = [];
      itemsByY[y].push({ x: item.transform[4], text: item.str });
    }

    const sortedY = Object.keys(itemsByY)
      .map(Number)
      .sort((a, b) => b - a);

    for (const y of sortedY) {
      const lineItems = itemsByY[y].sort((a, b) => a.x - b.x);
      const rowTokens = lineItems.map((i) => i.text.trim());
      allLines.push(rowTokens);
    }
  }

  if (allLines.length === 0) return [];

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(15, allLines.length); i++) {
    if (isHeaderRow(allLines[i])) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = allLines[headerRowIndex].map((h) => String(h ?? '').trim());
  const headerMap = buildHeaderMap(headerRow);

  const rows: ImportRow[] = [];
  for (let i = headerRowIndex + 1; i < allLines.length; i++) {
    const line = allLines[i];
    if (!line || line.length === 0) continue;

    const raw: RawImportRow = {};
    headerRow.forEach((h, idx) => {
      raw[h] = line[idx] ?? '';
    });

    const hasData = Object.entries(raw).some(([h, v]) => {
      const field = headerMap[h];
      return field && field !== 'ignore' && String(v ?? '').trim() !== '';
    });
    if (!hasData) continue;

    rows.push(
      parseRawRow(raw, headerMap, divisionId, categoryId, i + 1, `PDF-${rows.length + 1}`)
    );
  }

  return rows;
}

// ============================================================
// Main entry point
// ============================================================
export async function parseFile(
  file: File,
  divisionId: string,
  categoryId: string
): Promise<ImportRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCSV(file, divisionId, categoryId);
  } else if (ext === 'xls' || ext === 'xlsx') {
    return parseExcel(file, divisionId, categoryId);
  } else if (ext === 'pdf') {
    return parsePDF(file, divisionId, categoryId);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please use CSV, XLS, XLSX or PDF`);
  }
}

// ============================================================
// Normalization Helpers for Duplicate Checking
// ============================================================
export function normalizeNIC(nic?: string | null): string {
  if (!nic) return '';
  return String(nic).trim().toUpperCase().replace(/[\s-]/g, '');
}

export function normalizeName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(mr|mrs|ms|dr|prof|rev)\.?\s+/i, '')
    .replace(/\s+/g, '');
}

export interface ExistingMemberData {
  existingMemberNos: Set<string>;
  existingNICs: Set<string>;
  existingNames: Set<string>;
}

export function applyDuplicateDetection(
  rows: ImportRow[],
  dbData: ExistingMemberData
): ImportRow[] {
  const seenMemberNos = new Set<string>(dbData.existingMemberNos);
  const seenNICs = new Set<string>(dbData.existingNICs);

  return rows.map((row) => {
    if (row.status === 'invalid' || !row.parsed) return row;

    const rawNic = row.parsed.nic;
    const rawMemberNo = row.parsed.member_no;

    const nic = normalizeNIC(rawNic);
    const memberNo = fixMemberNo(rawMemberNo);

    let isDuplicate = false;
    let dupReason = 'ALREADY EXISTS';

    if (nic && seenNICs.has(nic)) {
      isDuplicate = true;
      dupReason = 'ALREADY EXISTS (NIC matched)';
    } else if (memberNo && seenMemberNos.has(memberNo)) {
      isDuplicate = true;
      dupReason = 'ALREADY EXISTS (Member No matched)';
    }

    if (isDuplicate) {
      return {
        ...row,
        status: 'duplicate',
        errors: [dupReason],
      };
    }

    if (nic) seenNICs.add(nic);
    if (memberNo) seenMemberNos.add(memberNo);

    return {
      ...row,
      status: 'valid',
      errors: [],
    };
  });
}

export function downloadImportTemplate(): void {
  const templateData = [
    ['member_no', 'name', 'address', 'email', 'phone', 'nic', 'joined_date', 'share_amount'],
    ['M001', 'Kamal Perera', 'No 10, Colombo', 'kamal@gmail.com', '0771234567', '199012345678', '2024-01-15', '5000'],
    ['M002', 'Nimal Silva', 'No 20, Kandy', 'nimal@gmail.com', '0772345678', '198512345678', '2024-02-01', '3000'],
    ['M003', 'Sunil Fernando', 'No 30, Galle', 'sunil@gmail.com', '0773456789', '200012345678', '2024-03-10', '7500'],
    ['M004', 'Kumari Perera', 'No 40, Matara', 'kumari@gmail.com', '0774567890', '199512345678', '2024-04-01', '4500'],
    ['M005', 'Ruwan Silva', 'No 50, Negombo', 'ruwan@gmail.com', '0775678901', '200212345678', '2024-05-15', '6000'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Members Import Template');
  XLSX.writeFile(wb, 'members_import_template.xlsx');
}
